/* Recording index: edit this data, not the state machine or playback code.
   durationMs is measured metadata; real playback also reads the decoded duration. */
(function(root){
const index={
 version:1,
 categories:['encouragement','good_morning','good_night','playful','special_occasions'],
 aliases:{comfort:'voice_001',hello:'voice_002',proud:'voice_003',greeting:'voice_004'},
 recordings:[
  {id:'voice_001',file:'voice/voice_001.wav',title:'A little encouragement',durationMs:17116,category:'encouragement',role:'personal',generated:true},
  {id:'voice_002',file:'voice/voice_002.wav',title:'Just saying hello',durationMs:12332,category:'playful',role:'personal',generated:true},
  {id:'voice_003',file:'voice/voice_003.wav',title:'A proud-of-you moment',durationMs:13468,category:'encouragement',role:'personal',generated:true},
  {id:'voice_004',file:'voice/voice_004.wav',title:'Hi, Mommy',durationMs:932,category:'special_occasions',role:'greeting',generated:true}
 ]
};
if(typeof module!=='undefined'&&module.exports)module.exports=index;else root.VOICE_INDEX=index;
})(globalThis);
