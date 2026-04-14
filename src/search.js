const path = require("path");
const { MAX_RESULTS, normalizeExtension } = require("./config");

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

function splitTerms(query) {
  const normalized = normalizeText(query);
  if (!normalized) {
    return [];
  }

  return normalized.split(/\s+/).filter(Boolean);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function matchesExtension(record, extensionFilter) {
  if (!extensionFilter) {
    return true;
  }

  const normalizedFilter = normalizeExtension(extensionFilter);
  return record.ext === normalizedFilter;
}

function matchesFavoritesOnly(record, favoritesOnly, favoritePathsSet) {
  if (!favoritesOnly) {
    return true;
  }

  return favoritePathsSet.has(record.path);
}

function containsAllTerms(text, terms) {
  if (!text || !terms.length) {
    return false;
  }

  return terms.every((term) => text.includes(term));
}

function countTermHits(text, terms) {
  if (!text || !terms.length) {
    return 0;
  }

  let hits = 0;

  for (const term of terms) {
    if (text.includes(term)) {
      hits += 1;
    }
  }

  return hits;
}

function scoreRecord(record, terms, options = {}) {
  const {
    favoritePathsSet = new Set(),
    enableContentSearch = true
  } = options;

  const name = record.nameLower || "";
  const filePath = record.pathLower || "";
  const directory = record.directoryLower || "";
  const content = enableContentSearch ? (record.contentLower || "") : "";

  let score = 0;
  let matchedBy = "none";

  if (!terms.length) {
    if (favoritePathsSet.has(record.path)) {
      score += 30;
    }

    return {
      score,
      matchedBy: "empty_query"
    };
  }

  const nameStarts = terms.every((term) => name.startsWith(term)) || terms.some((term) => name.startsWith(term));
  const fullNameMatch = containsAllTerms(name, terms);
  const pathMatch = containsAllTerms(filePath, terms);
  const dirMatch = containsAllTerms(directory, terms);
  const contentMatch = enableContentSearch && containsAllTerms(content, terms);

  const nameHits = countTermHits(name, terms);
  const pathHits = countTermHits(filePath, terms);
  const dirHits = countTermHits(directory, terms);
  const contentHits = enableContentSearch ? countTermHits(content, terms) : 0;

  if (nameStarts) {
    score += 140;
    matchedBy = "name_start";
  }

  if (fullNameMatch) {
    score += 100;
    matchedBy = matchedBy === "none" ? "name" : matchedBy;
  }

  if (pathMatch) {
    score += 55;
    if (matchedBy === "none") {
      matchedBy = "path";
    }
  }

  if (dirMatch) {
    score += 35;
    if (matchedBy === "none") {
      matchedBy = "directory";
    }
  }

  if (contentMatch) {
    score += 25;
    if (matchedBy === "none") {
      matchedBy = "content";
    }
  }

  score += nameHits * 15;
  score += pathHits * 8;
  score += dirHits * 5;
  score += contentHits * 4;

  if (favoritePathsSet.has(record.path)) {
    score += 40;
  }

  if (record.contentIndexed) {
    score += 2;
  }

  if (record.name && terms.length === 1 && normalizeText(record.name) === terms[0]) {
    score += 120;
    matchedBy = "exact_name";
  }

  if (record.ext && terms.includes(record.ext.replace(".", ""))) {
    score += 10;
  }

  if (typeof record.mtimeMs === "number") {
    const ageBoost = Math.max(0, 15 - Math.floor((Date.now() - record.mtimeMs) / (1000 * 60 * 60 * 24 * 30)));
    score += ageBoost;
  }

  return {
    score,
    matchedBy
  };
}

function recordMatches(record, terms, options = {}) {
  const {
    extensionFilter = "",
    favoritesOnly = false,
    favoritePathsSet = new Set(),
    enableContentSearch = true
  } = options;

  if (!record || typeof record !== "object" || !record.path) {
    return false;
  }

  if (!matchesExtension(record, extensionFilter)) {
    return false;
  }

  if (!matchesFavoritesOnly(record, favoritesOnly, favoritePathsSet)) {
    return false;
  }

  if (!terms.length) {
    return true;
  }

  const name = record.nameLower || "";
  const filePath = record.pathLower || "";
  const directory = record.directoryLower || "";
  const content = enableContentSearch ? (record.contentLower || "") : "";

  return (
    containsAllTerms(name, terms) ||
    containsAllTerms(filePath, terms) ||
    containsAllTerms(directory, terms) ||
    (enableContentSearch && containsAllTerms(content, terms))
  );
}

function decorateRecord(record, scoreData, favoritePathsSet) {
  return {
    ...record,
    isFavorite: favoritePathsSet.has(record.path),
    score: scoreData.score,
    matchedBy: scoreData.matchedBy,
    displayName: record.name || path.basename(record.path || ""),
    displayDirectory: record.directory || path.dirname(record.path || "")
  };
}

function sortResults(a, b) {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  const aFav = a.isFavorite ? 1 : 0;
  const bFav = b.isFavorite ? 1 : 0;

  if (bFav !== aFav) {
    return bFav - aFav;
  }

  if ((b.mtimeMs || 0) !== (a.mtimeMs || 0)) {
    return (b.mtimeMs || 0) - (a.mtimeMs || 0);
  }

  if ((a.name || "").length !== (b.name || "").length) {
    return (a.name || "").length - (b.name || "").length;
  }

  return (a.path || "").localeCompare(b.path || "");
}

function searchFiles(records, query, options = {}) {
  const {
    extensionFilter = "",
    favoritesOnly = false,
    favoritePaths = [],
    maxResults = MAX_RESULTS,
    enableContentSearch = true
  } = options;

  const allRecords = safeArray(records);
  const terms = splitTerms(query);
  const favoritePathsSet = new Set(safeArray(favoritePaths));

  const matches = [];

  for (const record of allRecords) {
    if (!recordMatches(record, terms, {
      extensionFilter,
      favoritesOnly,
      favoritePathsSet,
      enableContentSearch
    })) {
      continue;
    }

    const scoreData = scoreRecord(record, terms, {
      favoritePathsSet,
      enableContentSearch
    });

    matches.push(decorateRecord(record, scoreData, favoritePathsSet));
  }

  matches.sort(sortResults);

  return matches.slice(0, maxResults);
}

function filterByExtension(records, extensionFilter) {
  const allRecords = safeArray(records);

  if (!extensionFilter) {
    return allRecords;
  }

  const normalized = normalizeExtension(extensionFilter);
  return allRecords.filter((record) => record.ext === normalized);
}

function listAvailableExtensions(records) {
  const allRecords = safeArray(records);
  const extSet = new Set();

  for (const record of allRecords) {
    if (record && record.ext) {
      extSet.add(record.ext);
    }
  }

  return Array.from(extSet).sort((a, b) => a.localeCompare(b));
}

module.exports = {
  normalizeText,
  splitTerms,
  containsAllTerms,
  countTermHits,
  scoreRecord,
  recordMatches,
  decorateRecord,
  sortResults,
  searchFiles,
  filterByExtension,
  listAvailableExtensions
};