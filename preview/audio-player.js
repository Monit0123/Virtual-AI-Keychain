/* Real browser Web Audio adapter. Bundled/local bytes only; no synthesis/API. */
(function(root){
'use strict';
class BrowserAudioPlayer {
 constructor(library,{contextFactory,fetchFile,loadTimeoutMs=20000}={}){
  this.library=library;this.isReal=true;this.context=null;this.session=null;
  this.replacementVersions=new Map();this.personalIds=new Set();this.buffers=new Map();this.loads=new Map();this.pending=null;
  this.contextFactory=contextFactory||(()=>{const C=root.AudioContext||root.webkitAudioContext;if(!C)throw new Error('Web Audio unavailable');return new C();});
  this.fetchFile=fetchFile||(url=>fetch(url));this.loadTimeoutMs=loadTimeoutMs;this.unlocking=null;
 }
 unlock(){
  try{
   if(!this.context)this.context=this.contextFactory();
   this.unlocking=Promise.resolve(this.context.resume()).then(()=>{
    if(this.context.state!=='running')throw new Error('Tap Enable sound to allow audio.');
   });
  }catch(error){this.unlocking=Promise.reject(error);}
  // Attach a handler even if a caller only initiates unlock before dispatch.
  this.unlocking.catch(()=>{});return this.unlocking;
 }
 async prepare(id){
  const record=this.library.resolve(id);if(!record.ok)throw Object.assign(new Error(record.message),{category:record.category});
  id=record.message.id;
  if(this.buffers.has(id))return this.buffers.get(id);
  if(this.loads.has(id))return this.loads.get(id);
  const task=(async()=>{
   if(!this.context)throw Object.assign(new Error('Tap Enable sound or Play voice first.'),{category:'AUDIO_LOCKED'});
   const response=await this.fetchFile(record.message.file);
   if(!response.ok)throw Object.assign(new Error('This recording could not be loaded. Choose another message.'),{category:response.status===404?'AUDIO_MISSING':'AUDIO_LOAD'});
   const bytes=await response.arrayBuffer();
   if(!bytes.byteLength)throw Object.assign(new Error('This recording is empty.'),{category:'AUDIO_CORRUPT'});
   let buffer;
   try{buffer=await this.context.decodeAudioData(bytes);}catch{throw Object.assign(new Error('This recording could not be decoded. Choose WAV or another browser-supported audio file.'),{category:'AUDIO_CORRUPT'});}
   if(!buffer||!Number.isFinite(buffer.duration)||buffer.duration<=0)throw new Error('Invalid audio duration');
   this.buffers.set(id,buffer);return buffer;
  })();
  this.loads.set(id,task);
  try{return await task;}finally{if(this.loads.get(id)===task)this.loads.delete(id);}
 }
 async preload(){return Promise.all(this.library.records.map(record=>record.id).map(async id=>{try{await this.prepare(id);return {id,ok:true};}catch(error){return {id,ok:false,message:error.message};}}));}
 async replace(id,bytes){
  if(!this.context)throw new Error('Enable sound before choosing a recording.');
  id=this.library.canonicalId(id);
  if(!this.library.health.has(id))throw new Error('Unknown voice-message identifier.');
  const version=(this.replacementVersions.get(id)||0)+1;this.replacementVersions.set(id,version);
  // Decode first; an invalid replacement never destroys a working clip.
  const buffer=await this.context.decodeAudioData(bytes.slice(0));
  if(!buffer||!Number.isFinite(buffer.duration)||buffer.duration<=0)throw new Error('Invalid recording.');
  if(this.replacementVersions.get(id)!==version)throw new Error('A newer replacement was selected.');
  if(this.session?.message.id===id)this.stop();
  const oldLoad=this.loads.get(id);if(oldLoad){try{await oldLoad;}catch{}}
  if(this.replacementVersions.get(id)!==version)throw new Error('A newer replacement was selected.');
  this.buffers.set(id,buffer);this.personalIds.add(id);this.library.setHealth(id,'ready');return buffer.duration;
 }
 start(id,owner,now){
  this.stop();const record=this.library.resolve(id);if(!record.ok)return record;
  if(!this.context)return {ok:false,category:'AUDIO_LOCKED',message:'Tap Enable sound first, then try the voice message again.'};
  id=record.message.id;
  const cached=this.buffers.get(id);
  const session={owner,message:{...record.message,durationMs:cached?cached.duration*1000:record.message.durationMs,realAudio:true},started:now,status:'loading',source:null,audioStarted:0};
  this.session=session;
  (async()=>{
   try{
    if(this.unlocking)await this.unlocking;
    if(this.context.state!=='running')throw Object.assign(new Error('Audio is paused by your browser. Tap Enable sound and retry.'),{category:'AUDIO_LOCKED'});
    const buffer=await this.prepare(id);
    if(this.session!==session)return; // Cancellation/replacement invalidates the continuation.
    const health=this.library.resolve(id);if(!health.ok)throw Object.assign(new Error(health.message),{category:health.category});
    const source=this.context.createBufferSource();source.buffer=buffer;
    session.message={...session.message,durationMs:buffer.duration*1000};
    session.source=source;session.audioStarted=this.context.currentTime;session.status='playing';
    source.connect(this.context.destination);
    source.onended=()=>{if(this.session===session)this.pending={event:'PLAYBACK_FINISHED',payload:{owner}};};
    source.start();this.library.last=id;
   }catch(error){
    if(this.session===session)this.pending={event:'AUDIO_FAILURE',payload:{owner,category:error.category||'AUDIO_PLAYBACK',message:error.category?error.message:'Audio playback could not start. Tap Enable sound, then try another recording.'}};
   }
  })();
  return {ok:true,message:session.message};
 }
 progress(){
  const s=this.session;if(!s)return null;
  return {loading:s.status==='loading',durationMs:s.message.durationMs,
   elapsedMs:s.status==='playing'?Math.max(0,Math.min(s.message.durationMs,(this.context.currentTime-s.audioStarted)*1000)):0};
 }
 update(now){
  const s=this.session;if(!s)return null;
  const health=this.library.resolve(s.message.id);
  if(!health.ok)this.pending={event:'AUDIO_FAILURE',payload:{owner:s.owner,category:health.category,message:health.message}};
  if(!this.pending&&((s.status==='loading'&&now-s.started>=this.loadTimeoutMs)||now-s.started>s.message.durationMs+this.loadTimeoutMs+30000))
   this.pending={event:'AUDIO_FAILURE',payload:{owner:s.owner,category:'AUDIO_TIMEOUT',message:'Audio did not finish loading or playing. Return home and retry.'}};
  if(this.pending){const result=this.pending;this.stop();return result;}
  return null;
 }
 stop(){
  const s=this.session;this.session=null;this.pending=null;
  if(s?.source){s.source.onended=null;try{s.source.stop();}catch{}try{s.source.disconnect();}catch{}}
 }
}
// Separate owner for the IDLE emotional greeting, sharing decoded local audio.
// Regular message actions cancel this layer before entering PLAYING_VOICE.
class GreetingAudio {
 constructor(main){
  this.main=main;this.owner=0;
  this.player=new BrowserAudioPlayer(main.library,{fetchFile:main.fetchFile,loadTimeoutMs:main.loadTimeoutMs});
 }
 start(now){
  this.stop();const main=this.main,player=this.player;
  player.context=main.context;player.unlocking=main.unlocking;
  player.buffers=main.buffers;player.loads=main.loads;
  const id=main.library.greetingId();
  if(!id)return {ok:false,category:'AUDIO_MISSING',message:'No greeting recording is configured in the index.'};
  return player.start(id,++this.owner,now);
 }
 update(now){return this.player.update(now);}
 stop(){this.owner++;this.player.stop();}
}
BrowserAudioPlayer.GreetingAudio=GreetingAudio;
if(typeof module!=='undefined'&&module.exports)module.exports=BrowserAudioPlayer;
else {root.BrowserAudioPlayer=BrowserAudioPlayer;root.GreetingAudio=GreetingAudio;}
})(globalThis);
