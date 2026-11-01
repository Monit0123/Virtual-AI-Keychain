const test=require('node:test'),assert=require('node:assert/strict');
const {WakeMicrophone,isWakePhrase}=require('../preview/wake-mic.js');
function fixture({local=true}={}){
 const instances=[],statuses=[],heard=[],wakes=[];
 class Recognition{constructor(){if(local)this.processLocally=false;instances.push(this);}start(){this.started=true;this.onstart?.();}abort(){this.aborted=true;this.onend?.();}}
 const mic=new WakeMicrophone({Recognition,onPhrase:x=>wakes.push(x),onStatus:x=>statuses.push(x),onTranscript:x=>heard.push(x)});
 const emit=(r,text,final=true)=>r.onresult({resultIndex:0,results:[Object.assign([{transcript:text}],{isFinal:final})]});
 return {mic,instances,statuses,heard,wakes,emit};
}
test('wake phrase matching is exact and normalized, not substring/ambient speech',()=>{
 for(const text of ['Moni','Hi, Moni!',' hi DADDY '])assert.equal(isWakePhrase(text),true);
 for(const text of ['money','tell Moni something','Hi Mommy','',null])assert.equal(isWakePhrase(text),false);
});
test('no microphone starts on construction; local recognition is the default',()=>{
 const f=fixture();assert.equal(f.instances.length,0);assert.equal(f.mic.active,false);
 assert.equal(f.mic.start(),true);assert.equal(f.instances[0].processLocally,true);assert.equal(f.instances[0].started,true);assert.equal(f.mic.active,true);
});
test('no implicit cloud fallback when local speech recognition is unsupported',()=>{
 const f=fixture({local:false});assert.equal(f.mic.start(),false);assert.equal(f.instances[0].started,undefined);assert.match(f.statuses.at(-1),/No microphone started/);
 assert.equal(f.mic.start({allowOnline:true}),true);assert.equal(f.instances.at(-1).started,true);
});
test('explicit online consent permits browser service, and disabling stops session',()=>{
 const f=fixture();f.mic.start({allowOnline:true});assert.equal(f.instances[0].processLocally,false);f.mic.stop();assert.equal(f.instances[0].aborted,true);assert.equal(f.mic.active,false);
});
test('only final wake results trigger once and capture stops before callback',()=>{
 const f=fixture();f.mic.start();const r=f.instances[0];f.emit(r,'Moni',false);f.emit(r,'ordinary speech');assert.equal(f.wakes.length,0);
 f.emit(r,'Hi, Moni');assert.deepEqual(f.wakes,['Hi, Moni']);assert.equal(f.mic.active,false);assert.equal(r.aborted,true);
 f.emit(r,'Moni');assert.equal(f.wakes.length,1);
});
test('late callbacks from aborted/replaced sessions cannot wake or overwrite status',()=>{
 const f=fixture();f.mic.start();const old=f.instances[0];f.mic.start();const status=f.statuses.at(-1);
 old.onerror({error:'network'});old.onend();f.emit(old,'Moni');assert.equal(f.mic.active,true);assert.equal(f.statuses.at(-1),status);assert.equal(f.wakes.length,0);
});
test('permission/network/language errors stop safely without retry loops or fallback',()=>{
 for(const code of ['not-allowed','network','language-not-supported','audio-capture']){
  const f=fixture();f.mic.start();f.instances[0].onerror({error:code});assert.equal(f.mic.active,false);assert.match(f.statuses.at(-1),new RegExp(code));assert.equal(f.instances.length,1);
 }
});
test('natural recognition end, unavailable API and thrown start errors are recoverable',()=>{
 const f=fixture();f.mic.start();f.instances[0].onend();assert.equal(f.mic.active,false);assert.match(f.statuses.at(-1),/Press Start/);
 let status='';const absent=new WakeMicrophone({Recognition:null,onStatus:s=>status=s});assert.equal(absent.start(),false);assert.match(status,/unavailable/);
 class Broken{constructor(){this.processLocally=true;}start(){throw new Error('denied');}abort(){}}
 const broken=new WakeMicrophone({Recognition:Broken,onStatus:s=>status=s});assert.equal(broken.start(),false);assert.equal(broken.active,false);assert.match(status,/denied/);
});
const {microphoneContextIssue,checkMicrophoneAccess,recognitionErrorMessage}=require('../preview/wake-mic.js');
test('context diagnostics distinguish insecure origin and embedded policy denial',()=>{
 assert.match(microphoneContextIssue({isSecureContext:false}),/HTTPS/);
 assert.match(microphoneContextIssue({document:{permissionsPolicy:{allowsFeature:()=>false}}}),/Permissions Policy/);
 assert.equal(microphoneContextIssue({isSecureContext:true}),null);
});
test('capture check releases every track and does not claim recognition or sound pickup',async()=>{
 let stopped=0;const message=await checkMicrophoneAccess({navigator:{mediaDevices:{getUserMedia:async options=>{assert.deepEqual(options,{audio:true});return {getTracks:()=>[{stop:()=>stopped++},{stop:()=>stopped++}]};}}}});
 assert.equal(stopped,2);assert.match(message,/permission works/);assert.match(message,/does not prove/);
});
test('capture check reports permission, missing-device and busy-device failures separately',async()=>{
 for(const [name,pattern] of [['NotAllowedError',/capture blocked/],['NotFoundError',/No microphone/],['NotReadableError',/could not be opened/]]){
  const result=await checkMicrophoneAccess({navigator:{mediaDevices:{getUserMedia:async()=>{throw Object.assign(new Error('test'),{name});}}}});assert.match(result,pattern);
 }
 let requested=false;await checkMicrophoneAccess({isSecureContext:false,navigator:{mediaDevices:{getUserMedia:()=>{requested=true;}}}});assert.equal(requested,false);
});
test('recognition denial guidance does not equate speech service permission with mic permission',()=>{
 assert.match(recognitionErrorMessage('not-allowed'),/Microphone permission alone is not sufficient/);
 assert.match(recognitionErrorMessage('service-not-allowed'),/new tab/);
 assert.match(recognitionErrorMessage('language-not-supported'),/model/);
});
