const path = require("path");
const {
  initializeDatabase,
  loadIndex,
  replaceAllIndexedFiles,
  upsertIndexedFile,
  removeIndexedFile,
  loadSettings,
  updateSettings,
  getFavoritePaths,
  getIndexStats
} = require("./db");
const {
  buildFullIndex,
  reindexChangedFile,
  removeMissingFiles
} = require("./indexer");
const {
  searchFiles,
  listAvailableExtensions
} = require("./search");
const {
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  toggleFileFavorite,
  checkFavorite
} = require("./favorites");
const { startWatcher } = require("./watcher");

class DuFindEngine {
  constructor() {
    this.settings = null;
    this.index = [];
    this.watcherControl = null;
    this.isReady = false;
    this.isIndexing = false;
    this.lastIndexedAt = null;
  }

  async initialize() {
    initializeDatabase();

    this.settings = loadSettings();

    const storedIndex = loadIndex();
    this.index = removeMissingFiles(storedIndex.files || []);
    this.lastIndexedAt = storedIndex.updatedAt || null;

    if (this.index.length !== (storedIndex.files || []).length) {
      replaceAllIndexedFiles(this.index);
    }

    await this.startWatching();

    this.isReady = true;

    return {
      success: true,
      indexedFiles: this.index.length,
      lastIndexedAt: this.lastIndexedAt,
      settings: this.settings
    };
  }

  getSettings() {
    if (!this.settings) {
      this.settings = loadSettings();
    }

    return this.settings;
  }

  saveSettings(partialSettings = {}) {
    const nextSettings = updateSettings(partialSettings);
    this.settings = nextSettings;
    return nextSettings;
  }

  getIndex() {
    return this.index;
  }

  async rebuildIndex(customPaths = null) {
    if (this.isIndexing) {
      return {
        success: false,
        message: "A indexação já está em andamento."
      };
    }

    this.isIndexing = true;

    try {
      const settings = this.getSettings();
      const searchPaths = Array.isArray(customPaths) && customPaths.length
        ? customPaths
        : settings.searchPaths;

      const freshIndex = buildFullIndex(searchPaths);

      this.index = freshIndex;
      this.lastIndexedAt = new Date().toISOString();

      replaceAllIndexedFiles(freshIndex);

      return {
        success: true,
        totalFiles: freshIndex.length,
        lastIndexedAt: this.lastIndexedAt
      };
    } catch (error) {
      return {
        success: false,
        message: "Falha ao reconstruir o índice.",
        error: error.message
      };
    } finally {
      this.isIndexing = false;
    }
  }

  async reindexSingleFile(filePath) {
    if (!filePath || typeof filePath !== "string") {
      return {
        success: false,
        message: "Caminho inválido."
      };
    }

    const record = reindexChangedFile(filePath);

    if (!record) {
      this.removeByPath(filePath);

      return {
        success: false,
        removed: true,
        message: "Arquivo ausente ou inválido. Removido do índice."
      };
    }

    const existingIndex = this.index.findIndex((item) => item.path === record.path);

    if (existingIndex >= 0) {
      this.index[existingIndex] = record;
    } else {
      this.index.push(record);
    }

    upsertIndexedFile(record);
    this.lastIndexedAt = new Date().toISOString();

    return {
      success: true,
      updated: true,
      record
    };
  }

  removeByPath(filePath) {
    if (!filePath || typeof filePath !== "string") {
      return false;
    }

    const normalizedPath = path.normalize(filePath);
    const originalLength = this.index.length;

    this.index = this.index.filter((item) => item.path !== normalizedPath);

    if (this.index.length !== originalLength) {
      removeIndexedFile(normalizedPath);
      this.lastIndexedAt = new Date().toISOString();
      return true;
    }

    return false;
  }

  search(query = "", options = {}) {
    const settings = this.getSettings();
    const favoritePaths = getFavoritePaths();

    return searchFiles(this.index, query, {
      extensionFilter: options.extensionFilter || "",
      favoritesOnly: Boolean(options.favoritesOnly),
      favoritePaths,
      maxResults: options.maxResults || settings.maxResults,
      enableContentSearch: options.enableContentSearch ?? settings.enableContentSearch
    });
  }

  getAvailableExtensions() {
    return listAvailableExtensions(this.index);
  }

  getStats() {
    const persistedStats = getIndexStats();

    return {
      ...persistedStats,
      inMemoryFiles: this.index.length,
      availableExtensions: this.getAvailableExtensions().length,
      isReady: this.isReady,
      isIndexing: this.isIndexing,
      isWatching: Boolean(this.watcherControl && this.watcherControl.watcher),
      lastIndexedAt: this.lastIndexedAt || persistedStats.lastIndexedAt || null
    };
  }

  getFavorites() {
    return getFavorites();
  }

  isFavorite(filePath) {
    return checkFavorite(filePath);
  }

  addFavorite(filePath) {
    return addToFavorites(filePath);
  }

  removeFavorite(filePath) {
    return removeFromFavorites(filePath);
  }

  toggleFavorite(filePath) {
    return toggleFileFavorite(filePath);
  }

  async startWatching() {
    const settings = this.getSettings();

    if (this.watcherControl && this.watcherControl.close) {
      await this.watcherControl.close();
    }

    this.watcherControl = startWatcher(settings.searchPaths, {
      onAdd: async (filePath) => {
        await this.reindexSingleFile(filePath);
      },
      onChange: async (filePath) => {
        await this.reindexSingleFile(filePath);
      },
      onUnlink: (filePath) => {
        this.removeByPath(filePath);
      },
      onUnlinkDir: (dirPath) => {
        const normalizedDir = path.normalize(dirPath);

        this.index = this.index.filter((item) => {
          const keep = !item.path.startsWith(normalizedDir + path.sep) && item.path !== normalizedDir;

          if (!keep) {
            removeIndexedFile(item.path);
          }

          return keep;
        });

        this.lastIndexedAt = new Date().toISOString();
      },
      onError: (error) => {
        console.error("[WATCHER] Erro:", error);
      },
      onReady: (paths) => {
        console.log("[WATCHER] Monitorando:", paths);
      }
    });

    return {
      success: true,
      paths: this.watcherControl.paths || []
    };
  }

  async stopWatching() {
    if (!this.watcherControl || !this.watcherControl.close) {
      return {
        success: true,
        message: "Watcher já estava parado."
      };
    }

    await this.watcherControl.close();
    this.watcherControl = null;

    return {
      success: true,
      message: "Watcher encerrado com sucesso."
    };
  }

  async refreshSettingsAndWatcher(partialSettings = {}) {
    const settings = this.saveSettings(partialSettings);
    await this.startWatching();

    return {
      success: true,
      settings
    };
  }
}

const engine = new DuFindEngine();

module.exports = engine;