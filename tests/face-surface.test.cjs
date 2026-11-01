const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const {FaceSurface,faceSurfaceSize}=require('../preview/face-surface.js');
test('presentation matches CSS size and Retina density without the 128px intermediate',()=>{
 assert.deepEqual(faceSurfaceSize(288,1),{pixels:288,scale:4,sourcePixels:512});
 assert.deepEqual(faceSurfaceSize(288,2),{pixels:576,scale:5,sourcePixels:640});
 assert.deepEqual(faceSurfaceSize(256,2),{pixels:512,scale:4,sourcePixels:512});
 assert.equal(faceSurfaceSize(500,4).pixels,1024);assert.equal(faceSurfaceSize(NaN,NaN).pixels,128);
});
test('resizing preserves the logical design transform, and unchanged frames do not reset it',()=>{
 let width=288,ratio=1;const canvas=createCanvas(128,128);canvas.getBoundingClientRect=()=>({width});
 const s=new FaceSurface(canvas,{createCanvas:()=>createCanvas(1,1),pixelRatio:()=>ratio});
 assert.equal(canvas.width,288);assert.equal(s.pen.getTransform().a,4);assert.equal(s.resize(),false);
 ratio=2;assert.equal(s.resize(),true);assert.equal(canvas.width,576);assert.equal(s.pen.getTransform().a,5);
 width=256;s.resize();assert.equal(canvas.width,512);assert.equal(s.pen.getTransform().a,4);
 s.pen.fillStyle='#fb3355';s.pen.fillRect(0,0,128,128);s.present();
 for(const [x,y] of [[0,0],[511,511],[256,256]])assert.deepEqual(Array.from(s.ctx.getImageData(x,y,1,1).data),[251,51,85,255]);
});
test('supersampled curved edges contain coverage levels rather than binary stair steps',()=>{
 const canvas=createCanvas(128,128);canvas.getBoundingClientRect=()=>({width:288});
 const s=new FaceSurface(canvas,{createCanvas:()=>createCanvas(1,1),pixelRatio:()=>2});
 s.pen.fillStyle='#efd3ff';s.pen.beginPath();s.pen.ellipse(64,64,24,34,.13,0,Math.PI*2);s.pen.fill();s.present();
 const data=s.ctx.getImageData(0,0,canvas.width,canvas.height).data,levels=new Set();
 for(let i=3;i<data.length;i+=4)if(data[i]>0&&data[i]<255)levels.add(data[i]);
 assert.ok(levels.size>20,'curved boundaries retain smooth subpixel coverage');
 assert.equal(s.ctx.imageSmoothingEnabled,true);assert.equal(s.ctx.imageSmoothingQuality,'high');
});
