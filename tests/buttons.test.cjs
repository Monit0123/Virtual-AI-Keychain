const test=require('node:test'),assert=require('node:assert/strict');
const ButtonControls=require('../preview/buttons.js');
function setup(){const events=[],b=new ButtonControls(e=>events.push(e));return {b,events};}
function press(b,id,t){b.setPressed(id,true);b.update(t);b.update(t+30);}
function release(b,id,t){b.setPressed(id,false);b.update(t);b.update(t+30);}
test('short releases fire once; long presses fire once and suppress release',()=>{
 for(const id of ['A','B']){
 const {b,events}=setup();press(b,id,0);assert.deepEqual(events,[]);release(b,id,100);assert.deepEqual(events,[id+'_SHORT']);
 press(b,id,200);b.update(930);b.update(2000);release(b,id,2100);assert.deepEqual(events,[id+'_SHORT',id+'_LONG']);
 }
});
test('bounce shorter than 30ms never generates a press',()=>{
 const {b,events}=setup();b.setPressed('A',true);b.update(0);b.setPressed('A',false);b.update(10);b.update(1000);assert.deepEqual(events,[]);
 press(b,'A',1100);b.setPressed('A',false);b.update(1200);b.setPressed('A',true);b.update(1210);b.update(1250);release(b,'A',1300);assert.deepEqual(events,['A_SHORT']);
});
test('simultaneous buttons override shorts and longs until both released',()=>{
 const {b,events}=setup();b.setPressed('A',true);b.setPressed('B',true);b.update(0);b.update(30);b.update(1000);release(b,'A',1100);b.update(2000);release(b,'B',2100);assert.deepEqual(events,['BOTH_HOME']);
 press(b,'A',2200);release(b,'A',2300);assert.deepEqual(events,['BOTH_HOME','A_SHORT']);
});
test('staggered chord and second button after long press behave predictably',()=>{
 const {b,events}=setup();press(b,'A',0);press(b,'B',100);b.update(1000);release(b,'A',1100);release(b,'B',1200);assert.deepEqual(events,['BOTH_HOME']);
 press(b,'A',1500);b.update(2230);press(b,'B',2300);assert.deepEqual(events,['BOTH_HOME','A_LONG','BOTH_HOME']);
});
test('hold feedback is bounded; cancellation discards unfinished press',()=>{
 const {b,events}=setup();press(b,'A',0);const f=b.feedback('A',380);assert.equal(f.pressed,true);assert.equal(f.progress,.5);b.cancel();b.update(5000);assert.deepEqual(events,[]);assert.equal(b.feedback('A',5000).pressed,false);
});
