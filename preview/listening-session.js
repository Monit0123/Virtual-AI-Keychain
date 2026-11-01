/* User intent survives one recognition session and half-duplex speaker output. */
(function(root){
'use strict';
class ListeningSession {
 constructor(mic,{now=()=>performance.now(),canListen=()=>true,onStatus=()=>{},cooldownMs=900}={}){
  this.mic=mic;this.now=now;this.canListen=canListen;this.onStatus=onStatus;this.cooldownMs=cooldownMs;
  this.enabled=false;this.allowOnline=false;this.resumeAt=0;this.endTimes=[];this.paused=false;
 }
 start({allowOnline=false}={}){this.stop(false);this.enabled=true;this.allowOnline=allowOnline;this.endTimes=[];this.resumeAt=this.now();this.tick();}
 stop(report=true){this.enabled=false;this.paused=false;this.mic.stop();if(report)this.onStatus('Microphone off. Press Start microphone to enable continuous listening.');}
 pause(){this.mic.stop();this.resumeAt=this.now()+this.cooldownMs;if(this.enabled&&!this.paused)this.onStatus('Listening enabled — paused for the response or another action. It resumes automatically when ready.');this.paused=true;}
 heard(){this.endTimes=[];}
 ended(){
  if(!this.enabled)return;
  const now=this.now();this.endTimes=this.endTimes.filter(t=>now-t<30000);this.endTimes.push(now);
  if(this.endTimes.length>=5){this.stop(false);this.onStatus('Recognition repeatedly ended. Listening stopped; check speech support, then press Start to retry.');return;}
  this.resumeAt=now+this.cooldownMs;
  this.onStatus('Listening is enabled. Reconnecting the recognition session…');
 }
 failed(code){if(code==='no-speech'){this.ended();return;}this.stop(false);}
 tick(){
  if(!this.enabled)return;
  if(!this.canListen()){
   this.pause();
   return;
  }
  if(!this.mic.active&&this.now()>=this.resumeAt){
   this.paused=false;
   if(!this.mic.start({allowOnline:this.allowOnline}))this.enabled=false;
  }
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports=ListeningSession;else root.ListeningSession=ListeningSession;
})(globalThis);
