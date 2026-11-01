const test=require('node:test'),assert=require('node:assert/strict');
const {Affection,normalizeGreeting,drawAffectionHearts,drawAffectionCheeks}=require('../preview/affection.js');
const {createCanvas}=require('@napi-rs/canvas');
test('90-minute inactivity threshold; ordinary interaction restarts it',()=>{
 const a=new Affection(0),limit=90*60*1000;
 assert.equal(a.update(limit-1),null);assert.equal(a.update(limit).phase,'ignored');
 const sad=a.update(limit+2000);assert.equal(sad.weight,1);assert.ok(sad.gazeX>0&&sad.gazeY>0);assert.ok(sad.pose.curve<0);
 a.activity(limit+3000);assert.equal(a.update(limit+3001),null);assert.equal(a.update(limit*2+2999),null);
 assert.equal(a.update(limit*2+3000).phase,'ignored');
});
test('only whole approved greetings wake an ignored face; punctuation/case are normalized',()=>{
 for(const phrase of ['Hi, Moni','Hi, Daddy','Moni',' HI, MONI! ','hi daddy.']){
 const a=new Affection();assert.equal(a.wake(phrase,0),false);a.previewIgnored(0);assert.equal(a.wake(phrase,2000),true);
 }
 for(const phrase of ['voice_002','monica','not moni','hi mommy','Moni please',null]){
 const a=new Affection();a.previewIgnored(0);assert.equal(a.wake(phrase,2000),false);assert.equal(a.mode,'ignored');
 }
 assert.equal(normalizeGreeting('Hi, Moni!'),'hi moni');
});
test('look up precedes blush, then gradual smile and hearts',()=>{
 const a=new Affection();a.previewIgnored(0);a.wake('Moni',2000);
 const early=a.update(2000);assert.equal(early.gazeY,6);assert.equal(early.blush,0);assert.equal(early.hearts,0);
 const shy=a.update(5500);assert.ok(shy.gazeY<0);assert.ok(shy.blush>0);assert.equal(shy.hearts,0);
 const happier=a.update(10000);assert.ok(happier.pose.curve>shy.pose.curve);assert.ok(happier.hearts>0);
 assert.ok(happier.pose.r>early.pose.r);assert.ok(happier.pose.curve>0);
});
test('greeting is emitted once; cancel and late frames cannot cause a stale utterance',()=>{
 const a=new Affection();a.previewIgnored(0);a.wake('Hi Moni',1000);
 let spoken=0;for(let t=1000;t<17000;t+=16)if(a.update(t).speak)spoken++;
 assert.equal(spoken,1);assert.equal(a.mode,'greeting');
 a.update(18000);assert.equal(a.mode,'contented');
 a.activity(18001);assert.equal(a.update(18002),null);
 const b=new Affection();b.previewIgnored(0);b.wake('Moni',1);assert.equal(b.update(30000).speak,false);
});
test('reduced motion disables hearts and mouth motion but preserves warm expression',()=>{
 const a=new Affection();a.previewIgnored(0);a.wake('Moni',1);const s=a.update(2000,false);
 assert.equal(s.hearts,0);assert.equal(s.speaking,0);assert.equal(s.pose.curve,12);
});
test('real raster: blush and hearts add red pixels without leaving context changes',()=>{
 const canvas=createCanvas(128,128),ctx=canvas.getContext('2d');ctx.fillStyle='#030606';ctx.fillRect(0,0,128,128);
 const a=new Affection();a.previewIgnored(0);a.wake('Moni',0);const s=a.update(9000);
 drawAffectionHearts(ctx,s);drawAffectionCheeks(ctx,s);
 const pixels=ctx.getImageData(0,0,128,128).data;let red=0;
 for(let i=0;i<pixels.length;i+=4)if(pixels[i]>pixels[i+1]*1.5&&pixels[i]>40)red++;
 assert.ok(red>100);assert.equal(ctx.globalAlpha,1);assert.equal(ctx.getTransform().a,1);
});
test('right-eye tear gathers slowly, slides down, fades, and respects reduced motion',()=>{
 const {ignoredTear}=require('../preview/affection.js');
 const a=new Affection();a.previewIgnored(0);
 assert.equal(ignoredTear(a.update(1000)),null);
 const gathered=ignoredTear(a.update(3400)),fallen=ignoredTear(a.update(7000));
 assert.ok(gathered.x>95&&gathered.y>=61);assert.ok(fallen.y>gathered.y+30);
 assert.ok(fallen.alpha>0);assert.equal(ignoredTear(a.update(10000)),null);
 assert.equal(ignoredTear(a.update(7000),false),null);
 a.wake('Moni',7000);
 const start=ignoredTear(a.update(7000)),fading=ignoredTear(a.update(7750)),end=ignoredTear(a.update(8500));
 assert.ok(start.alpha>fading.alpha);assert.equal(end.alpha,0);
 assert.equal(start.y,fading.y);
});
test('tear raster is confined to right cheek and context is restored',()=>{
 const {drawIgnoredTear}=require('../preview/affection.js');
 const canvas=createCanvas(128,128),ctx=canvas.getContext('2d');
 const a=new Affection();a.previewIgnored(0);drawIgnoredTear(ctx,a.update(6000));
 const pixels=ctx.getImageData(0,0,128,128).data;let count=0;
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4;if(pixels[i+3]>0){assert.ok(x>98&&x<110);assert.ok(y>=60);count++;}
 }
 assert.ok(count>10);assert.equal(ctx.globalAlpha,1);assert.equal(ctx.getTransform().a,1);
});
test('heart properties scatter independently rather than using indexed rows',()=>{
 const {createHeartParticles}=require('../preview/affection.js');
 const particles=createHeartParticles(1234);
 assert.equal(particles.length,24);assert.deepEqual(particles,createHeartParticles(1234));
 assert.notDeepEqual(particles,createHeartParticles(5678));
 for(const property of ['x','startY','birthMs','size','speed','lifeMs']){
  assert.ok(new Set(particles.map(p=>p[property].toFixed(2))).size>20,property+' must vary per heart');
 }
 const births=[...particles].sort((a,b)=>a.birthMs-b.birthMs);
 let directionChanges=0;
 for(let i=2;i<births.length;i++)if((births[i].x-births[i-1].x)*(births[i-1].x-births[i-2].x)<0)directionChanges++;
 assert.ok(directionChanges>8,'emission order must not sweep diagonally across screen');
});
test('heart positions are stable at the same timestamp, smoothly rise, and stop on cancel',()=>{
 const {affectionHeartFrame}=require('../preview/affection.js');
 const a=new Affection(0,{random:()=>.3});a.previewIgnored(0);a.wake('Moni',0);
 const frame=affectionHeartFrame(a.update(10000));
 assert.ok(frame.length>2);assert.deepEqual(frame,affectionHeartFrame(a.update(10000)));
 // Check each particle in isolation to preserve identity across birth/death.
 for(const p of a.heartParticles){
  const scene={elapsed:6500+p.birthMs+1000,hearts:1,heartParticles:[p]};
  const first=affectionHeartFrame(scene)[0],next=affectionHeartFrame({...scene,elapsed:scene.elapsed+16})[0];
  assert.ok(next.y<first.y);assert.ok(Math.abs(next.x-first.x)<.2);assert.ok(first.alpha>=0&&first.alpha<=1);
 }
 a.activity(11000);assert.equal(a.heartParticles.length,0);assert.deepEqual(affectionHeartFrame(a.update(11001)),[]);
});
test('snuggle follows blush, holds a gentle smile, then returns smoothly to rest',()=>{
 const {snuggleFrame}=require('../preview/affection.js');
 assert.equal(snuggleFrame(5000).amount,0);assert.equal(snuggleFrame(5600).amount,0);
 const cozy=snuggleFrame(8000);assert.equal(cozy.amount,1);assert.ok(cozy.x<0);assert.ok(cozy.tilt<0);
 assert.equal(snuggleFrame(12500).amount,0);assert.equal(snuggleFrame(18000).amount,0);
 const a=new Affection();a.previewIgnored(0);a.wake('Moni',0);
 const scene=a.update(8000);assert.equal(scene.phase,'snuggling');assert.ok(scene.blush>.5);assert.ok(scene.pose.curve>0);assert.ok(scene.hearts>0);
 assert.equal(a.update(13000).phase,'happy');
});
test('snuggle stays bounded and continuous with distinct eye and mouth follow-through',()=>{
 const {snuggleFrame}=require('../preview/affection.js');let previous=snuggleFrame(0);
 for(let t=0;t<16000;t+=16){const s=snuggleFrame(t);
  assert.ok(s.amount>=0&&s.amount<=1);assert.ok(Math.abs(s.x)<=5.1);assert.ok(Math.abs(s.y)<=3.55);assert.ok(Math.abs(s.tilt)<=.112);
  assert.ok(Math.abs(s.x-previous.x)<.12);assert.ok(Math.abs(s.tilt-previous.tilt)<.005);previous=s;
 }
 const s=snuggleFrame(8500);assert.notEqual(s.eyeX,s.mouthX);assert.notEqual(s.eyeY,s.mouthY);
});
test('snuggle respects reduced motion and resets on ordinary activity',()=>{
 const {snuggleFrame}=require('../preview/affection.js');
 for(const t of [6000,8000,11000])assert.deepEqual(snuggleFrame(t,false),snuggleFrame(0));
 const a=new Affection();a.previewIgnored(0);a.wake('Hi Moni',0);a.update(8000);a.activity(8100);assert.equal(a.update(8101),null);
});
test('snuggle transform is local to face drawing and restores raster context',()=>{
 const {snuggleFrame,applySnuggleTransform}=require('../preview/affection.js');
 const canvas=createCanvas(128,128),ctx=canvas.getContext('2d');ctx.save();applySnuggleTransform(ctx,snuggleFrame(8500));
 assert.notEqual(ctx.getTransform().b,0);ctx.fillStyle='#def4df';ctx.fillRect(30,40,20,20);ctx.restore();
 assert.equal(ctx.getTransform().a,1);assert.equal(ctx.getTransform().b,0);assert.equal(ctx.globalAlpha,1);
});
