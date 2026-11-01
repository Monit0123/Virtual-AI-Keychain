const test=require('node:test'),assert=require('node:assert/strict');
test('actual canvas: both eyes remain visible beneath cloud and photo covers every final pixel',()=>{
const {createCanvas}=require('@napi-rs/canvas');
const vm=require('vm'),fs=require('fs');
const root=require('node:path').join(__dirname,'../preview/');
let clock=0,frame;
const elements=new Map(),buttons=[];
function element(){return {style:{setProperty(){}},textContent:'',dataset:{},checked:true,disabled:false,hidden:false,value:'',setAttribute(){},append(b){buttons.push(b);},getContext(){return createCanvas(128,128).getContext('2d');}};}
const canvas=createCanvas(128,128);canvas.setAttribute=()=>{};
elements.set('#face',canvas);
const sandbox={console,performance:{now:()=>clock},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>frame=fn,document:{querySelector:s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s);},querySelectorAll:s=>s==='.expression'?buttons:[],createElement:t=>t==='canvas'?createCanvas(512,512):element(),addEventListener(){}},URL,Image:function(){}};
const ctx=vm.createContext(sandbox);
for(const file of ['desktop-bridge.js','wake-mic.js','listening-session.js','voice/index.js','audio-player.js','voices.js','photos.js','screens.js','affection.js','personality.js','buttons.js','animation.js','companion.js','face-surface.js','bunny-face.js','living-face.js','state-face.js','memory-scene.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
vm.runInContext(fs.readFileSync(root+'index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
// Local high-contrast test photo: image data is independent of any private memory.
sandbox.testPhoto=createCanvas(160,100);let p=sandbox.testPhoto.getContext('2d');p.fillStyle='#ff3355';p.fillRect(0,0,160,100);
vm.runInContext("memoryImage=testPhoto;companion.dispatch('LOAD_MEMORY',0,{name:'test'});dispatch('PHOTO');",ctx);

let mid,full;
for(clock=0;clock<=9000;clock+=16){frame(clock);if(clock===4000)mid=canvas.getContext('2d').getImageData(0,0,128,128).data;if(clock===8000)full=canvas.getContext('2d').getImageData(0,0,128,128).data;}
function lit(x1,y1,x2,y2){let count=0;for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++){const i=(y*128+x)*4;if(mid[i]>100&&mid[i+1]>160&&mid[i+2]>140)count++;}return count;}
assert.ok(lit(26,72,46,96)>130,'left eye must be visible below cloud');
assert.ok(lit(62,72,82,96)>130,'right eye must be visible below cloud');
for(let i=0;i<full.length;i+=4){assert.ok(Math.abs(full[i]-255)<=1);assert.ok(Math.abs(full[i+1]-51)<=1);assert.ok(Math.abs(full[i+2]-85)<=1);assert.equal(full[i+3],255);}
assert.equal(vm.runInContext('companion.state',ctx),'SHOWING_PHOTO');
clock=9100;
vm.runInContext("dispatch('HOME_REQUESTED');animator.select(2,9000);animator.gx=1.25;animator.gy=2.5;dispatch('GALLERY_REQUESTED');",ctx);
const preserved=vm.runInContext('JSON.stringify(savedFace)',ctx);
for(;clock<=10000;clock+=16)frame(clock);
vm.runInContext("dispatch('HOME_REQUESTED')",ctx);
const restored=vm.runInContext('({selected:animator.selected,gx:animator.gx,gy:animator.gy,current:JSON.stringify(animator.current)})',ctx);
const saved=JSON.parse(preserved);
assert.equal(restored.selected,2);assert.equal(restored.gx,saved.values.gx);assert.equal(restored.gy,saved.values.gy);
assert.equal(restored.current,JSON.stringify(saved.current));

clock=10000;
vm.runInContext("companion.dispatch('HOME_REQUESTED',10000);affection.previewIgnored(10000);",ctx);
for(;clock<=12000;clock+=16)frame(clock);
assert.equal(vm.runInContext('companion.state',ctx),'IDLE');
vm.runInContext("affection.wake('Hi, Moni',12000)",ctx);
for(;clock<=21000;clock+=16)frame(clock);
const warm=canvas.getContext('2d').getImageData(0,0,128,128).data;
let blushPixels=0;
for(let i=0;i<warm.length;i+=4)if(warm[i]>80&&warm[i]>warm[i+1]*1.5)blushPixels++;
assert.ok(blushPixels>100,'integrated greeting draws red cheeks and hearts');
assert.equal(vm.runInContext('companion.state',ctx),'IDLE');

// New memory reveals share random selection, including the personality event.
vm.runInContext("memories.add('one',testPhoto);memories.add('two',testPhoto);memories.add('three',testPhoto);memories.random=()=>0;dispatch('HOME_REQUESTED');",ctx);
let last=vm.runInContext('memories.current',ctx);
for(let i=0;i<12;i++){
 vm.runInContext(`dispatch('${i%2?'PHOTO_SELECTED':'PHOTO'}')`,ctx);
 const picked=vm.runInContext('memories.current',ctx);
 assert.notEqual(picked,last,'a fresh reveal avoids the current photo');
 assert.equal(vm.runInContext('companion.memory.name',ctx),['one','two','three'][picked]);
 assert.equal(vm.runInContext('companion.state',ctx),'SHOWING_PHOTO');
 vm.runInContext("dispatch('PHOTO')",ctx);
 assert.equal(vm.runInContext('memories.current',ctx),picked,'busy requests do not reroll the visible image');
 last=picked;vm.runInContext("dispatch('HOME_REQUESTED')",ctx);
}
vm.runInContext("dispatch('GALLERY_REQUESTED');memories.current=2;selectMemory();dispatch('PHOTO_SELECTED',{animate:false});",ctx);
assert.equal(vm.runInContext('companion.memory.name',ctx),'three','explicit gallery selection stays deterministic');
// Every reference design is clickable without starting its corresponding real operation.
vm.runInContext("dispatch('HOME_REQUESTED');listeningSession.enabled=true",ctx);
for(const id of ['idle','happy','excited','surprised','sleepy','sad','angry','love','listening','thinking','speaking','photo','error']){
 const before=vm.runInContext('faceStudy.active?JSON.stringify(faceStudy.sample(performance.now())):null',ctx);
 vm.runInContext(`chooseFace('${id}')`,ctx);
 if(before){const source=JSON.parse(before),captured=JSON.parse(vm.runInContext('JSON.stringify(faceStudy.previous.frame)',ctx));assert.deepEqual(captured.pose,source.pose,'Home cleanup must not erase the visible source pose');assert.deepEqual(captured.features,source.features);}
 clock+=750;frame(clock);
 assert.equal(vm.runInContext('faceStudy.id',ctx),id);
 assert.equal(vm.runInContext('companion.state',ctx),'IDLE');
 assert.equal(vm.runInContext('realAudio.session',ctx),null);
 assert.equal(vm.runInContext('wakeMic.active',ctx),false);
}
vm.runInContext("document.querySelector('#return-live').onclick()",ctx);
assert.equal(vm.runInContext('faceStudy.active',ctx),false);
assert.equal(vm.runInContext('listeningSession.enabled',ctx),true,'preview pauses, rather than revokes, user listening intent');


});
