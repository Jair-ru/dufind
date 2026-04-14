const fs = require("fs");
const path = require("path");
const {
  MAX_FILE_SIZE_FOR_CONTENT_INDEX,
  MAX_CONTENT_PREVIEW_LENGTH,
  MAX_INDEXED_CONTENT_LENGTH,
  supportsContentIndex
} = require("./config");

function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function getExtension(filePath) {
  return path.extname(filePath || "").toLowerCase();
}

function isSupportedContentFile(filePath) {
  const ext = getExtension(filePath);
  return supportsContentIndex(ext);
}

function isFileTooLarge(filePath) {
  const stats = safeStat(filePath);

  if (!stats || !stats.isFile()) {
    return true;
  }

  return stats.size > MAX_FILE_SIZE_FOR_CONTENT_INDEX;
}

function normalizeWhitespace(text) {
  if (typeof text !== "string") {
    return "";
  }

  return text.replace(/\s+/g, " ").trim();
}

function normalizeContent(text) {
  if (typeof text !== "string") {
    return "";
  }

  return normalizeWhitespace(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function truncateContent(text, maxLength = MAX_INDEXED_CONTENT_LENGTH) {
  if (typeof text !== "string") {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength);
}

function sanitizeRawContent(text) {
  if (typeof text !== "string") {
    return "";
  }

  return text
    .replace(/\u0000/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]/g, " ");
}

function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function extractContent(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return {
      supported: false,
      indexed: false,
      content: "",
      normalizedContent: "",
      preview: "",
      reason: "invalid_path"
    };
  }

  if (!fileExists(filePath)) {
    return {
      supported: false,
      indexed: false,
      content: "",
      normalizedContent: "",
      preview: "",
      reason: "file_not_found"
    };
  }

  if (!isSupportedContentFile(filePath)) {
    return {
      supported: false,
      indexed: false,
      content: "",
      normalizedContent: "",
      preview: "",
      reason: "unsupported_extension"
    };
  }

  if (isFileTooLarge(filePath)) {
    return {
      supported: true,
      indexed: false,
      content: "",
      normalizedContent: "",
      preview: "",
      reason: "file_too_large"
    };
  }

  const raw = readTextFile(filePath);

  if (!raw) {
    return {
      supported: true,
      indexed: false,
      content: "",
      normalizedContent: "",
      preview: "",
      reason: "empty_or_unreadable"
    };
  }

  const sanitized = sanitizeRawContent(raw);
  const cleaned = normalizeWhitespace(sanitized);
  const truncated = truncateContent(cleaned);
  const normalized = normalizeContent(truncated);
  const preview = buildPreview(truncated);

  return {
    supported: true,
    indexed: true,
    content: truncated,
    normalizedContent: normalized,
    preview,
    reason: null
  };
}

function buildPreview(content, maxLength = MAX_CONTENT_PREVIEW_LENGTH) {
  if (typeof content !== "string" || !content.trim()) {
    return "";
  }

  const normalized = normalizeWhitespace(content);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function buildMatchPreview(content, query, maxLength = MAX_CONTENT_PREVIEW_LENGTH) {
  if (typeof content !== "string" || !content.trim()) {
    return "";
  }

  const cleanContent = normalizeWhitespace(content);

  if (!query || typeof query !== "string") {
    return buildPreview(cleanContent, maxLength);
  }

  const normalizedContent = normalizeContent(cleanContent);
  const normalizedQuery = normalizeContent(query);

  if (!normalizedQuery) {
    return buildPreview(cleanContent, maxLength);
  }

  const matchIndex = normalizedContent.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return buildPreview(cleanContent, maxLength);
  }

  const start = Math.max(0, matchIndex - Math.floor(maxLength / 3));
  const end = Math.min(cleanContent.length, start + maxLength);

  let snippet = cleanContent.slice(start, end).trim();

  if (start > 0) {
    snippet = `...${snippet}`;
  }

  if (end < cleanContent.length) {
    snippet = `${snippet}...`;
  }

  return snippet;
}

function hasContentMatch(content, query) {
  if (!content || !query) {
    return false;
  }

  const normalizedContent = normalizeContent(content);
  const normalizedQuery = normalizeContent(query);

  if (!normalizedContent || !normalizedQuery) {
    return false;
  }

  return normalizedContent.includes(normalizedQuery);
}

module.exports = {
  getExtension,
  isSupportedContentFile,
  isFileTooLarge,
  normalizeWhitespace,
  normalizeContent,
  truncateContent,
  sanitizeRawContent,
  readTextFile,
  extractContent,
  buildPreview,
  buildMatchPreview,
  hasContentMatch
};