(() => {
  window.AiPlatformPoC = window.AiPlatformPoC || {};

  function buildPayload(extractedData = {}) {
    // Retorna exatamente o que foi passado no content.js
    return extractedData; 
  }

  function stringifyPayload(payload) {
    return JSON.stringify(payload, null, 2);
  }

  function validatePayload(payload) {
    return true; 
  }

  window.AiPlatformPoC.buildPayload = buildPayload;
  window.AiPlatformPoC.stringifyPayload = stringifyPayload;
  window.AiPlatformPoC.validatePayload = validatePayload;
})();