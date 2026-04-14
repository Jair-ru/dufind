const path = require("path");
const {
  loadFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  isFavorite,
  getFavoritePaths
} = require("./db");

function normalizeFilePath(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return "";
  }

  return path.normalize(filePath.trim());
}

function getFavorites() {
  const data = loadFavorites();
  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .map((item) => ({
      ...item,
      path: normalizeFilePath(item.path)
    }))
    .filter((item) => item.path);
}

function getFavoriteSet() {
  return new Set(getFavoritePaths().map((itemPath) => normalizeFilePath(itemPath)));
}

function checkFavorite(filePath) {
  const normalizedPath = normalizeFilePath(filePath);

  if (!normalizedPath) {
    return false;
  }

  return isFavorite(normalizedPath);
}

function addToFavorites(filePath) {
  const normalizedPath = normalizeFilePath(filePath);

  if (!normalizedPath) {
    return {
      success: false,
      isFavorite: false,
      message: "Caminho inválido."
    };
  }

  const success = addFavorite(normalizedPath);

  return {
    success,
    isFavorite: success ? true : checkFavorite(normalizedPath),
    message: success
      ? "Arquivo adicionado aos favoritos."
      : "Não foi possível adicionar aos favoritos."
  };
}

function removeFromFavorites(filePath) {
  const normalizedPath = normalizeFilePath(filePath);

  if (!normalizedPath) {
    return {
      success: false,
      isFavorite: false,
      message: "Caminho inválido."
    };
  }

  const success = removeFavorite(normalizedPath);

  return {
    success,
    isFavorite: false,
    message: success
      ? "Arquivo removido dos favoritos."
      : "Não foi possível remover dos favoritos."
  };
}

function toggleFileFavorite(filePath) {
  const normalizedPath = normalizeFilePath(filePath);

  if (!normalizedPath) {
    return {
      success: false,
      isFavorite: false,
      message: "Caminho inválido."
    };
  }

  const nextFavoriteState = toggleFavorite(normalizedPath);

  return {
    success: true,
    isFavorite: nextFavoriteState,
    message: nextFavoriteState
      ? "Arquivo adicionado aos favoritos."
      : "Arquivo removido dos favoritos."
  };
}

function annotateFavorites(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  const favoriteSet = getFavoriteSet();

  return records.map((record) => {
    if (!record || typeof record !== "object") {
      return record;
    }

    return {
      ...record,
      isFavorite: favoriteSet.has(normalizeFilePath(record.path))
    };
  });
}

function sortFavoritesFirst(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return [...records].sort((a, b) => {
    const aFav = a && a.isFavorite ? 1 : 0;
    const bFav = b && b.isFavorite ? 1 : 0;

    if (bFav !== aFav) {
      return bFav - aFav;
    }

    return (a?.name || "").localeCompare(b?.name || "");
  });
}

module.exports = {
  normalizeFilePath,
  getFavorites,
  getFavoriteSet,
  checkFavorite,
  addToFavorites,
  removeFromFavorites,
  toggleFileFavorite,
  annotateFavorites,
  sortFavoritesFirst
};