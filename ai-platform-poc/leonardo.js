(() => {
  globalThis.AiPlatformPoC = globalThis.AiPlatformPoC || {};
  const sessionNames = ['__Secure-better-auth.session_token', 'better-auth.session_token',
    'CF_Access_Token', '__Secure-next-auth.session-token', 'next-auth.session-token'];
  const tokenNames = ['accessToken', 'access_token', 'leonardo_access_token', 'idToken',
    'id_token', 'token', '__Secure-next-auth.session-token', 'next-auth.session-token'];
  const jwt = value => typeof value === 'string' && /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
  const decode = value => { try { return decodeURIComponent(value); } catch { return value; } };
  const sessionName = name => sessionNames.includes(name) ||
    /^(__Secure-)?next-auth\.session-token\.\d+$/.test(name) ||
    /^(__Secure-)?better-auth\.session_data(\.\d+)?$/.test(name);
  const tokenName = name => tokenNames.includes(name) || /accesstoken|idtoken/i.test(name);
  const allowed = name => sessionName(name) || tokenName(name) ||
    ['_vcrcs', 'cf_clearance', '__cf_bm', '__Host-next-auth.csrf-token',
      '__Secure-next-auth.callback-url', 'next-auth.csrf-token', 'next-auth.callback-url'].includes(name);
  function cookieToken(map) {
    for (const name of tokenNames) {
      const value = decode(map.get(name)?.value || '');
      if (jwt(value)) return value;
    }
    for (const [name, c] of map) if (/accesstoken|idtoken/i.test(name) && jwt(c.value)) return c.value;
    return '';
  }
  function collect(cookies, pageUrl, now = Date.now()) {
    const url = new URL(pageUrl);
    if (url.origin !== 'https://app.leonardo.ai') throw new Error('Abra https://app.leonardo.ai autenticado.');
    const map = new Map();
    for (const c of [...cookies].sort((a, b) => (b.path || '/').length - (a.path || '/').length)) {
      const domain = c.domain.replace(/^\./, '');
      const path = c.path || '/';
      if (!['leonardo.ai', 'app.leonardo.ai'].includes(domain) ||
          (c.hostOnly && domain !== url.hostname) ||
          !(url.pathname === path || (url.pathname.startsWith(path) &&
            (path.endsWith('/') || url.pathname[path.length] === '/'))) ||
          !allowed(c.name) || !c.value || (c.expirationDate && c.expirationDate * 1000 <= now)) continue;
      if (!map.has(c.name)) map.set(c.name, c);
    }
    const deadline = [now + 24 * 60 * 60 * 1000];
    for (const [name, c] of map) {
      if ((sessionName(name) || tokenName(name)) && c.expirationDate) deadline.push(c.expirationDate * 1000);
    }
    // Require a first chunk and contiguous sequence when the browser stores split sessions.
    for (const base of ['__Secure-next-auth.session-token', 'next-auth.session-token',
      '__Secure-better-auth.session_data', 'better-auth.session_data',
      '__Secure-better-auth.session_token', 'better-auth.session_token']) {
      const chunks = [...map.keys()].filter(name => name.startsWith(base + '.'))
        .map(name => Number(name.slice(base.length + 1))).filter(Number.isInteger).sort((a, b) => a - b);
      if (chunks.some((part, index) => part !== index))
        throw new Error('Cookies de sessão Leonardo incompletos. Entre novamente e recarregue.');
    }
    return {
      cookies: [...map].map(([name, c]) => name + '=' + c.value).join('; '),
      cookieToken: cookieToken(map),
      hasSessionCookie: [...map.keys()].some(sessionName),
      expiresAt: Math.floor(Math.min(...deadline))
    };
  }
  async function fetchSession(fetcher) {
    // Fixed same-origin auth endpoints only; never follow redirects with session data.
    for (const endpoint of ['/api/auth/session', '/api/auth/get-session']) {
      try {
        const response = await fetcher(endpoint, {credentials: 'same-origin', redirect: 'error', cache: 'no-store',
          signal: globalThis.AbortSignal?.timeout?.(8000)});
        if (!response.ok) continue;
        const body = await response.json();
        for (const value of [body, body?.data, body?.session, body?.data?.session]) {
          if (!value || typeof value !== 'object') continue;
          for (const key of ['accessToken', 'access_token', 'idToken', 'token', 'bearerToken']) {
            if (jwt(value[key])) return value[key];
          }
        }
      } catch {}
    }
    return '';
  }
  function payload(data, pageUrl, userAgent, accountKey, sessionToken = '', now = Date.now()) {
    if (new URL(pageUrl).origin !== 'https://app.leonardo.ai') throw new Error('Origem Leonardo inválida.');
    if (typeof accountKey !== 'string' || !accountKey.trim() || accountKey.length > 191)
      throw new Error('Informe a chave exata da conta cadastrada no portal (até 191 caracteres).');
    const token = jwt(sessionToken) ? sessionToken : (data.cookieToken || '');
    if (!data.cookies || (!data.hasSessionCookie && !token))
      throw new Error('Sessão Leonardo ausente. _vcrcs/cf_clearance sozinhos não autenticam. Entre novamente.');
    let expiresAt = Math.min(data.expiresAt, now + 24 * 60 * 60 * 1000);
    if (token) {
      try {
        const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
        if (claims.exp !== undefined) {
          if (!Number.isSafeInteger(claims.exp) || claims.exp <= 0) throw new Error();
          expiresAt = Math.min(expiresAt, claims.exp * 1000);
        }
      } catch { throw new Error('JWT Leonardo malformado. Entre novamente.'); }
    }
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= now)
      throw new Error('Sessão Leonardo vencida. Entre novamente e recarregue.');
    return {accountKey: accountKey.trim(), label: 'Leonardo.Ai', toolId: 'leonardo',
      planType: 'maestro', chatgptAccountId: '', accessToken: token,
      cookies: data.cookies, userAgent, expiresAt};
  }
  globalThis.AiPlatformPoC.Leonardo = {collect, fetchSession, payload};
})();
