(() => {
  window.AiPlatformPoC = window.AiPlatformPoC || {};

  async function copyJson(text) {
    // 1. Tenta usar a API moderna primeiro
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (err) {
        console.warn('[AI Platform PoC] API moderna falhou, a usar o fallback...', err);
      }
    }

    // 2. Fallback seguro para extensões (funciona na maioria das restrições do Firefox)
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      
      document.body.appendChild(textarea);
      textarea.select();  

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          resolve();
        } else {
          reject(new Error('O navegador bloqueou a cópia.'));
        }
      } catch (err) {
        reject(new Error('A API de área de transferência não está disponível.'));
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  function exportJson(text) {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'ai-platform-poc.json';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  window.AiPlatformPoC.copyJson = copyJson;
  window.AiPlatformPoC.exportJson = exportJson;
})();