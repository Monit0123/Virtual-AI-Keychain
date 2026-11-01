/* Little Orbit face language: original vector paths, rendered at OLED resolution. */
(function(root){
'use strict';
const LAVENDER='#efd3ff',PINK='#ff9fdd';
function heart(p,x,y,s){p.beginPath();p.moveTo(x,y+s*.7);p.bezierCurveTo(x-s*1.4,y-s*.15,x-s*.7,y-s,x,y-s*.35);p.bezierCurveTo(x+s*.7,y-s,x+s*1.4,y-s*.15,x,y+s*.7);p.fill();}
function star(p,x,y,s){p.beginPath();p.moveTo(x,y-s);p.quadraticCurveTo(x+s*.18,y-s*.18,x+s,y);p.quadraticCurveTo(x+s*.18,y+s*.18,x,y+s);p.quadraticCurveTo(x-s*.18,y+s*.18,x-s,y);p.quadraticCurveTo(x-s*.18,y-s*.18,x,y-s);p.fill();}
// Every eye is ONE persistent, fully opaque closed contour. Corresponding
// vertices move between silhouettes; never composite separate expression layers.
function eyeContour(pose,left){
 const clamp=x=>Math.max(0,Math.min(1,x||0)),w=Math.max(10,pose.w),h=Math.max(3,pose.h*1.2);
 let remaining=1;const weights={};
 for(const [name,value] of [['love',pose.love],['spark',pose.spark],['happy',pose.arch],['sleepy',(14-pose.h)/6],['angry',pose.slope/10],['sad',-pose.slope/8]]){weights[name]=remaining*clamp(value);remaining-=weights[name];}weights.bunny=remaining;
 const points=[];
 for(let n=0;n<80;n++){
  const t=n*Math.PI*2/80,c=Math.cos(t),sn=Math.sin(t),x=sn*w*.44;
  const top=-1+(left?1:-1)*x/w*8,sadTop=-3-(left?1:-1)*x/w*8;
  // Smooth four-point star: broad concave sides, rounded tips AND valleys.
  // A continuous radial curve avoids both polygon cusps and narrow plus arms.
  const r=10.5+3.5*Math.cos(4*t);
  const shapes={bunny:[x,-c*h*.52],love:[12.8*sn**3,-.8*(13*c-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))],spark:[sn*r,-c*r],happy:[sn*w*.42,2-h*.28*c*c-c*1.3],sleepy:[x,-3+(c>0?-c*.8:-c*8)],angry:[x,top+(c>0?-c*1.2:-c*11)],sad:[x,sadTop+(c>0?-c*1.2:-c*h*.45)]};
  points.push(Object.entries(weights).reduce((v,[name,k])=>[v[0]+shapes[name][0]*k,v[1]+shapes[name][1]*k],[0,0]));
 }
 return {points,bunny:remaining};
}
function contourPath(p,points){
 const last=points[points.length-1],first=points[0];p.beginPath();p.moveTo((last[0]+first[0])/2,(last[1]+first[1])/2);
 points.forEach((v,i)=>{const next=points[(i+1)%points.length];p.quadraticCurveTo(v[0],v[1],(v[0]+next[0])/2,(v[1]+next[1])/2);});p.closePath();
}
function eye(p,cx,cy,left,open,pose){
 const {points,bunny}=eyeContour(pose,left),w=Math.max(10,pose.w),h=Math.max(3,pose.h*1.2);
 p.save();p.translate(cx,cy);p.scale(1,Math.max(.075,Math.min(1,open)));p.lineWidth=2.2;p.lineJoin='round';p.strokeStyle=LAVENDER;p.shadowColor='#d992ff';p.shadowBlur=3;
 // Solid materials, not opacity blending. The outline remains fully present.
 const base=[48,32,57],lit=[239,211,255];p.fillStyle=`rgb(${base.map((v,i)=>Math.round(v+(lit[i]-v)*(1-bunny))).join(',')})`;
 contourPath(p,points);p.fill();p.stroke();
 if(bunny>0){p.save();contourPath(p,points);p.clip();p.translate(pose.gazeX||0,pose.gazeY||0);p.scale(bunny,bunny);p.fillStyle=LAVENDER;
  p.beginPath();p.ellipse(0,h*.2,w*.24,h*.25,0,0,Math.PI*2);p.fill();
  for(const side of [-1,1]){p.beginPath();p.ellipse(side*w*.12,-h*.05,w*.085,h*.21,side*.2,0,Math.PI*2);p.fill();}
  p.shadowBlur=0;p.fillStyle='#fff7ff';p.beginPath();p.ellipse(-w*.16,-h*.29,1.4,2.2,.3,0,Math.PI*2);p.fill();p.restore();
 }
 p.restore();
}
function angerMark(p,x=108,y=23,strength=1){
 if(strength<=0)return;p.save();p.translate(x,y);p.scale(strength,strength);p.lineCap='round';p.lineJoin='round';p.lineWidth=1.8;p.strokeStyle='#ff3b45';p.shadowColor='#ff2638';p.shadowBlur=2;
 // Four inward-facing corners of a vein-pop symbol, mirrored on BOTH axes.
 for(const sx of [-1,1])for(const sy of [-1,1]){p.beginPath();p.moveTo(sx*1.5,sy*6);p.lineTo(sx*1.5,sy*1.5);p.lineTo(sx*6,sy*1.5);p.stroke();}p.restore();
}
function accents(p,{now=0,motion=true,love=0,spark=0,listening=false,thinking=false,speaking=false,sleepy=false,angry=false,surprised=false}={}){
 p.save();p.lineCap='round';p.strokeStyle=PINK;p.fillStyle=PINK;p.lineWidth=1.8;p.shadowColor='#f08cdd';p.shadowBlur=3;
 // Three little blush strokes are a stable part of the signature, not UI chrome.
 for(const cx of [31,97])for(let n=-1;n<=1;n++){p.beginPath();p.moveTo(cx+n*4-1,76);p.lineTo(cx+n*4+1,72);p.stroke();}
 if(spark>.5){p.fillStyle=LAVENDER;for(const [x,y,s] of [[16,29,3],[110,29,4],[112,65,2]])star(p,x,y,s*(motion?1+.12*Math.sin(now/430+x):1));}
 if(love>.5){for(const [x,y,s] of [[18,24,3],[108,20,4]])heart(p,x,y+(motion?Math.sin(now/900+x)*2:0),s);}
 if(listening){p.strokeStyle=LAVENDER;p.lineWidth=1;for(const side of [-1,1])for(let n=0;n<2;n++){p.globalAlpha=motion?.45+.25*Math.sin(now/480+n):.6;p.beginPath();const x=side<0?17:111;p.arc(x,48,5+n*3,side<0?2.2:-.9,side<0?4.1:.9);p.stroke();}}
 if(sleepy){p.strokeStyle=LAVENDER;p.lineWidth=1.2;for(const [x,y,s] of [[101,25,4],[110,19,3]]){p.beginPath();p.moveTo(x,y);p.lineTo(x+s,y);p.lineTo(x,y+s);p.lineTo(x+s,y+s);p.stroke();}}
 if(angry)angerMark(p,108,23);
 if(surprised){p.strokeStyle=PINK;p.lineWidth=1.5;for(const [x,y] of [[106,24],[111,28]]){p.beginPath();p.moveTo(x,y);p.lineTo(x+3,y-3);p.stroke();}}
 p.globalAlpha=1;
 if(thinking){p.fillStyle=LAVENDER;for(let n=0;n<3;n++){p.globalAlpha=motion?.4+.6*(.5+.5*Math.sin(now/400-n)):1;p.beginPath();p.arc(51+n*13,49,2.5,0,Math.PI*2);p.fill();}}

 p.restore();
}
const api={drawBunnyEye:eye,drawBunnyAccents:accents,bunnyEyeContour:eyeContour,drawAngerMark:angerMark};if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
