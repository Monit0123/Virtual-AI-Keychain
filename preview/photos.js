/* Local photo validation/decoding. No uploads, storage or application-state writes. */
(function(root){
'use strict';
function validatePhoto(file){
 if(!file||typeof file.name!=='string')return 'Choose an image file.';
 const types=['image/jpeg','image/png','image/webp'];
 if(file.type?!types.includes(file.type.toLowerCase()):!(/\.(jpe?g|png|webp)$/i.test(file.name)))return 'Unsupported image. Choose JPEG, PNG or WebP.';
 if(!Number.isFinite(file.size)||file.size<=0)return 'The image file is empty or unavailable.';
 if(file.size>8*1024*1024)return 'The image is too large. Choose a file under 8 MB.';
 return null;
}
async function loadLocalPhoto(file,adapters={}){
 const error=validatePhoto(file);if(error)return {ok:false,error};
 const create=adapters.createURL||(f=>URL.createObjectURL(f));
 const revoke=adapters.revokeURL||(url=>URL.revokeObjectURL(url));
 const decode=adapters.decode||(async url=>{const image=new Image();image.src=url;await image.decode();
  if(!(image.width>0&&image.height>0))return image;
  // Retain a small display-ready bitmap, not every full-resolution original.
  const scale=Math.min(1,384/Math.max(image.width,image.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  const context=canvas.getContext('2d');context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,0,0,canvas.width,canvas.height);return canvas;});
 let url;
 try{
  url=create(file);const image=await decode(url);
  if(!image||!(image.width>0)||!(image.height>0))throw new Error('Empty decoded image');
  return {ok:true,name:file.name,image};
 }catch{return {ok:false,error:'This image could not be loaded. Try another JPEG, PNG or WebP.'};}
 finally{if(url)revoke(url);}
}
class PhotoImporter {
 constructor({load=loadLocalPhoto,onItem=()=>{},onProgress=()=>{},yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){
  this.load=load;this.onItem=onItem;this.onProgress=onProgress;this.yieldControl=yieldControl;this.running=false;this.cancelled=false;
 }
 cancel(){this.cancelled=true;}
 async import(files){
  if(this.running)return null;
  this.running=true;this.cancelled=false;
  const progress={total:files.length,processed:0,added:0,skipped:0,firstError:'',cancelled:false};
  try{
   this.onProgress({...progress});
   for(const file of files){
    if(this.cancelled)break;
    let result;
    try{result=await this.load(file);}catch{result={ok:false,error:'This image could not be loaded.'};}
    if(this.cancelled)break;
    if(result.ok){this.onItem({...result,name:file.webkitRelativePath||result.name});progress.added++;}
    else{progress.skipped++;if(!progress.firstError)progress.firstError=result.error;}
    progress.processed++;this.onProgress({...progress});
    if(progress.processed%8===0)await this.yieldControl();
   }
  }finally{
   progress.cancelled=this.cancelled;this.running=false;this.onProgress({...progress});
  }
  return progress;
 }
}
const SAMPLE_PHOTOS=Object.freeze([
 Object.freeze({name:'Sample · Coffee break',src:'samples/coffee.jpg'}),
 Object.freeze({name:'Sample · Rocket launch',src:'samples/rocket.jpg'}),
 Object.freeze({name:'Sample · Distant stars',src:'samples/stars.jpg'})
]);
async function loadSamplePhotos(decode){
 const read=decode||(async src=>{const image=new Image();image.src=src;await image.decode();return image;});
 return Promise.all(SAMPLE_PHOTOS.map(async item=>{
  try{const image=await read(item.src);if(!(image?.width>0&&image?.height>0))throw new Error('Invalid sample');return {ok:true,name:item.name,image};}
  catch{return {ok:false,name:item.name,error:'Sample photo unavailable. You can preload your own images.'};}
 }));
}
const api={validatePhoto,loadLocalPhoto,PhotoImporter,SAMPLE_PHOTOS,loadSamplePhotos};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
