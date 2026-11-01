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
  const t=d.duration*n/8,f=livingFaceFrame(d.id,t);assert.equal(f.beat,n);assert.ok(f.open>=0&&f.open<=1);for(const v of [f.x,f.y,f.scale,f.tilt,f.wave,f.warning,f.photo])assert.ok(Number.isFinite(v));variants.add(image(d.id,t).toString('base64'));
 }assert.ok(variants.size>=3,d.id+' should visibly animate');}
});
test('reduced motion freezes every design, including voice ribbon and particles',()=>{
 for(const d of REFERENCE_FACES)assert.deepEqual(image(d.id,0,false),image(d.id,9999,false));
});
test('idle really closes its eyelids and speaking alternates smiling eyes with the reference ribbon',()=>{
 assert.equal(livingFaceFrame('idle',6400*.22).open,0);assert.equal(livingFaceFrame('idle',0).open,1);
 assert.equal(livingFaceFrame('speaking',0).wave,0);assert.equal(livingFaceFrame('speaking',3000).wave,1);assert.equal(livingFaceFrame('speaking',5999).wave,0);
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
function comparable(f){return {pose:f.pose,features:f.features,x:f.x,y:f.y,tilt:f.tilt,scale:f.scale,open:f.open,eyeScale:f.eyeScale,blush:f.blush,wave:f.wave,warning:f.warning,photo:f.photo,thinking:f.thinking,gazeX:f.gazeX,gazeY:f.gazeY};}
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
