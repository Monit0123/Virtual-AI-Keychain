/* 128x128 display primitives. No app-state mutation, assets or network calls. */
(function(root){
'use strict';
function paginateResponse(text,columns=22,rows=7){
 const lines=[];
 for(const paragraph of String(text).split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/).filter(Boolean)){
   let part=word;
   if(line&&line.length+part.length+1>columns){lines.push(line);line='';}
   while(part.length>columns){if(line){lines.push(line);line='';}lines.push(part.slice(0,columns));part=part.slice(columns);}
   if(part)line+=(line?' ':'')+part;
  }
  lines.push(line);
 }
 const pages=[];for(let i=0;i<lines.length;i+=rows)pages.push(lines.slice(i,i+rows));
 return pages.length?pages:[['No reply available.']];
}
function text(ctx,label,x,y,size=8,color='#e8d0f4',align='left'){
 ctx.fillStyle=color;ctx.font=`${size}px monospace`;ctx.textAlign=align;ctx.fillText(label,x,y);
}
function base(ctx,title,footer){ctx.fillStyle='#08060d';ctx.fillRect(0,0,128,128);text(ctx,title,8,15,10);ctx.strokeStyle='#46304f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(8,22);ctx.lineTo(120,22);ctx.stroke();if(footer)text(ctx,footer,64,121,7,'#a48bad','center');}
function cover(ctx,image,x,y,w,h){
 if(!image||!(image.width>0)||!(image.height>0))return false;
 ctx.save();
 try{ctx.beginPath();ctx.roundRect(x,y,w,h,4);ctx.clip();const s=Math.max(w/image.width,h/image.height);ctx.drawImage(image,x+(w-image.width*s)/2,y+(h-image.height*s)/2,image.width*s,image.height*s);return true;}
 catch{return false;}finally{ctx.restore();}
}
function drawWifi(ctx,online){
 if(!online)return;
 ctx.save();ctx.fillStyle='#65d68a';
 ctx.beginPath();ctx.arc(116,9,2,0,Math.PI*2);ctx.fill();ctx.restore();
}
function renderScreen(ctx,app,images,now){
 ctx.save();let exclusive=true;
 if(app.view==='gallery'&&app.state==='SHOWING_PHOTO'){
  base(ctx,'Memories',images.length?'A next  B previous':'Hold A: home');
  if(!images.length){text(ctx,'No memories yet',64,57,9,undefined,'center');text(ctx,'Preload photos below',64,75,8,'#baa0c9','center');}
  else{
   const item=images[app.galleryIndex];
   if(!cover(ctx,item?.image,8,28,112,74)){
    ctx.fillStyle='#201527';ctx.fillRect(8,28,112,74);
    text(ctx,'Photo unavailable',64,58,9,'#e8d0f4','center');
    text(ctx,'Try next or previous',64,76,7,'#baa0c9','center');
   }
   text(ctx,`${app.galleryIndex+1}/${images.length}`,64,111,8,'#c8aad8','center');
  }
 }else if(app.view==='settings'&&app.state==='IDLE'){
  base(ctx,'Settings','A next  B toggle');
  const rows=[['Motion',app.settings.motion?'On':'Off'],['Greeting voice',app.settings.speech?'On':'Off']];
  rows.forEach(([label,value],i)=>{if(app.settingIndex===i){ctx.fillStyle='#3c2549';ctx.beginPath();ctx.roundRect(5,32+i*29,118,25,5);ctx.fill();}text(ctx,label,10,48+i*29,8);text(ctx,value,117,48+i*29,8,'#e7bff4','right');});
  text(ctx,'Hold A: home',64,103,7,'#a48bad','center');
 }else if(app.state==='SHOWING_RESPONSE'){
  base(ctx,'Reply · demo','A next  B previous');
  const pages=paginateResponse(app.response);
  const index=Math.min(app.responsePage,pages.length-1);
  pages[index].forEach((line,i)=>text(ctx,line,8,36+i*10,8));
  text(ctx,`${index+1}/${pages.length} · hold A home`,64,110,7,'#bd9dcd','center');
 }else if(app.state==='ERROR'){
  base(ctx,'A little hiccup','B dismiss  Hold A home');
  if(root.drawBunnyEye){ctx.save();ctx.translate(40,17);ctx.scale(.38,.38);const pose={w:27,h:26,slope:-6,arch:0};root.drawBunnyEye(ctx,39,48,true,1,pose);root.drawBunnyEye(ctx,89,48,false,1,pose);ctx.restore();}
  const pages=paginateResponse(app.error,22,6);
  pages[0].forEach((line,i)=>text(ctx,line,8,50+i*10,8));
 }else exclusive=false;
 if(!exclusive){
  if(app.state==='PLAYING_VOICE'){
   ctx.fillStyle='rgba(3,6,6,.85)';ctx.fillRect(4,104,120,22);
   const progress=app.audio?.progress?.();
   text(ctx,app.audio?.isReal?(progress?.loading?'Loading recording':'Playing recording'):'Message · silent mock',64,113,7,'#dbbde8','center');
   const duration=app.voiceMessage?.durationMs||5000;
   ctx.fillStyle='#43284f';ctx.fillRect(16,119,96,2);ctx.fillStyle='#edc9f9';ctx.fillRect(16,119,96*Math.max(0,Math.min(1,(progress?progress.elapsedMs/progress.durationMs:(now-app.entered)/duration))),2);
  }else if(app.state==='LISTENING'||app.state==='WAITING_FOR_AI'){
   const waiting=app.state==='WAITING_FOR_AI';
   ctx.fillStyle='rgba(3,6,6,.9)';ctx.fillRect(4,105,120,20);
   text(ctx,waiting?'Thinking · mock':'Listening · typed',64,116,7,'#dbbde8','center');
   ctx.strokeStyle='#dbaff0';ctx.lineWidth=1;ctx.beginPath();ctx.arc(64,99,2+(1+Math.sin(now/400)),0,Math.PI*2);ctx.stroke();
  }
 }
 // Never put chrome over a completed full-bleed memory photo.
 if(app.state!=='SHOWING_PHOTO'||app.view==='gallery')drawWifi(ctx,app.online);
 ctx.restore();return exclusive;
}
const api={paginateResponse,renderScreen,coverPhoto:cover};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);
})(globalThis);
