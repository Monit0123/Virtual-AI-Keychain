/* Two sampled buttons. Times are milliseconds. No DOM, timers or app state. */
(function(root){
'use strict';
class ButtonControls {
 constructor(onGesture,{debounceMs=30,longMs=700}={}){
  this.onGesture=onGesture;this.debounceMs=debounceMs;this.longMs=longMs;
  this.buttons={A:this.#button(),B:this.#button()};this.chord=false;
 }
 #button(){return {raw:false,lastRaw:false,stable:false,changed:0,downAt:0,sent:false,suppressed:false};}
 setPressed(id,pressed){if(this.buttons[id])this.buttons[id].raw=!!pressed;}
 cancel(){for(const id of ['A','B'])this.buttons[id]=this.#button();this.chord=false;}
 update(now){
  const released=[];
  for(const [id,b] of Object.entries(this.buttons)){
   if(b.raw!==b.lastRaw){b.lastRaw=b.raw;b.changed=now;}
   if(b.stable!==b.raw&&now-b.changed>=this.debounceMs){
    b.stable=b.raw;
    if(b.stable){b.downAt=now;b.sent=false;b.suppressed=this.chord;}
    else released.push(id);
   }
  }
  const {A,B}=this.buttons;
  if(A.stable&&B.stable&&!this.chord){
   this.chord=true;A.suppressed=B.suppressed=true;this.onGesture('BOTH_HOME');
  }
  for(const id of released){const b=this.buttons[id];
   if(!this.chord&&!b.sent&&!b.suppressed)this.onGesture(id+'_SHORT');
  }
  for(const [id,b] of Object.entries(this.buttons)){
   if(b.stable&&!b.sent&&!b.suppressed&&!this.chord&&now-b.downAt>=this.longMs){b.sent=true;this.onGesture(id+'_LONG');}
  }
  if(!A.stable&&!B.stable)this.chord=false;
 }
 feedback(id,now){const b=this.buttons[id];return {pressed:b.stable,held:b.sent||this.chord,progress:b.stable?Math.min(1,(now-b.downAt)/this.longMs):0};}
}
if(typeof module!=='undefined'&&module.exports)module.exports=ButtonControls;else root.ButtonControls=ButtonControls;
})(globalThis);
