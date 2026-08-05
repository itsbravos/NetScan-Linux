const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const PORT = 3000;
const SERVER_URL = `http://localhost:${PORT}`;

let serverProcess = null;
let mainWindow = null;

function pingServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await pingServer(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

// In dev, the server is already started separately (npm run dev via concurrently).
// In a packaged build there is no dev server process to attach to, so we spawn
// the pre-built dist/server.cjs ourselves using Electron's embedded Node runtime.
function startServerIfPackaged() {
  if (!app.isPackaged) return;

  const appDir = path.join(process.resourcesPath, "app");
  const serverPath = path.join(appDir, "dist", "server.cjs");

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: appDir,
    env: { ...process.env, NODE_ENV: "production", ELECTRON_RUN_AS_NODE: "1" },
    stdio: "inherit",
  });

  serverProcess.on("exit", (code) => {
    if (code !== 0 && mainWindow) {
      mainWindow.close();
    }
  });
}

function loadingScreenHtml(message, isError) {
  const color = isError ? "#f87171" : "#e2e8f0";
  return `data:text/html,<body style="background:#090d16;color:${color};font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>${message}</p></body>`;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#090d16",
    title: "NetScan Linux",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(loadingScreenHtml("Iniciando NetScan Linux...", false));

  const ready = await waitForServer(SERVER_URL);
  if (!mainWindow) return;

  if (ready) {
    mainWindow.loadURL(SERVER_URL);
  } else {
    mainWindow.loadURL(
      loadingScreenHtml("Nao foi possivel iniciar o servidor local na porta 3000.", true)
    );
  }
}

app.whenReady().then(() => {
  startServerIfPackaged();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});
