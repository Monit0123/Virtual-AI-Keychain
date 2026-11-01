const test=require('node:test'),assert=require('node:assert/strict');
const BrowserAudioPlayer=require('../preview/audio-player.js');
const {MockVoiceLibrary}=require('../preview/voices.js');
const {Companion,STATES}=require('../preview/companion.js');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(options={}){
 const sources=[];
 const context={state:'suspended',currentTime:0,destination:{},resume:async function(){this.state='running';},decodeAudioData:async()=>({duration:12}),createBufferSource(){
  const source={connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;
 }};
 const library=new MockVoiceLibrary();let fetches=0;
 const player=new BrowserAudioPlayer(library,{contextFactory:()=>context,fetchFile:async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(32)};},...options});
 return {player,context,library,sources,get fetches(){return fetches;}};
}
test('real adapter decodes, starts an output source, reports actual progress, and emits ended once',async()=>{
 const x=setup();await x.player.unlock();assert.equal(x.player.start('voice_002',7,0).ok,true);await flush();
 assert.equal(x.sources[0].started,true);assert.equal(x.player.session.message.durationMs,12000);
 x.context.currentTime=3;assert.equal(x.player.progress().elapsedMs,3000);
 x.sources[0].onended();assert.deepEqual(x.player.update(12000),{event:'PLAYBACK_FINISHED',payload:{owner:7}});assert.equal(x.player.session,null);assert.equal(x.player.update(12001),null);assert.equal(x.sources[0].disconnected,true);
});
test('state manager waits for actual audio end, not the old mock timer, and Home stops output',async()=>{
 const x=setup();await x.player.unlock();const c=new Companion(0,{voiceLibrary:x.library,audioPlayer:x.player});c.online=false;
 c.dispatch('VOICE',0,'voice_001');await flush();c.tick(5001);assert.equal(c.state,STATES.PLAYING_VOICE);assert.equal(c.voiceMessage.durationMs,12000);
 c.dispatch('HOME',6000);assert.equal(x.sources[0].stopped,true);assert.equal(x.sources[0].onended,null);assert.equal(c.state,STATES.IDLE);
 c.dispatch('VOICE',7000,'voice_002');await flush();x.sources[1].onended();c.tick(19000);assert.equal(c.state,STATES.IDLE);
});
test('decoded files play without additional fetches and cancellation before loading never starts sound',async()=>{
 const x=setup();await x.player.unlock();await x.player.prepare('voice_001');const count=x.fetches;
 x.player.start('voice_001',1,0);await flush();x.player.stop();x.player.start('voice_001',2,1);await flush();assert.equal(x.fetches,count);x.player.stop();
 let resolve;
 const y=setup({fetchFile:()=>new Promise(r=>{resolve=r;})});await y.player.unlock();y.player.start('voice_002',3,0);await flush();y.player.stop();
 resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(32)});await flush();assert.equal(y.sources.length,0);assert.equal(y.player.update(5000),null);
});
test('missing files, decode failures, blocked audio and loading timeout are owned recoverable errors',async()=>{
 for(const mode of ['missing','decode','locked','timeout']){
  const x=setup({fetchFile:mode==='timeout'?()=>new Promise(()=>{}):mode==='missing'?async()=>({ok:false,status:404}):async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(32)})});
  if(mode!=='locked')await x.player.unlock();
  if(mode==='decode')x.context.decodeAudioData=async()=>{throw new Error('bad audio');};
  const start=x.player.start('voice_002',42,0);
  if(mode==='locked'){assert.equal(start.category,'AUDIO_LOCKED');continue;}
  await flush();const result=x.player.update(mode==='timeout'?21000:1);
  assert.equal(result.event,'AUDIO_FAILURE');assert.equal(result.payload.owner,42);assert.equal(x.player.session,null);
 }
});
test('local replacements decode atomically; invalid replacements preserve working buffers',async()=>{
 const x=setup();await x.player.unlock();await x.player.prepare('voice_002');const original=x.player.buffers.get('voice_002');
 x.context.decodeAudioData=async()=>{throw new Error('corrupt');};await assert.rejects(x.player.replace('voice_002',new ArrayBuffer(10)));assert.equal(x.player.buffers.get('voice_002'),original);
 x.context.decodeAudioData=async()=>({duration:21});assert.equal(await x.player.replace('voice_002',new ArrayBuffer(10)),21);assert.ok(x.player.personalIds.has('voice_002'));
 x.player.start('voice_002',9,0);await flush();assert.equal(x.player.progress().durationMs,21000);
});
test('bundled generated WAV files contain real non-silent PCM audio',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const id of ['voice_001','voice_002','voice_003']){
  const bytes=fs.readFileSync(path.join(__dirname,'../preview/voice',id+'.wav'));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
  let data,rate,channels,bits;
  for(let i=12;i+8<=bytes.length;){const size=bytes.readUInt32LE(i+4),tag=bytes.toString('ascii',i,i+4);
   if(tag==='fmt '){channels=bytes.readUInt16LE(i+10);rate=bytes.readUInt32LE(i+12);bits=bytes.readUInt16LE(i+22);}
   if(tag==='data')data=bytes.subarray(i+8,i+8+size);i+=8+size+(size%2);
  }
  assert.ok(data?.length>10000);assert.equal(bits,16);const duration=data.length/(rate*channels*2);assert.ok(duration>10&&duration<25);
  let sum=0;for(let i=0;i<data.length;i+=2)sum+=Math.abs(data.readInt16LE(i));assert.ok(sum>1000000);
 }
});
test('recorded greeting has separate ownership while sharing the real decoded audio cache',async()=>{
 const x=setup();await x.player.unlock();await x.player.prepare('voice_004');const fetches=x.fetches;
 const greeting=new BrowserAudioPlayer.GreetingAudio(x.player);
 assert.equal(greeting.start(0).ok,true);await flush();assert.equal(x.sources[0].started,true);
 assert.equal(greeting.player.session.message.id,'voice_004');assert.equal(x.player.session,null);assert.equal(x.fetches,fetches);
 greeting.stop();assert.equal(x.sources[0].stopped,true);assert.equal(greeting.update(10000),null);
});
test('greeting source ends once without changing main playback ownership; clip exists as actual PCM',async()=>{
 const x=setup();await x.player.unlock();const greeting=new BrowserAudioPlayer.GreetingAudio(x.player);
 greeting.start(0);await flush();const owner=greeting.player.session.owner;
 x.sources[0].onended();assert.deepEqual(greeting.update(12000),{event:'PLAYBACK_FINISHED',payload:{owner}});assert.equal(greeting.update(12001),null);
 const fs=require('node:fs'),path=require('node:path');
 const bytes=fs.readFileSync(path.join(__dirname,'../preview/voice/voice_004.wav'));
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');assert.ok(bytes.length>10000);
});
