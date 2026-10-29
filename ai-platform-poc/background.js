chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SESSION_COOKIES") {
    const urlObj = new URL(sender.tab.url);
    const hostname = urlObj.hostname;

    if (hostname === 'gemini.google.com' || hostname === 'app.vyral.com.br') {
      const query = {url: sender.tab.url};
      if (sender.tab.cookieStoreId) query.storeId = sender.tab.cookieStoreId;
      chrome.cookies.getAll(query, (cookies) => {
        if (chrome.runtime.lastError) {
          sendResponse({error: 'Não foi possível ler cookies. Confira as permissões da extensão.'});
          return;
        }
        try {
          const collector = hostname === 'app.vyral.com.br'
            ? globalThis.AiPlatformPoC.Vyral : globalThis.AiPlatformPoC.Gemini;
          sendResponse(collector.collect(cookies, sender.tab.url));
        } catch (error) {
          sendResponse({error: error.message});
        }
      });
      return true;
    }

    let query = {};

    // Mapeia o domínio raiz para contornar a limitação de leitura de cookies do Firefox
    if (hostname.includes('google.com')) {
      query = { domain: "google.com" }; // Puxa TODOS os cookies da Google (raiz e subdomínios)
    } else if (hostname.includes('x.com')) {
      query = { domain: "x.com" };
    } else if (hostname.includes('grok.com')) {
      query = { domain: "grok.com" };
    } else if (hostname.includes('chatgpt.com')) {
      query = { domain: "chatgpt.com" };
    } else if (hostname.includes('openai.com')) {
      query = { domain: "openai.com" };
    } else {
      query = { url: sender.tab.url }; // Fallback de segurança
    }

    // Busca os cookies baseados no filtro de domínio
    chrome.cookies.getAll(query, (cookies) => {
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      sendResponse({ cookies: cookieString });
    });
    
    return true; 
  }
});