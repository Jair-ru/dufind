const fs = require("fs");
const path = require("path");
const {
  DEFAULT_SEARCH_PATHS,
  isIgnoredDirectory,
  isIgnoredExtension,
  normalizeExtension
} = require("./config");
const { extractContent } = require("./content");

function safeStat(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

function pathExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function isDirectory(targetPath) {
  const stats = safeStat(targetPath);
  return !!stats && stats.isDirectory();
}

function isFile(targetPath) {
  const stats = safeStat(targetPath);
  return !!stats && stats.isFile();
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getFileExtension(filePath) {
  return normalizeExtension(path.extname(filePath || ""));
}

function shouldIgnorePath(targetPath) {
  if (!targetPath || typeof targetPath !== "string") {
    return true;
  }

  const segments = targetPath.split(path.sep).filter(Boolean);

  for (const segment of segments) {
    if (isIgnoredDirectory(segment)) {
      return true;
    }
  }

  return false;
}

function shouldIgnoreFile(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return true;
  }

  if (shouldIgnorePath(filePath)) {
    return true;
  }

  const extension = getFileExtension(filePath);
  if (extension && isIgnoredExtension(extension)) {
    return true;
  }

  return false;
}

function buildFileRecord(filePath) {
  if (!isFile(filePath) || shouldIgnoreFile(filePath)) {
    return null;
  }

  const stats = safeStat(filePath);
  if (!stats) {
    return null;
  }

  const name = path.basename(filePath);
  const dir = path.dirname(filePath);
  const ext = getFileExtension(filePath);
  const contentData = extractContent(filePath);

  return {
    name,
    nameLower: normalizeText(name),
    path: filePath,
    pathLower: normalizeText(filePath),
    directory: dir,
    directoryLower: normalizeText(dir),
    ext,
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    ctimeMs: stats.ctimeMs,
    birthtimeMs: stats.birthtimeMs,
    updatedAt: new Date().toISOString(),

    contentIndexed: contentData.indexed,
    contentSupported: contentData.supported,
    contentReason: contentData.reason,
    content: contentData.content,
    contentLower: contentData.normalizedContent,
    contentPreview: contentData.preview
  };
}

function scanDirectoryRecursive(rootPath, results = [], options = {}) {
  if (!rootPath || !pathExists(rootPath) || !isDirectory(rootPath)) {
    return results;
  }

  if (shouldIgnorePath(rootPath)) {
    return results;
  }

  let entries = [];

  try {
    entries = fs.readdirSync(rootPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      if (isIgnoredDirectory(entry.name)) {
        continue;
      }

      scanDirectoryRecursive(fullPath, results, options);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (shouldIgnoreFile(fullPath)) {
      continue;
    }

    const record = buildFileRecord(fullPath);
    if (record) {
      results.push(record);
    }
  }

  return results;
}

function resolveSearchPaths(customPaths) {
  const sourcePaths = Array.isArray(customPaths) && customPaths.length
    ? customPaths
    : DEFAULT_SEARCH_PATHS;

  const uniquePaths = new Set();

  for (const currentPath of sourcePaths) {
    if (!currentPath || typeof currentPath !== "string") {
      continue;
    }

    const normalized = path.normalize(currentPath.trim());
    if (!normalized) {
      continue;
    }

    if (!pathExists(normalized)) {
      continue;
    }

    uniquePaths.add(normalized);
  }

  return Array.from(uniquePaths);
}

function buildFullIndex(searchPaths) {
  const resolvedPaths = resolveSearchPaths(searchPaths);
  const allFiles = [];

  for (const currentPath of resolvedPaths) {
    scanDirectoryRecursive(currentPath, allFiles);
  }

  return allFiles.sort((a, b) => {
    if (a.nameLower < b.nameLower) return -1;
    if (a.nameLower > b.nameLower) return 1;
    return a.pathLower.localeCompare(b.pathLower);
  });
}

function indexSinglePath(targetPath) {
  if (!targetPath || typeof targetPath !== "string") {
    return null;
  }

  const normalizedPath = path.normalize(targetPath);

  if (!pathExists(normalizedPath)) {
    return null;
  }

  if (isDirectory(normalizedPath)) {
    return scanDirectoryRecursive(normalizedPath, []);
  }

  return buildFileRecord(normalizedPath);
}

function removeMissingFiles(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records.filter((record) => {
    return record && record.path && pathExists(record.path);
  });
}

function reindexChangedFile(targetPath) {
  if (!targetPath || typeof targetPath !== "string") {
    return null;
  }

  if (!pathExists(targetPath)) {
    return null;
  }

  return buildFileRecord(targetPath);
}

module.exports = {
  safeStat,
  pathExists,
  isDirectory,
  isFile,
  normalizeText,
  getFileExtension,
  shouldIgnorePath,
  shouldIgnoreFile,
  buildFileRecord,
  scanDirectoryRecursive,
  resolveSearchPaths,
  buildFullIndex,
  indexSinglePath,
  removeMissingFiles,
  reindexChangedFile
};