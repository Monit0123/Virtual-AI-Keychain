/* Real browser speech input. No fake transcripts or implicit cloud fallback. */
(function(root){
'use strict';
const isWakePhrase=text=>typeof text==='string'&&['hi moni','hi daddy','moni'].includes(text.toLowerCase().replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim());
function microphoneContextIssue(env=root){
 if(env.KeychainDesktop)return null;
 if(env.isSecureContext===false)return 'Microphone requires HTTPS or localhost. Open the secure preview URL directly.';
 const policy=env.document?.permissionsPolicy||env.document?.featurePolicy;
 if(policy?.allowsFeature&&policy.allowsFeature('microphone')===false)return 'This page is blocked by the embedding/Permissions Policy for microphone. Open the preview in a new tab; allowing site permission alone cannot override this policy.';
 return null;
}
async function checkMicrophoneAccess(env=root){
 if(env.KeychainDesktop)return env.KeychainDesktop.request('micCheck');
 const issue=microphoneContextIssue(env);if(issue)return issue;
 if(!env.navigator?.mediaDevices?.getUserMedia)return 'Microphone capture API unavailable. Use a supported browser over HTTPS.';
 let stream;
 try{
  stream=await env.navigator.mediaDevices.getUserMedia({audio:true});
  return 'Microphone capture permission works. This does not prove sound pickup or speech recognition. If recognition still says not-allowed, open the preview directly in a new tab and check browser/OS speech permissions. Browser speech services may also be restricted.';
 }catch(error){
  const name=error.name||'unknown';
  if(name==='NotAllowedError'||name==='SecurityError')return 'Microphone capture blocked ('+name+'). Check this preview origin’s site permission, OS microphone permission for the browser, and iframe/Permissions Policy. Try opening the preview directly in a new tab.';
  if(name==='NotFoundError')return 'No microphone device found. Connect/select an input device in system settings.';
  if(name==='NotReadableError')return 'Microphone could not be opened. Check OS input settings and whether another application is using the device.';
  return 'Microphone access check failed: '+name+'. '+(error.message||'');
 }finally{for(const track of stream?.getTracks()||[])track.stop();}
}
function recognitionErrorMessage(code){
 const prefix='Speech recognition error: '+code+'. ';
 if(code==='not-allowed'||code==='service-not-allowed')return prefix+'Microphone permission alone is not sufficient. Open this preview directly in a new tab (not embedded), run Check microphone access, and check browser/OS speech-recognition permissions. The recognition service or on-device recognition policy may be restricted. If local recognition is unsupported, use a compatible browser/model or explicitly opt into the browser speech service. No automatic cloud fallback.';
 if(code==='language-not-supported')return prefix+'The English on-device model may be missing or unsupported. Install it through your browser if available, or explicitly opt into browser speech service. No automatic cloud fallback.';
 return prefix+'Check input device, permissions, network (if using a browser service), and language support, then press Start again. No automatic cloud fallback.';
}
class WakeMicrophone {
 constructor({Recognition=root.SpeechRecognition||root.webkitSpeechRecognition,onPhrase=()=>{},onStatus=()=>{},onTranscript=()=>{},onEnded=()=>{},onFailure=()=>{}}={}){
  this.Recognition=Recognition;this.onPhrase=onPhrase;this.onStatus=onStatus;this.onTranscript=onTranscript;this.onEnded=onEnded;this.onFailure=onFailure;this.recognition=null;this.active=false;
 }
 start({allowOnline=false}={}){
  this.stop();
  const issue=microphoneContextIssue();if(issue){this.onStatus(issue);return false;}
  if(!this.Recognition){this.onStatus('Speech recognition is unavailable in this browser. Try a supported browser; typed testing remains available.');return false;}
  let r;
  try{
   r=new this.Recognition();
   if(!allowOnline&&!('processLocally' in r)){this.onStatus('Offline recognition is unavailable here. No microphone started. Use a supported local recognizer, or explicitly allow the browser speech service.');return false;}
   if('processLocally' in r)r.processLocally=!allowOnline;
   r.lang='en-US';r.continuous=true;r.interimResults=false;r.maxAlternatives=1;
   this.recognition=r;this.active=true;
   const current=()=>this.recognition===r;
   r.onstart=()=>{if(current())this.onStatus('Microphone listening — say “Moni”, “Hi, Moni”, or “Hi, Daddy”.');};
   r.onresult=e=>{
    if(!current())return;
    for(let i=e.resultIndex;i<e.results.length;i++){
     const result=e.results[i];if(!result.isFinal)continue;
     const text=result[0]?.transcript||'';this.onTranscript(text);
     if(isWakePhrase(text)){this.stop();this.onPhrase(text);break;}
    }
   };
   r.onerror=e=>{if(!current())return;const code=e.error||'unknown';this.stop();this.onFailure(code);this.onStatus(recognitionErrorMessage(code));};
   r.onend=()=>{if(!current())return;this.recognition=null;this.active=false;this.onStatus('Recognition session ended.');this.onEnded();};
   this.onStatus('Requesting microphone / speech recognition permission…');r.start();return true;
  }catch(error){this.stop();this.onStatus('Could not start microphone: '+error.message);return false;}
 }
 stop(){const r=this.recognition;this.recognition=null;this.active=false;if(r){try{r.abort();}catch{}this.onStatus('Microphone stopped. Press Start to listen again.');}}
}
const api={WakeMicrophone,isWakePhrase,microphoneContextIssue,checkMicrophoneAccess,recognitionErrorMessage};if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
