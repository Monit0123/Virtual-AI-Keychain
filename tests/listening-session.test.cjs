const test=require('node:test'),assert=require('node:assert/strict');
const ListeningSession=require('../preview/listening-session.js');
function fixture(){let now=0,ready=true;const statuses=[],starts=[];
 const mic={active:false,stop(){this.active=false;},start(options){this.active=true;starts.push(options);return true;}};
 const loop=new ListeningSession(mic,{now:()=>now,canListen:()=>ready,onStatus:s=>statuses.push(s)});
 return {mic,loop,statuses,starts,time:t=>now=t,ready:r=>ready=r};
}
test('enable once, recognize/respond repeatedly, and automatically listen after cooldown',()=>{
 const f=fixture();f.loop.start();assert.equal(f.starts.length,1);
 for(let n=1;n<=10;n++){
  f.loop.heard();f.loop.pause();f.ready(false);f.time(n*3000);f.loop.tick();assert.equal(f.mic.active,false);
  f.ready(true);f.time(n*3000+899);f.loop.tick();assert.equal(f.mic.active,false);
  f.time(n*3000+900);f.loop.tick();assert.equal(f.mic.active,true);
 }
 assert.equal(f.starts.length,11);assert.equal(f.loop.enabled,true);
});
test('stop during playback cancels listening intent and never reopens the mic',()=>{
 const f=fixture();f.loop.start();f.ready(false);f.loop.tick();f.loop.stop();f.ready(true);f.time(90000);f.loop.tick();assert.equal(f.starts.length,1);assert.equal(f.loop.enabled,false);
});
test('natural session end automatically reconnects using the original consent',()=>{
 const f=fixture();f.loop.start({allowOnline:true});f.mic.active=false;f.loop.ended();f.time(899);f.loop.tick();assert.equal(f.starts.length,1);f.time(900);f.loop.tick();assert.equal(f.starts.length,2);assert.equal(f.starts[1].allowOnline,true);
});
test('permission/provider failures disable retries; no-speech allows a controlled retry',()=>{
 for(const code of ['not-allowed','service-not-allowed','network','native authorization denied']){
  const f=fixture();f.loop.start();f.mic.active=false;f.loop.failed(code);f.time(9999);f.loop.tick();assert.equal(f.loop.enabled,false);assert.equal(f.starts.length,1);
 }
 const f=fixture();f.loop.start();f.mic.active=false;f.loop.failed('no-speech');f.time(900);f.loop.tick();assert.equal(f.starts.length,2);
});
test('repeated short recognition sessions stop rather than retry forever',()=>{
 const f=fixture();f.loop.start();for(let n=0;n<5;n++){f.time(n*1000);f.mic.active=false;f.loop.ended();f.time(n*1000+900);f.loop.tick();}
 assert.equal(f.loop.enabled,false);assert.match(f.statuses.at(-1),/repeatedly ended/);
});
test('hidden/busy state pauses capture, then resumes without requiring another click',()=>{
 const f=fixture();f.ready(false);f.loop.start();assert.equal(f.starts.length,0);f.time(1000);f.ready(true);f.loop.tick();assert.equal(f.starts.length,1);f.ready(false);f.loop.tick();assert.equal(f.mic.active,false);f.ready(true);f.time(2000);f.loop.tick();assert.equal(f.starts.length,2);
});
