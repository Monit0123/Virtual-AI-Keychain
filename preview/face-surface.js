/* Keep the 128x128 design grid separate from the Retina presentation buffer.
   Vector supersampling is filtered once, directly to physical screen pixels. */
(function(root){
'use strict';
function faceSurfaceSize(cssWidth=128,pixelRatio=1){
 const css=Number.isFinite(cssWidth)&&cssWidth>0?cssWidth:128;
 const ratio=Number.isFinite(pixelRatio)&&pixelRatio>0?pixelRatio:1;
 const pixels=Math.max(128,Math.min(1024,Math.ceil(css*ratio)));
 const scale=Math.max(4,Math.min(8,Math.ceil(pixels/128)));
 return {pixels,scale,sourcePixels:128*scale};
}
class FaceSurface {
 constructor(canvas,{createCanvas=()=>document.createElement('canvas'),pixelRatio=()=>root.devicePixelRatio||1}={}){
  this.canvas=canvas;this.high=createCanvas();this.ctx=canvas.getContext('2d');this.pen=this.high.getContext('2d');this.pixelRatio=pixelRatio;this.size=null;this.resize();
 }
 resize(){
  const size=faceSurfaceSize(this.canvas.getBoundingClientRect?.().width||128,this.pixelRatio());
  if(this.size?.pixels===size.pixels&&this.size?.scale===size.scale)return false;
  this.size=size;this.canvas.width=this.canvas.height=size.pixels;
  this.high.width=this.high.height=size.sourcePixels;
  this.pen.setTransform(size.scale,0,0,size.scale,0,0);
  this.pen.imageSmoothingEnabled=true;this.pen.imageSmoothingQuality='high';
  this.ctx.imageSmoothingEnabled=true;this.ctx.imageSmoothingQuality='high';
  return true;
 }
 present(){this.ctx.drawImage(this.high,0,0,this.canvas.width,this.canvas.height);}
}
const api={FaceSurface,faceSurfaceSize};if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
