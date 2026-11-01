const test=require('node:test'),assert=require('node:assert/strict');
const {memoryScene,drawMemoryCloud,memorySpring,faceFollowThrough,memoryThoughtDots}=require('../preview/memory-scene.js');
test('ordered memory choreography: settle, single blink, glance, dots, cloud, photo, fullscreen',()=>{
 const start=memoryScene(0);assert.equal(start.settle,0);assert.equal(start.openness,1);
 assert.equal(memoryScene(540).openness,0);assert.equal(memoryScene(740).openness,1);
 assert.equal(memoryScene(740).look,0);assert.equal(memoryScene(1500).look,1);
 assert.ok(memoryScene(1700).dots>0);assert.equal(memoryScene(1700).cloud,0);
 assert.equal(memoryScene(2850).photo,0);assert.equal(memoryScene(3000).cloud,1);
 assert.equal(memoryScene(4750).photo,1);assert.equal(memoryScene(4750).expand,0);
 assert.ok(memoryScene(6500).expand>0&&memoryScene(6500).expand<1);
 assert.equal(memoryScene(8000).expand,1);
 let closedIntervals=0,closed=false;
 for(let t=0;t<=10000;t+=10){const c=memoryScene(t).openness<.99;if(c&&!closed)closedIntervals++;closed=c;}
 assert.equal(closedIntervals,1);
});
test('reentry restarts; reduced motion and late frames display a complete memory',()=>{
 const end={settle:1,look:1,openness:1,dots:1,cloud:1,photo:1,expand:1};
 assert.deepEqual(memoryScene(999999),end);assert.deepEqual(memoryScene(0,false),end);
 assert.equal(memoryScene(0).photo,0);
 for(let t=-100;t<10000;t+=17)for(const v of Object.values(memoryScene(t)))assert.ok(v>=0&&v<=1);
});
test('all reveal phases balance context saves; missing image is safe',()=>{
 let depth=0,drawn=0;
 const ctx=new Proxy({save(){depth++;},restore(){depth--;assert.ok(depth>=0);},drawImage(){drawn++;}},{get:(o,k)=>k in o?o[k]:()=>{}});
 for(const t of [0,1500,2500,4000,6500,8000]){
 drawMemoryCloud(ctx,null,memoryScene(t));assert.equal(depth,0);
 drawMemoryCloud(ctx,{width:300,height:400},memoryScene(t));assert.equal(depth,0);
 }
 assert.equal(drawn,3);
});

test('spring has a controlled overshoot and settles exactly',()=>{
 assert.equal(memorySpring(0),0);assert.equal(memorySpring(1),1);
 assert.ok(memorySpring(.7)>1);
 for(let t=0;t<1;t+=.01)assert.ok(memorySpring(t)>=0&&memorySpring(t)<1.09);
});

test('eyes and mouth have distinct bounded follow-through on one clock',()=>{
 const rest={eyeY:0,eyeScaleY:1,mouthY:0,mouthScaleY:1};
 assert.deepEqual(faceFollowThrough(0),rest);
 assert.deepEqual(faceFollowThrough(1500),rest);
 assert.deepEqual(faceFollowThrough(300,false),rest);
 const moving=faceFollowThrough(250);
 assert.notEqual(moving.eyeScaleY,moving.mouthScaleY);
 for(let t=0;t<1500;t+=10){const p=faceFollowThrough(t);assert.ok(Math.abs(p.eyeY)<=1.8);assert.ok(Math.abs(p.mouthY)<=2.2);}
});

test('thought dots stay outside both eyes with a visible gap beside the face',()=>{
 const dots=memoryThoughtDots();
 // Right eye outer edge in the settled, up-right-looking face.
 const rightEdge=3.92+.72*(89+6+26/2);
 for(const [,x,,radius] of dots)assert.ok(x-radius>rightEdge+5);
 for(let i=1;i<dots.length;i++){
  assert.ok(dots[i][1]>dots[i-1][1]);
  assert.ok(dots[i][2]<dots[i-1][2]);
 }
});
