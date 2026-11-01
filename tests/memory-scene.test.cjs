const test=require('node:test'),assert=require('node:assert/strict');
const {memoryScene,drawMemoryPhoto,memorySpring,faceFollowThrough}=require('../preview/memory-scene.js');
const {photoFrameRect}=require('../preview/living-face.js');
test('one photo frame grows in, holds the actual image, then expands slowly to full display',()=>{
 assert.deepEqual(memoryScene(0),{frame:0,expand:0});assert.deepEqual(memoryScene(900),{frame:1,expand:0});assert.deepEqual(memoryScene(4200),{frame:1,expand:0});
 assert.ok(memoryScene(6100).expand>0&&memoryScene(6100).expand<1);assert.deepEqual(memoryScene(8000),{frame:1,expand:1});
 assert.deepEqual(photoFrameRect(0),{x:53,y:101,w:22,h:16,r:1.5,inset:1.3});assert.deepEqual(photoFrameRect(1),{x:0,y:0,w:128,h:128,r:0,inset:0});
 let last=0;for(let t=0;t<9000;t+=17){const s=memoryScene(t);assert.ok(s.expand>=last);last=s.expand;for(const v of Object.values(s))assert.ok(v>=0&&v<=1);}
});
test('reentry resets and reduced motion or late frames show a completed memory',()=>{
 assert.deepEqual(memoryScene(999999),{frame:1,expand:1});assert.deepEqual(memoryScene(0,false),{frame:1,expand:1});assert.equal(memoryScene(0).frame,0);
});
test('frame rendering balances context ownership, including missing images',()=>{
 let depth=0,drawn=0;const ctx=new Proxy({save(){depth++;},restore(){depth--;assert.ok(depth>=0);},drawImage(){drawn++;}},{get:(o,k)=>k in o?o[k]:()=>{}});
 for(const t of [0,900,2500,4000,6500,8000]){drawMemoryPhoto(ctx,null,memoryScene(t));assert.equal(depth,0);drawMemoryPhoto(ctx,{width:300,height:400},memoryScene(t));assert.equal(depth,0);}assert.equal(drawn,5);
});
test('spring has a controlled overshoot and settles exactly',()=>{
 assert.equal(memorySpring(0),0);assert.equal(memorySpring(1),1);assert.ok(memorySpring(.7)>1);for(let t=0;t<1;t+=.01)assert.ok(memorySpring(t)>=0&&memorySpring(t)<1.09);
});
test('eyes and mouth retain distinct bounded follow-through on one clock',()=>{
 const rest={eyeY:0,eyeScaleY:1,mouthY:0,mouthScaleY:1};assert.deepEqual(faceFollowThrough(0),rest);assert.deepEqual(faceFollowThrough(1500),rest);assert.deepEqual(faceFollowThrough(300,false),rest);const f=faceFollowThrough(250);assert.notEqual(f.eyeScaleY,f.mouthScaleY);
 for(let t=0;t<1500;t+=10){const p=faceFollowThrough(t);assert.ok(Math.abs(p.eyeY)<=1.8);assert.ok(Math.abs(p.mouthY)<=2.2);}
});
test('photo expansion grows continuously within the display without overshoot or corner jumps',()=>{
 let previous=photoFrameRect(0);
 for(let i=1;i<=1000;i++){const g=photoFrameRect(i/1000);assert.ok(g.x<=previous.x&&g.y<=previous.y&&g.w>=previous.w&&g.h>=previous.h&&g.r<=previous.r);assert.ok(g.x>=0&&g.y>=0&&g.x+g.w<=128.000001&&g.y+g.h<=128.000001);previous=g;}
});
