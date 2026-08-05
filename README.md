# 📡 NetScan Linux

**Mapeador de dispositivos de rede local com varredura de portas, terminal Nmap, auditoria de segurança heurística e teste de velocidade — tudo em uma interface neo-brutalista construída com React + Express.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Sobre o projeto

**NetScan Linux** é um dashboard web para mapear e monitorar dispositivos conectados a uma rede local (LAN), com foco em ambientes Linux/self-hosted. A interface é dividida em abas (com atalhos de teclado `1`–`8`) que cobrem descoberta de dispositivos, topologia de rede, varredura de portas, um terminal estilo Nmap, um assistente de segurança heurístico, gerenciamento de whitelist/blacklist e um teste de velocidade de internet.

O projeto foi criado no **Google AI Studio** e usa um backend Express que serve tanto a API quanto o bundle Vite/React.

> ⚠️ **Nota de transparência:** este é um projeto de demonstração/portfólio. A varredura de portas em `127.0.0.1` é **real** (conexões TCP de fato testadas via `net.Socket`), assim como a detecção das interfaces de rede locais (via módulo `os` do Node). Porém, a lista de **dispositivos da LAN** retornada pelo endpoint `/api/scan`, o **terminal Nmap** e o **teste de velocidade** usam **dados simulados/mockados** para fins de demonstração da UI — não há varredura ARP real da rede nem execução do binário `nmap`. Veja a seção [Como funciona por baixo dos panos](#como-funciona-por-baixo-dos-panos) para detalhes e ideias de como torná-lo 100% funcional.

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Stack técnica](#stack-técnica)
- [Como funciona por baixo dos panos](#como-funciona-por-baixo-dos-panos)
- [Por que não dá para hospedar no GitHub Pages](#por-que-não-dá-para-hospedar-no-github-pages)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e uso](#instalação-e-uso)
- [Instalar no Windows](#instalar-no-windows)
- [Instalar no Linux](#instalar-no-linux)
- [App desktop (Electron)](#app-desktop-electron)
- [Acessar pelo celular](#acessar-pelo-celular)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Referência da API](#referência-da-api)
- [Atalhos de teclado](#atalhos-de-teclado)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## Funcionalidades

| Aba | Descrição |
|---|---|
| 🖥️ **Dispositivos** | Lista todos os dispositivos "descobertos" na subnet, com IP, MAC, hostname, fabricante (vendor), tipo de dispositivo, latência, histórico de ping e nível de risco. Permite marcar/desmarcar como confiável e editar apelido/notas. |
| 🌐 **Mapa da Topologia** | Visualização gráfica da rede em formato de grafo, conectando o roteador/gateway aos dispositivos descobertos. |
| 🔌 **Scanner de Portas** | Varredura de portas TCP em um IP alvo específico, com catálogo de ~20 serviços comuns (SSH, HTTP, SMB, RDP, MySQL, MongoDB, Telnet, etc.) e nota de risco de segurança para cada porta aberta. |
| 💻 **Terminal Nmap** | Interface estilo terminal que simula a saída de comandos `nmap` (ex: `-sV -O`) para o alvo selecionado. |
| 🛡️ **Auditoria & Security Advisor** | Gera uma pontuação de segurança (0–100) e recomendações de mitigação para os dispositivos escaneados, usando um **motor heurístico local** (detecção de Telnet, SMB/NetBIOS, RDP, FTP sem criptografia, dispositivos não confiáveis, etc.). |
| ✅ **Whitelist** | Gerenciamento de dispositivos marcados como confiáveis/conhecidos. |
| ⚡ **Speedtest** | Teste de velocidade de download/upload/ping/jitter com histórico salvo localmente. |
| 🚫 **Ignorados & Configurações** | Blacklist de IPs/MACs a ignorar nos alertas, tema claro/escuro, cor de destaque, alertas sonoros e notificações. |

Recursos transversais:
- 🔔 Sistema de **alertas** para dispositivos novos/desconhecidos na rede, com som de notificação.
- 📊 Linha do tempo (timeline) de 24h de dispositivos totais/confiáveis/não confiáveis/alto risco.
- 📝 Log persistente de eventos de rede (conexões, mudanças de confiança, vulnerabilidades detectadas).
- 💾 Persistência local em arquivos JSON (sem necessidade de banco de dados externo).
- 🌗 Tema claro/escuro com paletas de cor de destaque customizáveis, estilo **neo-brutalista**.
- ⌨️ Navegação completa por atalhos de teclado.

---

## Stack técnica

**Frontend**
- [React 19](https://react.dev/) + TypeScript
- [Vite 6](https://vitejs.dev/) (dev server e build)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Recharts](https://recharts.org/) — gráficos e timeline
- [Motion](https://motion.dev/) — animações
- [Lucide React](https://lucide.dev/) — ícones

**Backend**
- [Express 4](https://expressjs.com/) servindo API REST + middleware Vite (dev) / arquivos estáticos (prod)
- Node.js (`net`, `os`, `fs`) para probing de portas TCP e leitura de interfaces de rede
- Persistência em arquivos JSON (`/data`)

**Build/Tooling**
- [tsx](https://github.com/privatenumber/tsx) — execução TypeScript em dev
- [esbuild](https://esbuild.github.io/) — bundle do servidor para produção
- [Bun](https://bun.sh/) como gerenciador de pacotes (também compatível com `npm`)

**Desktop (opcional)**
- [Electron](https://www.electronjs.org/) — empacota o app web (frontend + servidor Express) em uma janela desktop nativa
- [electron-builder](https://www.electron.build/) — gera instaladores (`.exe` NSIS no Windows, `AppImage`/`.deb` no Linux)

---

## Como funciona por baixo dos panos

- `GET /api/network/interfaces` — **real**, lê as interfaces de rede do host via `os.networkInterfaces()`.
- `POST /api/scan` — **híbrido**: sonda de fato portas TCP comuns em `127.0.0.1` (para refletir serviços reais rodando no host do servidor), mas o restante dos dispositivos da subnet é uma **lista mockada** gerada dinamicamente com o prefixo da subnet informada, para simular um ambiente doméstico típico (roteador, servidor, celulares, smart TV, câmera IP, impressora, etc).
- `POST /api/scan/port` — **real** quando o alvo é `127.0.0.1`/`localhost` (conexões TCP reais); **simulado** para outros IPs.
- `POST /api/nmap/exec` — **simulado**: retorna uma saída de terminal formatada como se fosse um `nmap -sV -O`, mas não invoca o binário `nmap`.
- `POST /api/security/ai-analysis` — **real**, roda heurísticas locais baseadas nas portas/dispositivos recebidos (sem dependência de serviços de IA externos).
- **Speedtest** — simulado no frontend, com histórico persistido em `localStorage`.

Para transformar isso em um scanner 100% real de LAN, os pontos de extensão naturais seriam:
1. Substituir a lista mockada em `/api/scan` por uma varredura ARP real (ex: via `arp -a`, `node-arp`, ou parsing de `/proc/net/arp` no Linux).
2. Invocar o binário `nmap` de fato em `/api/nmap/exec` (via `child_process.exec`), com sanitização rigorosa do input do usuário para evitar injeção de comando.
3. Implementar um teste de velocidade real (ex: contra um servidor de referência ou usando bibliotecas como `speedtest-net`).

---

## Por que não dá para hospedar no GitHub Pages

**GitHub Pages só serve arquivos estáticos** (HTML/CSS/JS puros) — ele não executa código de servidor. Este projeto **precisa** de um processo Node.js rodando (o `server.ts` com Express) para:

- ler as interfaces de rede reais da máquina (`os.networkInterfaces()`);
- abrir conexões TCP para sondar portas (`net.Socket`);
- persistir dados em disco (`/data/*.json`).

Nada disso é possível em um host puramente estático como o GitHub Pages. Se você fizer só o build do frontend (`vite build`) e subir a pasta `dist` para o Pages, a interface até carrega, mas **todas as chamadas para `/api/...` vão falhar** (não existe backend para responder).

Além disso, faz sentido pensar assim: essa ferramenta escaneia a rede **da máquina onde ela está rodando**. Não existe "hospedar na nuvem" um scanner de LAN — ele precisa rodar fisicamente dentro (ou conectado) da rede que você quer mapear. Por isso o uso pretendido é sempre **local**: no seu PC Windows, num servidor Linux de casa, num Raspberry Pi, etc.

Se seu objetivo é só **mostrar o projeto/portfólio** publicamente (sem funcionalidade real de scan), aí sim dá pra publicar o frontend estático em GitHub Pages, Vercel ou Netlify — mas nesse caso as abas que dependem da API (Dispositivos, Portas, Nmap, Auditoria) ficam quebradas. Para uma demo pública funcional de verdade, o caminho é hospedar o app completo (frontend + backend) em algo que rode Node.js, como Railway, Render, Fly.io ou uma VPS.

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+ (recomendado 20+)
- [Bun](https://bun.sh/) (recomendado, já que o projeto usa `bun.lock`) **ou** `npm`/`pnpm`/`yarn`

---

## Instalação e uso

```bash
# 1. Clone o repositório
git clone https://github.com/itsbravos/NetScan-Linux.git
cd NetScan-Linux

# 2. Instale as dependências
bun install
# ou: npm install

# 3. Configure as variáveis de ambiente (opcional)
cp .env.example .env

# 4. Rode em modo desenvolvimento
bun run dev
# ou: npm run dev
```

A aplicação sobe em **http://localhost:3000**.

### Build para produção

```bash
bun run build
bun run start
# ou com npm:
npm run build
npm run start
```

O comando `build` compila o frontend com Vite e empacota o servidor Express com `esbuild` em `dist/server.cjs`; `start` executa esse bundle com Node.

---

## Instalar no Windows

1. Instale o [Node.js LTS](https://nodejs.org/) (o instalador `.msi` já adiciona `node` e `npm` ao PATH).
2. Instale o [Git para Windows](https://git-scm.com/download/win), se ainda não tiver.
3. Abra o PowerShell ou o Prompt de Comando e rode:
   ```powershell
   git clone https://github.com/itsbravos/NetScan-Linux.git
   cd NetScan-Linux
   npm install
   npm run dev
   ```
4. Acesse **http://localhost:3000** no navegador.

> A detecção de interfaces de rede funciona nativamente no Windows (usa a API de rede do Node.js), mas o app foi pensado/testado com foco em ambiente Linux — algumas informações (ex: nomes de interface `eth0`) podem aparecer de forma diferente do Windows (`Ethernet`, `Wi-Fi`, etc). Funciona, mas a experiência "de casa" é a Linux.
>
> Prefere não usar terminal nenhum? Veja o [app desktop (Electron)](#app-desktop-electron) — gera um instalador `.exe` de clique duplo.

## Instalar no Linux

O ambiente nativo do projeto. Em Debian/Ubuntu, por exemplo:

```bash
# Instale Node.js (via nvm é o mais simples)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install --lts

# Clone e rode
git clone https://github.com/itsbravos/NetScan-Linux.git
cd NetScan-Linux
npm install
npm run dev
```

Para deixar rodando permanentemente em um servidor Linux (ex: um mini-PC ou Raspberry Pi que fica ligado 24/7 na rede), use um gerenciador de processos como o [`pm2`](https://pm2.keymetrics.io/):

```bash
npm run build
npm install -g pm2
pm2 start dist/server.cjs --name netscan
pm2 save
pm2 startup   # configura o pm2 para subir junto com o boot do sistema
```

## App desktop (Electron)

Para quem prefere um "instalador de clique duplo" em vez de rodar comandos no terminal, o projeto também empacota o mesmo frontend + servidor Express dentro de uma janela desktop nativa via [Electron](https://www.electronjs.org/). Por baixo dos panos é o **mesmo** `server.ts` — o Electron só abre uma janela apontando para `http://localhost:3000` e gerencia o processo do servidor para você.

**Testar em modo desenvolvimento:**

```bash
npm install
npm run electron:dev
```

Isso sobe o servidor (`npm run dev`) e, quando ele responder, abre a janela do Electron automaticamente.

**Gerar o instalador:**

```bash
# Windows (gera um .exe via NSIS em /release)
npm run dist:win

# Linux (gera AppImage e .deb em /release)
npm run dist:linux

# Ambos (usa a plataforma atual como padrão do electron-builder)
npm run electron:build
```

Os pacotes gerados ficam na pasta `release/`. Depois de instalado, o app cria uma pasta `data/` (dispositivos confiáveis, alertas, histórico) dentro do próprio diretório de instalação — a mesma persistência em JSON usada na versão web.

> ℹ️ Gerar os instaladores baixa os binários do Electron para cada plataforma (arquivos grandes) — é necessário ter conexão com a internet na primeira vez que rodar `electron-builder`. Ícones customizados podem ser adicionados depois em `electron/build/icon.ico` (Windows) e `electron/build/icon.png` (Linux), configurando os campos `win.icon`/`linux.icon` no bloco `build` do `package.json`.

## Acessar pelo celular

Este projeto **não é um app nativo** (não existe `.apk`/`.ipa`) — é um painel web. Duas formas de usar no celular:

**1. Acessar o painel do PC/servidor pelo navegador do celular (mais simples e recomendado)**

Com o servidor rodando no seu PC ou Linux (via `npm run dev`/`npm run start`), e o celular conectado **na mesma rede Wi-Fi**:

1. Descubra o IP local da máquina que está rodando o servidor (Windows: `ipconfig`; Linux: `ip a`).
2. No navegador do celular, acesse `http://<IP-DA-MAQUINA>:3000` (ex: `http://192.168.1.100:3000`).

Isso te dá o dashboard completo no celular, mas o scan continua refletindo a rede vista **pela máquina onde o servidor está rodando**, não pelo celular.

**2. Rodar o servidor diretamente no Android via Termux (avançado)**

Se quiser que o app escaneie a partir do próprio celular:

```bash
# Dentro do Termux (F-Droid)
pkg install nodejs git
git clone https://github.com/itsbravos/NetScan-Linux.git
cd NetScan-Linux
npm install
npm run dev
```

Depois acesse `http://localhost:3000` no navegador do próprio celular. iOS não tem um ambiente equivalente ao Termux com suporte real a Node.js, então essa opção é só para Android.

---

## Variáveis de ambiente

Definidas em `.env` (veja `.env.example`):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `APP_URL` | Não | URL onde a aplicação está hospedada (usado para links/callbacks quando implantado, ex: em Cloud Run). |

---

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `dev` | Inicia o servidor Express + Vite (HMR) em modo desenvolvimento na porta 3000. |
| `build` | Compila o frontend (Vite) e empacota o servidor (esbuild) para produção em `dist/`. |
| `start` | Executa o build de produção (`dist/server.cjs`). |
| `clean` | Remove os diretórios `dist`, `server.js` e `release` gerados. |
| `lint` | Roda a checagem de tipos do TypeScript (`tsc --noEmit`). |
| `electron:dev` | Sobe o servidor e abre a janela do Electron em modo desenvolvimento. |
| `electron:build` | Builda o app e empacota o instalador para a plataforma atual em `release/`. |
| `dist:win` | Builda o app e gera o instalador `.exe` (NSIS) para Windows. |
| `dist:linux` | Builda o app e gera `AppImage`/`.deb` para Linux. |

---

## Estrutura do projeto

```
NetScan-Linux/
├── server.ts                    # Servidor Express: API REST + persistência em JSON + middleware Vite
├── index.html                   # Ponto de entrada HTML
├── src/
│   ├── main.tsx                 # Bootstrap do React
│   ├── App.tsx                  # Componente raiz: navegação por abas, estado global, polling de scan
│   ├── index.css                # Estilos globais (Tailwind)
│   ├── types.ts                 # Tipos TypeScript compartilhados (Device, ScanConfig, Alert, etc.)
│   ├── lib/
│   │   └── audioAlert.ts        # Reprodução de sons de alerta
│   └── components/
│       ├── Header.tsx           # Cabeçalho, seleção de interface, controles de scan e alertas
│       ├── AlertBanner.tsx      # Banner de dispositivos novos/desconhecidos
│       ├── DeviceList.tsx       # Listagem e cards de dispositivos
│       ├── DeviceCard.tsx       # Card individual de dispositivo
│       ├── DeviceModal.tsx      # Modal de detalhes/edição de dispositivo
│       ├── NetworkTopology.tsx  # Grafo de topologia da rede
│       ├── PortScannerView.tsx  # Scanner de portas por IP
│       ├── NmapTerminal.tsx     # Terminal simulado de comandos Nmap
│       ├── SecurityAdvisor.tsx  # Auditoria de segurança heurística + heatmap de tráfego
│       ├── TrustedDevicesView.tsx    # Gerenciamento da whitelist
│       ├── BlacklistSettingsView.tsx # Blacklist + configurações de tema/alertas
│       ├── Speedtest.tsx        # Teste de velocidade
│       └── PingSparkline.tsx    # Mini-gráfico de latência
├── electron/
│   └── main.cjs                 # Processo principal do Electron: sobe/gerencia o servidor e abre a janela
├── data/                        # (gerado em runtime) Persistência JSON: dispositivos confiáveis, alertas, histórico, eventos
├── .env.example                 # Exemplo de variáveis de ambiente
├── vite.config.ts               # Configuração do Vite + Tailwind
├── tsconfig.json                # Configuração do TypeScript
└── package.json                 # Scripts + configuração do electron-builder (bloco "build")
```

---

## Referência da API

Todos os endpoints são servidos pelo Express em `server.ts` sob o prefixo `/api`.

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/network/interfaces` | Lista as interfaces de rede IPv4 do host. |
| `POST` | `/api/scan` | Executa uma varredura da subnet (`targetSubnet`, `scanType: 'quick' \| 'full'`, `forceNewDevice`). Retorna dispositivos, resumo e alertas. |
| `POST` | `/api/scan/port` | Varre uma lista de portas TCP em um IP alvo (`ip`, `ports`). |
| `POST` | `/api/nmap/exec` | Retorna a saída simulada de um comando Nmap (`command`, `targetIp`). |
| `POST` | `/api/devices/trust` | Marca/desmarca um dispositivo como confiável e atualiza apelido/notas (`mac`, `isTrusted`, `customName`, `deviceType`, `notes`). |
| `GET` | `/api/alerts` | Lista os alertas gerados. |
| `POST` | `/api/alerts/read` | Marca todos os alertas como lidos. |
| `GET` | `/api/blacklist` | Lista os dispositivos ignorados. |
| `POST` | `/api/blacklist` | Adiciona um IP/MAC à blacklist (`macOrIp`, `label`). |
| `DELETE` | `/api/blacklist/:id` | Remove um item da blacklist. |
| `GET` | `/api/history/timeline` | Retorna série temporal de 24h (12 pontos) para o gráfico de auditoria. |
| `GET` | `/api/history/events` | Lista o log de eventos de rede persistido. |
| `POST` | `/api/history/events` | Adiciona um novo evento ao log. |
| `DELETE` | `/api/history/events` | Limpa o log de eventos. |
| `POST` | `/api/security/ai-analysis` | Gera pontuação de segurança e recomendações via motor heurístico local. |

---

## Atalhos de teclado

| Tecla | Aba |
|---|---|
| `1` | Dispositivos |
| `2` | Mapa da Topologia |
| `3` | Scanner de Portas |
| `4` | Terminal Nmap |
| `5` | Auditoria & Security Advisor |
| `6` | Whitelist |
| `7` | Speedtest |
| `8` | Ignorados & Configurações |

*(Desativado automaticamente quando o foco está em campos de input/textarea/select.)*

---

## Roadmap

- [ ] Varredura ARP real da rede local (substituir mock de `/api/scan`)
- [ ] Execução real do `nmap` via `child_process` com sanitização de input
- [ ] Teste de velocidade real contra servidores de referência
- [ ] Autenticação/login para proteger o painel em redes compartilhadas
- [ ] Suporte a IPv6

---

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma *issue* relatando bugs ou sugerindo melhorias, ou enviar um *pull request*.

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/minha-feature`)
3. Commit suas mudanças (`git commit -m 'feat: minha nova feature'`)
4. Push para a branch (`git push origin feature/minha-feature`)
5. Abra um Pull Request

---

## Licença

Distribuído sob a licença [MIT](LICENSE).

---

<div align="center">

Desenvolvido por [@itsbravos](https://github.com/itsbravos)

</div>
