chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SESSION_COOKIES") {
    
    // Usar 'url' garante a captura de cookies de domínios raiz (ex: .google.com)
    chrome.cookies.getAll({ url: sender.tab.url }, (cookies) => {
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      sendResponse({ cookies: cookieString });
    });
    
    return true; 
  }
});