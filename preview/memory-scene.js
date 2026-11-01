/* One elapsed-time timeline owns the memory scene. No timers or state writes. */
(function(root){
'use strict';
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
const mix=(a,b,t)=>a+(b-a)*t;
function memoryScene(elapsed,motion=true){
 const t=Math.max(0,elapsed);
 return motion?{frame:ease(t/900),expand:ease((t-4200)/3800)}:{frame:1,expand:1};
}
// Bounded, endpoint-continuous overshoot: no indefinite oscillation.
function memorySpring(t){
 t=Math.max(0,Math.min(1,t));
 const u=t-1;
 return 1+2.5*u*u*u+1.5*u*u;
}
// Shared gesture clock, separate feature follow-through. No perpetual wobble.
function faceFollowThrough(elapsed,motion=true){
 const pulse=delay=>{
  const t=(elapsed-delay)/1100;
  if(!motion||t<=0||t>=1)return 0;
  return Math.sin(Math.PI*t)**2*Math.sin(3*Math.PI*t);
 };
 const eye=pulse(0),mouth=pulse(80);
 return {eyeY:eye===0?0:-1.8*eye,eyeScaleY:1+.08*eye,
         mouthY:2.2*mouth,mouthScaleY:1+.12*mouth};
}
function drawMemoryPhoto(ctx,image,scene){
 const api=typeof module!=='undefined'&&module.exports?require('./living-face.js'):root;
 api.drawPhotoFrame(ctx,image,scene.expand,scene.frame);
}
const api={memoryScene,drawMemoryPhoto,memorySpring,faceFollowThrough};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
