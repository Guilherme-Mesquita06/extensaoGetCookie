(() => {
  window.AiPlatformPoC = window.AiPlatformPoC || {};

  window.AiPlatformPoC.showModal = ({ platformName, payload, jsonText }) => {
    const existingModal = document.getElementById('ai-poc-modal-root');
    if (existingModal) existingModal.remove();

    const root = document.createElement('div');
    root.id = 'ai-poc-modal-root';
    Object.assign(root.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.75)', zIndex: '999999',
      display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif'
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
      backgroundColor: '#1e1e1e', color: '#fff', padding: '20px', borderRadius: '8px',
      width: '80%', maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
    });

    const title = document.createElement('h2');
    title.innerText = `Sessão Capturada: ${platformName}`;
    title.style.marginTop = '0';
    title.style.color = '#4caf50';

    const textArea = document.createElement('textarea');
    textArea.value = jsonText;
    textArea.readOnly = true;
    Object.assign(textArea.style, {
      width: '100%', flexGrow: '1', minHeight: '350px', marginBottom: '20px',
      fontFamily: 'monospace', fontSize: '13px', padding: '12px',
      backgroundColor: '#2d2d2d', color: '#a6e22e', border: '1px solid #444',
      borderRadius: '4px', resize: 'vertical', whiteSpace: 'pre'
    });

    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, { display: 'flex', gap: '12px', justifyContent: 'flex-end' });

    const styleButton = (btn, bgColor) => {
      Object.assign(btn.style, {
        padding: '10px 18px', border: 'none', borderRadius: '4px',
        cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
        backgroundColor: bgColor, color: 'white', transition: 'opacity 0.2s'
      });
      btn.onmouseover = () => btn.style.opacity = '0.8';
      btn.onmouseout = () => btn.style.opacity = '1';
    };

    if (jsonText && jsonText.trim() !== '') {
      const copyBtn = document.createElement('button');
      copyBtn.innerText = '📋 Copiar JSON';
      styleButton(copyBtn, '#007bff'); 
      
      copyBtn.onclick = () => {
        textArea.select();
        try {
          document.execCommand('copy');
          copyBtn.innerText = '✔ Copiado!';
          copyBtn.style.backgroundColor = '#28a745';
        } catch (err) {
          copyBtn.innerText = '❌ Erro';
        }
        setTimeout(() => {
          copyBtn.innerText = '📋 Copiar JSON';
          copyBtn.style.backgroundColor = '#007bff';
        }, 2500);
      };

      const exportBtn = document.createElement('button');
      exportBtn.innerText = '💾 Exportar .json';
      styleButton(exportBtn, '#ff9800'); 
      
      exportBtn.onclick = () => {
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Extrai o nome exato (grok, flow, chatgpt) a partir do campo "toolId" gerado no JSON
        // Se a sua estrutura usar o array "accounts", ele busca lá dentro.
        let nomeIa = "sessao";
        if (payload) {
          nomeIa = payload.toolId || (payload.accounts && payload.accounts[0]?.toolId) || platformName.toLowerCase().replace('google ', '');
        }

        const filename = `${nomeIa}-session.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        exportBtn.innerText = '✔ Arquivo Salvo!';
        exportBtn.style.backgroundColor = '#4caf50';
        setTimeout(() => {
          exportBtn.innerText = '💾 Exportar .json';
          exportBtn.style.backgroundColor = '#ff9800';
        }, 2500);
      };

      buttonContainer.appendChild(copyBtn);
      buttonContainer.appendChild(exportBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✖ Fechar';
    styleButton(closeBtn, '#dc3545'); 
    closeBtn.onclick = () => root.remove();

    buttonContainer.appendChild(closeBtn);

    modal.appendChild(title);
    modal.appendChild(textArea);
    modal.appendChild(buttonContainer);
    root.appendChild(modal);
    document.body.appendChild(root);
  };
})();