const test=require('node:test'),assert=require('node:assert/strict');
const {Companion,STATES}=require('../preview/companion.js');
test('idle, timed expressing, and photo memory lifecycle',()=>{
 const c=new Companion();assert.equal(c.state,STATES.IDLE);
 c.dispatch('EXPRESS',10,1);assert.equal(c.state,STATES.EXPRESSING);c.tick(4510);assert.equal(c.state,STATES.IDLE);
 c.dispatch('PHOTO',5000);assert.equal(c.state,STATES.ERROR);
 c.dispatch('RETRY',5100);c.dispatch('LOAD_MEMORY',5200,{name:'memory.jpg'});c.dispatch('ONLINE',5300,false);
 c.dispatch('PHOTO',5400);assert.equal(c.state,STATES.SHOWING_PHOTO);c.tick(100000);assert.equal(c.state,STATES.SHOWING_PHOTO);
 c.dispatch('HOME',100001);assert.equal(c.state,STATES.IDLE);
});
test('voice works offline, rejects competing action, completes and cancels',()=>{
 const c=new Companion();c.dispatch('ONLINE',0,false);c.dispatch('VOICE',1);
 assert.equal(c.state,STATES.PLAYING_VOICE);assert.equal(c.dispatch('LISTEN',2),false);
 c.tick(5001);assert.equal(c.state,STATES.IDLE);c.dispatch('VOICE',6000);c.dispatch('HOME',6100);c.tick(20000);assert.equal(c.state,STATES.IDLE);
});
test('mock question answer flow and response dismissal',()=>{
 const c=new Companion();c.dispatch('LISTEN',0);assert.equal(c.state,STATES.LISTENING);
 c.dispatch('FINISH_LISTENING',100,'Hello');assert.equal(c.state,STATES.WAITING_FOR_AI);
 c.tick(2300);assert.equal(c.state,STATES.SHOWING_RESPONSE);assert.match(c.response,/prewritten/);
 c.tick(17300);assert.equal(c.state,STATES.SHOWING_RESPONSE);c.dispatch('RESPONSE_FINISHED',17301,{owner:c.requestId});assert.equal(c.state,STATES.IDLE);
});
test('empty input, offline AI and listening timeout enter recoverable errors',()=>{
 for(const mode of ['empty','offline','timeout']){
 const c=new Companion();if(mode==='offline')c.dispatch('ONLINE',0,false);c.dispatch('LISTEN',0);
 if(mode==='timeout')c.tick(20000);else c.dispatch('FINISH_LISTENING',100,mode==='empty'?' ':'Hello');
 assert.equal(c.state,STATES.ERROR);c.dispatch('RETRY',21000);assert.equal(c.state,STATES.IDLE);
 }
});
test('cancelled AI cannot later overwrite state; disconnect and timeout recover',()=>{
 const c=new Companion();c.dispatch('LISTEN',0);c.dispatch('FINISH_LISTENING',1,'Hi');c.dispatch('HOME',100);c.tick(3000);assert.equal(c.state,STATES.IDLE);
 c.dispatch('LISTEN',4000);c.dispatch('FINISH_LISTENING',4001,'Hi');c.dispatch('ONLINE',4100,false);assert.equal(c.state,STATES.ERROR);
 c.dispatch('HOME',4200);c.dispatch('ONLINE',4200,true);c.mockAI=false;c.dispatch('LISTEN',4300);c.dispatch('FINISH_LISTENING',4400,'Hi');c.tick(14400);assert.equal(c.state,STATES.ERROR);
});

test('only IDLE can admit an action; primary state cannot be assigned by modules',()=>{
 const c=new Companion();
 assert.equal(Reflect.set(c,'state',STATES.ERROR),false);
 c.dispatch('EXPRESSION_REQUESTED',0,1);
 for(const e of ['EXPRESSION_REQUESTED','PHOTO_SELECTED','VOICE_MESSAGE_SELECTED','LISTENING_REQUESTED'])assert.equal(c.dispatch(e,1,2),false);
 assert.equal(c.state,STATES.EXPRESSING);
});
test('Home and cancellation clean up every active state without late completion',()=>{
 const entries=[c=>{},c=>c.dispatch('EXPRESS',0,1),c=>{c.dispatch('LOAD_MEMORY',0,{name:'x'});c.dispatch('PHOTO',0);},c=>c.dispatch('VOICE',0),c=>c.dispatch('LISTEN',0),c=>{c.dispatch('LISTEN',0);c.dispatch('FINISH_LISTENING',1,'voice_002');},c=>{c.dispatch('LISTEN',0);c.dispatch('FINISH_LISTENING',1,'voice_002');c.tick(2300);},c=>c.dispatch('FAIL',0,'test')];
 for(const enter of entries)for(const cancel of ['HOME_REQUESTED','CANCEL_REQUESTED']){
 const c=new Companion();enter(c);const owner=c.requestId;
 assert.equal(c.dispatch(cancel,2400),true);assert.equal(c.state,STATES.IDLE);
 for(const name of ['audio','recording','ai'])assert.equal(c.resources[name],false);
 assert.equal(c.dispatch('AI_RESPONSE_RECEIVED',2500,{owner,text:'late'}),false);
 assert.equal(c.state,STATES.IDLE);
 }
});
test('AI completions reject wrong owners and duplicates, with timeout taking precedence',()=>{
 const c=new Companion();c.dispatch('LISTEN',0);c.dispatch('FINISH_LISTENING',1,'Hi');
 const owner=c.requestId;
 assert.equal(c.dispatch('AI_RESPONSE_RECEIVED',100,{owner:owner-1,text:'stale'}),false);
 assert.equal(c.state,STATES.WAITING_FOR_AI);
 c.dispatch('AI_RESPONSE_RECEIVED',200,{owner,text:'Hello'});assert.equal(c.state,STATES.SHOWING_RESPONSE);
 assert.equal(c.dispatch('AI_RESPONSE_RECEIVED',210,{owner,text:'duplicate'}),false);assert.equal(c.response,'Hello');
 c.dispatch('HOME',300);c.dispatch('LISTEN',400);c.dispatch('FINISH_LISTENING',401,'Hi');
 c.dispatch('AI_RESPONSE_RECEIVED',10401,{owner:c.requestId,text:'too late'});
 assert.equal(c.state,STATES.ERROR);assert.equal(c.errorInfo.category,'AI_TIMEOUT');
});
test('same-turn priority: cancel beats error; failure beats AI completion',()=>{
 for(const order of [false,true]){
 const c=new Companion();c.dispatch('LISTEN',0);c.dispatch('FINISH_LISTENING',1,'Hi');
 let events=[{event:'FAILURE',payload:'failure'},{event:'CANCEL_REQUESTED'}];
 if(order)events.reverse();c.dispatchBatch(events,50);assert.equal(c.state,STATES.IDLE);
 }
 const c=new Companion();c.dispatch('LISTEN',0);c.dispatch('FINISH_LISTENING',1,'Hi');
 c.dispatchBatch([{event:'AI_RESPONSE_RECEIVED',payload:{owner:c.requestId,text:'Hi'}},{event:'FAILURE',payload:'failure'}],100);
 assert.equal(c.state,STATES.ERROR);
});
test('errors preserve structured recovery, require explicit retry and cap it at one',()=>{
 const c=new Companion();c.mockAI=false;c.dispatch('LISTEN',0);c.dispatch('FINISH_LISTENING',1,'Hi');
 c.dispatch('AI_REQUEST_FAILED',10,{owner:c.requestId});
 assert.equal(c.errorInfo.operation,STATES.WAITING_FOR_AI);assert.equal(c.errorInfo.retryable,true);
 c.tick(100);assert.equal(c.state,STATES.ERROR);
 assert.equal(c.dispatch('RETRY_REQUESTED',200),true);assert.equal(c.state,STATES.WAITING_FOR_AI);
 c.dispatch('AI_REQUEST_FAILED',210,{owner:c.requestId});assert.equal(c.errorInfo.retryable,false);
 assert.equal(c.dispatch('RETRY_REQUESTED',220),false);assert.equal(c.state,STATES.ERROR);
 c.dispatch('DISMISS_ERROR',230);assert.equal(c.state,STATES.IDLE);assert.equal(c.errorInfo,null);
});
test('invalid response fails recoverably; bounded logs do not accumulate indefinitely',()=>{
 const c=new Companion();c.dispatch('LISTEN',0);c.dispatch('FINISH_LISTENING',1,'Hi');
 c.dispatch('AI_RESPONSE_RECEIVED',100,{owner:c.requestId,text:''});assert.equal(c.errorInfo.category,'INVALID_RESPONSE');
 c.dispatch('CANCEL_REQUESTED',200);
 for(let i=0;i<10000;i++)c.dispatch('HOME',201+i);
 assert.equal(c.log.length,100);assert.equal(c.state,STATES.IDLE);
});
