/* Offline emotional behaviour; no microphone, network, or application-state writes. */
(function(root){
'use strict';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
const mix=(a,b,t)=>a+(b-a)*t;
const SAD={h:20,w:27,slope:-6,arch:0,curve:-9,mw:22,mh:0,r:140,g:188,b:210};
const SHY={h:23,w:27,slope:-2,arch:0,curve:1,mw:13,mh:0,r:199,g:228,b:225};
const HAPPY={h:25,w:29,slope:0,arch:.72,curve:12,mw:27,mh:0,r:229,g:247,b:225};
function blend(a,b,t){return Object.fromEntries(Object.keys(a).map(k=>[k,mix(a[k],b[k],t)]));}
function normalizeGreeting(text){return typeof text==='string'?text.toLowerCase().replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim():'';}
class Affection {
 constructor(now=0,{aloneMs=90*60*1000,random=Math.random}={}){this.lastInteraction=now;this.aloneMs=aloneMs;this.mode='normal';this.started=now;this.spoken=false;this.tearAtWake=null;this.random=random;this.heartParticles=[];}
 activity(now){this.lastInteraction=now;this.mode='normal';this.started=now;this.spoken=false;this.heartParticles=[];}
 previewIgnored(now){this.mode='ignored';this.started=now;this.spoken=false;this.heartParticles=[];}
 wake(text,now){
  if(!['hi moni','hi daddy','moni'].includes(normalizeGreeting(text))||this.mode!=='ignored')return false;
  this.tearAtWake=ignoredTear({phase:'ignored',elapsed:now-this.started,weight:1},true);
  this.heartParticles=createHeartParticles(Math.floor(this.random()*4294967296));
  this.mode='greeting';this.started=now;this.lastInteraction=now;this.spoken=false;return true;
 }
 update(now,motion=true){
  if(this.mode!=='ignored'&&this.mode!=='greeting'&&now-this.lastInteraction>=this.aloneMs)this.previewIgnored(now);
  if(this.mode==='normal')return null;
  const t=Math.max(0,now-this.started);
  if(this.mode==='greeting'&&t>=16000)this.mode='contented';
  if(this.mode==='ignored')return {phase:'ignored',pose:{...SAD},weight:motion?smooth(t/1800):1,gazeX:6,gazeY:6,blush:0,hearts:0,speak:false,speaking:0,elapsed:t};
  const look=motion?smooth(t/2000):1;
  const shy=motion?smooth((t-1300)/3400):1;
  const smile=motion?smooth((t-3900)/3900):1;
  const pose=blend(blend(SAD,SHY,shy),HAPPY,smile);
  let speak=false;
  if(!this.spoken&&t>=7300){speak=t<=11000;this.spoken=true;}
  const heart=motion?smooth((t-6500)/1800)*(1-smooth((t-12500)/3500)):0;
  const talking=motion&&t>=7300&&t<9500?(1+Math.sin((t-7300)/140))*2:0;
  pose.mh+=talking;
  const snuggle=snuggleFrame(t,motion);
  // Relax into the smile, without replacing the expression or blink channel.
  pose.h-=2*snuggle.amount;pose.arch+=.14*snuggle.amount;
  pose.curve+=snuggle.amount;pose.mw-=1.5*snuggle.amount;
  return {snuggle,phase:t<2000?'looking-up':t<5500?'shy':snuggle.amount>.01?'snuggling':'happy',pose,weight:1,
   gazeX:mix(6,0,look)+Math.sin(t/1800)*.6*shy*(1-smile),gazeY:mix(6,-2,look),
   blush:shy*(.85-.45*smooth((t-11000)/5000)),hearts:heart,heartParticles:this.heartParticles,speak,speaking:talking,elapsed:t,
   tear:this.tearAtWake?{...this.tearAtWake,alpha:this.tearAtWake.alpha*(1-smooth(t/1500))}:null};
 }
}
// Soft lean -> two tiny cheek nuzzles -> slow release, all on one scene clock.
function snuggleFrame(elapsed,motion=true){
 const t=elapsed-5600;
 const amount=motion?smooth(t/1600)*(1-smooth((t-4000)/2900)):0;
 const rub=motion?Math.sin(Math.max(0,t-1100)/630)*smooth((t-1100)/700)*(1-smooth((t-3800)/1200))*amount:0;
 return {amount,x:-4*amount+1.1*rub,y:3*amount+.55*rub,
  tilt:-.09*amount+.022*rub,scale:1+.012*amount,
  eyeX:-.6*rub,eyeY:-.35*amount+.45*rub,
  mouthX:.45*rub,mouthY:.45*amount-.3*rub};
}
function applySnuggleTransform(ctx,snuggle){
 if(!snuggle||snuggle.amount<=0)return;
 ctx.translate(64+snuggle.x,66+snuggle.y);ctx.rotate(snuggle.tilt);
 ctx.scale(snuggle.scale,snuggle.scale);ctx.translate(-64,-66);
}
// One quiet tear per nine-second cycle; no particles or independent timers.
function ignoredTear(scene,motion=true){
 if(!scene||!motion)return null;
 if(scene.phase!=='ignored')return scene.tear||null;
 const age=scene.elapsed-2000;if(age<0)return null;
 const t=age%9000;
 const gather=smooth(t/1400),slide=smooth((t-1400)/4600);
 const alpha=gather*(1-smooth((t-5600)/1400))*scene.weight;
 if(alpha<=0)return null;
 return {x:104+Math.sin(slide*Math.PI)*1.2,y:61+slide*43,
  size:1.2+gather*1.1,alpha,trail:slide};
}
function drawIgnoredTear(ctx,scene,motion=true){
 const drop=ignoredTear(scene,motion);if(!drop||drop.alpha<=0)return;
 ctx.save();ctx.globalAlpha=drop.alpha;
 // A very faint wet trail follows the cheek rather than covering the eye.
 if(drop.trail>0){
  const trail=ctx.createLinearGradient(104,62,drop.x,drop.y);
  trail.addColorStop(0,'rgba(116,202,239,0)');
  trail.addColorStop(1,'rgba(116,202,239,.16)');
  ctx.strokeStyle=trail;ctx.lineWidth=1;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(104,62);ctx.quadraticCurveTo(106,82,drop.x,drop.y);ctx.stroke();
 }
 ctx.translate(drop.x,drop.y);ctx.scale(drop.size,drop.size);
 const water=ctx.createLinearGradient(-1,-2,1,2);
 water.addColorStop(0,'#d3f3ff');water.addColorStop(.45,'#8bd6f2');water.addColorStop(1,'#4ca4d0');
 ctx.fillStyle=water;ctx.beginPath();ctx.moveTo(0,-2.1);
 ctx.bezierCurveTo(-.3,-1,-1.25,-.2,-1.1,.65);
 ctx.bezierCurveTo(-.9,1.9,.9,1.9,1.1,.65);
 ctx.bezierCurveTo(1.25,-.2,.3,-1,0,-2.1);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.ellipse(-.35,.25,.2,.42,.3,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
// Randomize once per greeting, never per frame: independent paths stay smooth.
function createHeartParticles(seed){
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
 return Array.from({length:24},()=>Object.freeze({
  x:10+random()*108,startY:102+random()*37,
  birthMs:random()*5500,lifeMs:3600+random()*3100,
  size:.4+random()*.8,speed:17+random()*23,
  drift:2+random()*7,phase:random()*Math.PI*2,
  swayMs:900+random()*1400,rotation:(random()-.5)*.7,
  color:random()<.5?'#ff647f':'#ed355b',opacity:.5+random()*.35
 }));
}
function affectionHeartFrame(scene){
 if(!scene||scene.hearts<=0)return [];
 const time=scene.elapsed-6500;
 return (scene.heartParticles||[]).flatMap(p=>{
  const age=time-p.birthMs;
  if(age<=0||age>=p.lifeMs)return [];
  const enter=smooth(age/700),exit=1-smooth((age-(p.lifeMs-1200))/1200);
  return [{x:p.x+(Math.sin(age/p.swayMs+p.phase)-Math.sin(p.phase))*p.drift,
   y:p.startY-p.speed*age/1000,
   size:p.size*(.45+.55*enter),alpha:enter*exit*scene.hearts*p.opacity,
   rotation:p.rotation+.1*Math.sin(age/1400+p.phase),color:p.color}];
 });
}
function drawAffectionHearts(ctx,scene){
 const particles=affectionHeartFrame(scene);if(!particles.length)return;
 ctx.save();
 for(const p of particles){
  ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(p.x,p.y);
  ctx.rotate(p.rotation);ctx.scale(p.size,p.size);
  ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(0,3);
  ctx.bezierCurveTo(-11,-3,-5,-10,0,-5);ctx.bezierCurveTo(5,-10,11,-3,0,3);ctx.fill();ctx.restore();
 }
 ctx.restore();
}
function drawAffectionCheeks(ctx,scene){
 if(scene.blush<=0)return;ctx.save();
 for(const x of [23,105]){
  ctx.save();ctx.translate(x,73);ctx.scale(1,.58);
  const glow=ctx.createRadialGradient(0,0,1,0,0,14);
  glow.addColorStop(0,`rgba(255,69,100,${scene.blush*.72})`);
  glow.addColorStop(.5,`rgba(245,56,91,${scene.blush*.42})`);glow.addColorStop(1,'rgba(245,56,91,0)');
  ctx.fillStyle=glow;ctx.fillRect(-15,-15,30,30);ctx.restore();
 }ctx.restore();
}
const api={Affection,normalizeGreeting,drawAffectionHearts,drawAffectionCheeks,ignoredTear,drawIgnoredTear,createHeartParticles,affectionHeartFrame,snuggleFrame,applySnuggleTransform};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
