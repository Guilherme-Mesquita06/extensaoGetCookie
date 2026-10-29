const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '../ai-platform-poc');
const ctx = {URL, atob};
vm.runInNewContext(fs.readFileSync(path.join(dir, 'leonardo.js'), 'utf8'), ctx);
const leonardo = ctx.AiPlatformPoC.Leonardo;
const now = Date.now();
const url = 'https://app.leonardo.ai/image-generation';
const jwt = exp => [Buffer.from('{"alg":"HS256"}').toString('base64url'),
 Buffer.from(JSON.stringify({exp})).toString('base64url'), 'synthetic'].join('.');
const cookie = (name, value, extra = {}) => ({
 name, value, domain: '.leonardo.ai', path:'/', expirationDate: now/1000+7200, ...extra
});
test('preserves every NextAuth chunk, HttpOnly session and WAF without unrelated cookies', () => {
 const data = leonardo.collect([
  cookie('__Secure-next-auth.session-token.0', 'part0==', {httpOnly:true}),
  cookie('__Secure-next-auth.session-token.1', 'part1'),
  cookie('_vcrcs', 'waf'),
  cookie('tracking', 'bad'),
  cookie('accessToken', 'bad', {domain:'auth.leonardo.ai'}),
  cookie('accessToken', 'bad', {path:'/other'}),
  cookie('accessToken', 'bad', {expirationDate:now/1000-1})
 ], url, now);
 const result = leonardo.payload(data,url,'ua','conta-leonardo-01','',now);
 assert.match(result.cookies,/session-token.0=part0==/);
 assert.match(result.cookies,/session-token.1=part1/);
 assert.match(result.cookies,/_vcrcs=waf/);
 assert.doesNotMatch(result.cookies,/bad/);
 assert.equal(result.accessToken,'');
 assert.equal(result.toolId,'leonardo');
 assert.equal(result.planType,'maestro');
});
test('supports opaque Better Auth cookies without requiring JWT or leaking other hosts', () => {
 const data = leonardo.collect([
  cookie('__Secure-better-auth.session_token','opaque%2Bsession'),
  cookie('CF_Access_Token','bad',{domain:'leonardo.ai',hostOnly:true})
 ],url,now);
 assert.equal(leonardo.payload(data,url,'ua','account','',now).accessToken,'');
 assert.doesNotMatch(data.cookies,/bad/);
});
test('rejects WAF-only, missing chunks, wrong origins and expired tokens', () => {
 const data = leonardo.collect([cookie('_vcrcs','waf'),cookie('cf_clearance','cf')],url,now);
 assert.throws(()=>leonardo.payload(data,url,'','account','',now),/ausente/);
 assert.throws(()=>leonardo.collect([cookie('__Secure-next-auth.session-token.1','one')],url,now),/incompletos/);
 assert.throws(()=>leonardo.collect([], 'https://evil.example',now));
 const session=leonardo.collect([cookie('accessToken',jwt(Math.floor(now/1000)-1))],url,now);
 assert.throws(()=>leonardo.payload(session,url,'','account','',now),/vencida/);
});
test('prefers live endpoint JWT, respects exp and preserves encoded cookie JWT fallback', () => {
 const token=jwt(Math.floor(now/1000)+300);
 const data=leonardo.collect([cookie('accessToken',token.replace(/^e/,'%65'))],url,now);
 assert.equal(data.cookieToken,token);
 const result=leonardo.payload(data,url,'ua','account','',now);
 assert.equal(result.accessToken,token);
 assert.equal(result.expiresAt,Math.floor(now/1000)*1000+300000);
 const newer=jwt(Math.floor(now/1000)+600);
 assert.equal(leonardo.payload(data,url,'ua','account',newer,now).accessToken,newer);
});
test('uses only fixed same-origin session endpoints and tolerates opaque-session responses', async () => {
 const paths=[];
 const token=jwt(Math.floor(now/1000)+600);
 const found=await leonardo.fetchSession(async (path,options)=>{
  paths.push(path);
  assert.equal(options.credentials,'same-origin');
  assert.equal(options.redirect,'error');
  return {ok:true,json:async()=> path.endsWith('get-session')?{data:{session:{accessToken:token}}}:{}};
 });
 assert.equal(found,token);
 assert.deepEqual(paths,['/api/auth/session','/api/auth/get-session']);
 assert.equal(await leonardo.fetchSession(async()=>{throw Error('offline');}),'');
});
test('background uses current Firefox store and orchestrator produces downloadable payload', async () => {
 let listener, query, response, shown;
 const runtime={onMessage:{addListener:fn=>{listener=fn;}}};
 const bg={URL,AiPlatformPoC:{Leonardo:leonardo},chrome:{
  runtime,cookies:{getAll:(q,callback)=>{query=q;callback([cookie('__Secure-better-auth.session_token','session')]);}}
 }};
 vm.runInNewContext(fs.readFileSync(path.join(dir,'background.js'),'utf8'),bg);
 listener({action:'GET_SESSION_COOKIES'},{tab:{url,cookieStoreId:'firefox-container-4'}},r=>{response=r;});
 assert.equal(query.storeId,'firefox-container-4');
 const content={
  window:{location:{hostname:'app.leonardo.ai',href:url},prompt:()=> 'conta-leonardo-01',
   alert:msg=>{throw Error(msg);},AiPlatformPoC:{
    Leonardo:leonardo,buildPayload:x=>x,stringifyPayload:JSON.stringify,showModal:r=>{shown=r;}
   }},
  document:{documentElement:{}},navigator:{userAgent:'test'},console,
  chrome:{runtime:{sendMessage:(_,callback)=>callback(response)}},
  fetch:async()=>({ok:true,json:async()=>({})})
 };
 await vm.runInNewContext(fs.readFileSync(path.join(dir,'content.js'),'utf8'),content);
 assert.equal(shown.payload.toolId,'leonardo');
 assert.equal(JSON.parse(shown.jsonText).accountKey,'conta-leonardo-01');
});
