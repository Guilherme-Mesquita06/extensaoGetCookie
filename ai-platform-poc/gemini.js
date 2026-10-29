(() => {
  globalThis.AiPlatformPoC = globalThis.AiPlatformPoC || {};
  const names = new Set([
    'SID', 'HSID', 'SSID', 'APISID', 'SAPISID', '__Secure-1PAPISID',
    '__Secure-3PAPISID', '__Secure-1PSID', '__Secure-3PSID',
    '__Secure-1PSIDTS', '__Secure-3PSIDTS', 'SIDCC', '__Secure-1PSIDCC',
    '__Secure-3PSIDCC', '__Secure-BUCKET', '__Secure-OSID', 'AEC', 'NID',
    'OSID', 'OTZ', 'S', 'SEARCH_SAMESITE', '_GRECAPTCHA'
  ]);
  function collect(cookies, pageUrl, now = Date.now()) {
    const url = new URL(pageUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'gemini.google.com')
      throw new Error('Abra https://gemini.google.com/app na conta desejada.');
    const selected = new Map();
    // Keep the first applicable cookie in browser path order; never merge another site's cookie.
    for (const cookie of [...cookies].sort((a, b) => (b.path || '/').length - (a.path || '/').length)) {
      const domain = cookie.domain.replace(/^\./, '');
      const path = cookie.path || '/';
      const pathMatches = url.pathname === path ||
        (url.pathname.startsWith(path) && (path.endsWith('/') || url.pathname[path.length] === '/'));
      if (!['google.com', 'gemini.google.com'].includes(domain) ||
          (cookie.hostOnly && domain !== url.hostname) || !pathMatches ||
          !names.has(cookie.name) || !cookie.value ||
          (cookie.expirationDate && cookie.expirationDate * 1000 <= now)) continue;
      if (!selected.has(cookie.name)) selected.set(cookie.name, cookie);
    }
    const has = name => selected.has(name);
    if (!(has('__Secure-1PSID') || has('SID')) ||
        !(has('SAPISID') || has('__Secure-1PAPISID') || has('__Secure-3PAPISID')))
      throw new Error('Cookies de autenticação ausentes. Entre no Gemini e recarregue a página.');
    // Conservative local deadline, capped by available authentication/rotation cookie expirations.
    const deadlines = [now + 24 * 60 * 60 * 1000];
    for (const [name, cookie] of selected) {
      if (/SID|APISID/.test(name) && cookie.expirationDate) deadlines.push(cookie.expirationDate * 1000);
    }
    return {
      cookies: [...selected].map(([name, c]) => name + '=' + c.value).join('; '),
      expiresAt: Math.floor(Math.min(...deadlines))
    };
  }
  function payload(data, pageUrl, userAgent, accountKey) {
    if (typeof accountKey !== 'string' || !accountKey.trim() || accountKey.length > 191)
      throw new Error('Informe a chave exata da conta cadastrada no portal (até 191 caracteres).');
    const url = new URL(pageUrl);
    const slot = url.pathname.match(/\/u\/(\d+)(?:\/|$)/)?.[1] ||
      url.searchParams.get('authuser') || '0';
    if (!/^\d+$/.test(slot)) throw new Error('Abra a conta usando /u/N ou authuser numérico.');
    return {
      accountKey: accountKey.trim(), label: 'Google Gemini', toolId: 'gemini',
      planType: 'advanced', chatgptAccountId: slot, accessToken: '',
      cookies: data.cookies, userAgent, expiresAt: data.expiresAt
    };
  }
  globalThis.AiPlatformPoC.Gemini = { collect, payload };
})();
