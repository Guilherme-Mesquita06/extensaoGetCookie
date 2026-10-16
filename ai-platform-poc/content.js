(async () => {
  const platformName = 'ChatGPT';
  if (!document.documentElement) return;
  if (window.__aiPlatformPoCAlreadyShown) return;
  window.__aiPlatformPoCAlreadyShown = true;

  const api = window.AiPlatformPoC;

  // Busca os cookies crus do background.js
  const getCookies = () => new Promise(resolve => {
    chrome.runtime.sendMessage({ action: "GET_SESSION_COOKIES" }, (response) => {
      resolve(response && response.cookies ? response.cookies : "");
    });
  });

  const rawCookies = await getCookies();

  // Função para filtrar e extrair apenas os cookies de sessão no formato limpo desejado
 function formatSessionCookies(cookieString) {
  if (!cookieString) return "";
  
  // Apenas os cookies vitais para a sessão
  const targetNames = [
    "__Secure-next-auth.session-token.0",
    "__Secure-next-auth.session-token.1",
    "cf_clearance",
    "oai-did",
    "__cf_bm"
  ];

  const cookieMap = {};
  cookieString.split(';').forEach(pair => {
    const parts = pair.trim().split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookieMap[name] = value;
    }
  });

  const formattedPairs = [];
  targetNames.forEach(name => {
    if (cookieMap[name] !== undefined) {
      formattedPairs.push(`${name}=${cookieMap[name]}`);
    }
  });

  return formattedPairs.join('; ');
}

  const cleanedCookies = formatSessionCookies(rawCookies);

  let accessToken = "";
  let expiresAt = null;
  let chatgptAccountId = "";

  // Função auxiliar para procurar por uma chave específica em qualquer nível do objeto JSON
  function findValueByKey(obj, targetKey) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj[targetKey]) return obj[targetKey];
    
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object') {
        const found = findValueByKey(obj[key], targetKey);
        if (found) return found;
      }
    }
    return null;
  }

  try {
    const sessionRes = await fetch('/api/auth/session');
    if (sessionRes.ok) {
      const s = await sessionRes.json();
      accessToken = s.accessToken || "";
      expiresAt = s.expires ? new Date(s.expires).getTime() : null;

      const accountRes = await fetch('/backend-api/accounts/check/v4-2023-04-27', {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
      
      if (accountRes.ok) {
        const a = await accountRes.json();
        // Extrai dinamicamente o account_id da resposta da API
        chatgptAccountId = findValueByKey(a, 'account_id') || findValueByKey(a, 'id') || "";
      }
    }
  } catch (e) {
    console.error('[AI Platform PoC] Falha ao extrair dados da API:', e);
  }

  const sessionData = {
    "_comment": "Arquivo exportado com cookies limpos, token e accountId dinâmico da sessão atual.",
    "accountKey": "conta-piloto-01",
    "toolId": "chatgpt",
    "chatgptAccountId": chatgptAccountId, // Preenchido dinamicamente via "account_id"
    "planType": "free",
    "accessToken": accessToken,
    "cookies": cleanedCookies, // Cookies formatados e limpos
    "userAgent": navigator.userAgent,
    "expiresAt": expiresAt
  };

  const payload = api.buildPayload(sessionData);
  const jsonText = api.stringifyPayload(payload);

  if (!api.validatePayload(payload)) {
    console.error('[AI Platform PoC] Estrutura inválida.', payload);
  }

  api.showModal({ platformName, payload, jsonText });
})();