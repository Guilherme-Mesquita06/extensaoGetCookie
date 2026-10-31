const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '../ai-platform-poc');
const context = {URL, atob};
vm.runInNewContext(fs.readFileSync(path.join(dir, 'vyral.js'), 'utf8'), context);
const vyral = context.AiPlatformPoC.Vyral;
const now = 1800000000000;
const jwt = exp => [Buffer.from('{"alg":"HS256"}').toString('base64url'),
  Buffer.from(JSON.stringify({exp})).toString('base64url'), 'synthetic'].join('.');
const cookie = (name, value, extra = {}) => ({
  name, value, domain: '.vyral.com.br', path: '/', expirationDate: now/1000+7200, ...extra
});
const url = 'https://app.vyral.com.br/dashboard';
test('collects real authentication cookie names including HttpOnly and encoded values', () => {
  const token = jwt(now/1000+300);
  const data = vyral.collect([
    cookie('dashboardToken', encodeURIComponent(token), {httpOnly: true}),
    cookie('userSession', 'context=='),
    cookie('dashboardToken', 'bad', {domain: 'evilvyral.com.br'}),
    cookie('dashboardToken', 'bad', {path: '/other'}),
    cookie('userSession', 'bad', {domain: 'vyral.com.br', hostOnly: true}),
    cookie('tracking', 'bad'),
    cookie('__cf_bm', 'old', {expirationDate: now/1000-1})
  ], url, now);
  const payload = vyral.payload(data, url, 'test-agent', 'conta-vyral-01', null, now);
  assert.equal(payload.accessToken, token);
  assert.equal(payload.expiresAt, now+300000);
  assert.equal(payload.toolId, 'vyral');
  assert.equal(payload.chatgptAccountId, '');
  assert.match(payload.cookies, /userSession=context==/);
  assert.doesNotMatch(payload.cookies, /bad|old/);
});
test('refuses context-only, expired JWT, wrong origin and missing account key', () => {
  const onlyContext = vyral.collect([cookie('userSession', 'context')], url, now);
  assert.throws(() => vyral.payload(onlyContext, url, '', 'account', null, now), /dashboardToken/);
  const expired = vyral.collect([cookie('dashboardToken', jwt(now/1000-1))], url, now);
  assert.throws(() => vyral.payload(expired, url, '', 'account', null, now), /vencida/);
  assert.throws(() => vyral.collect([], 'https://evil.example', now));
  assert.throws(() => vyral.payload(onlyContext, url, '', '', null, now));
});
test('supports a known localStorage JWT and emits a matching dashboard cookie', () => {
  const token = jwt(now/1000+900);
  const data = vyral.collect([cookie('userSession', 'context')], url, now);
  const storage = {getItem: key => key === 'accessToken' ? JSON.stringify(token) : null};
  const result = vyral.payload(data, url, 'ua', 'account', storage, now);
  assert.equal(result.accessToken, token);
  assert.match(result.cookies, /dashboardToken=/);
  assert.equal(result.expiresAt, now+900000);
  assert.throws(() => vyral.payload(data, url, '', 'account', {getItem: () => {throw Error();}}, now));
});
test('accepts opaque dashboard cookies and limits lifetime to the cookie deadline', () => {
  const data = vyral.collect([cookie('dashboardToken', 'opaque+token==', {expirationDate: now/1000+120})], url, now);
  const result = vyral.payload(data, url, 'ua', 'account', null, now);
  assert.equal(result.accessToken, 'opaque+token==');
  assert.equal(result.expiresAt, now+120000);
  const expiredCookie = vyral.collect([cookie('dashboardToken', 'expired', {expirationDate: now/1000-1})], url, now);
  assert.throws(() => vyral.payload(expiredCookie, url, '', 'account', null, now));
});
test('does not infer an API token from arbitrary localStorage data', () => {
  const data = vyral.collect([], url, now);
  const queried = [];
  assert.throws(() => vyral.payload(data, url, '', 'account',
    {getItem: key => {queried.push(key); return null;}}, now));
  assert.deepEqual(queried, ['dashboardToken', 'accessToken', 'access_token']);
});
test('orchestrator shows downloadable Vyral payload using the existing modal', async () => {
  let result;
  const token = jwt(now/1000+300);
  const data = vyral.collect([cookie('dashboardToken', token)], url, now);
  // Payload uses actual current time; a fixed future token is used for deterministic data.
  const ctx = {
    window: {location: {hostname: 'app.vyral.com.br', href: url},
      prompt: () => 'conta-vyral-01', AiPlatformPoC: {
        Vyral: vyral, buildPayload: x => x, stringifyPayload: JSON.stringify,
        showModal: value => {result = value;}}, alert: msg => {throw Error(msg);}},
    navigator: {userAgent: 'test'}, document: {documentElement: {}}, console,
    chrome: {runtime: {sendMessage: (_, callback) => callback(data)}}
  };
  await vm.runInNewContext(fs.readFileSync(path.join(dir, 'content.js'), 'utf8'), ctx);
  assert.equal(result.payload.toolId, 'vyral');
  assert.equal(result.payload.accountKey, 'conta-vyral-01');
  assert.equal(JSON.parse(result.jsonText).accessToken, token);
});
test('background reads current cookie store and uses Vyral collector', () => {
  let listener, query, response;
  const runtime = {onMessage: {addListener: fn => {listener = fn;}}};
  const ctx = {URL, AiPlatformPoC: {Vyral: vyral}, chrome: {
    runtime, cookies: {getAll: (q, cb) => {
      query = q; cb([cookie('dashboardToken', 'opaque', {expirationDate: Date.now()/1000+300})]);
    }}
  }};
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'background.js'), 'utf8'), ctx);
  assert.equal(listener({action: 'GET_SESSION_COOKIES'},
    {tab: {url, cookieStoreId: 'firefox-container-3'}}, r => {response = r;}), true);
  assert.equal(query.storeId, 'firefox-container-3');
  assert.equal(response.dashboardToken, 'opaque');
});
