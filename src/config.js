const path = require("path");
const os = require("os");

const USER_HOME = os.homedir();

const APP_NAME = "DuFind";
const APP_DIR_NAME = "DuFind";

const APP_DATA_DIR = path.join(USER_HOME, "AppData", "Roaming", APP_DIR_NAME);
const DATA_FILE = path.join(APP_DATA_DIR, "index.json");
const SETTINGS_FILE = path.join(APP_DATA_DIR, "settings.json");
const FAVORITES_FILE = path.join(APP_DATA_DIR, "favorites.json");
const LOG_FILE = path.join(APP_DATA_DIR, "dufind.log");

const DEFAULT_SEARCH_PATHS = [
  path.join(USER_HOME, "Desktop"),
  path.join(USER_HOME, "Documents"),
  path.join(USER_HOME, "Downloads")
];

const IGNORED_DIRECTORIES = [
  "$Recycle.Bin",
  "System Volume Information",
  "Windows",
  "Program Files",
  "Program Files (x86)",
  "ProgramData",
  "Recovery",
  "PerfLogs",
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  "dist",
  "build",
  "out",
  "coverage",
  ".cache",
  ".idea",
  ".vscode"
];

const IGNORED_EXTENSIONS = [
  ".tmp",
  ".temp",
  ".log",
  ".bak",
  ".old",
  ".cache",
  ".dll",
  ".sys",
  ".exe",
  ".msi",
  ".bin",
  ".iso"
];

const CONTENT_SEARCH_EXTENSIONS = [
  ".txt",
  ".md",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".json",
  ".html",
  ".css",
  ".xml",
  ".csv",
  ".yml",
  ".yaml",
  ".ini"
];

const MAX_RESULTS = 200;
const MAX_FILE_SIZE_FOR_CONTENT_INDEX = 1024 * 1024 * 2; // 2 MB
const MAX_CONTENT_PREVIEW_LENGTH = 220;
const MAX_INDEXED_CONTENT_LENGTH = 10000;

const WATCHER_OPTIONS = {
  ignoreInitial: true,
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 350,
    pollInterval: 100
  }
};

const WINDOW_OPTIONS = {
  width: 1100,
  height: 720,
  minWidth: 760,
  minHeight: 520,
  backgroundColor: "#111827",
  autoHideMenuBar: true,
  show: false
};

const GLOBAL_SHORTCUT = "CommandOrControl+Space";

const DEFAULT_SETTINGS = {
  searchPaths: DEFAULT_SEARCH_PATHS,
  ignoredDirectories: IGNORED_DIRECTORIES,
  ignoredExtensions: IGNORED_EXTENSIONS,
  contentSearchExtensions: CONTENT_SEARCH_EXTENSIONS,
  maxResults: MAX_RESULTS,
  globalShortcut: GLOBAL_SHORTCUT,
  launchOnStartup: false,
  enableContentSearch: true,
  rememberWindowState: true
};

function normalizePath(inputPath) {
  if (!inputPath || typeof inputPath !== "string") {
    return "";
  }

  return path.normalize(inputPath.trim());
}

function normalizeExtension(ext) {
  if (!ext || typeof ext !== "string") {
    return "";
  }

  const normalized = ext.trim().toLowerCase();
  return normalized.startsWith(".") ? normalized : `.${normalized}`;
}

function ensureUniquePaths(paths) {
  if (!Array.isArray(paths)) {
    return [];
  }

  const unique = new Set();

  for (const currentPath of paths) {
    const normalized = normalizePath(currentPath);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}

function isIgnoredDirectory(dirName) {
  if (!dirName) {
    return false;
  }

  return IGNORED_DIRECTORIES.includes(String(dirName).trim());
}

function isIgnoredExtension(ext) {
  const normalized = normalizeExtension(ext);
  return IGNORED_EXTENSIONS.includes(normalized);
}

function supportsContentIndex(ext) {
  const normalized = normalizeExtension(ext);
  return CONTENT_SEARCH_EXTENSIONS.includes(normalized);
}

module.exports = {
  APP_NAME,
  APP_DIR_NAME,
  APP_DATA_DIR,
  DATA_FILE,
  SETTINGS_FILE,
  FAVORITES_FILE,
  LOG_FILE,

  DEFAULT_SEARCH_PATHS,
  IGNORED_DIRECTORIES,
  IGNORED_EXTENSIONS,
  CONTENT_SEARCH_EXTENSIONS,

  MAX_RESULTS,
  MAX_FILE_SIZE_FOR_CONTENT_INDEX,
  MAX_CONTENT_PREVIEW_LENGTH,
  MAX_INDEXED_CONTENT_LENGTH,

  WATCHER_OPTIONS,
  WINDOW_OPTIONS,
  GLOBAL_SHORTCUT,
  DEFAULT_SETTINGS,

  normalizePath,
  normalizeExtension,
  ensureUniquePaths,
  isIgnoredDirectory,
  isIgnoredExtension,
  supportsContentIndex
};