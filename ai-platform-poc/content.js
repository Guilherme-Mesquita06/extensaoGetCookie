(async () => {
  // ==============================================================================
  // 1. GESTOR DE ESTRATÉGIAS (Design Pattern: Strategy)
  // ==============================================================================
  const PlatformManager = {
    strategies: [],
    register(strategy) { this.strategies.push(strategy); },
    getStrategy(hostname) { return this.strategies.find(s => s.matches(hostname)); }
  };

  // ==============================================================================
  // 2. MÓDULOS ISOLADOS DAS PLATAFORMAS (Desacoplamento)
  // ==============================================================================

  PlatformManager.register({
    name: 'Google Gemini',
    matches: hostname => hostname === 'gemini.google.com',
    extract: async (_rawCookies, response) => {
      const key = window.prompt('Chave exata da conta Gemini cadastrada no portal:');
      if (key === null) throw new Error('Exportação cancelada.');
      return window.AiPlatformPoC.Gemini.payload(response, window.location.href, navigator.userAgent, key);
    }
  });

  PlatformManager.register({
    name: 'Vyral IA',
    matches: hostname => hostname === 'app.vyral.com.br',
    extract: async (_rawCookies, response) => {
      const key = window.prompt('Chave exata da conta Vyral cadastrada no portal:');
      if (key === null) throw new Error('Exportação cancelada.');
      let storage;
      try { storage = window.localStorage; } catch {}
      return window.AiPlatformPoC.Vyral.payload(response, window.location.href, navigator.userAgent, key, storage);
    }
  });

  // --- ESTRATÉGIA DO GOOGLE FLOW ---
  // --- ESTRATÉGIA DO GOOGLE FLOW ---
  PlatformManager.register({
    name: 'Google Flow',
    matches: (hostname) => ['flow.google.com'].includes(hostname),
    extract: async (rawCookies) => {
      const cookieMap = {};
      rawCookies.split(';').forEach(pair => {
        const parts = pair.trim().split('=');
        if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
      });

      // Lista exata de cookies MESTRES e ROTATIVOS exigida pelo documento
      const targetNames = [
        "SID", "HSID", "SSID", "APISID", "SAPISID",
        "__Secure-1PAPISID", "__Secure-3PAPISID",
        "__Secure-1PSID", "__Secure-3PSID",
        "__Secure-1PSIDTS", "__Secure-3PSIDTS",
        "SIDCC", "__Secure-1PSIDCC", "__Secure-3PSIDCC",
        "__Secure-BUCKET", "__Secure-OSID", "_GRECAPTCHA", 
        "AEC", "NID", "OSID", "OTZ", "S", "SEARCH_SAMESITE"
      ];

      const formattedPairs = targetNames
        .filter(name => cookieMap[name] !== undefined)
        .map(name => `${name}=${cookieMap[name]}`);

      // LÓGICA DO PASSO 2.1: Identificar o "Slot" da Conta Google
      // Exemplo: https://flow.google.com/u/2/ -> Extrai o "2"
      let userSlot = "0"; // Valor padrão seguro
      const slotMatch = window.location.pathname.match(/\/u\/(\d+)/);
      if (slotMatch && slotMatch[1]) {
        userSlot = slotMatch[1];
      }

      // Retorna exatamente a estrutura JSON exigida no Passo 3.3
      return {
        "accountKey": "conta-piloto-01",
        "label": "Flow 01 (Ultra)",
        "toolId": "flow",
        "planType": "ultra",
        "chatgptAccountId": userSlot, // Extraído dinamicamente da URL
        "accessToken": "",            // Obrigatório ser vazio
        "cookies": formattedPairs.join('; '),
        "userAgent": navigator.userAgent // Adicionado conforme Passo 3.2
      };
    }
  });

  // --- ESTRATÉGIA DO GROK ---
  PlatformManager.register({
    name: 'Grok',
    matches: (hostname) => ['grok.com', 'x.com'].includes(hostname),
    extract: async (rawCookies) => {
      const cookieMap = {};
      rawCookies.split(';').forEach(pair => {
        const parts = pair.trim().split('=');
        if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
      });

      const targetNames = [
        "__cf_bm", "__cuid", "__stripe_mid", "__stripe_sid", 
        "cf_clearance", "grok_device_id", "i18nextLng", 
        "sso", "sso-rw", "team-id", "x-userid"
      ];

      const formattedPairs = targetNames
        .filter(name => cookieMap[name] !== undefined)
        .map(name => `${name}=${cookieMap[name]}`);

      const extractedPlanType = cookieMap['plan_type'] || cookieMap['grok_plan'] || cookieMap['tier'] || "supergrok";

      return {
        "accountKey": "conta-piloto-01",
        "label": "Grok 02 (SuperGrok)",
        "toolId": "grok",
        "planType": extractedPlanType,
        "cookies": formattedPairs.join('; ')
      };
    }
  });

  // --- ESTRATÉGIA DO CHATGPT ---
  PlatformManager.register({
    name: 'ChatGPT',
    matches: (hostname) => ['chatgpt.com', 'chat.openai.com'].includes(hostname),
    extract: async (rawCookies) => {
      const cookieMap = {};
      rawCookies.split(';').forEach(pair => {
        const parts = pair.trim().split('=');
        if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
      });

      const targetNames = ["__Secure-next-auth.session-token.0", "__Secure-next-auth.session-token.1", "cf_clearance", "oai-did", "__cf_bm"];
      const formattedPairs = targetNames
        .filter(name => cookieMap[name] !== undefined)
        .map(name => `${name}=${cookieMap[name]}`);

      let accessToken = "";
      let expiresAt = null;
      let chatgptAccountId = "";
      let planType = "free";

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
            chatgptAccountId = findValueByKey(a, 'account_id') || findValueByKey(a, 'id') || "";
            const extractedPlan = findValueByKey(a, 'plan_type');
            if (extractedPlan) planType = extractedPlan;
          }
        }
      } catch (e) {
        console.error('[AI Platform PoC] Falha na API do ChatGPT:', e);
      }

      return {
        "accountKey": "conta-piloto-01",
        "toolId": "chatgpt",
        "chatgptAccountId": chatgptAccountId,
        "planType": planType,
        "accessToken": accessToken,
        "cookies": formattedPairs.join('; '),
        "userAgent": navigator.userAgent,
        "expiresAt": expiresAt
      };
    }
  });

  // ==============================================================================
  // 3. ORQUESTRADOR PRINCIPAL
  // ==============================================================================
  if (!document.documentElement) return;
  
  const api = window.AiPlatformPoC;
  if (!api || !api.showModal) return;

  const hostname = window.location.hostname.replace('www.', '');
  const platform = PlatformManager.getStrategy(hostname);
  
  if (!platform) return; // Se não for ChatGPT, Grok ou Flow, não faz nada

  // Pede os cookies brutos (incluindo .google.com) ao background
  const getCookies = () => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "GET_SESSION_COOKIES" }, (response) => {
      if (chrome.runtime.lastError || response?.error) {
        reject(new Error(response?.error || 'Não foi possível comunicar com a extensão.'));
        return;
      }
      resolve(response || {});
    });
  });

  try {
    const response = await getCookies();
    const sessionData = await platform.extract(response.cookies || "", response);
    
    const payload = api.buildPayload(sessionData);
    const jsonText = api.stringifyPayload(payload);

    api.showModal({ platformName: platform.name, payload, jsonText });
  } catch (error) {
    console.error('[AI Platform PoC] Erro:', error.message);
    if (['gemini.google.com', 'app.vyral.com.br'].includes(hostname)) window.alert(error.message);
  }
})();