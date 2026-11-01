/* Pure animation controller: no DOM, network, or rendering dependencies. */
(function (root) {
'use strict';
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };
class FaceAnimation {
  constructor(moods, {random = Math.random, now = 0, motion = true} = {}) {
    this.moods=moods; this.random=random; this.motion=motion; this.automatic=true;
    this.selected=0; this.current={...moods[0]}; this.from={...this.current};
    this.transition=now; this.lastChange=now; this.last=now;
    this.nextLook=now+1800; this.nextBlink=now+2400; this.blinkStart=null;
    this.doublePending=false; this.gx=0; this.gy=0; this.tx=0; this.ty=0;
    this.blinks=0; this.looks=0;
  }
  select(index, now) {
    // Capture the currently displayed pose, including an interrupted morph.
    this.pose(now);
    this.from={...this.current}; this.selected=index;
    this.transition=now; this.lastChange=now;
  }
  pose(now) {
    const age=now-this.transition;
    for(const key of Object.keys(this.moods[0])) {
      if(typeof this.moods[0][key]!=='number')continue;
      // One transition clock; mouth follows eyes by 70 ms and both settle at 650 ms.
      const mouth=['curve','mw','mh'].includes(key);
      const progress=this.motion?smooth((age-(mouth?70:0))/(mouth?580:650)):1;
      const u=progress-1;
      const spring=1+2*u*u*u+u*u;
      const t=['r','g','b'].includes(key)?progress:spring;
      this.current[key]=this.from[key]+(this.moods[this.selected][key]-this.from[key])*t;
    }
  }

  snapshot(now){
    // Keep the exact pose, blink progress, gaze and scheduler lifetime.
    this.pose(now);
    const values={};
    for(const key of ['selected','transition','lastChange','last','nextLook','nextBlink','blinkStart','doublePending','gx','gy','tx','ty','blinks','looks','motion','automatic'])values[key]=this[key];
    return {at:now,current:{...this.current},from:{...this.from},values};
  }
  resume(snapshot,now){
    const pause=Math.max(0,now-snapshot.at);
    Object.assign(this,snapshot.values);
    this.current={...snapshot.current};this.from={...snapshot.from};
    for(const key of ['transition','lastChange','nextLook','nextBlink'])this[key]+=pause;
    if(this.blinkStart!==null)this.blinkStart+=pause;
    this.last=now;
  }
  setMotion(enabled, now) {
    this.motion=enabled; this.blinkStart=null; this.doublePending=false;
    this.nextBlink=now+2400; this.nextLook=now+1800;
  }
  update(now) {
    const dt=Math.min(Math.max(0,(now-this.last)/1000),.05); this.last=now;
    if(this.automatic && now-this.lastChange>=6000)
      this.select((this.selected+1)%this.moods.length,now);
    this.pose(now);
    const transitioning=this.motion && now-this.transition<650;
    // One owner per channel: morph owns geometry, blink only openness,
    // idle only gaze. New idle actions wait while an expression is settling.
    if(this.motion && this.blinkStart!==null && now-this.blinkStart>=240) {
      this.blinkStart=null;
      this.nextBlink=now+(this.doublePending?120:2800+this.random()*2600);
      this.doublePending=false;
    }
    if(this.motion && !transitioning && this.blinkStart===null && now>=this.nextBlink) {
      this.blinkStart=now; this.blinks++;
      this.doublePending=this.random()<.15;
    }
    if(this.motion && !transitioning && this.blinkStart===null && now>=this.nextLook) {
      // Return to centre sometimes, rather than endlessly scanning.
      const centre=this.random()<.35;
      this.tx=centre?0:(this.random()-.5)*8;
      this.ty=centre?0:(this.random()-.5)*3;
      this.nextLook=now+1800+this.random()*2400; this.looks++;
    }
    const follow=1-Math.exp(-dt*5);
    this.gx+=((this.motion?this.tx:0)-this.gx)*follow;
    this.gy+=((this.motion?this.ty:0)-this.gy)*follow;
    let openness=1;
    if(this.motion && this.blinkStart!==null) {
      const elapsed=now-this.blinkStart;
      openness=elapsed<85?1-smooth(elapsed/85):smooth((elapsed-85)/155);
    }
    return {current:this.current,selected:this.selected,gx:this.gx,gy:this.gy,
      openness,breath:this.motion?Math.sin(now/1600)*.5:0};
  }
}
if(typeof module!=='undefined' && module.exports) module.exports=FaceAnimation;
else root.FaceAnimation=FaceAnimation;
})(globalThis);
