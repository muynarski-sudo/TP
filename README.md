# Teleprompter (PWA)

Teleprompter offline para celular, sem backend e sem dependências. Dados ficam só no aparelho (localStorage).

Recursos: vários roteiros, rolagem com velocidade ajustável, contagem regressiva, toque para pausar/continuar, arrastar para posicionar, espelhamento, linha-guia, cores, margens, marcações `[cena]`, tela sempre ligada, câmera como fundo e gravação de vídeo (salvar/compartilhar).

## Rodar no celular
A câmera e a instalação offline exigem HTTPS (ou localhost).

**Opção A – GitHub Pages (recomendado):** Settings → Pages → Deploy from branch → escolha a branch e a pasta `/ (root)`. Abra a URL no celular e:
- iPhone (Safari): Compartilhar → Adicionar à Tela de Início
- Android (Chrome): menu ⋮ → Instalar app

Depois de instalado, funciona sem internet.

**Opção B – rede local (teste):** `python3 -m http.server 8000` no computador e abra `http://IP-DO-PC:8000` no celular. Sem HTTPS a câmera não funciona, mas o teleprompter sim.
