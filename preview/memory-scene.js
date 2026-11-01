/* One elapsed-time timeline owns the memory scene. No timers or state writes. */
(function(root){
'use strict';
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
const mix=(a,b,t)=>a+(b-a)*t;
function memoryScene(elapsed,motion=true){
 const t=Math.max(0,elapsed);
 if(!motion)return {settle:1,look:1,openness:1,dots:1,cloud:1,photo:1,expand:1};
 // The deliberate single blink ends before the upward glance begins.
 let openness=1;
 if(t>=430&&t<730)openness=t<540?1-ease((t-430)/110):ease((t-540)/190);
 return {settle:ease(t/850),look:ease((t-740)/750),openness,
 dots:ease((t-1250)/650),cloud:ease((t-1900)/1100),
 photo:ease((t-2850)/1900),expand:ease((t-5200)/2800)};
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
function cloudPath(ctx,expand=0){
 // A growing rounded base absorbs the lobes into a full-screen rectangle.
 ctx.beginPath();
 ctx.roundRect(mix(16,0,expand),mix(25,0,expand),mix(98,128,expand),mix(39,128,expand),17*(1-expand));
 for(const [x,y,r] of [[37,27,19],[62,24,22],[88,30,20]]){
 const radius=r*(1-expand);if(radius<=0)continue;
 ctx.moveTo(x+radius,y);ctx.arc(x,y,radius,0,Math.PI*2);
 }
}
// Detached thought trail outside the face's right edge, never over the eyes.
function memoryThoughtDots(){
 return [[0,92,88,1.5],[1,100,78,2.3],[2,107,69,3]];
}
function drawMemoryCloud(ctx,image,scene){
 ctx.save();
 try{
 // Pop the entire cloud/photo assembly together, not independent layers.
 const pop=1+.065*Math.sin(3*Math.PI*scene.cloud)*Math.sin(Math.PI*scene.cloud)*(1-scene.expand);
 ctx.translate(64,34);ctx.scale(pop,pop);ctx.translate(-64,-34);
 // Each thought dot arrives in turn, rather than appearing as one group.
 for(const [i,x,y,r] of memoryThoughtDots()){
  ctx.globalAlpha=ease(scene.dots*3-i)*(1-scene.expand);
  ctx.fillStyle='#e5f0eb';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 }
 if(scene.cloud>0){
 ctx.globalAlpha=scene.cloud;
 cloudPath(ctx,scene.expand);ctx.fillStyle='#fff';ctx.fill();
 if(image&&scene.photo>0){
  ctx.save();
  try{
  // A smaller inner silhouette leaves a clean white perimeter, including lobes.
  const inset=3*(1-scene.expand);
  ctx.translate(64,34);ctx.scale(1-inset/49,1-inset/31);ctx.translate(-64,-34);
  cloudPath(ctx,scene.expand);ctx.clip();
  ctx.globalAlpha=scene.cloud*scene.photo;
  const x=mix(16,0,scene.expand),y=mix(2,0,scene.expand);
  const w=mix(98,128,scene.expand),h=mix(62,128,scene.expand);
  const scale=Math.max(w/image.width,h/image.height);
  const iw=image.width*scale,ih=image.height*scale;
  ctx.drawImage(image,x+w/2-iw/2,y+h/2-ih/2,iw,ih);
  }finally{ctx.restore();}
 }
 }
 }finally{ctx.restore();}
}
const api={memoryScene,drawMemoryCloud,memorySpring,faceFollowThrough,memoryThoughtDots};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
