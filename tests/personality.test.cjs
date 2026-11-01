const test=require('node:test'),assert=require('node:assert/strict');
const {Personality,MemoryCollection,VOICE_MOCKS}=require('../preview/personality.js');
const {Companion,STATES}=require('../preview/companion.js');
function rng(){let seed=73;return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
test('online with memories visits all seven reactions once per bag without immediate repeats',()=>{
 const p=new Personality(rng());let previous;
 for(let cycle=0;cycle<20;cycle++){
  const bag=[];for(let i=0;i<7;i++){const r=p.next({online:true,photos:3});assert.notEqual(r.id,previous);previous=r.id;bag.push(r.id);}
  assert.equal(new Set(bag).size,7);
 }
});
test('offline without photos offers only five valid local reactions',()=>{
 const p=new Personality(rng());const ids=new Set();
 for(let i=0;i<100;i++){const r=p.next();assert.notEqual(r.id,'photo');assert.notEqual(r.id,'ai');ids.add(r.id);}
 assert.equal(ids.size,5);
});
test('changing capabilities immediately removes unavailable actions',()=>{
 const p=new Personality(rng());p.next({online:true,photos:2});
 for(let i=0;i<20;i++)assert.ok(!['ai','photo'].includes(p.next({online:false,photos:0}).id));
 const online=new Set(Array.from({length:7},()=>p.next({online:true,photos:2}).id));assert.ok(online.has('ai'));assert.ok(online.has('photo'));
});
test('voice and status variants do not immediately repeat; voice entries are silent mocks',()=>{
 const p=new Personality(rng());let voice,status;const voices=new Set();
 for(let i=0;i<100;i++){
  const r=p.next();if(r.id==='voice'){assert.notEqual(r.payload.id,voice);voice=r.payload.id;voices.add(voice);assert.match(r.label,/voice message/);}
  if(r.id==='status'){assert.notEqual(r.label,status);status=r.label;}
 }
 assert.equal(voices.size,VOICE_MOCKS.length);
});
test('every personality plan goes through state-manager admission; AI never submits input',()=>{
 const p=new Personality(rng()),c=new Companion();
 c.dispatch('MEMORY_LOADED',0,{name:'local'});
 const expected={happy:STATES.EXPRESSING,playful:STATES.EXPRESSING,sleepy:STATES.EXPRESSING,status:STATES.EXPRESSING,photo:STATES.SHOWING_PHOTO,voice:STATES.PLAYING_VOICE,ai:STATES.LISTENING};
 for(let i=0;i<100;i++){
  c.dispatch('HOME_REQUESTED',i*100);
  const r=p.next({online:true,photos:1});assert.equal(c.dispatch(r.event,i*100+1,r.payload),true);assert.equal(c.state,expected[r.id]);
  if(r.id==='ai'){assert.equal(c.question,'');assert.equal(c.resources.ai,false);}
  if(r.id==='sleepy'){c.tick(i*100+1801);assert.equal(c.state,STATES.EXPRESSING);assert.equal(c.expression,4);}
 }
});
test('memory collection handles empty, single, multiple and unlimited count without repeat',()=>{
 const m=new MemoryCollection(rng());assert.equal(m.randomMemory(),null);
 m.add('one',{});assert.equal(m.randomMemory().name,'one');m.add('two',{});m.add('three',{});
 let previous=m.selected().name;
 for(let i=0;i<100;i++){const item=m.randomMemory();assert.notEqual(item.name,previous);previous=item.name;}
 for(let i=0;i<1000;i++)m.add('extra'+i,{});assert.equal(m.items.length,1003);assert.equal(m.add('another',{}),true);
});
test('idle is spontaneous but restricted to gentle expressions and pauses',()=>{
 const p=new Personality(rng());let previous;
 for(let i=0;i<100;i++){const r=p.idle();assert.ok([0,1,3,4].includes(r.expression));assert.notEqual(r.expression,previous);previous=r.expression;assert.ok(r.waitMs>=6500&&r.waitMs<=11000);assert.ok(r.durationMs<=2800);assert.equal(r.event,undefined);}
});
