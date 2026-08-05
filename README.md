# 📡 NetScan Linux

**Mapeador de dispositivos de rede local com varredura de portas, terminal Nmap, auditoria de segurança assistida por IA e teste de velocidade — tudo em uma interface neo-brutalista construída com React + Express.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Sobre o projeto

**NetScan Linux** é um dashboard web para mapear e monitorar dispositivos conectados a uma rede local (LAN), com foco em ambientes Linux/self-hosted. A interface é dividida em abas (com atalhos de teclado `1`–`8`) que cobrem descoberta de dispositivos, topologia de rede, varredura de portas, um terminal estilo Nmap, um assistente de segurança com IA (Google Gemini), gerenciamento de whitelist/blacklist e um teste de velocidade de internet.

O projeto foi criado no **Google AI Studio** e usa um backend Express que serve tanto a API quanto o bundle Vite/React.

> ⚠️ **Nota de transparência:** este é um projeto de demonstração/portfólio. A varredura de portas em `127.0.0.1` é **real** (conexões TCP de fato testadas via `net.Socket`), assim como a detecção das interfaces de rede locais (via módulo `os` do Node). Porém, a lista de **dispositivos da LAN** retornada pelo endpoint `/api/scan`, o **terminal Nmap** e o **teste de velocidade** usam **dados simulados/mockados** para fins de demonstração da UI — não há varredura ARP real da rede nem execução do binário `nmap`. Veja a seção [Como funciona por baixo dos panos](#como-funciona-por-baixo-dos-panos) para detalhes e ideias de como torná-lo 100% funcional.

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Stack técnica](#stack-técnica)
- [Como funciona por baixo dos panos](#como-funciona-por-baixo-dos-panos)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e uso](#instalação-e-uso)
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
| 🛡️ **Auditoria & Security Advisor** | Gera uma pontuação de segurança (0–100) e recomendações de mitigação para os dispositivos escaneados. Usa a **API do Google Gemini** (`gemini-2.5-flash`) quando uma `GEMINI_API_KEY` válida está configurada; caso contrário, cai automaticamente em um **motor heurístico local** (detecção de Telnet, SMB/NetBIOS, RDP, FTP sem criptografia, dispositivos não confiáveis, etc.). |
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
- [`@google/genai`](https://www.npmjs.com/package/@google/genai) — integração opcional com Google Gemini para análise de segurança
- Persistência em arquivos JSON (`/data`)

**Build/Tooling**
- [tsx](https://github.com/privatenumber/tsx) — execução TypeScript em dev
- [esbuild](https://esbuild.github.io/) — bundle do servidor para produção
- [Bun](https://bun.sh/) como gerenciador de pacotes (também compatível com `npm`)

---

## Como funciona por baixo dos panos

- `GET /api/network/interfaces` — **real**, lê as interfaces de rede do host via `os.networkInterfaces()`.
- `POST /api/scan` — **híbrido**: sonda de fato portas TCP comuns em `127.0.0.1` (para refletir serviços reais rodando no host do servidor), mas o restante dos dispositivos da subnet é uma **lista mockada** gerada dinamicamente com o prefixo da subnet informada, para simular um ambiente doméstico típico (roteador, servidor, celulares, smart TV, câmera IP, impressora, etc).
- `POST /api/scan/port` — **real** quando o alvo é `127.0.0.1`/`localhost` (conexões TCP reais); **simulado** para outros IPs.
- `POST /api/nmap/exec` — **simulado**: retorna uma saída de terminal formatada como se fosse um `nmap -sV -O`, mas não invoca o binário `nmap`.
- `POST /api/security/ai-analysis` — usa o **Gemini** de verdade se `GEMINI_API_KEY` estiver configurada; senão usa heurísticas locais baseadas nas portas/dispositivos recebidos.
- **Speedtest** — simulado no frontend, com histórico persistido em `localStorage`.

Para transformar isso em um scanner 100% real de LAN, os pontos de extensão naturais seriam:
1. Substituir a lista mockada em `/api/scan` por uma varredura ARP real (ex: via `arp -a`, `node-arp`, ou parsing de `/proc/net/arp` no Linux).
2. Invocar o binário `nmap` de fato em `/api/nmap/exec` (via `child_process.exec`), com sanitização rigorosa do input do usuário para evitar injeção de comando.
3. Implementar um teste de velocidade real (ex: contra um servidor de referência ou usando bibliotecas como `speedtest-net`).

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+ (recomendado 20+)
- [Bun](https://bun.sh/) (recomendado, já que o projeto usa `bun.lock`) **ou** `npm`/`pnpm`/`yarn`
- (Opcional) Uma **chave de API do Google Gemini** para habilitar a análise de segurança por IA — obtenha em [Google AI Studio](https://aistudio.google.com/apikey)

---

## Instalação e uso

```bash
# 1. Clone o repositório
git clone https://github.com/itsbravos/NetScan-Linux.git
cd NetScan-Linux

# 2. Instale as dependências
bun install
# ou: npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# edite o .env e adicione sua GEMINI_API_KEY (opcional)

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

## Variáveis de ambiente

Definidas em `.env` (veja `.env.example`):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GEMINI_API_KEY` | Não | Chave da API do Google Gemini. Se ausente ou inválida, a auditoria de segurança usa o motor heurístico local automaticamente. |
| `APP_URL` | Não | URL onde a aplicação está hospedada (usado para links/callbacks quando implantado, ex: em Cloud Run). |

---

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `dev` | Inicia o servidor Express + Vite (HMR) em modo desenvolvimento na porta 3000. |
| `build` | Compila o frontend (Vite) e empacota o servidor (esbuild) para produção em `dist/`. |
| `start` | Executa o build de produção (`dist/server.cjs`). |
| `clean` | Remove os diretórios `dist` e `server.js` gerados. |
| `lint` | Roda a checagem de tipos do TypeScript (`tsc --noEmit`). |

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
│       ├── SecurityAdvisor.tsx  # Auditoria de segurança (IA/heurística) + heatmap de tráfego
│       ├── TrustedDevicesView.tsx    # Gerenciamento da whitelist
│       ├── BlacklistSettingsView.tsx # Blacklist + configurações de tema/alertas
│       ├── Speedtest.tsx        # Teste de velocidade
│       └── PingSparkline.tsx    # Mini-gráfico de latência
├── data/                        # (gerado em runtime) Persistência JSON: dispositivos confiáveis, alertas, histórico, eventos
├── .env.example                 # Exemplo de variáveis de ambiente
├── vite.config.ts               # Configuração do Vite + Tailwind
├── tsconfig.json                # Configuração do TypeScript
└── package.json
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
| `POST` | `/api/security/ai-analysis` | Gera pontuação de segurança e recomendações (Gemini se configurado, senão heurística local). |

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
