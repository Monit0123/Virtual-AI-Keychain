#!/usr/bin/env node
// No packages needed: validate the index/assets, or export portable JSON.
const fs=require('node:fs'),path=require('node:path');
try{
 const index=require('../preview/voice/index.js');
 const {validateVoiceIndex}=require('../preview/voices.js');
 validateVoiceIndex(index);
 if(process.argv.includes('--json')){process.stdout.write(JSON.stringify(index,null,2)+'\n');process.exit(0);}
 for(const m of index.recordings){
  const file=path.join(__dirname,'../preview',m.file);
  if(!fs.existsSync(file))throw new Error(m.id+': recording file is missing: '+m.file);
  if(/\.wav$/i.test(m.file)){
   const b=fs.readFileSync(file);if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw new Error(m.id+': invalid WAV header.');
   let rate,data;
   for(let i=12;i+8<=b.length;){const size=b.readUInt32LE(i+4),tag=b.toString('ascii',i,i+4);if(i+8+size>b.length)throw new Error(m.id+': truncated WAV chunk.');if(tag==='fmt '&&size>=16)rate=b.readUInt32LE(i+16);if(tag==='data')data=size;i+=8+size+(size%2);}
   if(!rate||!data)throw new Error(m.id+': WAV has no playable sample data.');
   const ms=data/rate*1000;
   if(Math.abs(ms-m.durationMs)>25)throw new Error(m.id+': durationMs should be '+Math.round(ms)+' (currently '+m.durationMs+').');
  }
 }
 console.log('Validated '+index.recordings.length+' indexed recordings and local assets.');
}catch(error){console.error('Voice index: '+error.message);process.exitCode=1;}
