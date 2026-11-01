/* All application states keep the face on screen. No text-based device screens. */
(function(root){
'use strict';
function createStateFaces(base){
 const poses=base.map(p=>({...p}));
 poses.push({...base[3],name:'Listening',h:30,w:28,mw:10,mh:1,r:191,g:235,b:236});
 poses.push({...base[0],name:'Thinking',h:19,w:27,mw:12,curve:0,r:198,g:210,b:240});
 poses.push({...base[1],name:'Speaking',arch:.3,h:25,mw:20,mh:4,curve:4});
 poses.push({...base[2],name:'Concerned',slope:-5,curve:-5,r:235,g:204,b:174});
 poses.push({...base[0],name:'Remembering',h:29,w:26,curve:0,mw:10,mh:13,r:204,g:235,b:223});
 return poses;
}
function stateFaceIndex(state,expression=0){
 return ({IDLE:0,EXPRESSING:expression,SHOWING_PHOTO:10,PLAYING_VOICE:8,
 LISTENING:6,WAITING_FOR_AI:7,SHOWING_RESPONSE:8,ERROR:9})[state]??0;
}
function stateFaceMotion(state,elapsed,motion=true){
 if(!motion)return {x:0,y:0,mouthOpen:0};
 const speaking=state==='PLAYING_VOICE'||state==='SHOWING_RESPONSE';
 return {x:state==='WAITING_FOR_AI'?2*Math.sin(elapsed/950):0,
 y:state==='WAITING_FOR_AI'?-3:state==='LISTENING'?-1:0,
 mouthOpen:speaking?2+5*Math.pow(Math.sin(elapsed/150),2)*(.55+.45*Math.sin(elapsed/490)):0};
}
const api={createStateFaces,stateFaceIndex,stateFaceMotion};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
