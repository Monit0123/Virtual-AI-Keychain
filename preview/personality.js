/* Small, capability-aware shuffle bag: variety without surprise side effects. */
(function(root){
'use strict';
const VOICES=typeof module!=='undefined'&&module.exports?require('./voices.js').VOICE_MESSAGES:root.VOICE_MESSAGES;
const STATUS=Object.freeze(['A little pause is okay.','Your memories are here, even offline.','One small step at a time.','A quiet moment, just for you.']);
class Personality {
 constructor(random=Math.random){this.random=random;this.bag=[];this.signature='';this.last=null;this.lastVoice=-1;this.lastStatus=-1;this.lastIdle=null;}
 #index(length){return Math.min(length-1,Math.max(0,Math.floor(this.random()*length)));}
 #variation(length,last){if(length<2)return 0;if(last<0)return this.#index(length);const n=this.#index(length-1);return n>=last?n+1:n;}
 next({online=false,photos=0}={}){
  const available=['happy','playful','sleepy','status'];if(VOICES.length)available.splice(3,0,'voice');
  if(photos>0)available.push('photo');if(online)available.push('ai');
  const signature=available.join(',');
  if(signature!==this.signature){this.signature=signature;this.bag=[];}
  if(!this.bag.length){
   this.bag=[...available];
   for(let i=this.bag.length-1;i>0;i--){const j=this.#index(i+1);[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}
   if(this.bag[0]===this.last)[this.bag[0],this.bag[1]]=[this.bag[1],this.bag[0]];
  }
  const id=this.bag.shift();this.last=id;
  if(id==='happy')return {id,event:'EXPRESSION_REQUESTED',payload:{expression:1,durationMs:3000},label:'Happy to see you'};
  if(id==='playful')return {id,event:'EXPRESSION_REQUESTED',payload:{expression:3,durationMs:2600},label:'Oh! A little surprise'};
  if(id==='sleepy')return {id,event:'EXPRESSION_REQUESTED',payload:{expression:4,durationMs:1800},label:'Just a tiny yawn'};
  if(id==='photo')return {id,event:'PHOTO_SELECTED',label:'Let’s remember a little moment'};
  if(id==='ai')return {id,event:'LISTENING_REQUESTED',label:'Want to ask something? Type to submit · mock AI'};
  if(id==='voice'){
   this.lastVoice=this.#variation(VOICES.length,this.lastVoice);
   return {id,event:'VOICE_MESSAGE_SELECTED',payload:{...VOICES[this.lastVoice]},label:VOICES[this.lastVoice].title+' · voice message'};
  }
  this.lastStatus=this.#variation(STATUS.length,this.lastStatus);
  return {id,event:'EXPRESSION_REQUESTED',payload:{expression:0,durationMs:3000},label:STATUS[this.lastStatus]};
 }
 idle(){
  const choices=[0,1,3,4].filter(n=>n!==this.lastIdle);
  const expression=choices[this.#index(choices.length)];this.lastIdle=expression;
  return {expression,durationMs:expression===4?1800:2800,waitMs:6500+this.#index(4501)};
 }
}
class MemoryCollection {
 constructor(random=Math.random){this.items=[];this.current=-1;this.random=random;}
 add(name,image){this.items.push({name,image});if(this.current<0)this.current=0;return true;}
 selected(){return this.items[this.current]||null;}
 randomMemory(){
  if(!this.items.length)return null;
  if(this.items.length===1)this.current=0;
  else{let n=Math.min(this.items.length-2,Math.floor(this.random()*(this.items.length-1)));if(n>=this.current)n++;this.current=n;}
  return this.selected();
 }
}
const api={Personality,MemoryCollection,VOICE_MOCKS:VOICES};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
