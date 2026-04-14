const path = require("path");
const chokidar = require("chokidar");
const {
  WATCHER_OPTIONS,
  DEFAULT_SEARCH_PATHS,
  isIgnoredDirectory,
  isIgnoredExtension,
  normalizePath,
  ensureUniquePaths
} = require("./config");

function normalizeFilePath(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return "";
  }

  return path.normalize(filePath.trim());
}

function getExtension(filePath) {
  return path.extname(filePath || "").toLowerCase();
}

function shouldIgnoreWatchPath(targetPath) {
  const normalized = normalizeFilePath(targetPath);

  if (!normalized) {
    return true;
  }

  const parts = normalized.split(path.sep).filter(Boolean);

  for (const part of parts) {
    if (isIgnoredDirectory(part)) {
      return true;
    }
  }

  const ext = getExtension(normalized);
  if (ext && isIgnoredExtension(ext)) {
    return true;
  }

  return false;
}

function buildIgnoredCallback() {
  return (targetPath) => shouldIgnoreWatchPath(targetPath);
}

function resolveWatchPaths(customPaths = []) {
  const basePaths = Array.isArray(customPaths) && customPaths.length
    ? customPaths
    : DEFAULT_SEARCH_PATHS;

  return ensureUniquePaths(
    basePaths
      .map((item) => normalizePath(item))
      .filter(Boolean)
  );
}

function createWatcherHandlers(callbacks = {}) {
  return {
    onAdd: typeof callbacks.onAdd === "function" ? callbacks.onAdd : () => {},
    onChange: typeof callbacks.onChange === "function" ? callbacks.onChange : () => {},
    onUnlink: typeof callbacks.onUnlink === "function" ? callbacks.onUnlink : () => {},
    onAddDir: typeof callbacks.onAddDir === "function" ? callbacks.onAddDir : () => {},
    onUnlinkDir: typeof callbacks.onUnlinkDir === "function" ? callbacks.onUnlinkDir : () => {},
    onError: typeof callbacks.onError === "function" ? callbacks.onError : () => {},
    onReady: typeof callbacks.onReady === "function" ? callbacks.onReady : () => {}
  };
}

function startWatcher(customPaths = [], callbacks = {}) {
  const watchPaths = resolveWatchPaths(customPaths);
  const handlers = createWatcherHandlers(callbacks);

  if (!watchPaths.length) {
    return {
      watcher: null,
      close: async () => {},
      paths: []
    };
  }

  const watcher = chokidar.watch(watchPaths, {
    ...WATCHER_OPTIONS,
    ignored: buildIgnoredCallback()
  });

  watcher
    .on("add", (filePath) => {
      if (!shouldIgnoreWatchPath(filePath)) {
        handlers.onAdd(normalizeFilePath(filePath));
      }
    })
    .on("change", (filePath) => {
      if (!shouldIgnoreWatchPath(filePath)) {
        handlers.onChange(normalizeFilePath(filePath));
      }
    })
    .on("unlink", (filePath) => {
      if (!shouldIgnoreWatchPath(filePath)) {
        handlers.onUnlink(normalizeFilePath(filePath));
      }
    })
    .on("addDir", (dirPath) => {
      if (!shouldIgnoreWatchPath(dirPath)) {
        handlers.onAddDir(normalizeFilePath(dirPath));
      }
    })
    .on("unlinkDir", (dirPath) => {
      if (!shouldIgnoreWatchPath(dirPath)) {
        handlers.onUnlinkDir(normalizeFilePath(dirPath));
      }
    })
    .on("error", (error) => {
      handlers.onError(error);
    })
    .on("ready", () => {
      handlers.onReady(watchPaths);
    });

  return {
    watcher,
    paths: watchPaths,
    close: async () => {
      try {
        await watcher.close();
      } catch {
        // ignora erro de fechamento
      }
    }
  };
}

module.exports = {
  normalizeFilePath,
  getExtension,
  shouldIgnoreWatchPath,
  buildIgnoredCallback,
  resolveWatchPaths,
  createWatcherHandlers,
  startWatcher
};