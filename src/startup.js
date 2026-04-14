const path = require("path");
const { app } = require("electron");

function getExecutablePath() {
  return process.execPath;
}

function getProcessArguments() {
  const isPackaged = app.isPackaged;

  if (isPackaged) {
    return ["--hidden"];
  }

  return [
    path.resolve(process.argv[1] || ""),
    "--hidden"
  ].filter(Boolean);
}

function setLaunchOnStartup(enabled) {
  try {
    const openAtLogin = Boolean(enabled);

    app.setLoginItemSettings({
      openAtLogin,
      openAsHidden: true,
      path: getExecutablePath(),
      args: getProcessArguments()
    });

    return {
      success: true,
      enabled: openAtLogin,
      message: openAtLogin
        ? "Inicialização com o Windows ativada."
        : "Inicialização com o Windows desativada."
    };
  } catch (error) {
    return {
      success: false,
      enabled: false,
      message: "Não foi possível alterar a inicialização com o Windows.",
      error: error.message
    };
  }
}

function getLaunchOnStartupStatus() {
  try {
    const settings = app.getLoginItemSettings({
      path: getExecutablePath(),
      args: getProcessArguments()
    });

    return {
      success: true,
      enabled: Boolean(settings.openAtLogin),
      settings
    };
  } catch (error) {
    return {
      success: false,
      enabled: false,
      message: "Não foi possível consultar a inicialização com o Windows.",
      error: error.message
    };
  }
}

function enableLaunchOnStartup() {
  return setLaunchOnStartup(true);
}

function disableLaunchOnStartup() {
  return setLaunchOnStartup(false);
}

function wasOpenedHidden() {
  return process.argv.includes("--hidden");
}

module.exports = {
  getExecutablePath,
  getProcessArguments,
  setLaunchOnStartup,
  getLaunchOnStartupStatus,
  enableLaunchOnStartup,
  disableLaunchOnStartup,
  wasOpenedHidden
};