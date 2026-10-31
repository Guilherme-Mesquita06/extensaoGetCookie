chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SESSION_COOKIES") {
    const urlObj = new URL(sender.tab.url);
    const hostname = urlObj.hostname;

    // --- BLOCO 1: Módulos Nativos ---
    if (['gemini.google.com', 'app.vyral.com.br'].includes(hostname)) {
      const query = { url: sender.tab.url };
      if (sender.tab.cookieStoreId) query.storeId = sender.tab.cookieStoreId;
      
      chrome.cookies.getAll(query, (cookies) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: 'Não foi possível ler cookies.' });
          return;
        }
        try {
          const collector = { 
            'gemini.google.com': globalThis.AiPlatformPoC?.Gemini,
            'app.vyral.com.br': globalThis.AiPlatformPoC?.Vyral 
          }[hostname];

          if (collector && typeof collector.collect === 'function') {
            sendResponse(collector.collect(cookies, sender.tab.url));
          } else {
            const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            sendResponse({ cookies: cookieString });
          }
        } catch (error) { 
          sendResponse({ error: error.message }); 
        }
      });
      return true; 
    }

    // --- BLOCO 2: Mapeamento de Domínio Raiz ---
    let query = {};

    if (hostname.includes('google.com')) { query = { domain: "google.com" }; 
    } else if (hostname.includes('x.com')) { query = { domain: "x.com" };
    } else if (hostname.includes('grok.com')) { query = { domain: "grok.com" };
    } else if (hostname.includes('chatgpt.com')) { query = { domain: "chatgpt.com" };
    } else if (hostname.includes('openai.com')) { query = { domain: "openai.com" };
    } else if (hostname.includes('leonardo.ai')) { query = { domain: "leonardo.ai" };
    } else if (hostname.includes('higgsfield.ai')) { query = { domain: "higgsfield.ai" };
    } else if (hostname.includes('pollo.ai')) { query = { domain: "pollo.ai" };
    } else if (hostname.includes('digen')) { query = { domain: "digen.ai" };
    } else if (hostname.includes('magnific.com')) { query = { domain: "magnific.com" }; // <--- ADICIONADO MAGNIFIC
    } else { query = { url: sender.tab.url }; }

    if (sender.tab.cookieStoreId) {
      query.storeId = sender.tab.cookieStoreId;
    }

    chrome.cookies.getAll(query, (cookies) => {
      if (chrome.runtime.lastError) {
         sendResponse({ cookies: "" });
         return;
      }
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      sendResponse({ cookies: cookieString });
    });
    
    return true; 
  }
});