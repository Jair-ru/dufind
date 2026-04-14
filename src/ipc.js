const { ipcMain } = require("electron");
const engine = require("./engine");
const {
  openFile,
  openFolder,
  revealInExplorer,
  copyPath,
  getPathInfo
} = require("./actions");
const {
  getLaunchOnStartupStatus,
  setLaunchOnStartup
} = require("./startup");

const IPC_CHANNELS = {
  APP_INIT: "app:init",

  SEARCH_FILES: "search:files",
  REBUILD_INDEX: "index:rebuild",
  GET_STATS: "index:stats",
  GET_EXTENSIONS: "index:extensions",

  GET_SETTINGS: "settings:get",
  SAVE_SETTINGS: "settings:save",

  GET_FAVORITES: "favorites:get",
  TOGGLE_FAVORITE: "favorites:toggle",
  ADD_FAVORITE: "favorites:add",
  REMOVE_FAVORITE: "favorites:remove",

  OPEN_FILE: "file:open",
  OPEN_FOLDER: "file:openFolder",
  REVEAL_FILE: "file:reveal",
  COPY_PATH: "file:copyPath",
  PATH_INFO: "file:pathInfo",

  STARTUP_STATUS: "startup:status",
  STARTUP_SET: "startup:set"
};

function ok(data = {}) {
  return {
    success: true,
    ...data
  };
}

function fail(message, error = null, extra = {}) {
  return {
    success: false,
    message,
    ...(error ? { error: error.message || String(error) } : {}),
    ...extra
  };
}

function sanitizeSearchPayload(payload = {}) {
  return {
    query: typeof payload.query === "string" ? payload.query : "",
    extensionFilter:
      typeof payload.extensionFilter === "string" ? payload.extensionFilter : "",
    favoritesOnly: Boolean(payload.favoritesOnly),
    enableContentSearch:
      typeof payload.enableContentSearch === "boolean"
        ? payload.enableContentSearch
        : undefined,
    maxResults:
      typeof payload.maxResults === "number" && payload.maxResults > 0
        ? payload.maxResults
        : undefined
  };
}

function sanitizeSettingsPayload(payload = {}) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const next = {};

  if (Array.isArray(payload.searchPaths)) {
    next.searchPaths = payload.searchPaths;
  }

  if (Array.isArray(payload.ignoredDirectories)) {
    next.ignoredDirectories = payload.ignoredDirectories;
  }

  if (Array.isArray(payload.ignoredExtensions)) {
    next.ignoredExtensions = payload.ignoredExtensions;
  }

  if (Array.isArray(payload.contentSearchExtensions)) {
    next.contentSearchExtensions = payload.contentSearchExtensions;
  }

  if (typeof payload.maxResults === "number") {
    next.maxResults = payload.maxResults;
  }

  if (typeof payload.globalShortcut === "string") {
    next.globalShortcut = payload.globalShortcut;
  }

  if (typeof payload.launchOnStartup === "boolean") {
    next.launchOnStartup = payload.launchOnStartup;
  }

  if (typeof payload.enableContentSearch === "boolean") {
    next.enableContentSearch = payload.enableContentSearch;
  }

  if (typeof payload.rememberWindowState === "boolean") {
    next.rememberWindowState = payload.rememberWindowState;
  }

  return next;
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.APP_INIT, async () => {
    try {
      const initResult = await engine.initialize();
      const startupStatus = getLaunchOnStartupStatus();

      return ok({
        init: initResult,
        settings: engine.getSettings(),
        stats: engine.getStats(),
        extensions: engine.getAvailableExtensions(),
        startup: startupStatus
      });
    } catch (error) {
      return fail("Falha ao inicializar o aplicativo.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SEARCH_FILES, async (_event, payload = {}) => {
    try {
      const options = sanitizeSearchPayload(payload);
      const results = engine.search(options.query, options);

      return ok({
        results,
        total: results.length,
        query: options.query
      });
    } catch (error) {
      return fail("Falha ao buscar arquivos.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.REBUILD_INDEX, async (_event, payload = {}) => {
    try {
      const customPaths = Array.isArray(payload.searchPaths) ? payload.searchPaths : null;
      const result = await engine.rebuildIndex(customPaths);

      return result.success
        ? ok({
            ...result,
            stats: engine.getStats(),
            extensions: engine.getAvailableExtensions()
          })
        : result;
    } catch (error) {
      return fail("Falha ao reconstruir o índice.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_STATS, async () => {
    try {
      return ok({
        stats: engine.getStats()
      });
    } catch (error) {
      return fail("Falha ao obter estatísticas.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_EXTENSIONS, async () => {
    try {
      return ok({
        extensions: engine.getAvailableExtensions()
      });
    } catch (error) {
      return fail("Falha ao listar extensões.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    try {
      return ok({
        settings: engine.getSettings()
      });
    } catch (error) {
      return fail("Falha ao obter configurações.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_event, payload = {}) => {
    try {
      const nextSettings = sanitizeSettingsPayload(payload);
      const result = await engine.refreshSettingsAndWatcher(nextSettings);

      if (typeof nextSettings.launchOnStartup === "boolean") {
        setLaunchOnStartup(nextSettings.launchOnStartup);
      }

      return ok({
        settings: result.settings,
        stats: engine.getStats()
      });
    } catch (error) {
      return fail("Falha ao salvar configurações.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_FAVORITES, async () => {
    try {
      return ok({
        favorites: engine.getFavorites()
      });
    } catch (error) {
      return fail("Falha ao carregar favoritos.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TOGGLE_FAVORITE, async (_event, filePath) => {
    try {
      return engine.toggleFavorite(filePath);
    } catch (error) {
      return fail("Falha ao alternar favorito.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.ADD_FAVORITE, async (_event, filePath) => {
    try {
      return engine.addFavorite(filePath);
    } catch (error) {
      return fail("Falha ao adicionar favorito.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_FAVORITE, async (_event, filePath) => {
    try {
      return engine.removeFavorite(filePath);
    } catch (error) {
      return fail("Falha ao remover favorito.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_FILE, async (_event, filePath) => {
    try {
      return await openFile(filePath);
    } catch (error) {
      return fail("Falha ao abrir arquivo.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_FOLDER, async (_event, filePath) => {
    try {
      return await openFolder(filePath);
    } catch (error) {
      return fail("Falha ao abrir pasta.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.REVEAL_FILE, async (_event, filePath) => {
    try {
      return await revealInExplorer(filePath);
    } catch (error) {
      return fail("Falha ao revelar arquivo no Explorer.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.COPY_PATH, async (_event, filePath) => {
    try {
      return copyPath(filePath);
    } catch (error) {
      return fail("Falha ao copiar caminho.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PATH_INFO, async (_event, filePath) => {
    try {
      return ok({
        info: getPathInfo(filePath)
      });
    } catch (error) {
      return fail("Falha ao consultar caminho.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.STARTUP_STATUS, async () => {
    try {
      return ok(getLaunchOnStartupStatus());
    } catch (error) {
      return fail("Falha ao consultar inicialização com o Windows.", error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.STARTUP_SET, async (_event, enabled) => {
    try {
      return setLaunchOnStartup(Boolean(enabled));
    } catch (error) {
      return fail("Falha ao alterar inicialização com o Windows.", error);
    }
  });

  return IPC_CHANNELS;
}

module.exports = {
  IPC_CHANNELS,
  registerIpcHandlers
};