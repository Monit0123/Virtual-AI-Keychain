/* Little Orbit face language: original vector paths, rendered at OLED resolution. */
(function(root){
'use strict';
const LAVENDER='#efd3ff',PINK='#ff9fdd';
function heart(p,x,y,s){p.beginPath();p.moveTo(x,y+s*.7);p.bezierCurveTo(x-s*1.4,y-s*.15,x-s*.7,y-s,x,y-s*.35);p.bezierCurveTo(x+s*.7,y-s,x+s*1.4,y-s*.15,x,y+s*.7);p.fill();}
function star(p,x,y,s){p.beginPath();p.moveTo(x,y-s);p.quadraticCurveTo(x+s*.18,y-s*.18,x+s,y);p.quadraticCurveTo(x+s*.18,y+s*.18,x,y+s);p.quadraticCurveTo(x-s*.18,y+s*.18,x-s,y);p.quadraticCurveTo(x-s*.18,y-s*.18,x,y-s);p.fill();}
function eye(p,cx,cy,left,open,pose){
 p.save();p.translate(cx,cy);p.strokeStyle=LAVENDER;p.fillStyle=LAVENDER;p.lineWidth=2.6;p.lineCap='round';p.lineJoin='round';
 p.shadowColor='#d992ff';p.shadowBlur=3;
 const w=Math.max(10,pose.w),h=Math.max(3,pose.h*1.2),clamp=x=>Math.max(0,Math.min(1,x||0));
 p.scale(1,Math.max(.025,Math.min(1,open)));
 // Crossfade silhouettes with the existing spring clock instead of snapping pupils.
 let remaining=1;const layers=[];
 for(const [shape,strength] of [['love',clamp(pose.love)],['spark',clamp(pose.spark)],['happy',clamp(pose.arch)],['sleepy',clamp((14-pose.h)/6)],['angry',clamp(pose.slope/10)],['sad',clamp(-pose.slope/8)]]){
  const alpha=remaining*strength;remaining-=alpha;if(alpha>0)layers.push([shape,alpha]);
 }
 if(remaining>0)layers.push(['bunny',remaining]);
 for(const [shape,alpha] of layers){
  p.save();p.globalAlpha*=alpha;
  if(shape==='love'){p.fillStyle=PINK;heart(p,0,0,12);}
  else if(shape==='spark')star(p,0,0,14);
  else if(shape==='happy'){p.beginPath();p.moveTo(-w*.42,2);p.bezierCurveTo(-w*.24,-h*.45,w*.24,-h*.45,w*.42,2);p.stroke();}
  else if(shape==='sleepy'){p.beginPath();p.moveTo(-w*.42,-3);p.lineTo(w*.42,-3);p.bezierCurveTo(w*.34,10,-w*.34,10,-w*.42,-3);p.fill();}
  else if(shape==='sad'){
   p.scale(left?1:-1,1);p.beginPath();p.moveTo(-w*.4,-3);p.quadraticCurveTo(0,-4,w*.33,-h*.38);p.quadraticCurveTo(w*.52,h*.4,0,h*.42);p.quadraticCurveTo(-w*.4,h*.38,-w*.4,-3);p.fill();
   p.shadowBlur=0;p.fillStyle='#21152d';p.beginPath();p.ellipse(w*.1,h*.05,w*.12,h*.19,-.18,0,Math.PI*2);p.fill();p.fillStyle='#fff4ff';p.beginPath();p.arc(-w*.23,0,1.3,0,Math.PI*2);p.fill();
  }
  else if(shape==='angry'){
   p.beginPath();p.moveTo(-w*.43,left?-5:3);p.lineTo(w*.43,left?3:-5);p.quadraticCurveTo(w*.28,13,-w*.2,10);p.quadraticCurveTo(-w*.48,8,-w*.43,left?-5:3);p.fill();
  }else{
   p.rotate(Math.min(1,Math.max(0,-pose.slope/8))*(left?-.18:.18));
   p.save();p.fillStyle='#9e75ba';p.globalAlpha*=.23;p.beginPath();p.ellipse(0,0,w*.44,h*.52,0,0,Math.PI*2);p.fill();p.restore();
   p.beginPath();p.ellipse(0,0,w*.44,h*.52,0,0,Math.PI*2);p.stroke();
   p.save();p.beginPath();p.ellipse(0,0,w*.44,h*.52,0,0,Math.PI*2);p.clip();p.translate(pose.gazeX||0,pose.gazeY||0);
   p.beginPath();p.ellipse(0,h*.2,w*.24,h*.25,0,0,Math.PI*2);p.fill();
   for(const side of [-1,1]){p.beginPath();p.ellipse(side*w*.12,-h*.05,w*.085,h*.21,side*.2,0,Math.PI*2);p.fill();}
   p.restore();p.shadowBlur=0;p.fillStyle='#fff7ff';p.beginPath();p.ellipse(-w*.16,-h*.29,1.4,2.2,.3,0,Math.PI*2);p.fill();
  }
  p.restore();
 }
 p.restore();
}
function accents(p,{now=0,motion=true,love=0,spark=0,listening=false,thinking=false,speaking=false,sleepy=false,angry=false,surprised=false}={}){
 p.save();p.lineCap='round';p.strokeStyle=PINK;p.fillStyle=PINK;p.lineWidth=1.8;p.shadowColor='#f08cdd';p.shadowBlur=3;
 // Three little blush strokes are a stable part of the signature, not UI chrome.
 for(const cx of [31,97])for(let n=-1;n<=1;n++){p.beginPath();p.moveTo(cx+n*4-1,76);p.lineTo(cx+n*4+1,72);p.stroke();}
 if(spark>.5){p.fillStyle=LAVENDER;for(const [x,y,s] of [[16,29,3],[110,29,4],[112,65,2]])star(p,x,y,s*(motion?1+.12*Math.sin(now/430+x):1));}
 if(love>.5){for(const [x,y,s] of [[18,24,3],[108,20,4]])heart(p,x,y+(motion?Math.sin(now/900+x)*2:0),s);}
 if(listening){p.strokeStyle=LAVENDER;p.lineWidth=1;for(const side of [-1,1])for(let n=0;n<2;n++){p.globalAlpha=motion?.45+.25*Math.sin(now/480+n):.6;p.beginPath();const x=side<0?17:111;p.arc(x,48,5+n*3,side<0?2.2:-.9,side<0?4.1:.9);p.stroke();}}
 if(sleepy){p.strokeStyle=LAVENDER;p.lineWidth=1.2;for(const [x,y,s] of [[101,25,4],[110,19,3]]){p.beginPath();p.moveTo(x,y);p.lineTo(x+s,y);p.lineTo(x,y+s);p.lineTo(x+s,y+s);p.stroke();}}
 if(angry){p.strokeStyle=PINK;p.lineWidth=1.5;for(const [x,y,s] of [[105,26,-1],[112,26,1],[105,34,-1],[112,34,1]]){p.beginPath();p.moveTo(x,y-2*s);p.lineTo(x,y);p.lineTo(x+2*s,y);p.stroke();}}
 if(surprised){p.strokeStyle=PINK;p.lineWidth=1.5;for(const [x,y] of [[106,24],[111,28]]){p.beginPath();p.moveTo(x,y);p.lineTo(x+3,y-3);p.stroke();}}
 p.globalAlpha=1;
 if(thinking){p.fillStyle=LAVENDER;for(let n=0;n<3;n++){p.globalAlpha=motion?.4+.6*(.5+.5*Math.sin(now/400-n)):1;p.beginPath();p.arc(51+n*13,49,2.5,0,Math.PI*2);p.fill();}}
 if(speaking){p.strokeStyle=LAVENDER;p.lineWidth=2;for(let n=-2;n<=2;n++){const h=motion?2+5*Math.abs(Math.sin(now/170+n*.8)):3;p.beginPath();p.moveTo(64+n*4,84-h);p.lineTo(64+n*4,84+h);p.stroke();}}
 p.restore();
}
const api={drawBunnyEye:eye,drawBunnyAccents:accents};if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
