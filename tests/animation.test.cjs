const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const FaceAnimation=require('../preview/animation.js');
const html=fs.readFileSync('preview/index.html','utf8');
const moods=vm.runInNewContext(html.match(/const moods=(\[[\s\S]*?\]);/)[1]);
function create(){let seed=42;return new FaceAnimation(moods,{random:()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}});}
test('all eight expressions settle to exact target geometry',()=>{
 for(let i=0;i<moods.length;i++){const a=create();a.automatic=false;a.select(i,1000);a.update(1650);
 for(const key of ['h','w','slope','arch','curve','mw','mh','r','g','b'])assert.ok(Math.abs(a.current[key]-moods[i][key])<1e-9);}
});
test('interrupted expression morph starts from current pose without snapping',()=>{
 const a=create();a.automatic=false;a.select(1,1000);const before={...a.update(1250).current};a.select(2,1250);
 assert.deepEqual(a.update(1250).current,before);
});
test('two idle minutes continue blinking and looking with expression cycling off',()=>{
 const a=create();a.automatic=false;let closed=false,open=false;
 for(let t=0;t<120000;t+=16){const s=a.update(t);assert.ok(s.openness>=0&&s.openness<=1);assert.ok(Number.isFinite(s.gx));if(t>60000&&s.openness<.15)closed=true;if(t>60000&&s.openness===1)open=true;}
 assert.ok(a.blinks>15);assert.ok(a.looks>20);assert.ok(closed&&open);assert.equal(a.selected,0);
});
test('idle actions wait for expression morph; active blink finishes safely',()=>{
 const a=create();a.nextBlink=100;a.nextLook=100;a.select(1,0);a.update(100);
 assert.equal(a.blinks,0);assert.equal(a.looks,0);a.update(700);assert.equal(a.blinks,1);
 a.select(2,720);assert.ok(a.update(750).openness<1);assert.equal(a.update(960).openness,1);
});
test('motion disabled stops ambient animation but expression selection still works',()=>{
 const a=create();a.setMotion(false,0);a.automatic=false;a.select(5,100);
 for(let t=100;t<30000;t+=16){const s=a.update(t);assert.equal(s.openness,1);assert.equal(s.breath,0);}
 assert.equal(a.blinks,0);assert.equal(a.looks,0);assert.equal(a.current.slope,moods[5].slope);
});
test('automatic cycling continues with no input and long frame gaps are safe',()=>{
 const a=create();a.update(6001);assert.equal(a.selected,1);const s=a.update(3600000);
 assert.ok(Number.isFinite(s.gx));assert.ok(s.openness>=0&&s.openness<=1);
});
test('animation paths use cooperative scheduling, not delay or interval loops',()=>{
 const sketch=fs.readFileSync('wokwi/animated-face/sketch.ino','utf8');
 assert.doesNotMatch(sketch,/\bdelay(?:Microseconds)?\s*\(/);
 assert.match(sketch,/const uint32_t now = millis\(\)/);
 assert.ok(sketch.indexOf('updateButton(now)')<sketch.indexOf('if (now - lastFrame < FRAME_MS) return;'));
 assert.match(html,/requestAnimationFrame\(frame\)/);
 assert.doesNotMatch(html,/\bsetInterval\s*\(/);
});
test('expression pace stays at 650 ms with staggered mouth follow-through',()=>{
 const a=create();a.automatic=false;a.select(3,1000);
 const early={...a.update(1050).current};
 assert.equal(early.mh,moods[0].mh); // Mouth waits 70 ms, eyes lead.
 assert.notEqual(early.h,moods[0].h);
 a.update(1280);assert.notEqual(a.current.h,moods[3].h); // Not the old fast 280 ms pace.
 a.update(1650);
 assert.equal(a.current.h,moods[3].h);assert.equal(a.current.mh,moods[3].mh);
});
test('gallery suspension preserves face pose, gaze, and blink progress over a long pause',()=>{
 const a=create();a.automatic=false;a.select(2,1000);a.update(1300);
 a.blinkStart=1280;a.nextBlink=5000;a.gx=2.3;a.gy=-.8;
 const snapshot=a.snapshot(1300),before={...a.current};
 a.select(4,1500);a.update(9000); // A temporary photo-view face must not replace home history.
 a.resume(snapshot,20000);
 assert.deepEqual(a.current,before);assert.equal(a.selected,2);assert.equal(a.gx,2.3);assert.equal(a.gy,-.8);
 assert.equal(20000-a.blinkStart,1300-1280);
 assert.equal(a.nextBlink-20000,5000-1300);
 assert.equal(20000-a.transition,300); // Morph resumes at the same point, not reset or finished.
});
