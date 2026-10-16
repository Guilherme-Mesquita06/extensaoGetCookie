(() => {
  window.AiPlatformPoC = window.AiPlatformPoC || {};

  function showModal({ platformName, payload, jsonText }) {
    if (document.getElementById('ai-platform-poc-host')) return;

    const host = document.createElement('div');
    host.id = 'ai-platform-poc-host';
    host.setAttribute('aria-live', 'polite');
    host.style.all = 'initial';
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'closed' });
    const theme = window.AiPlatformPoC.detectModalTheme();

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; }
      .panel {
        position: fixed; top: 18px; right: 18px; width: min(360px, calc(100vw - 36px));
        z-index: 2147483647; padding: 18px; border-radius: 14px;
        background: ${theme === 'light' ? '#f8fafc' : '#101722'};
        color: ${theme === 'light' ? '#111827' : '#f3f6fb'};
        border: 1px solid ${theme === 'light' ? '#cbd5e1' : '#344256'};
        box-shadow: 0 18px 55px rgba(0,0,0,.35);
        font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
      .eyebrow { margin:0 0 4px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; opacity:.72; }
      h2 { margin:0; font-size:17px; line-height:1.25; font-weight:700; }
      .close { border:0; background:transparent; color:inherit; font-size:22px; line-height:1;
        cursor:pointer; padding:0 2px; border-radius:5px; }
      .status { margin:12px 0; padding:10px 11px; border-radius:8px;
        background:${theme === 'light' ? '#e2e8f0' : '#1b293b'}; }
      .status strong { display:block; margin-bottom:2px; }
      .hint { margin:0; opacity:.78; font-size:12px; }
      .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
      .action { flex:1 1 130px; border:1px solid ${theme === 'light' ? '#94a3b8' : '#52647b'};
        border-radius:8px; padding:10px 12px; font:600 13px system-ui, sans-serif; cursor:pointer; }
      .primary { color:white; background:#2563eb; border-color:#2563eb; }
      .secondary { background:transparent; color:inherit; }
      .foot { margin-top:12px; display:flex; justify-content:space-between; gap:10px;
        font-size:11px; opacity:.72; }
      .message { min-height:17px; margin:8px 0 0; font-size:12px; }
      button:focus-visible { outline:3px solid #60a5fa; outline-offset:2px; }
      @media (max-width: 420px) { .panel { right: 10px; top: 10px; width: calc(100vw - 20px); } }
    `;

    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'PoC de dados da plataforma de IA');
    panel.innerHTML = `
      <div class="header">
        <div><p class="eyebrow">Prova de conceito local</p><h2>Plataforma detectada</h2></div>
        <button class="close" type="button" aria-label="Fechar modal" title="Fechar">×</button>
      </div>
      <div class="status"><strong></strong><p class="hint">Estrutura JSON pronta. Credenciais e valores reais de cookies não são lidos.</p></div>
      <p class="hint">A exportação é gerada localmente no navegador; nenhum conteúdo é enviado a um servidor.</p>
      <div class="actions">
        <button class="action primary copy" type="button">Copiar JSON</button>
      </div>
      <p class="message" role="status"></p>
      <div class="foot"><span class="countdown">Fechando em 10s</span><span>Manifest V3</span></div>
    `;
    shadow.append(style, panel);

    panel.querySelector('h2').textContent = platformName;
    panel.querySelector('.status strong').textContent =
      window.AiPlatformPoC.validatePayload(payload) ? 'Dados de demonstração disponíveis' : 'Erro na estrutura do JSON';

    const message = panel.querySelector('.message');
    const countdown = panel.querySelector('.countdown');
    const close = () => host.remove();
    panel.querySelector('.close').addEventListener('click', close);

    let remaining = 10;
    let interacted = false;
    const timer = window.setInterval(() => {
      if (interacted) return;
      remaining -= 1;
      countdown.textContent = `Fechando em ${remaining}s`;
      if (remaining <= 0) {
        window.clearInterval(timer);
        close();
      }
    }, 1000);

    function pauseCountdown() {
      interacted = true;
      window.clearInterval(timer);
      countdown.textContent = 'Fechamento automático pausado';
    }

    panel.querySelector('.copy').addEventListener('click', async () => {
      pauseCountdown();
      try {
        await window.AiPlatformPoC.copyJson(jsonText);
        message.textContent = 'JSON copiado para a área de transferência.';
      } catch (error) {
        message.textContent = error instanceof Error ? error.message : 'Não foi possível copiar o JSON.';
      }
    });

  }

  window.AiPlatformPoC.showModal = showModal;
})();