const test=require('node:test'),assert=require('node:assert/strict');
const index=require('../preview/voice/index.js');
const {validateVoiceIndex,MockVoiceLibrary}=require('../preview/voices.js');
const BrowserAudioPlayer=require('../preview/audio-player.js');
const clone=()=>JSON.parse(JSON.stringify(index));
test('index defines measured durations, consistent IDs/paths, five categories and the greeting role',()=>{
 assert.equal(validateVoiceIndex(index),index);
 assert.deepEqual(index.recordings.map(m=>m.id),['voice_001','voice_002','voice_003','voice_004']);
 assert.equal(index.categories.length,5);assert.equal(new MockVoiceLibrary().greetingId(),'voice_004');
 for(const m of index.recordings){assert.ok(m.durationMs>0);assert.equal(m.file,'voice/'+m.id+'.wav');}
});
test('adding a recording/category is data-only and automatically included in selection/preload',async()=>{
 const data=clone();data.recordings.push({id:'voice_005',file:'voice/voice_005.wav',title:'Good night',durationMs:8000,category:'good_night',role:'personal',generated:false});
 const library=new MockVoiceLibrary({index:data,random:()=>0});assert.equal(library.list('good_night')[0].id,'voice_005');assert.equal(library.randomMessage('good_night').id,'voice_005');
 const files=[],context={state:'running',resume:async()=>{},decodeAudioData:async()=>({duration:8})};
 const player=new BrowserAudioPlayer(library,{contextFactory:()=>context,fetchFile:async file=>{files.push(file);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(32)};}});
 await player.unlock();const results=await player.preload();assert.equal(results.length,5);assert.ok(files.includes('voice/voice_005.wav'));assert.ok(results.every(m=>m.ok));
});
test('legacy aliases remain accepted but resolve to canonical IDs',()=>{
 const library=new MockVoiceLibrary();
 for(const [alias,id] of Object.entries(index.aliases)){assert.equal(library.resolve(alias).message.id,id);library.setHealth(alias,'missing');assert.equal(library.resolve(id).ok,false);library.setHealth(id,'ready');}
});
test('malformed, duplicate, unsafe and inconsistent index entries are rejected',()=>{
 const edits=[d=>d.recordings.push({...d.recordings[0]}),d=>d.recordings[0].id='comfort',d=>d.recordings[0].file='../private.wav',d=>d.recordings[0].durationMs=NaN,d=>d.recordings[0].durationMs=0,d=>d.recordings[0].category='unknown',d=>d.recordings[0].role='unknown',d=>d.recordings[0].role='greeting',d=>d.aliases.bad='voice_999',d=>d.categories.push(d.categories[0])];
 for(const edit of edits){const data=clone();edit(data);assert.throws(()=>validateVoiceIndex(data));}
 const optional=clone();delete optional.recordings[0].category;assert.doesNotThrow(()=>validateVoiceIndex(optional));
});
test('greeting is selected by role instead of a hardcoded ID, and excluded from random messages',()=>{
 const data=clone();data.recordings[3].role='personal';data.recordings.push({id:'voice_010',file:'voice/voice_010.wav',title:'New greeting',durationMs:1200,role:'greeting'});
 const library=new MockVoiceLibrary({index:data});assert.equal(library.greetingId(),'voice_010');
 assert.ok(!library.list().some(m=>m.id==='voice_010'));
 for(let i=0;i<100;i++)assert.notEqual(library.randomMessage().id,'voice_010');
});
