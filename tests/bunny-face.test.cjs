const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas');
const {drawBunnyEye,drawBunnyAccents}=require('../preview/bunny-face.js');
const {Companion,STATES}=require('../preview/companion.js');
const {createStateFaces,stateFaceIndex}=require('../preview/state-face.js');
const moods=vm.runInNewContext(fs.readFileSync('preview/index.html','utf8').match(/const moods=(\[[\s\S]*?\]);/)[1]);
function render(mood,open=1,options={}){const c=createCanvas(128,128),p=c.getContext('2d');drawBunnyEye(p,39,48,true,open,mood);drawBunnyEye(p,89,48,false,open,mood);drawBunnyAccents(p,{motion:false,love:mood.love,spark:mood.spark,...options});return c;}
test('eight reference-inspired expressions render distinct, nonempty vector faces',()=>{
 assert.equal(moods.length,8);const hashes=new Set();for(const mood of moods){const c=render(mood),data=c.getContext('2d').getImageData(0,0,128,128).data;assert.ok(data.filter((v,i)=>i%4===3&&v>100).length>80);hashes.add(c.toBuffer('image/png').toString('base64'));}assert.equal(hashes.size,8);
});
test('bunny eye details collapse inside blinks and every renderer restores context state',()=>{
 const open=render(moods[0]),closed=render(moods[0],0);
 const pixels=c=>c.getContext('2d').getImageData(15,20,98,48).data.filter((v,i)=>i%4===3&&v>100).length;
 assert.ok(pixels(closed)<pixels(open)*.3);
 const p=createCanvas(128,128).getContext('2d');p.globalAlpha=.7;p.lineWidth=7;const matrix=p.getTransform();drawBunnyEye(p,39,48,true,.5,moods[0]);drawBunnyAccents(p,{speaking:true,listening:true});assert.equal(p.lineWidth,7);assert.ok(Math.abs(p.globalAlpha-.7)<.01);assert.equal(p.shadowBlur,0);assert.equal(p.getTransform().a,matrix.a);
});
test('accent animation is static in reduced motion and changes with time otherwise',()=>{
 assert.deepEqual(render(moods[6],1,{now:0}).toBuffer('image/png'),render(moods[6],1,{now:999}).toBuffer('image/png'));
 assert.notDeepEqual(render(moods[6],1,{now:0,motion:true}).toBuffer('image/png'),render(moods[6],1,{now:999,motion:true}).toBuffer('image/png'));
});
test('excited and love are expressions, not new FSM states, and application poses stay aligned',()=>{
 for(const index of [6,7]){const c=new Companion();assert.equal(c.dispatch('EXPRESSION_REQUESTED',0,index),true);assert.equal(c.state,STATES.EXPRESSING);assert.equal(c.expression,index);c.tick(5000);assert.equal(c.state,STATES.IDLE);}
 const faces=createStateFaces(moods);for(const [state,name] of [['LISTENING','Listening'],['WAITING_FOR_AI','Thinking'],['PLAYING_VOICE','Speaking'],['SHOWING_PHOTO','Remembering'],['ERROR','Concerned']])assert.equal(faces[stateFaceIndex(state)].name,name);
 assert.equal(Object.values(STATES).length,8);
});
