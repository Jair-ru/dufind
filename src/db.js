const fs = require("fs");
const path = require("path");
const {
  APP_DATA_DIR,
  DATA_FILE,
  SETTINGS_FILE,
  FAVORITES_FILE,
  DEFAULT_SETTINGS
} = require("./config");

function ensureAppDirectory() {
  if (!fs.existsSync(APP_DATA_DIR)) {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  }
}

function ensureFile(filePath, defaultData) {
  ensureAppDirectory();

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf-8");
  }
}

function readJson(filePath, fallback) {
  try {
    ensureFile(filePath, fallback);
    const raw = fs.readFileSync(filePath, "utf-8");

    if (!raw.trim()) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error(`[DB] Erro ao ler ${filePath}:`, error);
    return fallback;
  }
}

function writeJson(filePath, data) {
  try {
    ensureAppDirectory();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error(`[DB] Erro ao salvar ${filePath}:`, error);
    return false;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function createDefaultIndexData() {
  return {
    version: 1,
    updatedAt: null,
    files: []
  };
}

function createDefaultFavoritesData() {
  return {
    version: 1,
    updatedAt: null,
    items: []
  };
}

function initializeDatabase() {
  ensureFile(DATA_FILE, createDefaultIndexData());
  ensureFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  ensureFile(FAVORITES_FILE, createDefaultFavoritesData());
}

function loadIndex() {
  const data = readJson(DATA_FILE, createDefaultIndexData());

  if (!data || typeof data !== "object") {
    return createDefaultIndexData();
  }

  if (!Array.isArray(data.files)) {
    data.files = [];
  }

  if (!("version" in data)) {
    data.version = 1;
  }

  if (!("updatedAt" in data)) {
    data.updatedAt = null;
  }

  return data;
}

function saveIndex(files) {
  const safeFiles = Array.isArray(files) ? files : [];

  const payload = {
    version: 1,
    updatedAt: nowIso(),
    files: safeFiles
  };

  return writeJson(DATA_FILE, payload);
}

function loadSettings() {
  const data = readJson(SETTINGS_FILE, DEFAULT_SETTINGS);

  if (!data || typeof data !== "object") {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    ...DEFAULT_SETTINGS,
    ...data
  };
}

function saveSettings(settings) {
  const payload = {
    ...DEFAULT_SETTINGS,
    ...(settings || {})
  };

  return writeJson(SETTINGS_FILE, payload);
}

function updateSettings(partialSettings) {
  const current = loadSettings();
  const next = {
    ...current,
    ...(partialSettings || {})
  };

  saveSettings(next);
  return next;
}

function loadFavorites() {
  const data = readJson(FAVORITES_FILE, createDefaultFavoritesData());

  if (!data || typeof data !== "object") {
    return createDefaultFavoritesData();
  }

  if (!Array.isArray(data.items)) {
    data.items = [];
  }

  if (!("version" in data)) {
    data.version = 1;
  }

  if (!("updatedAt" in data)) {
    data.updatedAt = null;
  }

  return data;
}

function saveFavorites(items) {
  const safeItems = Array.isArray(items) ? items : [];

  const payload = {
    version: 1,
    updatedAt: nowIso(),
    items: safeItems
  };

  return writeJson(FAVORITES_FILE, payload);
}

function getFavoritePaths() {
  const favorites = loadFavorites();
  return favorites.items.map((item) => item.path);
}

function isFavorite(filePath) {
  if (!filePath) {
    return false;
  }

  const favorites = loadFavorites();
  return favorites.items.some((item) => item.path === filePath);
}

function addFavorite(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }

  const favorites = loadFavorites();

  const exists = favorites.items.some((item) => item.path === filePath);
  if (exists) {
    return true;
  }

  favorites.items.push({
    path: filePath,
    createdAt: nowIso()
  });

  favorites.updatedAt = nowIso();
  return writeJson(FAVORITES_FILE, favorites);
}

function removeFavorite(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }

  const favorites = loadFavorites();
  const originalLength = favorites.items.length;

  favorites.items = favorites.items.filter((item) => item.path !== filePath);

  if (favorites.items.length === originalLength) {
    return true;
  }

  favorites.updatedAt = nowIso();
  return writeJson(FAVORITES_FILE, favorites);
}

function toggleFavorite(filePath) {
  if (isFavorite(filePath)) {
    removeFavorite(filePath);
    return false;
  }

  addFavorite(filePath);
  return true;
}

function upsertIndexedFile(fileRecord) {
  if (!fileRecord || typeof fileRecord !== "object" || !fileRecord.path) {
    return false;
  }

  const indexData = loadIndex();
  const existingIndex = indexData.files.findIndex((item) => item.path === fileRecord.path);

  if (existingIndex >= 0) {
    indexData.files[existingIndex] = {
      ...indexData.files[existingIndex],
      ...fileRecord
    };
  } else {
    indexData.files.push(fileRecord);
  }

  indexData.updatedAt = nowIso();
  return writeJson(DATA_FILE, indexData);
}

function removeIndexedFile(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }

  const indexData = loadIndex();
  const originalLength = indexData.files.length;

  indexData.files = indexData.files.filter((item) => item.path !== filePath);

  if (indexData.files.length === originalLength) {
    return true;
  }

  indexData.updatedAt = nowIso();
  return writeJson(DATA_FILE, indexData);
}

function replaceAllIndexedFiles(files) {
  return saveIndex(files);
}

function clearIndex() {
  return writeJson(DATA_FILE, createDefaultIndexData());
}

function getIndexStats() {
  const indexData = loadIndex();
  const favorites = loadFavorites();

  return {
    totalFiles: indexData.files.length,
    totalFavorites: favorites.items.length,
    lastIndexedAt: indexData.updatedAt
  };
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function resolveAppFile(...segments) {
  ensureAppDirectory();
  return path.join(APP_DATA_DIR, ...segments);
}

module.exports = {
  initializeDatabase,

  loadIndex,
  saveIndex,
  upsertIndexedFile,
  removeIndexedFile,
  replaceAllIndexedFiles,
  clearIndex,

  loadSettings,
  saveSettings,
  updateSettings,

  loadFavorites,
  saveFavorites,
  getFavoritePaths,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,

  getIndexStats,
  fileExists,
  resolveAppFile
};