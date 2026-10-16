// O background script escuta pedidos do content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SESSION_COOKIES") {
    
    // Captura TODOS os cookies do domínio chatgpt.com
    chrome.cookies.getAll({ domain: "chatgpt.com" }, (cookies) => {
      
      // Formata os cookies no padrão "nome=valor; nome2=valor2"
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      // Envia a string pronta de volta
      sendResponse({ cookies: cookieString });
    });
    
    // Retorna true para indicar que a resposta será assíncrona
    return true; 
  }
});