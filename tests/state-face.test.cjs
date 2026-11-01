const test=require('node:test'),assert=require('node:assert/strict');
const {STATES}=require('../preview/companion.js');
const {stateFaceIndex,stateFaceMotion,createStateFaces}=require('../preview/state-face.js');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('preview/index.html','utf8');
const base=vm.runInNewContext(html.match(/const moods=(\[[\s\S]*?\]);/)[1]);
test('every application state maps to a complete facial pose',()=>{
 const poses=createStateFaces(base);
 for(const state of Object.values(STATES)){
 const pose=poses[stateFaceIndex(state,2)];assert.ok(pose);
 for(const key of ['h','w','slope','arch','curve','mw','mh','r','g','b'])assert.ok(Number.isFinite(pose[key]));
 }
 assert.equal(stateFaceIndex('EXPRESSING',4),4);
 assert.notEqual(stateFaceIndex('LISTENING'),stateFaceIndex('WAITING_FOR_AI'));
});
test('speaking mouth animates; reduced motion suppresses all state gestures',()=>{
 for(const state of ['PLAYING_VOICE','SHOWING_RESPONSE'])assert.ok(stateFaceMotion(state,100).mouthOpen>0);
 for(const state of Object.values(STATES))assert.deepEqual(stateFaceMotion(state,200,false),{x:0,y:0,mouthOpen:0});
 assert.ok(stateFaceMotion('WAITING_FOR_AI',100).y<0);
});
test('device renderer has no text or waveform screen replacements',()=>{
 assert.doesNotMatch(html,/screenText\(|pen\.fillText\(/);
 assert.match(html,/stateFaceMotion\(companion.state/);
});
