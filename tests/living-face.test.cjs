const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const {REFERENCE_FACES,livingFaceFrame,drawLivingFace,FaceStudy}=require('../preview/living-face.js');
const names=['idle','happy','excited','surprised','sleepy','sad','angry','love','listening','thinking','speaking','photo','error'];
function image(id,t,motion=true){const c=createCanvas(128,128);drawLivingFace(c.getContext('2d'),livingFaceFrame(id,t,motion));return c.toBuffer('image/png');}
test('all 13 reference designs have distinct thumbnails and eight named beats',()=>{
 assert.deepEqual(REFERENCE_FACES.map(d=>d.id),names);const pixels=new Set();
 for(const d of REFERENCE_FACES){assert.equal(d.beats.length,8);assert.ok(d.description.length>40);pixels.add(image(d.id,0,false).toString('base64'));}
 assert.equal(pixels.size,13);
});
test('each design has eight safe key frames and a changing animation, not just a static icon',()=>{
 for(const d of REFERENCE_FACES){const variants=new Set();for(let n=0;n<8;n++){
  const t=d.duration*n/8,f=livingFaceFrame(d.id,t);assert.equal(f.beat,n);assert.ok(f.open>=0&&f.open<=1);for(const v of [f.x,f.y,f.scale,f.tilt,f.warning,f.photo])assert.ok(Number.isFinite(v));variants.add(image(d.id,t).toString('base64'));
 }assert.ok(variants.size>=3,d.id+' should visibly animate');}
});
test('reduced motion freezes every design, including mouth and sleeping Z particles',()=>{
 for(const d of REFERENCE_FACES)assert.deepEqual(image(d.id,0,false),image(d.id,9999,false));
});
test('idle really closes its eyelids and speaking uses a complete face with an articulating mouth',()=>{
 assert.equal(livingFaceFrame('idle',6400*.22).open,0);assert.equal(livingFaceFrame('idle',0).open,1);
 assert.equal(livingFaceFrame('speaking',0).pose.mh,0);assert.ok(livingFaceFrame('speaking',400).pose.mh>4);assert.equal(livingFaceFrame('speaking',5999).pose.mh,0);
 assert.equal(livingFaceFrame('photo',3200).photo,1);assert.equal(livingFaceFrame('error',3000).warning,1);
});
test('all designs preserve canvas transforms, opacity, clipping and shadow ownership',()=>{
 const p=createCanvas(128,128).getContext('2d');p.globalAlpha=.6;p.lineWidth=6;p.translate(2,3);const before=p.getTransform();
 for(const d of REFERENCE_FACES){drawLivingFace(p,livingFaceFrame(d.id,d.duration*.5));assert.ok(Math.abs(p.globalAlpha-.6)<.01);assert.equal(p.lineWidth,6);assert.equal(p.shadowBlur,0);assert.equal(p.getTransform().e,before.e);assert.equal(p.getTransform().f,before.f);}
});
test('study can tour all designs, morph interruptions, reject unknown names and return live',()=>{
 const s=new FaceStudy();assert.equal(s.active,false);assert.equal(s.select('unknown',0),false);s.select('happy',100);s.select('sad',300);assert.equal(s.previous.id,'happy');assert.equal(s.previous.elapsed,200);s.tour=true;
 const seen=new Set();let now=300;for(let i=0;i<13;i++){seen.add(s.id);now+=REFERENCE_FACES.find(d=>d.id===s.id).duration;s.update(now);}
 assert.equal(seen.size,13);s.stop();assert.equal(s.active,false);assert.equal(s.tour,false);assert.equal(s.update(999),null);
});
function comparable(f){return {pose:f.pose,features:f.features,x:f.x,y:f.y,tilt:f.tilt,scale:f.scale,open:f.open,eyeScale:f.eyeScale,blush:f.blush,warning:f.warning,photo:f.photo,thinking:f.thinking,gazeX:f.gazeX,gazeY:f.gazeY};}
test('a new expression starts at the exact currently visible geometry, including rapid retargets',()=>{
 const s=new FaceStudy();s.select('love',0);const before=s.sample(1600);
 s.select('sad',1600);assert.deepEqual(comparable(s.sample(1600)),comparable(before));
 const intermediate=s.sample(1800);assert.ok(intermediate.pose.love>0&&intermediate.pose.love<1);
 s.select('excited',1800);assert.deepEqual(comparable(s.sample(1800)),comparable(intermediate));
 const settled=s.sample(2800);assert.deepEqual(comparable(settled),comparable(livingFaceFrame('excited',1000)));
});
test('transitions interpolate body, pupils, mouth and effect ownership instead of fading the face away',()=>{
 const s=new FaceStudy();s.select('love',0);s.select('surprised',1000);const a=s.sample(1000),mid=s.sample(1425),b=s.sample(1850);
 assert.ok(mid.pose.h>a.pose.h&&mid.pose.h<b.pose.h);assert.ok(mid.pose.love>0&&mid.pose.love<1);
 assert.equal(a.blush,1.3);assert.ok(mid.blush>=1&&mid.blush<=1.3);
 const c=createCanvas(128,128),p=c.getContext('2d');s.draw(p,1425);const data=p.getImageData(20,68,88,9).data;
 assert.ok(data.filter((v,i)=>i%4===3&&v>100).length>15,'cheeks remain fully present mid-morph');
});
test('the first frame of a new selection rasterizes exactly like its captured source',()=>{
 const s=new FaceStudy();s.select('thinking',0);const source=s.sample(1900);s.select('happy',1900);
 const a=createCanvas(128,128),b=createCanvas(128,128);drawLivingFace(a.getContext('2d'),source);s.draw(b.getContext('2d'),1900);
 assert.deepEqual(a.toBuffer('image/png'),b.toBuffer('image/png'));
});
test('live/study handoffs accept an explicit visible snapshot and reduced motion clears stale morphs',()=>{
 const live=new FaceStudy(),study=new FaceStudy();live.select('listening',0);const visible=live.sample(2000);
 study.select('angry',2000,visible);assert.deepEqual(comparable(study.sample(2000)),comparable(visible));
 study.sample(2100,false);assert.equal(study.previous,null);assert.equal(study.sample(2150,true).pose.slope,10);
});
test('all face contours and intermediate morphs retain BOTH eyes without opacity compositing',()=>{
 const c=createCanvas(128,128),ctx=c.getContext('2d');const writes=[];
 const p=new Proxy(ctx,{get(target,key){const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;},set(target,key,value){if(key==='globalAlpha'||key==='globalCompositeOperation')writes.push([key,value]);return Reflect.set(target,key,value,target);}});
 const s=new FaceStudy();let now=0;s.select('idle',now);
 for(const d of REFERENCE_FACES){now+=1100;s.select(d.id,now);for(const age of [0,170,425,850,2200]){
  ctx.clearRect(0,0,128,128);s.draw(p,now+age,true,{sleepMarks:false});for(const x of [24,74]){const data=ctx.getImageData(x,26,30,40).data;assert.ok(data.filter((v,i)=>i%4===3&&v>150).length>20,`${d.id} at ${age} keeps eye ${x} visible`);}
 }}
 assert.deepEqual(writes,[],'face renderer never sets opacity or uses compositing fades');
});
test('body stays anchored in the centre even when legacy poses request translation',()=>{
 const f=livingFaceFrame('love',1700),a=createCanvas(128,128),b=createCanvas(128,128);
 drawLivingFace(a.getContext('2d'),f);drawLivingFace(b.getContext('2d'),{...f,x:40,y:-30});assert.deepEqual(a.toBuffer('image/png'),b.toBuffer('image/png'));
});
test('anger symbol is red and reflected correctly across both axes',()=>{
 const {drawAngerMark}=require('../preview/bunny-face.js'),c=createCanvas(128,128),p=c.getContext('2d');drawAngerMark(p,64,64);const data=p.getImageData(0,0,128,128).data;let red=0,error=0;
 for(let y=55;y<73;y++)for(let x=55;x<73;x++){const i=(y*128+x)*4,j=(y*128+127-x)*4,k=((127-y)*128+x)*4;if(data[i]>200&&data[i+1]<100&&data[i+2]<100&&data[i+3]>100)red++;error+=Math.abs(data[i+3]-data[j+3])+Math.abs(data[i+3]-data[k+3]);}
 assert.ok(red>25);assert.ok(error<300,'four corners have horizontal and vertical symmetry');
});
test('speaking uses an animated mouth, with no waveform beneath the full face',()=>{
 const c=createCanvas(128,128),p=c.getContext('2d'),mouths=new Set();
 for(const t of [0,200,400,700,1500,2000,3000,5000]){
  p.clearRect(0,0,128,128);drawLivingFace(p,livingFaceFrame('speaking',t));
  const below=p.getImageData(34,102,60,18).data;assert.ok(below.every((v,i)=>i%4!==3||v<5),'no waveform pixels below the face');
  mouths.add(Buffer.from(p.getImageData(54,80,20,17).data).toString('base64'));
  for(const x of [24,74])assert.ok(p.getImageData(x,26,30,40).data.filter((v,i)=>i%4===3&&v>150).length>20);
 }
 assert.ok(mouths.size>=5,'mouth articulates, pauses and smiles rather than remaining static');
});
test('excited eyes are rounded four-point stars with broad inward corners, not plus signs',()=>{
 const {bunnyEyeContour}=require('../preview/bunny-face.js'),pose=livingFaceFrame('excited',0).pose;
 for(const left of [true,false]){
  const {points}=bunnyEyeContour(pose,left),r=points.map(([x,y])=>Math.hypot(x,y));let tips=0;
  for(let i=0;i<r.length;i++)if(r[i]>r[(i+r.length-1)%r.length]&&r[i]>r[(i+1)%r.length])tips++;
  assert.ok(points[5][0]<2.1&&points[5][1]<-10,'sides taper into a star, not broad plus-shaped arms');
  assert.equal(points.length,80);assert.equal(tips,4);assert.ok(Math.abs(Math.max(...r)-14)<1e-6);assert.ok(Math.abs(Math.min(...r)-Math.sqrt(40.5))<1e-6);
 }
 for(let i=0;i<=20;i++){const f=livingFaceFrame('idle',0);f.pose.spark=i/20;for(const [x,y] of bunnyEyeContour(f.pose,true).points)assert.ok(Number.isFinite(x)&&Number.isFinite(y));}
});
test('each expression change blinks exactly once, closing before the morph begins',()=>{
 const s=new FaceStudy();s.select('love',0);s.select('angry',1000);
 assert.equal(s.sample(1100).pose.love,1,'old eye shape is held until eyes close');
 assert.equal(s.sample(1120).open,0);assert.equal(s.sample(1175).open,0);
 assert.ok(s.sample(1200).pose.love<1,'shape morph starts behind closed lids');
 assert.equal(s.sample(1360).open,1);
 let intervals=0,closed=false;
 for(let age=0;age<=900;age+=5){const next=s.sample(1000+age).open<.95;if(next&&!closed)intervals++;closed=next;}
 assert.equal(intervals,1);assert.deepEqual(comparable(s.sample(1850)),comparable(livingFaceFrame('angry',850)));
});
test('interrupted blinks preserve lid position; same-design replays do not add a blink',()=>{
 const s=new FaceStudy();s.select('idle',0);s.select('happy',1000);const mid=s.sample(1060);
 assert.ok(mid.open>0&&mid.open<1);s.select('excited',1060);assert.equal(s.sample(1060).open,mid.open);
 const visible=s.sample(1090);s.select('excited',1090);assert.equal(s.previous.blink,false);assert.deepEqual(comparable(s.sample(1090)),comparable(visible));
 s.sample(1100,false);assert.equal(s.previous,null);assert.equal(s.sample(1110).open,1);
});
test('closed eyes remain solid eyelid strokes instead of becoming transparent',()=>{
 const c=createCanvas(128,128),p=c.getContext('2d'),s=new FaceStudy();s.select('happy',0);s.select('love',1000);s.draw(p,1150);
 for(const x of [24,74])assert.ok(p.getImageData(x,43,30,10).data.filter((v,i)=>i%4===3&&v>200).length>20);
});
test('sleep loop yawns widely first, closes the mouth, then gently bobs while dozing',()=>{
 const start=livingFaceFrame('sleepy',0),yawn=livingFaceFrame('sleepy',1500),asleep=livingFaceFrame('sleepy',4200);
 assert.equal(start.pose.mh,0);assert.equal(yawn.pose.mh,24);assert.equal(yawn.pose.mw,16);assert.equal(yawn.sleep,0);
 assert.equal(asleep.pose.mh,0);assert.equal(asleep.sleep,1);assert.ok(asleep.open<.2);
 const bobs=new Set();for(const t of [3300,3700,4100,4500,4900,5300]){const f=livingFaceFrame('sleepy',t);bobs.add(f.headBob);assert.ok(f.headBob>=0&&f.headBob<=1.7);assert.ok(Math.abs(f.tilt)<=.025);}assert.ok(bobs.size>=4);
 assert.deepEqual(livingFaceFrame('sleepy',7600).pose,start.pose);assert.equal(livingFaceFrame('sleepy',7600).headBob,0);
});
test('sleeping Zs emerge above the head, travel upward, grow and fade with bounded lifetimes',()=>{
 const {sleepParticles}=require('../preview/living-face.js');assert.deepEqual(sleepParticles(2000),[]);
 const a=sleepParticles(3600)[0],b=sleepParticles(4200)[0],c=sleepParticles(5000)[0];
 assert.ok(a.y>b.y&&b.y>c.y);assert.ok(a.x<b.x&&b.x<c.x);assert.ok(a.alpha>b.alpha&&b.alpha>c.alpha);assert.ok(a.size<b.size&&b.size<c.size);
 for(let t=0;t<7600;t+=20)for(const z of sleepParticles(t)){assert.ok(z.alpha>=0&&z.alpha<=1);assert.ok(z.x>=99&&z.x+z.size<128);assert.ok(z.y>=0&&z.y+z.size<35);}
 assert.deepEqual(sleepParticles(7600),[]);assert.deepEqual(sleepParticles(11400),sleepParticles(3800));assert.deepEqual(sleepParticles(0,false),sleepParticles(99999,false));
});
