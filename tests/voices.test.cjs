const test=require('node:test'),assert=require('node:assert/strict');
const {VOICE_MESSAGES,MockVoiceLibrary,MockVoicePlayer}=require('../preview/voices.js');
const {Companion,STATES}=require('../preview/companion.js');
test('catalogue has unique IDs, associated local WAV paths and configurable mock durations',()=>{
 assert.equal(new Set(VOICE_MESSAGES.map(m=>m.id)).size,3);
 for(const m of VOICE_MESSAGES){assert.match(m.file,/^voice\/\w+\.wav$/);assert.ok(m.durationMs>0);}
 const p=new MockVoicePlayer();assert.equal(p.start('voice_002',7,100,2000).ok,true);
 assert.equal(p.update(2099),null);assert.deepEqual(p.update(2100),{event:'PLAYBACK_FINISHED',payload:{owner:7}});assert.equal(p.update(2200),null);
 assert.equal(p.start('voice_002',8,0,NaN).ok,false);assert.equal(p.session,null);
});
test('random selection avoids immediate repeats and unavailable files',()=>{
 const library=new MockVoiceLibrary({random:()=>.2});let previous;
 for(let i=0;i<100;i++){const m=library.randomMessage();assert.notEqual(m.id,previous);previous=m.id;}
 library.setHealth('voice_001','missing');library.setHealth('voice_002','corrupt');
 assert.equal(library.randomMessage().id,'voice_003');
 library.setHealth('voice_003','missing');assert.equal(library.randomMessage(),null);
});
test('specific-message selection works offline and automatically returns idle on completion',()=>{
 for(const m of VOICE_MESSAGES){
  const c=new Companion();c.dispatch('ONLINE',0,false);c.dispatch('VOICE_MESSAGE_SELECTED',1,m.id);
  assert.equal(c.state,STATES.PLAYING_VOICE);assert.equal(c.voiceMessage.file,m.file);assert.equal(c.resources.audio,true);
  c.tick(m.durationMs);assert.equal(c.state,STATES.PLAYING_VOICE);c.tick(m.durationMs+1);assert.equal(c.state,STATES.IDLE);assert.equal(c.audio.session,null);assert.equal(c.resources.audio,false);
 }
});
test('cancel stops the player and stale audio completions/failures cannot replace home',()=>{
 const c=new Companion();c.dispatch('VOICE',0,'voice_002');const owner=c.requestId;
 c.dispatch('CANCEL_REQUESTED',100);assert.equal(c.audio.session,null);assert.equal(c.state,STATES.IDLE);
 c.tick(10000);assert.equal(c.state,STATES.IDLE);
 assert.equal(c.dispatch('PLAYBACK_FINISHED',10001,{owner}),false);
 assert.equal(c.dispatch('AUDIO_FAILURE',10002,{owner,message:'late error'}),false);
});
test('unknown, missing and corrupt recordings fail recoverably without pretending to play',()=>{
 for(const [id,health,category] of [['unknown',null,'AUDIO_MISSING'],['voice_001','missing','AUDIO_MISSING'],['voice_002','corrupt','AUDIO_CORRUPT']]){
  const c=new Companion();if(health)c.dispatch('VOICE_FILE_STATUS_CHANGED',0,{id,status:health});
  c.dispatch('VOICE_MESSAGE_SELECTED',1,id);assert.equal(c.state,STATES.ERROR);assert.equal(c.errorInfo.category,category);assert.equal(c.audio.session,null);assert.equal(c.resources.audio,false);
  c.dispatch('DISMISS_ERROR',2);assert.equal(c.state,STATES.IDLE);
 }
});
test('mid-play corruption stops playback, and safe retry revalidates the restored mock file',()=>{
 const c=new Companion();c.dispatch('VOICE',0,'voice_001');
 c.dispatch('VOICE_FILE_STATUS_CHANGED',100,{id:'voice_001',status:'corrupt'});c.tick(101);
 assert.equal(c.state,STATES.ERROR);assert.equal(c.audio.session,null);
 c.dispatch('VOICE_FILE_STATUS_CHANGED',200,{id:'voice_001',status:'ready'});
 c.dispatch('RETRY_REQUESTED',201);assert.equal(c.state,STATES.PLAYING_VOICE);assert.equal(c.audio.session.started,201);
 c.tick(201+c.voiceMessage.durationMs);assert.equal(c.state,STATES.IDLE);
});
test('all missing files and invalid durations are recoverable; busy selections are rejected',()=>{
 const c=new Companion();for(const m of VOICE_MESSAGES)c.dispatch('VOICE_FILE_STATUS_CHANGED',0,{id:m.id,status:'missing'});
 c.dispatch('VOICE_RANDOM_REQUESTED',1);assert.equal(c.state,STATES.ERROR);c.dispatch('HOME',2);
 c.dispatch('VOICE_FILE_STATUS_CHANGED',3,{id:'voice_002',status:'ready'});
 c.dispatch('VOICE_MESSAGE_SELECTED',4,{id:'voice_002',durationMs:-1});assert.equal(c.state,STATES.ERROR);c.dispatch('HOME',5);
 c.dispatch('VOICE_MESSAGE_SELECTED',6,'voice_002');assert.equal(c.dispatch('VOICE_RANDOM_REQUESTED',7),false);assert.equal(c.voiceMessage.id,'voice_002');
});
