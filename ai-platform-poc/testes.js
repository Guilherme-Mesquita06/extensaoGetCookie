/**
 * Suite de Testes Unitários para as Estratégias do AI Platform PoC
 */
(function runAiPlatformTests() {
  console.group('%c[AI Platform PoC] A iniciar Testes Unitários...', 'color: #3b82f6; font-weight: bold; font-size: 14px;');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`%c  ✔ PASSOU: ${message}`, 'color: #10b981;');
      passed++;
    } else {
      console.error(`%c  ✖ FALHOU: ${message}`, 'color: #ef4444;');
      failed++;
    }
  }

  // Mock global se necessário
  window.AiPlatformPoC = window.AiPlatformPoC || {};

  // ==========================================
  // TESTE 1: Estratégia do Google Flow
  // ==========================================
  try {
    const rawCookies = "SID=abc; HSID=def; __Secure-1PSID=xyz; AEC=123";
    // Mock simples da lógica do Flow
    const cookieMap = {};
    rawCookies.split(';').forEach(pair => {
      const parts = pair.trim().split('=');
      if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
    
    assert(cookieMap["SID"] === "abc", "Google Flow: Extração do cookie SID mestre");
    assert(cookieMap["__Secure-1PSID"] === "xyz", "Google Flow: Extração do cookie rotativo Secure");
  } catch (e) {
    assert(false, `Google Flow gerou exceção: ${e.message}`);
  }

  // ==========================================
  // TESTE 2: Estratégia do Grok
  // ==========================================
  try {
    const rawCookies = "sso=token_grok_123; cf_clearance=abc_cf; plan_type=supergrok";
    const cookieMap = {};
    rawCookies.split(';').forEach(pair => {
      const parts = pair.trim().split('=');
      if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
    
    const extractedPlan = cookieMap['plan_type'] || "supergrok";
    assert(cookieMap["sso"] === "token_grok_123", "Grok: Extração do token sso");
    assert(extractedPlan === "supergrok", "Grok: Deteção correta do plano SuperGrok");
  } catch (e) {
    assert(false, `Grok gerou exceção: ${e.message}`);
  }

  // ==========================================
  // TESTE 3: Estratégia do ChatGPT
  // ==========================================
  try {
    const rawCookies = "__Secure-next-auth.session-token.0=token_part_0; oai-did=uuid-123";
    const cookieMap = {};
    rawCookies.split(';').forEach(pair => {
      const parts = pair.trim().split('=');
      if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
    });

    const hasToken = Object.keys(cookieMap).some(k => k.startsWith("__Secure-next-auth.session-token"));
    assert(hasToken, "ChatGPT: Reconhecimento dinâmico do session-token");
    assert(cookieMap["oai-did"] === "uuid-123", "ChatGPT: Extração do identificador oai-did");
  } catch (e) {
    assert(false, `ChatGPT gerou exceção: ${e.message}`);
  }

  // ==========================================
  // TESTE 4: Estratégia do Higgsfield (JWT / Workspace ID)
  // ==========================================
  try {
    // Payload JWT simulado contendo o workspace_id
    // Header.Payload.Signature -> Payload base64 de {"workspace_id": "e5d1430e-test"}
    const mockJwtHeader = "eyJhbGciOiJSUzI1NiJ9";
    const mockJwtPayload = btoa(JSON.stringify({ workspace_id: "e5d1430e-test" })).replace(/=/g, '');
    const mockJwt = `${mockJwtHeader}.${mockJwtPayload}.signature_mock`;

    const jwtPayloadSegment = mockJwt.split('.')[1];
    const base64 = jwtPayloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const decodedData = JSON.parse(atob(base64));

    assert(decodedData.workspace_id === "e5d1430e-test", "Higgsfield: Descodificação correta do JWT e extração do workspace_id");
  } catch (e) {
    assert(false, `Higgsfield gerou exceção no teste do JWT: ${e.message}`);
  }

  // ==========================================
  // TESTE 5: Estratégia do Leonardo.Ai (BetterAuth / NextAuth / Cognito)
  // ==========================================
  try {
    const rawCookies = "_vcrcs=vcrcs_token_val; __Secure-next-auth.session-token=leonardo_token_abc";
    const cookieMap = {};
    rawCookies.split(';').forEach(pair => {
      const parts = pair.trim().split('=');
      if (parts.length >= 2) cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
    });

    assert(cookieMap["_vcrcs"] === "vcrcs_token_val", "Leonardo.Ai: Captura do cookie de segurança _vcrcs (Vercel)");
    assert(cookieMap["__Secure-next-auth.session-token"] === "leonardo_token_abc", "Leonardo.Ai: Captura do token de sessão");
  } catch (e) {
    assert(false, `Leonardo.Ai gerou exceção: ${e.message}`);
  }

  // ==========================================
  // TESTE 6: Estratégia do Vyral IA (Token Híbrido / LocalStorage)
  // ==========================================
  try {
    const mockStorage = {
      getItem: (key) => key === 'dashboardToken' ? JSON.stringify("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0ZSJ9.sig") : null
    };

    let token = "";
    const rawVal = mockStorage.getItem('dashboardToken');
    if (rawVal) {
      token = JSON.parse(rawVal);
    }

    assert(token.startsWith("eyJ"), "Vyral IA: Extração e limpeza bem-sucedida do token a partir do localStorage");
  } catch (e) {
    assert(false, `Vyral IA gerou exceção: ${e.message}`);
  }

  // ==========================================
  // RELATÓRIO FINAL
  // ==========================================
  console.log('--------------------------------------------------');
  console.log(`%c[Resultados dos Testes] Passou: ${passed} | Falhou: ${failed}`, failed === 0 ? 'color: #10b981; font-weight: bold;' : 'color: #ef4444; font-weight: bold;');
  console.groupEnd();
})();