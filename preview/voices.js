/* Shared local voice catalogue, plus explicit mock adapters for core tests.
   The browser uses BrowserAudioPlayer with actual bundled WAV files. */
(function(root){
'use strict';
const INDEX=typeof module!=='undefined'&&module.exports?require('./voice/index.js'):root.VOICE_INDEX;
function validateVoiceIndex(index){
 if(!index||index.version!==1||!Array.isArray(index.recordings)||!Array.isArray(index.categories))throw new Error('Invalid recording index version or structure.');
 const ids=new Set(),files=new Set(),categories=new Set(index.categories);
 if(categories.size!==index.categories.length||index.categories.some(c=>typeof c!=='string'||!c.trim()))throw new Error('Invalid categories.');
 let greetings=0;
 for(const m of index.recordings){
  if(!m||!/^voice_\d{3,}$/.test(m.id)||ids.has(m.id))throw new Error('Recording IDs must be unique voice_001-style names.');
  if(typeof m.file!=='string'||!new RegExp('^voice/'+m.id+'\\.(wav|mp3|m4a|ogg)$','i').test(m.file)||files.has(m.file))throw new Error('Recording file path must match its ID.');
  if(typeof m.title!=='string'||!m.title.trim()||!Number.isFinite(m.durationMs)||m.durationMs<=0)throw new Error('Each recording needs a title and positive durationMs.');
  if(m.category!==undefined&&!categories.has(m.category))throw new Error('Unknown recording category.');
  if(!['personal','greeting'].includes(m.role))throw new Error('Unknown recording role.');
  if(m.role==='greeting')greetings++;
  ids.add(m.id);files.add(m.file);
 }
 if(greetings>1)throw new Error('Only one recording can own the greeting role.');
 for(const [alias,id] of Object.entries(index.aliases||{}))if(!alias||ids.has(alias)||!ids.has(id))throw new Error('Invalid legacy recording alias.');
 return index;
}
validateVoiceIndex(INDEX);
const ALL_VOICE_MESSAGES=Object.freeze(INDEX.recordings.map(m=>Object.freeze({...m})));
const VOICE_MESSAGES=Object.freeze(ALL_VOICE_MESSAGES.filter(m=>m.role==='personal'));
const GREETING_MESSAGE=ALL_VOICE_MESSAGES.find(m=>m.role==='greeting');
class MockVoiceLibrary {
 constructor({random=Math.random,index=INDEX}={}){
  validateVoiceIndex(index);this.random=random;this.last=null;
  this.records=Object.freeze(index.recordings.map(m=>Object.freeze({...m})));
  this.aliases=Object.freeze({...index.aliases});this.categories=Object.freeze([...index.categories]);
  this.health=new Map(this.records.map(m=>[m.id,'ready']));
 }
 canonicalId(id){return this.aliases[id]||id;}
 greetingId(){return this.records.find(m=>m.role==='greeting')?.id||null;}
 list(category=null,{includeGreeting=false}={}){return this.records.filter(m=>(includeGreeting||m.role==='personal')&&(!category||m.category===category));}
 setHealth(id,status){id=this.canonicalId(id);if(!this.health.has(id)||!['ready','missing','corrupt'].includes(status))return false;this.health.set(id,status);return true;}
 resolve(id){
  id=this.canonicalId(id);const message=this.records.find(m=>m.id===id);
  if(!message)return {ok:false,category:'AUDIO_MISSING',message:'That voice-message identifier is unavailable.'};
  const health=this.health.get(id);
  if(health==='missing')return {ok:false,category:'AUDIO_MISSING',message:'This recording is missing. Choose another message or restore its file.'};
  if(health!=='ready')return {ok:false,category:'AUDIO_CORRUPT',message:'This recording could not be read. Choose another message or replace the file.'};
  return {ok:true,message};
 }
 randomMessage(category=null){
  const ready=this.list(category).filter(m=>this.resolve(m.id).ok);
  if(!ready.length)return null;
  const choices=ready.length>1?ready.filter(m=>m.id!==this.last):ready;
  const index=Math.min(choices.length-1,Math.max(0,Math.floor(this.random()*choices.length)));
  const message=choices[index];this.last=message.id;return message;
 }
}
// Replacement interface: start(id,owner,now,durationOverride), update(now), stop().
// A real adapter must verify/decode local bytes and actually stop its audio output.
class MockVoicePlayer {
 constructor(library=new MockVoiceLibrary()){this.library=library;this.session=null;}
 start(id,owner,now,durationOverride){
  this.stop();const result=this.library.resolve(id);if(!result.ok)return result;
  const durationMs=durationOverride??result.message.durationMs;
  if(!Number.isFinite(durationMs)||durationMs<=0||durationMs>1800000)return {ok:false,category:'AUDIO_INVALID',message:'Choose a positive simulated duration up to 30 minutes.'};
  const message=Object.freeze({...result.message,durationMs});
  this.library.last=message.id;
  this.session={message,owner,started:now};return {ok:true,message};
 }
 update(now){
  if(!this.session)return null;
  const {message,owner,started}=this.session;
  const health=this.library.resolve(message.id);
  if(!health.ok){this.stop();return {event:'AUDIO_FAILURE',payload:{owner,category:health.category,message:health.message}};}
  if(now-started>=message.durationMs){this.stop();return {event:'PLAYBACK_FINISHED',payload:{owner}};}
  return null;
 }
 stop(){this.session=null;}
}
const api={VOICE_INDEX:INDEX,validateVoiceIndex,VOICE_MESSAGES,GREETING_MESSAGE,ALL_VOICE_MESSAGES,MockVoiceLibrary,MockVoicePlayer};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
