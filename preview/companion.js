/* Central state machine. Audio adapter is injected; microphone and AI remain mocks. */
(function(root){
'use strict';
const STATES=Object.freeze(Object.fromEntries(['IDLE','EXPRESSING','SHOWING_PHOTO','PLAYING_VOICE','LISTENING','WAITING_FOR_AI','SHOWING_RESPONSE','ERROR'].map(s=>[s,s])));
const EVENTS=Object.freeze(Object.fromEntries(['HOME_REQUESTED','CANCEL_REQUESTED','EXPRESSION_REQUESTED','EXPRESSION_FINISHED','PHOTO_SELECTED','VOICE_MESSAGE_SELECTED','PLAYBACK_FINISHED','AUDIO_FAILURE','VOICE_RANDOM_REQUESTED','VOICE_FILE_STATUS_CHANGED','LISTENING_REQUESTED','INPUT_CAPTURED','RECORDING_TIMEOUT','AI_RESPONSE_RECEIVED','AI_REQUEST_FAILED','AI_REQUEST_TIMEOUT','RESPONSE_FINISHED','FAILURE','RETRY_REQUESTED','DISMISS_ERROR','NETWORK_CHANGED','MEMORY_LOADED','GALLERY_REQUESTED','GALLERY_UPDATED','NEXT_PHOTO','PREVIOUS_PHOTO','SETTINGS_REQUESTED','NEXT_SETTING','TOGGLE_SETTING','SETTING_CHANGED','NEXT_PAGE','PREVIOUS_PAGE'].map(s=>[s,s])));
// Compatibility names used by the existing preview buttons, not extra transitions.
const voiceAPI=typeof module!=='undefined'&&module.exports?require('./voices.js'):root;
const pagesFor=typeof module!=='undefined'&&module.exports?require('./screens.js').paginateResponse:root.paginateResponse;
const aliases={HOME:'HOME_REQUESTED',EXPRESS:'EXPRESSION_REQUESTED',PHOTO:'PHOTO_SELECTED',VOICE:'VOICE_MESSAGE_SELECTED',LISTEN:'LISTENING_REQUESTED',FINISH_LISTENING:'INPUT_CAPTURED',FAIL:'FAILURE',ONLINE:'NETWORK_CHANGED',LOAD_MEMORY:'MEMORY_LOADED',RETRY:'DISMISS_ERROR'};
const completion=new Set(['EXPRESSION_FINISHED','PLAYBACK_FINISHED','AUDIO_FAILURE','RECORDING_TIMEOUT','AI_RESPONSE_RECEIVED','AI_REQUEST_FAILED','AI_REQUEST_TIMEOUT','RESPONSE_FINISHED']);
function priority(event){event=aliases[event]||event;
 if(['HOME_REQUESTED','CANCEL_REQUESTED','DISMISS_ERROR'].includes(event))return 0;
 if(event==='FAILURE')return 1;
 if(event==='NETWORK_CHANGED')return 2;
 if(['AI_REQUEST_TIMEOUT','RECORDING_TIMEOUT','AI_REQUEST_FAILED','AUDIO_FAILURE'].includes(event))return 3;
 return completion.has(event)?4:5;
}
class Companion {
 #state=STATES.IDLE;
 #owner=null;
 #view='face';
 get view(){return this.#view;}
 #handling=false;
 #retry=null;
 constructor(now=0,options={}){
  this.entered=now;this.online=true;this.memory=null;this.question='';this.response='';this.error='';this.errorInfo=null;this.expression=0;this.revision=0;this.requestId=0;this.mockAI=true;
  this.galleryIndex=0;this.galleryCount=0;this.settingIndex=0;this.settings={motion:true,speech:false};this.responsePage=0;this.photoReveal=true;
  this.expressionDuration=4500;this.voiceMessage=null;
  this.config={voiceMs:5000,recordingMs:20000,aiDelayMs:2200,aiTimeoutMs:10000,...options};
  this.voiceLibrary=options.voiceLibrary||new voiceAPI.MockVoiceLibrary();
  this.audio=options.audioPlayer||new voiceAPI.MockVoicePlayer(this.voiceLibrary);
  this.log=[];this.retryCount=0;
  this.#owner={id:0,state:STATES.IDLE,cancelled:false,audio:false,recording:false,ai:false};
 }
 get state(){return this.#state;}
 get resources(){return Object.freeze({...this.#owner});}
 #record(event,from,accepted,reason,now){
  this.log.push(Object.freeze({at:now,event,from,to:this.state,accepted,reason,owner:this.requestId}));
  if(this.log.length>100)this.log.shift();
 }
 #enter(state,now){
  // Exit procedure: invalidate ownership and release all mock activity flags.
  this.audio.stop();
  this.#owner.cancelled=true;
  this.#owner.audio=this.#owner.recording=this.#owner.ai=false;
  this.requestId++;
  this.#state=state;this.#view=state===STATES.SHOWING_PHOTO?'viewer':'face';this.entered=now;this.revision++;
  // Entry procedure: the one new state owns all future completion events.
  this.#owner={id:this.requestId,state,cancelled:false,
   audio:state===STATES.PLAYING_VOICE,recording:state===STATES.LISTENING,ai:state===STATES.WAITING_FOR_AI};
  if(state===STATES.IDLE){this.question='';this.response='';this.error='';this.errorInfo=null;this.#retry=null;this.retryCount=0;}
  if(state===STATES.LISTENING)this.question='';
  if(state===STATES.PLAYING_VOICE){
   const result=this.audio.start(this.voiceMessage.id,this.requestId,now,this.voiceMessage.durationMs);
   if(result.ok)this.voiceMessage=result.message;
   else this.#fail(result.category,result.message,now);
  }
 }
 #fail(category,message,now){
  const operation=this.state;
  const retryState=[STATES.PLAYING_VOICE,STATES.LISTENING,STATES.WAITING_FOR_AI].includes(operation)?operation:null;
  this.#retry=retryState;
  this.error=message;
  this.errorInfo=Object.freeze({category,operation,retryable:!!retryState&&this.retryCount<1,message});
  this.#enter(STATES.ERROR,now);
 }
 dispatchBatch(events,now){
  // One event-loop turn: safety/cancel first; never apply remaining old events
  // to the new state's lifetime. Equal-priority events keep arrival order.
  const ordered=events.map((e,i)=>({...e,i})).sort((a,b)=>priority(a.event)-priority(b.event)||a.i-b.i);
  const revision=this.revision;
  for(const item of ordered){
   if(this.revision!==revision){this.#record(item.event,this.state,false,'superseded by higher-priority transition',now);continue;}
   this.dispatch(item.event,now,item.payload);
  }
 }
 dispatch(event,now,payload){
  if(this.#handling)return false;
  this.#handling=true;
  const from=this.state;event=aliases[event]||event;
  let accepted=false,reason='invalid in current state';
  try{
   if(!Object.hasOwn(EVENTS,event)){reason='unknown event';return false;}
   if(completion.has(event)&&(!payload||payload.owner!==this.requestId)){
    reason='stale or unowned completion';return false;
   }
   const elapsed=now-this.entered;
   if(['HOME_REQUESTED','CANCEL_REQUESTED','DISMISS_ERROR'].includes(event)){
    this.#enter(STATES.IDLE,now);accepted=true;
   }else if(event==='NETWORK_CHANGED'){
    this.online=!!payload;accepted=true;
    if(!this.online&&this.state===STATES.WAITING_FOR_AI)this.#fail('NETWORK','AI is offline. Local photos, expressions and mock voice still work.',now);
   }else if(event==='VOICE_FILE_STATUS_CHANGED'){
    accepted=!!payload&&this.voiceLibrary.setHealth(payload.id,payload.status);
   }else if(event==='GALLERY_UPDATED'){
    if(Number.isSafeInteger(payload)&&payload>=0){this.galleryCount=payload;this.galleryIndex=Math.min(this.galleryIndex,Math.max(0,payload-1));accepted=true;}
   }else if(event==='SETTING_CHANGED'){
    if(payload&&['motion','speech'].includes(payload.key)&&typeof payload.value==='boolean'){this.settings[payload.key]=payload.value;accepted=true;}
   }else if(event==='MEMORY_LOADED'){
    if(payload&&typeof payload.name==='string'){this.memory=payload;if(Number.isInteger(payload.index)&&payload.index>=0&&payload.index<this.galleryCount)this.galleryIndex=payload.index;accepted=true;}
   }else if(event==='FAILURE'){
    this.#fail('OPERATION',typeof payload==='string'?payload:'The action could not finish. Return home to continue.',now);accepted=true;
   }else if(event==='RETRY_REQUESTED'&&this.state===STATES.ERROR){
    if(this.errorInfo?.retryable&&this.#retry&&this.retryCount<1){
     const target=this.#retry;
     if(target===STATES.WAITING_FOR_AI&&!this.online){reason='network still unavailable';return false;}
     this.retryCount++;this.error='';this.errorInfo=null;this.#enter(target,now);accepted=true;
    }else reason='retry unavailable or limit reached';
   }else if(this.state===STATES.IDLE){
    if(event==='GALLERY_REQUESTED'){this.#enter(STATES.SHOWING_PHOTO,now);this.#view='gallery';accepted=true;}
    else if(event==='SETTINGS_REQUESTED'){this.#view='settings';this.revision++;accepted=true;}
    else if(this.#view==='settings'&&event==='NEXT_SETTING'){this.settingIndex=(this.settingIndex+1)%2;accepted=true;}
    else if(this.#view==='settings'&&event==='TOGGLE_SETTING'){const key=['motion','speech'][this.settingIndex];this.settings[key]=!this.settings[key];accepted=true;}
    else if(event==='EXPRESSION_REQUESTED'&&this.#view==='face'){
     const expression=typeof payload==='object'?payload?.expression:payload;
     const duration=typeof payload==='object'?payload?.durationMs:4500;
     if(Number.isInteger(expression)&&expression>=0&&expression<6&&Number.isFinite(duration)&&duration>=1000&&duration<=10000){
      this.expression=expression;this.expressionDuration=duration;this.#enter(STATES.EXPRESSING,now);accepted=true;
     }
    }
    else if(event==='PHOTO_SELECTED'){
     if(!this.memory)this.#fail('PHOTO','No memory loaded. Choose a local photo first.',now);
     else{this.photoReveal=payload?.animate!==false;this.#enter(STATES.SHOWING_PHOTO,now);}accepted=true;
    }else if(event==='VOICE_MESSAGE_SELECTED'||event==='VOICE_RANDOM_REQUESTED'){
     const choice=event==='VOICE_RANDOM_REQUESTED'?this.voiceLibrary.randomMessage(payload?.category||null):payload||{id:'voice_001',durationMs:this.config.voiceMs};
     const id=typeof choice==='string'?choice:choice?.id;
     if(!choice){this.#fail('AUDIO_MISSING','No available recordings in this category. Choose another category or restore a recording.',now);accepted=true;}
     else if(typeof id==='string'){
      this.voiceMessage={id,durationMs:typeof choice==='object'?choice.durationMs:undefined};
      this.#enter(STATES.PLAYING_VOICE,now);accepted=true;
     }
    }
    else if(event==='LISTENING_REQUESTED'){this.#enter(STATES.LISTENING,now);accepted=true;}
   }else if(this.state===STATES.SHOWING_PHOTO){
    if(event==='GALLERY_REQUESTED'){this.#view='gallery';accepted=true;}
    else if(event==='NEXT_PHOTO'||event==='PREVIOUS_PHOTO'){
     if(this.galleryCount){this.galleryIndex=(this.galleryIndex+(event==='NEXT_PHOTO'?1:-1)+this.galleryCount)%this.galleryCount;accepted=true;}
    }else if(event==='PHOTO_SELECTED'&&this.memory){this.photoReveal=payload?.animate!==false;this.#enter(STATES.SHOWING_PHOTO,now);accepted=true;}
   }else if(this.state===STATES.EXPRESSING&&event==='EXPRESSION_FINISHED'){
    this.#enter(STATES.IDLE,now);accepted=true;
   }else if(this.state===STATES.PLAYING_VOICE&&['PLAYBACK_FINISHED','AUDIO_FAILURE'].includes(event)){
    if(event==='AUDIO_FAILURE')this.#fail(payload.category||'AUDIO_FAILURE',payload.message||'Audio playback failed. Return home or retry once.',now);
    else this.#enter(STATES.IDLE,now);accepted=true;
   }else if(this.state===STATES.LISTENING){
    if(event==='RECORDING_TIMEOUT'||(event==='INPUT_CAPTURED'&&elapsed>=this.config.recordingMs)){
     this.#fail('RECORDING_TIMEOUT','Listening timed out. Type a question and try again.',now);accepted=true;
    }else if(event==='INPUT_CAPTURED'){
     this.question=typeof payload==='string'?payload.trim():'';
     if(!this.question)this.#fail('EMPTY_INPUT','No question entered. Try listening again.',now);
     else if(!this.online)this.#fail('NETWORK','AI is offline. Local features are still available.',now);
     else this.#enter(STATES.WAITING_FOR_AI,now);accepted=true;
    }
   }else if(this.state===STATES.WAITING_FOR_AI){
    if(event==='AI_REQUEST_TIMEOUT'||(event==='AI_RESPONSE_RECEIVED'&&elapsed>=this.config.aiTimeoutMs)){
     this.#fail('AI_TIMEOUT','AI request timed out. Please try again later.',now);accepted=true;
    }else if(event==='AI_REQUEST_FAILED'){
     this.#fail('AI_FAILURE','The AI request failed. Try again or return home.',now);accepted=true;
    }else if(event==='AI_RESPONSE_RECEIVED'){
     if(typeof payload.text!=='string'||!payload.text.trim()||payload.text.length>16000)this.#fail('INVALID_RESPONSE','The reply could not be read. Try again or return home.',now);
     else{this.response=payload.text.trim();this.responsePage=0;this.#enter(STATES.SHOWING_RESPONSE,now);}accepted=true;
    }
   }else if(this.state===STATES.SHOWING_RESPONSE){
    if(event==='NEXT_PAGE'){this.responsePage=Math.min(pagesFor(this.response).length-1,this.responsePage+1);accepted=true;}
    else if(event==='PREVIOUS_PAGE'){this.responsePage=Math.max(0,this.responsePage-1);accepted=true;}
    else if(event==='RESPONSE_FINISHED'){this.#enter(STATES.IDLE,now);accepted=true;}
   }
   return accepted;
  }finally{this.#record(event,from,accepted,accepted?'handled':reason,now);this.#handling=false;}
 }
 tick(now){
  const elapsed=now-this.entered,owner=this.requestId;
  if(this.state===STATES.PLAYING_VOICE){const progress=this.audio.progress?.();if(progress)this.voiceMessage={...this.voiceMessage,durationMs:progress.durationMs};const result=this.audio.update(now);if(result)this.dispatch(result.event,now,result.payload);return;}
  let event,payload={owner};
  if(this.state===STATES.EXPRESSING&&elapsed>=this.expressionDuration)event=EVENTS.EXPRESSION_FINISHED;
  else if(this.state===STATES.LISTENING&&elapsed>=this.config.recordingMs)event=EVENTS.RECORDING_TIMEOUT;
  else if(this.state===STATES.WAITING_FOR_AI){
   if(!this.online){this.dispatch(EVENTS.NETWORK_CHANGED,now,false);return;}
   if(elapsed>=this.config.aiTimeoutMs)event=EVENTS.AI_REQUEST_TIMEOUT;
   else if(this.mockAI&&elapsed>=this.config.aiDelayMs){event=EVENTS.AI_RESPONSE_RECEIVED;payload.text='Demo reply: take a little breath. You are doing better than you think. This is a prewritten response, not cloud AI.';}
  }
  if(event)this.dispatch(event,now,payload);
 }
}
const api={Companion,STATES,EVENTS,eventPriority:priority};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
