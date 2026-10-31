# Extensão de sessões: ChatGPT, Grok, Flow, Gemini, Vyral e Leonardo.Ai

## Download

- [Firefox — baixar ZIP](https://github.com/arsenallucrativo-devs/extensaoGetCookie/raw/refs/heads/main/downloads/extensaoGetCookie-v1.3.0-firefox.zip)
- [Chrome — baixar ZIP](https://github.com/arsenallucrativo-devs/extensaoGetCookie/raw/refs/heads/main/downloads/extensaoGetCookie-v1.3.0-chrome.zip)

Se o repositório for privado, entre no GitHub com uma conta autorizada antes de baixar.
Descompacte o ZIP; ele contém o manifest.json na raiz. No Firefox, selecione esse arquivo em about:debugging.


## Leonardo.Ai

A versão 1.3.0 mantém todas as ferramentas anteriores. Abra https://app.leonardo.ai autenticado, recarregue, informe a chave da conta do portal e clique em **Exportar .json** para baixar `leonardo-session.json`.

A extensão preserva cookies Better Auth/NextAuth, inclusive divididos em partes, e tenta obter JWT nos endpoints de sessão da própria origem. Não exige JWT para cookies opacos. `_vcrcs`/cf_clearance sozinhos não bastam; cookies incompletos e JWT vencido provocam erro. Exemplo: [leonardo-session.example.json](leonardo-session.example.json).

Publique o backend correspondente antes do upload. A coleta fica local e não envia o arquivo automaticamente. Sessão real pode depender de verificações humanas e IP; nunca compartilhe o JSON.

## Vyral IA

Abra https://app.vyral.com.br autenticado, recarregue a página, informe a chave da conta cadastrada no portal e clique em **Exportar .json**. A extensão 1.2.0 inclui todas as ferramentas anteriores.

Vyral exige `dashboardToken` ou JWT de API; `userSession` sozinho não basta. A extensão coleta os cookies via API (incluindo HttpOnly) e confere a validade temporal do JWT. Somente se o cookie de token estiver ausente, tenta as chaves conhecidas dashboardToken/accessToken/access_token no localStorage da mesma origem. JSON de exemplo: [vyral-session.example.json](vyral-session.example.json), com placeholders que devem ser substituídos pela exportação real. O resultado é `vyral-session.json`; trate-o como uma senha.

A versão do backend correspondente precisa ser publicada. Nenhum arquivo é enviado automaticamente para o servidor. JWT exp é uma checagem de tempo, não uma validação de assinatura ou de login upstream.

## Google Gemini

1. Cadastre a ferramenta com slug `gemini`, associe ao plano e crie uma conta ativa com vagas.
2. Instale/recarregue a extensão atualizada. Firefox: `about:debugging#/runtime/this-firefox` → Carregar extensão temporária → escolha o manifest.json da pasta descompactada. Aceite acesso aos cookies Google.
3. Entre na conta desejada em https://gemini.google.com/app ou https://gemini.google.com/u/1/app. Conclua login/2FA antes da captura; depois recarregue a página.
4. No diálogo, informe o accountKey exato da conta do portal (external_account_ref; nas versões novas corresponde ao nome cadastrado). Não use o ID numérico da ferramenta.
5. Clique em Exportar .json no modal para baixar `gemini-session.json`. Faça upload na mesma conta Gemini do portal.
6. Aguarde o processamento assíncrono pela fila até sessão válida, confirme vagas e acesso pelo usuário com plano habilitado.

## Campos e validação

Veja `gemini-session.example.json`. Ele é um modelo com placeholders, propositalmente recusado no upload; use o arquivo real da extensão.

- `toolId`: `gemini`.
- `accountKey`: referência exata cadastrada no portal.
- `chatgptAccountId`: nome legado para o slot Google, string numérica "0", "1" etc.; não é email nem ID de ChatGPT.
- `accessToken`: vazio. O proxy usa cookies e gera SAPISIDHASH quando necessário; o backend normaliza esse campo para vazio no Gemini.
- `cookies`: cabeçalho único nome=valor separado por ponto e vírgula. Backend exige (__Secure-1PSID ou SID) e (SAPISID ou __Secure-1PAPISID ou __Secure-3PAPISID). A extensão inclui cookies rotativos PSIDTS, PSIDCC e demais cookies Google permitidos que estiverem presentes.
- `userAgent`: navegador que fez a captura.
- `expiresAt`: extensão exporta epoch em milissegundos, limitado à menor validade disponível dos cookies de autenticação/rotação e a 24 horas da coleta. É um prazo operacional conservador, não garantia de aceitação Google. Backend também aceita ISO-8601; modelo sem esse campo usa a política já existente de validade a partir do upload.
- `planType`: padrão `advanced`, metadado da conta upstream; não concede plano nem acesso no portal.

A leitura usa a API de cookies da extensão, incluindo HttpOnly, o cookie store da aba quando disponível e cookies aplicáveis ao domínio/caminho atual. Não captura cookies de accounts.google.com, de outros sites, cookies vencidos nem telemetria fora da lista. A exportação fica local, sem envio automático ao backend. Não compartilhe o JSON real.

## Validação e limites

Testes cobrem coleta, expiração, duplicatas/caminhos, slot, contrato de projeção e preservação das estratégias Flow/Grok/ChatGPT. O proxy já contém adapter Gemini e não exige mudança para esse formato. Não foram executados login real no Google ou deploy AWS.

Validação de formato e validade temporal não comprova autenticação upstream. Após upload, teste o Gemini pelo portal. Em caso de rejeição Google, recapture após abrir a conta, confira slot, cookies rotativos e IP de saída. Não há alteração de filas, planos, pagamentos, versão de acesso ou infraestrutura nesta entrega; as questões gerais de rotação e Selenium continuam sendo trabalho separado.

## Desenvolver e testar

`node --test tests/*.test.cjs`

O manifest de origem usa background scripts para Firefox. O pacote Chrome gerado usa service_worker com importScripts, mantendo os mesmos módulos.
