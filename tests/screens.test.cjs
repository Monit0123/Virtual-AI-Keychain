const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const {paginateResponse,renderScreen}=require('../preview/screens.js');
const {Companion,STATES}=require('../preview/companion.js');
test('gallery and viewer are subviews of one primary photo state, with wraparound',()=>{
 const c=new Companion();c.dispatch('GALLERY_REQUESTED',0);assert.equal(c.state,STATES.SHOWING_PHOTO);assert.equal(c.view,'gallery');
 assert.equal(c.dispatch('NEXT_PHOTO',1),false);
 c.dispatch('GALLERY_UPDATED',2,3);c.dispatch('PREVIOUS_PHOTO',3);assert.equal(c.galleryIndex,2);c.dispatch('NEXT_PHOTO',4);assert.equal(c.galleryIndex,0);
 c.dispatch('MEMORY_LOADED',5,{name:'memory',index:1});c.dispatch('PHOTO_SELECTED',6);assert.equal(c.view,'viewer');assert.equal(c.galleryIndex,1);
 c.dispatch('GALLERY_REQUESTED',7);assert.equal(c.view,'gallery');c.dispatch('HOME',8);assert.equal(c.state,STATES.IDLE);assert.equal(c.view,'face');
});
test('settings are explicit idle subview with two working toggles and home exit',()=>{
 const c=new Companion();c.dispatch('SETTINGS_REQUESTED',0);assert.equal(c.view,'settings');assert.equal(c.state,STATES.IDLE);
 c.dispatch('TOGGLE_SETTING',1);assert.equal(c.settings.motion,false);c.dispatch('NEXT_SETTING',2);c.dispatch('TOGGLE_SETTING',3);assert.equal(c.settings.speech,true);
 c.dispatch('HOME',4);assert.equal(c.view,'face');assert.equal(c.settings.speech,true);
});
test('response text wraps words and long tokens; pages stay readable until dismissed',()=>{
 const text=('A long memory with some comforting words.\n'+'x'.repeat(66)+'\n').repeat(20);
 const pages=paginateResponse(text);assert.ok(pages.length>1);
 for(const p of pages){assert.ok(p.length<=7);for(const line of p)assert.ok(line.length<=22);}
 const c=new Companion();c.dispatch('LISTEN',0);c.dispatch('INPUT_CAPTURED',1,'Hello');c.dispatch('AI_RESPONSE_RECEIVED',2,{owner:c.requestId,text});
 c.tick(999999);assert.equal(c.state,STATES.SHOWING_RESPONSE);
 for(let i=0;i<1000;i++)c.dispatch('NEXT_PAGE',3+i);assert.equal(c.responsePage,pages.length-1);
 for(let i=0;i<1000;i++)c.dispatch('PREVIOUS_PAGE',2000+i);assert.equal(c.responsePage,0);
 c.dispatch('CANCEL_REQUESTED',5000);assert.equal(c.state,STATES.IDLE);
});
test('all compact screens rasterize safely; photo viewer has no chrome over full-bleed image',()=>{
 const canvas=createCanvas(128,128),ctx=canvas.getContext('2d'),c=new Companion();
 const photo=createCanvas(128,128);photo.getContext('2d').fillRect(0,0,128,128);
 const images=[{name:'local',image:photo}];
 assert.equal(renderScreen(ctx,c,images,0),false);
 c.dispatch('GALLERY_REQUESTED',1);assert.equal(renderScreen(ctx,c,[],1),true);
 c.dispatch('GALLERY_UPDATED',2,1);assert.equal(renderScreen(ctx,c,images,2),true);
 c.dispatch('MEMORY_LOADED',3,{name:'local'});c.dispatch('PHOTO_SELECTED',4);assert.equal(renderScreen(ctx,c,images,4),false);
 c.dispatch('HOME',5);c.dispatch('VOICE',6);assert.equal(renderScreen(ctx,c,images,7),false);
 c.dispatch('HOME',8);c.dispatch('LISTEN',9);renderScreen(ctx,c,images,9);c.dispatch('INPUT_CAPTURED',10,'Hi');renderScreen(ctx,c,images,11);
 c.tick(2210);assert.equal(renderScreen(ctx,c,images,2210),true);
 c.dispatch('FAIL',2211,'Network unavailable. Return home.');assert.equal(renderScreen(ctx,c,images,2211),true);
 c.dispatch('HOME',2212);c.dispatch('SETTINGS_REQUESTED',2213);assert.equal(renderScreen(ctx,c,images,2213),true);
 assert.equal(ctx.globalAlpha,1);assert.equal(ctx.getTransform().a,1);
});
test('network status is only a steady green dot online and draws nothing offline',()=>{
 const canvas=createCanvas(128,128),ctx=canvas.getContext('2d'),c=new Companion();
 c.online=false;renderScreen(ctx,c,[],0);
 assert.ok(ctx.getImageData(0,0,128,128).data.every(v=>v===0),'offline draws no home overlay');
 c.online=true;renderScreen(ctx,c,[],0);
 const pixel=ctx.getImageData(116,9,1,1).data;
 assert.ok(pixel[1]>pixel[0]&&pixel[1]>pixel[2]);assert.equal(pixel[3],255);
 const first=ctx.getImageData(0,0,128,128).data;
 ctx.clearRect(0,0,128,128);renderScreen(ctx,c,[],999);
 assert.deepEqual(ctx.getImageData(0,0,128,128).data,first,'dot never blinks or pulses');
});
