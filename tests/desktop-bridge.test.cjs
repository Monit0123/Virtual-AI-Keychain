const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function host(){
 const messages=[],context=vm.createContext({console,Uint8Array,ArrayBuffer,btoa,atob,isSecureContext:false,webkit:{messageHandlers:{keychain:{postMessage:m=>messages.push(m)}}}});
 for(const file of ['desktop-bridge.js','wake-mic.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../preview',file),'utf8'),context);
 return {context,messages,run:source=>vm.runInContext(source,context),reply:(m,value)=>context.KeychainDesktop.receive({requestId:m.requestId,value})};
}
test('ordinary browser does not install native bridge or replace recognition',()=>{
 const Existing=function(){};const c=vm.createContext({SpeechRecognition:Existing});vm.runInContext(fs.readFileSync(path.join(__dirname,'../preview/desktop-bridge.js'),'utf8'),c);
 assert.equal(c.SpeechRecognition,Existing);assert.equal(c.KeychainDesktop,undefined);
});
test('native speech bypasses browser origin policy and stops before wake callback',()=>{
 const h=host();h.run('var phrases=[];var mic=new WakeMicrophone({onPhrase:t=>phrases.push(t)});mic.start()');
 const start=h.messages[0];assert.equal(start.op,'speechStart');assert.equal(start.allowOnline,false);h.reply(start,true);
 h.context.KeychainDesktop.receive({event:'speech',session:start.session,kind:'result',text:'Hi Moni',final:true});
 assert.equal(h.run('phrases[0]'),'Hi Moni');assert.equal(h.messages.at(-1).op,'speechStop');assert.equal(h.run('mic.active'),false);
 h.context.KeychainDesktop.receive({event:'speech',session:start.session,kind:'result',text:'Moni',final:true});assert.equal(h.run('phrases.length'),1);
});
test('native capture check uses native permission API rather than getUserMedia',async()=>{
 const h=host(),result=h.run('checkMicrophoneAccess()');assert.equal(h.messages[0].op,'micCheck');h.reply(h.messages[0],'Native microphone granted');assert.equal(await result,'Native microphone granted');
});
test('persistent recording bridge round-trips bytes and skips unknown catalogue IDs',async()=>{
 const h=host();h.context.input=Uint8Array.from([0,128,255,8]).buffer;
 const saved=h.run("KeychainDesktop.saveAudio('voice_004',input)");const m=h.messages[0];assert.equal(m.id,'voice_004');assert.equal(m.data,'AID/CA==');h.reply(m,true);await saved;
 h.run("var restored=[];var player={library:{health:new Map([['voice_004','ready']])},replace:async(id,bytes)=>restored.push([id,Array.from(new Uint8Array(bytes))])}");
 const restore=h.run('KeychainDesktop.restoreAudio(player)');h.reply(h.messages.at(-1),['voice_004','voice_999']);await Promise.resolve();h.reply(h.messages.at(-1),'AID/CA==');await restore;
 assert.deepEqual(JSON.parse(h.run('JSON.stringify(restored)')),[['voice_004',[0,128,255,8]]]);
});
test('native errors reject requests rather than reporting saved success',async()=>{
 const h=host(),save=h.run("KeychainDesktop.saveAudio('voice_001',new ArrayBuffer(4))");h.context.KeychainDesktop.receive({requestId:h.messages[0].requestId,error:'Disk full'});await assert.rejects(save,/Disk full/);
});
