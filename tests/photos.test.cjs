const test=require('node:test'),assert=require('node:assert/strict');
const {validatePhoto,loadLocalPhoto}=require('../preview/photos.js');
const {coverPhoto,renderScreen}=require('../preview/screens.js');
const {createCanvas}=require('@napi-rs/canvas');
const {Companion}=require('../preview/companion.js');
const good={name:'memory.png',type:'image/png',size:100};
test('missing, empty, oversized and unsupported files are rejected before decoding',async()=>{
 for(const file of [null,{...good,size:0},{...good,size:9*1024*1024},{...good,type:'image/heic'},{...good,name:'memory.gif',type:'image/gif'}]){
  assert.ok(validatePhoto(file));let called=false;
  const result=await loadLocalPhoto(file,{decode:()=>{called=true;}});assert.equal(result.ok,false);assert.equal(called,false);
 }
 assert.equal(validatePhoto({...good,type:'',name:'memory.JPG'}),null);
});
test('valid local image decodes and temporary URL is released',async()=>{
 const released=[],image=createCanvas(20,30);
 const result=await loadLocalPhoto(good,{createURL:()=> 'blob:test',revokeURL:u=>released.push(u),decode:async()=>image});
 assert.equal(result.ok,true);assert.equal(result.name,'memory.png');assert.equal(result.image,image);assert.deepEqual(released,['blob:test']);
});
test('decode failure and zero-size decoded images return helpful errors and release URLs',async()=>{
 for(const decode of [async()=>{throw new Error('corrupt data');},async()=>({width:0,height:0})]){
  const released=[];
  const result=await loadLocalPhoto(good,{createURL:()=> 'blob:bad',revokeURL:u=>released.push(u),decode});
  assert.equal(result.ok,false);assert.match(result.error,/could not be loaded/);assert.deepEqual(released,['blob:bad']);
 }
});
test('gallery missing or broken image renders recoverable placeholder without canvas leaks',()=>{
 const canvas=createCanvas(128,128),ctx=canvas.getContext('2d'),app=new Companion();app.dispatch('GALLERY_REQUESTED',0);
 for(const image of [null,{}, {width:10,height:10}]){
  assert.equal(coverPhoto(ctx,image,8,28,112,74),false);
  assert.doesNotThrow(()=>renderScreen(ctx,app,[{name:'bad',image}],1));
  assert.equal(ctx.getTransform().a,1);assert.equal(ctx.globalAlpha,1);
 }
 app.dispatch('HOME_REQUESTED',2);assert.equal(app.state,'IDLE');
});
test('gallery displays only the selected image rather than a thumbnail grid',()=>{
 const ctx=createCanvas(128,128).getContext('2d'),app=new Companion();
 function photo(color){const c=createCanvas(16,16);const p=c.getContext('2d');p.fillStyle=color;p.fillRect(0,0,16,16);return c;}
 const images=[{image:photo('#ff0000')},{image:photo('#0000ff')}];
 app.dispatch('GALLERY_UPDATED',0,2);app.dispatch('GALLERY_REQUESTED',1);renderScreen(ctx,app,images,1);
 assert.ok(ctx.getImageData(64,60,1,1).data[0]>240);
 app.dispatch('NEXT_PHOTO',2);renderScreen(ctx,app,images,2);assert.ok(ctx.getImageData(64,60,1,1).data[2]>240);
 app.dispatch('NEXT_PHOTO',3);assert.equal(app.galleryIndex,0);app.dispatch('PREVIOUS_PHOTO',4);assert.equal(app.galleryIndex,1);
});
test('failed photo reveal restores nested clips before the app draws its error screen',()=>{
 const {drawMemoryCloud,memoryScene}=require('../preview/memory-scene.js');let depth=0;
 const ctx=new Proxy({save(){depth++;},restore(){depth--;},drawImage(){throw new Error('decode no longer available');}},{get:(o,k)=>k in o?o[k]:()=>{}});
 assert.throws(()=>drawMemoryCloud(ctx,{width:10,height:10},memoryScene(8000)));assert.equal(depth,0);
});
test('three bundled real sample photos load locally, navigate, and tolerate one missing sample',async()=>{
 const {loadSamplePhotos,SAMPLE_PHOTOS}=require('../preview/photos.js');
 const {loadImage}=require('@napi-rs/canvas');const path=require('node:path');
 const results=await loadSamplePhotos(src=>loadImage(path.join(__dirname,'../preview',src)));
 assert.equal(results.length,3);assert.ok(results.every(r=>r.ok&&r.name.startsWith('Sample')));
 assert.equal(new Set(SAMPLE_PHOTOS.map(p=>p.src)).size,3);
 const c=new Companion();c.dispatch('GALLERY_UPDATED',0,results.length);c.dispatch('GALLERY_REQUESTED',1);
 for(const expected of [1,2,0]){c.dispatch('NEXT_PHOTO',2);assert.equal(c.galleryIndex,expected);}
 c.dispatch('HOME',3);assert.equal(c.state,'IDLE');
 const partial=await loadSamplePhotos(async src=>{if(src.includes('rocket'))throw new Error('missing');return loadImage(path.join(__dirname,'../preview',src));});
 assert.equal(partial.filter(r=>r.ok).length,2);assert.match(partial.find(r=>!r.ok).error,/unavailable/);
});
test('imports all selected photos without a count cap, one decode at a time',async()=>{
 const {PhotoImporter}=require('../preview/photos.js');let active=0,maxActive=0,yields=0;const items=[];
 const files=Array.from({length:240},(_,i)=>({...good,name:i+'.png',webkitRelativePath:'Trip/day'+(i%5)+'/'+i+'.png'}));
 const importer=new PhotoImporter({load:async file=>{active++;maxActive=Math.max(maxActive,active);await Promise.resolve();active--;return {ok:true,name:file.name,image:{width:128,height:128}};},onItem:item=>items.push(item),yieldControl:async()=>{yields++;}});
 const result=await importer.import(files);
 assert.equal(result.added,240);assert.equal(items.length,240);assert.equal(maxActive,1);assert.ok(yields>0);
 assert.equal(items[0].name,'Trip/day0/0.png');assert.equal(importer.running,false);
 const c=new Companion();assert.equal(c.dispatch('GALLERY_UPDATED',0,240),true);c.dispatch('GALLERY_REQUESTED',1);c.dispatch('PREVIOUS_PHOTO',2);assert.equal(c.galleryIndex,239);
});
test('folder import skips unreadable/non-image files and cancellation preserves already imported images',async()=>{
 const {PhotoImporter}=require('../preview/photos.js');const items=[];
 const files=Array.from({length:30},(_,i)=>({...good,name:i+'.png'}));
 let importer;
 importer=new PhotoImporter({load:async f=>f.name==='1.png'?{ok:false,error:'Unsupported file'}:{ok:true,name:f.name,image:{}},onItem:item=>items.push(item),onProgress:p=>{if(p.processed===6)importer.cancel();},yieldControl:async()=>{}});
 const result=await importer.import(files);assert.equal(result.processed,6);assert.equal(result.added,5);assert.equal(result.skipped,1);assert.equal(result.cancelled,true);assert.equal(items.length,5);assert.equal(importer.running,false);
 const next=await importer.import([good]);assert.equal(next.added,1);assert.equal(next.cancelled,false);
});
test('in-progress decoder can be cancelled and concurrent imports are rejected safely',async()=>{
 const {PhotoImporter}=require('../preview/photos.js');let resolve;const items=[];
 const importer=new PhotoImporter({load:()=>new Promise(r=>{resolve=r;}),onItem:item=>items.push(item)});
 const pending=importer.import([good]);assert.equal(await importer.import([good]),null);
 importer.cancel();resolve({ok:true,name:'cancelled',image:{}});
 const result=await pending;assert.equal(result.cancelled,true);assert.equal(items.length,0);assert.equal(importer.running,false);
});
