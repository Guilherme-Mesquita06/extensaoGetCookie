(() => {
  globalThis.AiPlatformPoC = globalThis.AiPlatformPoC || {};
  const names = new Set(['dashboardToken', 'userSession', 'cf_clearance', '__cf_bm']);
  function decode(value) {
    try { return decodeURIComponent(value); } catch { return value; }
  }
  function tokenExpiry(token) {
    if (!/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
    try {
      const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, '=')));
      if (claims.exp === undefined) return null;
      if (!Number.isSafeInteger(claims.exp) || claims.exp <= 0) throw new Error();
      return claims.exp * 1000;
    } catch { throw new Error('Token Vyral malformado. Entre novamente e recarregue a página.'); }
  }
  function collect(cookies, pageUrl, now = Date.now()) {
    const url = new URL(pageUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'app.vyral.com.br')
      throw new Error('Abra https://app.vyral.com.br na conta desejada.');
    const selected = new Map();
    for (const c of [...cookies].sort((a, b) => (b.path || '/').length - (a.path || '/').length)) {
      const domain = c.domain.replace(/^\./, '');
      const path = c.path || '/';
      const matchesPath = url.pathname === path ||
        (url.pathname.startsWith(path) && (path.endsWith('/') || url.pathname[path.length] === '/'));
      if (!['vyral.com.br', 'app.vyral.com.br'].includes(domain) ||
          (c.hostOnly && domain !== url.hostname) || !matchesPath ||
          !names.has(c.name) || !c.value || (c.expirationDate && c.expirationDate * 1000 <= now)) continue;
      if (!selected.has(c.name)) selected.set(c.name, c);
    }
    const dashboardToken = decode(selected.get('dashboardToken')?.value || '').trim();
    const deadlines = [now + 24 * 60 * 60 * 1000];
    // Only authentication cookies bound validity, not unrelated WAF/telemetry.
    for (const name of ['dashboardToken', 'userSession']) {
      const end = selected.get(name)?.expirationDate;
      if (end) deadlines.push(end * 1000);
    }
    return {
      cookies: [...selected].map(([name, c]) => name + '=' + c.value).join('; '),
      dashboardToken, expiresAt: Math.floor(Math.min(...deadlines))
    };
  }
  function payload(data, pageUrl, userAgent, accountKey, storage, now = Date.now()) {
    if (new URL(pageUrl).origin !== 'https://app.vyral.com.br') throw new Error('Origem Vyral inválida.');
    if (typeof accountKey !== 'string' || !accountKey.trim() || accountKey.length > 191)
      throw new Error('Informe a chave exata da conta cadastrada no portal (até 191 caracteres).');
    let token = data.dashboardToken || '';
    // Known keys only; do not scan arbitrary storage or send its contents.
    if (!token && storage) {
      for (const key of ['dashboardToken', 'accessToken', 'access_token']) {
        let value;
        try { value = storage.getItem(key); } catch { continue; }
        if (!value) continue;
        try { value = JSON.parse(value); } catch {}
        if (typeof value === 'string' && /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
          token = value;
          break;
        }
      }
    }
    if (!token) throw new Error('dashboardToken ausente. userSession sozinho não autentica a API. Entre no Vyral e recarregue.');
    if (/[\r\n\0]/.test(token)) throw new Error('Token Vyral inválido.');
    const jwtExpiry = tokenExpiry(token);
    const expiresAt = Math.min(data.expiresAt, now + 24 * 60 * 60 * 1000, jwtExpiry ?? Infinity);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= now)
      throw new Error('Sessão Vyral vencida. Entre novamente e recarregue a página.');
    let cookies = data.cookies;
    // Keep browser-app authentication consistent when the token only exists in local storage.
    if (!data.dashboardToken) cookies = [cookies, 'dashboardToken=' + encodeURIComponent(token)].filter(Boolean).join('; ');
    return {
      accountKey: accountKey.trim(), label: 'Vyral IA', toolId: 'vyral', planType: 'pro',
      chatgptAccountId: '', accessToken: token, cookies, userAgent, expiresAt
    };
  }
  globalThis.AiPlatformPoC.Vyral = {collect, payload, tokenExpiry};
})();
