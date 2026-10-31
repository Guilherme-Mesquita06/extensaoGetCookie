const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '../ai-platform-poc');
const ctx = {URL};
vm.runInNewContext(fs.readFileSync(path.join(dir, 'gemini.js'), 'utf8'), ctx);
const gemini = ctx.AiPlatformPoC.Gemini;
const now = 1800000000000;
const cookie = (name, value, extra = {}) => ({
  name, value, domain: '.google.com', path: '/', expirationDate: now / 1000 + 7200, ...extra
});
test('collects HttpOnly cookies, preserves equals and caps expiry using rotation cookie', () => {
  const result = gemini.collect([
    cookie('SID', 'synthetic==', {httpOnly: true}),
    cookie('SAPISID', 'synthetic'),
    cookie('__Secure-1PSIDTS', 'rotation', {expirationDate: now / 1000 + 300}),
    cookie('NID', 'expired', {expirationDate: now / 1000 - 1}),
    cookie('tracking', 'excluded'),
    cookie('SID', 'wrong-host', {domain: 'accounts.google.com'}),
    cookie('SID', 'wrong-path', {path: '/other'})
  ], 'https://gemini.google.com/app', now);
  assert.match(result.cookies, /SID=synthetic==/);
  assert.doesNotMatch(result.cookies, /expired|excluded|wrong/);
  assert.equal(result.expiresAt, now + 300000);
});
test('requires both Google auth groups and ignores unrelated domains', () => {
  for (const cookies of [[], [cookie('SID', 'one')], [
    cookie('SID', 'one', {domain: 'evilgoogle.com'}), cookie('SAPISID', 'two')
  ]]) assert.throws(() => gemini.collect(cookies, 'https://gemini.google.com/app', now));
});
test('builds exact tool identity and numeric Google slot with empty token', () => {
  const data = {cookies: 'SID=fake; SAPISID=fake', expiresAt: now + 300000};
  for (const [url, slot] of [['/app', '0'], ['/u/2/app', '2'], ['/app?authuser=3', '3']]) {
    const payload = gemini.payload(data, 'https://gemini.google.com' + url, 'test-agent', 'conta-gemini-01');
    assert.equal(payload.chatgptAccountId, slot);
    assert.equal(payload.toolId, 'gemini');
    assert.equal(payload.accessToken, '');
    assert.equal(payload.accountKey, 'conta-gemini-01');
  }
  assert.throws(() => gemini.payload(data, 'https://gemini.google.com/app?authuser=email@example.com', '', 'x'));
});
test('content orchestration retains legacy strategies and adds Gemini', async () => {
  for (const hostname of ['flow.google.com', 'grok.com', 'chatgpt.com', 'gemini.google.com']) {
    let shown;
    const context = {
      window: {location: {hostname, pathname: '/u/2/app', href: 'https://' + hostname + '/u/2/app'},
        prompt: () => 'conta-gemini-01', alert: message => {throw new Error(message)},
        AiPlatformPoC: {Gemini: gemini, buildPayload: x => x,
          stringifyPayload: JSON.stringify, showModal: x => {shown = x}}},
      navigator: {userAgent: 'test'}, document: {documentElement: {}}, console,
      chrome: {runtime: {sendMessage: (_, callback) => callback({
        cookies: 'SID=fake; SAPISID=fake; sso=fake', expiresAt: now + 300000
      })}},
      fetch: async () => ({ok: false})
    };
    await vm.runInNewContext(fs.readFileSync(path.join(dir, 'content.js'), 'utf8'), context);
    assert.equal(shown.payload.toolId, { 'flow.google.com': 'flow', 'grok.com': 'grok',
      'chatgpt.com': 'chatgpt', 'gemini.google.com': 'gemini' }[hostname]);
  }
});
test('background reads the current cookie store and returns no data on API failure', () => {
  let listener, query, response;
  const runtime = {onMessage: {addListener: fn => {listener = fn;}}};
  const context = {URL, AiPlatformPoC: {Gemini: gemini}, chrome: {
    runtime, cookies: {getAll: (q, callback) => {
      query = q;
      callback([cookie('SID', 'one', {expirationDate: Date.now()/1000+300}),
        cookie('SAPISID', 'two', {expirationDate: Date.now()/1000+300})]);
    }}
  }};
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'background.js'), 'utf8'), context);
  const sender = {tab: {url: 'https://gemini.google.com/app', cookieStoreId: 'firefox-container-2'}};
  assert.equal(listener({action: 'GET_SESSION_COOKIES'}, sender, r => {response = r;}), true);
  assert.equal(query.storeId, 'firefox-container-2');
  assert.match(response.cookies, /SID=one/);
  runtime.lastError = {message: 'denied'};
  listener({action: 'GET_SESSION_COOKIES'}, sender, r => {response = r;});
  assert.ok(response.error);
  assert.equal(response.cookies, undefined);
});
test('duplicate cookie names retain most specific applicable path', () => {
  const result = gemini.collect([
    cookie('SID', 'root'), cookie('SID', 'specific', {domain: 'gemini.google.com', path: '/app'}),
    cookie('SAPISID', 'auth')
  ], 'https://gemini.google.com/app/chat', now);
  assert.match(result.cookies, /SID=specific/);
  assert.doesNotMatch(result.cookies, /SID=root/);
});
