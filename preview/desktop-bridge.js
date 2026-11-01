/* Native macOS host adapter. Ordinary browser behavior is unchanged. */
(function(root){
'use strict';
if(!root.webkit?.messageHandlers?.keychain)return;
let sequence=0;const pending=new Map(),recognizers=new Map();
function request(op,args={}){return new Promise((resolve,reject)=>{const requestId=++sequence;pending.set(requestId,{resolve,reject});root.webkit.messageHandlers.keychain.postMessage({op,requestId,...args});});}
function encode(bytes){let text='';const a=new Uint8Array(bytes);for(let i=0;i<a.length;i+=8192)text+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(text);}
function decode(text){return Uint8Array.from(atob(text),c=>c.charCodeAt(0)).buffer;}
class NativeRecognition {
 constructor(){this.processLocally=true;this.session=++sequence;}
 start(){recognizers.set(this.session,this);request('speechStart',{session:this.session,allowOnline:!this.processLocally}).catch(error=>{if(recognizers.has(this.session))this.onerror?.({error:error.message});});}
 abort(){recognizers.delete(this.session);request('speechStop',{session:this.session}).catch(()=>{});}
}
root.KeychainDesktop={
 request,
 receive(message){
  if(message.event==='speech'){
   const r=recognizers.get(message.session);if(!r)return;
   if(message.kind==='start')r.onstart?.();
   if(message.kind==='error'){recognizers.delete(message.session);r.onerror?.({error:message.text});}
   if(message.kind==='end'){recognizers.delete(message.session);r.onend?.();}
   if(message.kind==='result')r.onresult?.({resultIndex:0,results:[Object.assign([{transcript:message.text}],{isFinal:message.final})]});
   return;
  }
  const job=pending.get(message.requestId);if(!job)return;pending.delete(message.requestId);
  if(message.error)job.reject(new Error(message.error));else job.resolve(message.value);
 },
 saveAudio:(id,bytes)=>request('audioSave',{id,data:encode(bytes)}),
 async restoreAudio(player){for(const id of await request('audioList')){if(!player.library.health.has(id))continue;try{await player.replace(id,decode(await request('audioLoad',{id})));}catch(error){throw new Error(id+': '+error.message);}}}
};
root.SpeechRecognition=NativeRecognition;
})(globalThis);
