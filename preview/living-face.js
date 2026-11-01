/* Thirteen reference designs, each with its own timed, eight-beat performance.
   Pure render data: no microphone, playback, storage, or FSM side effects. */
(function(root){
'use strict';
const faceAPI=typeof module!=='undefined'&&module.exports?require('./bunny-face.js'):root;
const DEFINITIONS=[
 ['idle','Idle / Blink','A quiet little presence. Looks around, exhales, blinks, and returns to you.',6400,'Resting|Notice|Blink|Open|Breathe|Look|Blink|Settle'],
 ['happy','Happy','A soft lift of the cheeks, smiling eyes, then a contented little bounce.',5600,'Notice|Warm|Smile|Lift|Glow|Sway|Smile|Settle'],
 ['excited','Excited','Star eyes brighten with a little anticipation, two light hops, then sparkle.',4800,'Anticipate|Brighten|Hop|Sparkle|Hop|Shimmer|Glow|Settle'],
 ['surprised','Surprised','A tiny recoil, wide bunny eyes, a curious tilt, then a slow recovery.',5200,'Notice|Recoil|Wide eyes|Hold|Tilt|Curious|Relax|Settle'],
 ['sleepy','Sleepy','Heavy lids, a slow nod and drifting sleep marks. Drowsy, not switched off.',7600,'Drowsy|Heavy lids|Nod|Doze|Dream|Doze|Stir|Rest'],
 ['sad','Sad','Drooping eyes glance down, breathe, and quietly ask for a little comfort.',7200,'Withdraw|Lower gaze|Sigh|Hold|Look up|Soft blink|Breathe|Rest'],
 ['angry','Angry','A playful little huff: narrowed eyes and a brief frustration mark, never threatening.',5000,'Notice|Narrow|Huff|Tense|Huff|Soften|Blink|Settle'],
 ['love','Love','Heart eyes lean closer while small, independently drifting hearts rise away.',6800,'Notice|Warm|Lean|Heart eyes|Nuzzle|Float|Glow|Settle'],
 ['listening','Listening','Smaller attentive bunny pupils lean toward you as gentle sound ripples travel outward.',6000,'Notice|Attend|Lean|Hear|Tilt|Attend|Hear|Settle'],
 ['thinking','Thinking','Three luminous dots take turns breathing. A small pause, not a frantic loading spinner.',4800,'Pause|Consider|Dot one|Dot two|Dot three|Reflect|Consider|Pause'],
 ['speaking','Speaking','Smiling eyes open into a restrained voice ribbon and return to a warm smile.',6000,'Smile|Begin|Voice|Phrase|Pause|Voice|Finish|Smile'],
 ['photo','Showing Photo','Smiling eyes, a miniature picture frame and tiny hearts: a fond memory, not a system icon.',6400,'Remember|Smile|Picture|Warm|Little hearts|Hold|Smile|Settle'],
 ['error','Error','A gentle double-take gives way to a clear warning, then reassuring bunny eyes return.',6000,'Notice|Concern|Pause|Warning|Warning|Recover|Reassure|Settle']
];
const REFERENCE_FACES=Object.freeze(DEFINITIONS.map(([id,label,description,duration,beats])=>Object.freeze({id,label,description,duration,beats:Object.freeze(beats.split('|'))})));
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
function track(values,phase){const t=phase*(values.length-1),i=Math.min(values.length-2,Math.floor(t));return values[i]+(values[i+1]-values[i])*ease(t-i);}
function livingFaceFrame(id,elapsed=0,motion=true){
 const design=REFERENCE_FACES.find(d=>d.id===id)||REFERENCE_FACES[0];
 const phase=motion?((Math.max(0,elapsed)%design.duration)/design.duration):.5;
 const t=motion?Math.max(0,elapsed):0;
 const pose={w:27,h:29,slope:0,arch:0,curve:2,mw:10,mh:0,spark:0,love:0};
 const f={id:design.id,phase,beat:Math.min(7,Math.floor(phase*8)),pose,x:0,y:0,tilt:0,scale:1,open:1,eyeScale:1,blush:1,wave:0,warning:0,photo:0,now:t,motion};
 if(motion){f.y=Math.sin(t/1700)*.32;f.x=track([0,0,1.2,1.2,0,-1,-1,0],phase);}
 switch(design.id){
  case 'idle':
   if(motion){const blink=(at,width)=>{const d=Math.abs(phase-at);return d<width?1-ease(1-d/width):1;};f.open=Math.min(blink(.22,.023),blink(.76,.023));}
   break;
  case 'happy':pose.arch=1;pose.curve=6;f.y+=motion?track([0,1,-1.4,0,-.8,0,0,0],phase):0;f.blush=1.2;break;
  case 'excited':pose.spark=1;pose.curve=7;f.scale=motion?track([1,.97,1.04,1,1.025,1,1,1],phase):1;f.y+=motion?track([0,1,-2,0,-1.4,0,0,0],phase):0;break;
  case 'surprised':pose.h=35;pose.mh=9;pose.mw=7;pose.curve=0;f.y+=motion?track([0,1,-2,-2,-1,0,0,0],phase):0;f.tilt=motion?track([0,0,-.035,-.035,.045,.045,0,0],phase):0;break;
  case 'sleepy':pose.h=8;pose.curve=1;f.open=motion?track([.9,.85,.7,.55,.45,.55,.8,.9],phase):.7;f.y+=motion?track([0,.4,1.2,2,2,1.7,.5,0],phase):1;break;
  case 'sad':pose.slope=-8;pose.h=25;pose.curve=-4;f.x=motion?track([0,1,1,1,0,-.5,-.5,0],phase):0;f.y+=1.5;f.blush=.6;break;
  case 'angry':pose.slope=10;pose.h=24;pose.curve=-3;f.scale=motion?track([1,.98,1.015,1,1.01,1,1,1],phase):1;break;
  case 'love':pose.love=1;pose.curve=5;f.scale=motion?track([1,1,1.025,1.025,1.035,1.025,1,1],phase):1;f.tilt=motion?Math.sin(phase*Math.PI*2)*.035:0;f.blush=1.3;break;
  case 'listening':pose.h=27;pose.mw=7;f.eyeScale=.84;f.tilt=motion?track([0,0,-.035,-.035,0,.025,.025,0],phase):0;f.y-=.7;break;
  case 'thinking':f.x=0;f.pose.curve=0;break;
  case 'speaking':pose.arch=1;pose.curve=5;f.wave=motion?ease((phase-.1)/.12)*(1-ease((phase-.8)/.13)):1;break;
  case 'photo':pose.arch=1;pose.curve=4;f.photo=motion?ease(phase/.14)*(1-ease((phase-.87)/.13)):1;break;
  case 'error':pose.h=27;pose.curve=-2;f.warning=motion?ease((phase-.22)/.12)*(1-ease((phase-.65)/.15)):1;f.x=motion?track([0,-1,1,0,0,0,0,0],phase):0;break;
 }
 if(!motion){f.x=0;f.y=0;f.tilt=0;f.scale=1;}
 f.gazeX=motion?track([0,0,1.2,1.2,0,-1,-1,0],phase):0;f.gazeY=motion?Math.sin(t/2000)*.35:0;
 f.thinking=design.id==='thinking'?1:0;f.features=Object.fromEntries(REFERENCE_FACES.map(d=>[d.id,d.id===design.id?1:0]));
 return f;
}
function heart(p,x,y,s){p.beginPath();p.moveTo(x,y+s*.7);p.bezierCurveTo(x-s*1.3,y-s*.2,x-s*.65,y-s,x,y-s*.3);p.bezierCurveTo(x+s*.65,y-s,x+s*1.3,y-s*.2,x,y+s*.7);p.fill();}
function star(p,x,y,s){p.beginPath();p.moveTo(x,y-s);p.quadraticCurveTo(x+s*.2,y-s*.2,x+s,y);p.quadraticCurveTo(x+s*.2,y+s*.2,x,y+s);p.quadraticCurveTo(x-s*.2,y+s*.2,x-s,y);p.quadraticCurveTo(x-s*.2,y-s*.2,x,y-s);p.fill();}
function drawLivingFace(p,frame,{mouth=true}={}){
 const f=frame,pose=f.pose,t=f.now,feature=id=>f.features?.[id]??(f.id===id?1:0);
 p.save();p.translate(64+f.x,63+f.y);p.rotate(f.tilt);p.scale(f.scale,f.scale);p.translate(-64,-63);
 p.lineCap='round';p.lineJoin='round';p.lineWidth=1.7;p.fillStyle=p.strokeStyle='#efd3ff';p.shadowColor='#d892f5';p.shadowBlur=2;
 const hideEyes=Math.max(f.thinking||0,f.wave,f.warning);
 if(hideEyes<1){p.save();p.globalAlpha*=1-hideEyes;
  for(const [x,left] of [[39,true],[89,false]]){p.save();p.translate(x,48);p.scale(f.eyeScale,f.eyeScale);faceAPI.drawBunnyEye(p,0,0,left,f.open,{...pose,gazeX:f.gazeX||0,gazeY:f.gazeY||0});p.restore();}p.restore();}
 // Blush follows the face, not the eyes, so gaze and cheek motion have different weight.
 p.save();p.strokeStyle='#ff9fdb';p.globalAlpha*=Math.min(1,f.blush*.8);p.lineWidth=1.7;
 for(const cx of [31,97])for(let n=-1;n<=1;n++){p.beginPath();p.moveTo(cx+n*3.6-1,74);p.lineTo(cx+n*3.6+1,70);p.stroke();}p.restore();
 if(f.thinking>0){p.save();p.globalAlpha*=f.thinking;
  for(let n=0;n<3;n++){p.save();p.globalAlpha*=f.motion?.45+.55*(.5+.5*Math.sin(t/480-n*1.1)):1;p.beginPath();p.arc(50+n*14,49,2.5,0,Math.PI*2);p.fill();p.restore();}
  p.restore();
 }
 if(f.wave>0){p.save();p.globalAlpha*=f.wave;p.lineWidth=2.2;for(let n=-5;n<=5;n++){const h=f.motion?1.3+(1-Math.abs(n)/7)*(3+8*Math.abs(Math.sin(t/230+n*.73))*Math.abs(Math.sin(t/1100))):3+6*(1-Math.abs(n)/5);p.beginPath();p.moveTo(64+n*4,49-h);p.lineTo(64+n*4,49+h);p.stroke();}p.restore();}
 if(f.warning>0){p.save();p.globalAlpha*=f.warning;p.strokeStyle='#ff8cbc';p.lineWidth=1.8;p.beginPath();p.moveTo(64,34);p.lineTo(78,59);p.quadraticCurveTo(79,62,76,62);p.lineTo(52,62);p.quadraticCurveTo(49,62,50,59);p.closePath();p.stroke();p.beginPath();p.moveTo(64,44);p.lineTo(64,52);p.stroke();p.fillStyle='#ff8cbc';p.beginPath();p.arc(64,57,1,0,Math.PI*2);p.fill();p.restore();}
 if(f.photo>0){p.save();p.globalAlpha*=f.photo;p.lineWidth=1.4;p.beginPath();p.roundRect(53,82,22,16,2);p.stroke();p.beginPath();p.moveTo(56,94);p.lineTo(61,89);p.lineTo(65,93);p.lineTo(69,87);p.lineTo(72,94);p.stroke();p.beginPath();p.arc(58,86,1,0,Math.PI*2);p.fill();p.restore();}
 const mouthAlpha=(1-f.photo)*(1-(f.thinking||0))*(1-f.wave)*(1-f.warning);
 if(mouth&&mouthAlpha>0){p.save();p.globalAlpha*=mouthAlpha;p.lineWidth=1.4;
  const w=pose.mw/2,h=pose.mh*2/3,cy=86;
  p.beginPath();p.moveTo(64-w,cy);p.bezierCurveTo(64-w,cy+h+pose.curve,64+w,cy+h+pose.curve,64+w,cy);p.bezierCurveTo(64+w,cy-h+pose.curve,64-w,cy-h+pose.curve,64-w,cy);p.closePath();p.stroke();p.restore();
 }
 p.fillStyle=p.strokeStyle='#ffaddf';p.lineWidth=1.3;
 const affection=Math.max(feature('love'),feature('photo'),feature('error'));
 if(affection>0){
  const particles=[[16,30,3,.13],[107,25,3.8,.67],[99,16,2.2,.39]];
  particles.forEach(([x,y,s,offset],i)=>{const weight=i===2?feature('love'):affection;if(weight<=0)return;const life=f.motion?(f.phase+offset)%1:.5;p.save();p.globalAlpha*=weight*(f.motion?Math.sin(life*Math.PI)*.8:.6);heart(p,x+(f.motion?Math.sin(life*5+offset)*2:0),y+(f.motion?(1-life)*12:0),s);p.restore();});
 }
 if(feature('excited')>0){p.save();p.globalAlpha*=feature('excited');for(const [x,y,s,k] of [[18,31,3,0],[110,28,4,1],[108,68,2,2]]){p.save();p.globalAlpha*=f.motion?.55+.4*Math.sin(t/500+k)**2:1;star(p,x,y,s);p.restore();}p.restore();}
 if(feature('sleepy')>0){p.save();p.globalAlpha*=feature('sleepy');for(const [x,y,s,k] of [[100,27,4,0],[109,20,3,1]]){p.save();p.globalAlpha*=f.motion?.4+.45*Math.sin(t/1200+k)**2:.8;const rise=f.motion?Math.sin(t/1400+k)*1.5:0;p.beginPath();p.moveTo(x,y+rise);p.lineTo(x+s,y+rise);p.lineTo(x,y+s+rise);p.lineTo(x+s,y+s+rise);p.stroke();p.restore();}p.restore();}
 if(feature('angry')>0){p.save();p.globalAlpha*=feature('angry');for(const [x,y,s] of [[104,24,-1],[111,24,1],[104,31,-1],[111,31,1]]){p.beginPath();p.moveTo(x,y-2*s);p.lineTo(x,y);p.lineTo(x+2*s,y);p.stroke();}p.restore();}
 if(feature('happy')>0&&(!f.motion||(f.phase>.25&&f.phase<.6))){p.save();p.globalAlpha*=feature('happy');for(const [x,y] of [[103,25],[108,27]]){p.beginPath();p.moveTo(x,y);p.lineTo(x+2,y-3);p.stroke();}p.restore();}
 if(feature('surprised')>0){p.save();p.globalAlpha*=feature('surprised');for(const [x,y] of [[104,23],[110,27]]){p.beginPath();p.moveTo(x,y);p.lineTo(x+2,y-4);p.stroke();}p.restore();}
 if(feature('listening')>0){p.save();p.globalAlpha*=feature('listening');p.strokeStyle='#e7c7ff';p.lineWidth=1;for(const side of [-1,1])for(let n=0;n<3;n++){p.save();p.globalAlpha*=f.motion?.18+.5*(.5+.5*Math.sin(t/480-n*.9)):.5;p.beginPath();p.arc(side<0?19:109,48,5+n*3,side<0?2.2:-.9,side<0?4.1:.9);p.stroke();p.restore();}p.restore();}
 p.restore();
}
const transitionEase=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const copyFrame=f=>({...f,pose:{...f.pose},features:{...f.features}});
class FaceStudy {
 constructor(){this.id=null;this.since=0;this.previous=null;this.tour=false;this.transitionMs=850;}
 select(id,now,source=null){
  if(!REFERENCE_FACES.some(d=>d.id===id))return false;
  const visible=source||this.sample(now,true),oldId=this.id,elapsed=Math.max(0,now-this.since);
  this.previous=visible?{id:oldId||visible.id,elapsed,frame:copyFrame(visible)}:null;
  this.id=id;this.since=now;return true;
 }
 stop(){this.id=null;this.previous=null;this.tour=false;}
 get active(){return this.id!==null;}
 sample(now,motion=true){
  if(!this.active)return null;
  const target=livingFaceFrame(this.id,now-this.since,motion);
  if(!motion){this.previous=null;return target;}
  if(!this.previous||now-this.since>=this.transitionMs)return target;
  const from=this.previous.frame,age=Math.max(0,now-this.since),t=transitionEase(age/this.transitionMs),mouthT=transitionEase((age-65)/(this.transitionMs-65));
  const frame=copyFrame(target);
  for(const key of Object.keys(target))if(typeof target[key]==='number')frame[key]=(from[key]??target[key])+(target[key]-(from[key]??target[key]))*t;
  for(const key of Object.keys(target.pose)){const u=['mw','mh','curve'].includes(key)?mouthT:t;frame.pose[key]=from.pose[key]+(target.pose[key]-from.pose[key])*u;}
  for(const key of Object.keys(target.features))frame.features[key]=(from.features[key]||0)+(target.features[key]-(from.features[key]||0))*t;
  // Labels follow the selected design; geometry and effect ownership follow the visible frame.
  frame.beat=target.beat;frame.phase=from.phase+(target.phase-from.phase)*t;return frame;
 }
 update(now,motion=true){if(!this.active)return null;const design=REFERENCE_FACES.find(d=>d.id===this.id);if(this.tour&&now-this.since>=design.duration){const next=REFERENCE_FACES[(REFERENCE_FACES.indexOf(design)+1)%REFERENCE_FACES.length];this.select(next.id,now);}return this.sample(now,motion);}
 draw(p,now,motion=true,options={}){const f=this.update(now,motion);if(f)drawLivingFace(p,f,options);}
}

const api={REFERENCE_FACES,livingFaceFrame,drawLivingFace,FaceStudy};if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
