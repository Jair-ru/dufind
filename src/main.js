const path = require("path");
const { app, BrowserWindow, globalShortcut, nativeTheme } = require("electron");
const { registerIpcHandlers } = require("./ipc");
const engine = require("./engine");
const { wasOpenedHidden } = require("./startup");
const { WINDOW_OPTIONS, DEFAULT_SETTINGS } = require("./config");

let mainWindow = null;
let appInitialized = false;

function isDev() {
  return !app.isPackaged;
}

function getIconPath() {
  return path.join(app.getAppPath(), "assets", "icon.ico");
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    ...WINDOW_OPTIONS,
    title: "DuFind",
    icon: getIconPath(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(app.getAppPath(), "ui", "index.html"));

  mainWindow.once("ready-to-show", () => {
    if (!wasOpenedHidden()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev()) {
    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      console.error("[WINDOW] Falha ao carregar interface:", errorCode, errorDescription);
    });
  }

  return mainWindow;
}

function focusMainWindow() {
  if (!mainWindow) {
    createMainWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();
}

function registerGlobalShortcuts() {
  const settings = engine.getSettings ? engine.getSettings() : DEFAULT_SETTINGS;
  const shortcut = settings.globalShortcut || DEFAULT_SETTINGS.globalShortcut;

  if (!shortcut) {
    return;
  }

  try {
    globalShortcut.unregisterAll();

    const registered = globalShortcut.register(shortcut, () => {
      focusMainWindow();
    });

    if (!registered) {
      console.warn(`[SHORTCUT] Não foi possível registrar o atalho: ${shortcut}`);
    }
  } catch (error) {
    console.error("[SHORTCUT] Erro ao registrar atalho global:", error);
  }
}

async function bootstrapEngine() {
  if (appInitialized) {
    return;
  }

  registerIpcHandlers();

  const initResult = await engine.initialize();

  if (!initResult || !initResult.success) {
    console.error("[ENGINE] Falha ao inicializar.");
    return;
  }

  if (!initResult.indexedFiles || initResult.indexedFiles === 0) {
    console.log("[ENGINE] Índice vazio. Reconstruindo índice inicial...");
    const rebuildResult = await engine.rebuildIndex();

    if (!rebuildResult.success) {
      console.error("[ENGINE] Falha ao reconstruir índice inicial:", rebuildResult.message || rebuildResult.error);
    }
  }

  registerGlobalShortcuts();
  appInitialized = true;
}

async function onReady() {
  nativeTheme.themeSource = "dark";

  await bootstrapEngine();
  createMainWindow();
}

app.whenReady().then(onReady).catch((error) => {
  console.error("[APP] Erro durante inicialização:", error);
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
    return;
  }

  focusMainWindow();
});

app.on("will-quit", async () => {
  try {
    globalShortcut.unregisterAll();
    await engine.stopWatching();
  } catch (error) {
    console.error("[APP] Erro ao encerrar recursos:", error);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});