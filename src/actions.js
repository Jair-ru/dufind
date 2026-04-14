const fs = require("fs");
const path = require("path");
const { shell, clipboard } = require("electron");

function normalizeFilePath(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return "";
  }

  return path.normalize(filePath.trim());
}

function exists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function getStats(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

function isFile(targetPath) {
  const stats = getStats(targetPath);
  return !!stats && stats.isFile();
}

function isDirectory(targetPath) {
  const stats = getStats(targetPath);
  return !!stats && stats.isDirectory();
}

async function openFile(filePath) {
  const normalizedPath = normalizeFilePath(filePath);

  if (!normalizedPath) {
    return {
      success: false,
      message: "Caminho inválido."
    };
  }

  if (!exists(normalizedPath) || !isFile(normalizedPath)) {
    return {
      success: false,
      message: "Arquivo não encontrado."
    };
  }

  try {
    await shell.openPath(normalizedPath);

    return {
      success: true,
      message: "Arquivo aberto com sucesso."
    };
  } catch (error) {
    return {
      success: false,
      message: "Não foi possível abrir o arquivo.",
      error: error.message
    };
  }
}

async function openFolder(targetPath) {
  const normalizedPath = normalizeFilePath(targetPath);

  if (!normalizedPath) {
    return {
      success: false,
      message: "Caminho inválido."
    };
  }

  let folderPath = normalizedPath;

  if (exists(normalizedPath) && isFile(normalizedPath)) {
    folderPath = path.dirname(normalizedPath);
  }

  if (!exists(folderPath) || !isDirectory(folderPath)) {
    return {
      success: false,
      message: "Pasta não encontrada."
    };
  }

  try {
    await shell.openPath(folderPath);

    return {
      success: true,
      message: "Pasta aberta com sucesso."
    };
  } catch (error) {
    return {
      success: false,
      message: "Não foi possível abrir a pasta.",
      error: error.message
    };
  }
}

async function revealInExplorer(filePath) {
  const normalizedPath = normalizeFilePath(filePath);

  if (!normalizedPath) {
    return {
      success: false,
      message: "Caminho inválido."
    };
  }

  if (!exists(normalizedPath)) {
    return {
      success: false,
      message: "Arquivo ou pasta não encontrado."
    };
  }

  try {
    shell.showItemInFolder(normalizedPath);

    return {
      success: true,
      message: "Item revelado no Explorer."
    };
  } catch (error) {
    return {
      success: false,
      message: "Não foi possível revelar o item no Explorer.",
      error: error.message
    };
  }
}

function copyPath(targetPath) {
  const normalizedPath = normalizeFilePath(targetPath);

  if (!normalizedPath) {
    return {
      success: false,
      message: "Caminho inválido."
    };
  }

  clipboard.writeText(normalizedPath);

  return {
    success: true,
    message: "Caminho copiado com sucesso.",
    value: normalizedPath
  };
}

function getPathInfo(targetPath) {
  const normalizedPath = normalizeFilePath(targetPath);

  if (!normalizedPath) {
    return {
      exists: false,
      isFile: false,
      isDirectory: false,
      path: ""
    };
  }

  return {
    exists: exists(normalizedPath),
    isFile: isFile(normalizedPath),
    isDirectory: isDirectory(normalizedPath),
    path: normalizedPath
  };
}

module.exports = {
  normalizeFilePath,
  exists,
  isFile,
  isDirectory,
  openFile,
  openFolder,
  revealInExplorer,
  copyPath,
  getPathInfo
};