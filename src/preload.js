const { contextBridge, ipcRenderer } = require("electron");

const CHANNELS = {
  APP_INIT: "app:init",

  SEARCH_FILES: "search:files",
  REBUILD_INDEX: "index:rebuild",
  GET_STATS: "index:stats",
  GET_EXTENSIONS: "index:extensions",

  GET_SETTINGS: "settings:get",
  SAVE_SETTINGS: "settings:save",

  GET_FAVORITES: "favorites:get",
  TOGGLE_FAVORITE: "favorites:toggle",
  ADD_FAVORITE: "favorites:add",
  REMOVE_FAVORITE: "favorites:remove",

  OPEN_FILE: "file:open",
  OPEN_FOLDER: "file:openFolder",
  REVEAL_FILE: "file:reveal",
  COPY_PATH: "file:copyPath",
  PATH_INFO: "file:pathInfo",

  STARTUP_STATUS: "startup:status",
  STARTUP_SET: "startup:set"
};

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

contextBridge.exposeInMainWorld("dufind", {
  app: {
    init: () => invoke(CHANNELS.APP_INIT)
  },

  search: {
    files: (payload = {}) => invoke(CHANNELS.SEARCH_FILES, payload)
  },

  index: {
    rebuild: (payload = {}) => invoke(CHANNELS.REBUILD_INDEX, payload),
    stats: () => invoke(CHANNELS.GET_STATS),
    extensions: () => invoke(CHANNELS.GET_EXTENSIONS)
  },

  settings: {
    get: () => invoke(CHANNELS.GET_SETTINGS),
    save: (payload = {}) => invoke(CHANNELS.SAVE_SETTINGS, payload)
  },

  favorites: {
    get: () => invoke(CHANNELS.GET_FAVORITES),
    toggle: (filePath) => invoke(CHANNELS.TOGGLE_FAVORITE, filePath),
    add: (filePath) => invoke(CHANNELS.ADD_FAVORITE, filePath),
    remove: (filePath) => invoke(CHANNELS.REMOVE_FAVORITE, filePath)
  },

  file: {
    open: (filePath) => invoke(CHANNELS.OPEN_FILE, filePath),
    openFolder: (filePath) => invoke(CHANNELS.OPEN_FOLDER, filePath),
    reveal: (filePath) => invoke(CHANNELS.REVEAL_FILE, filePath),
    copyPath: (filePath) => invoke(CHANNELS.COPY_PATH, filePath),
    info: (filePath) => invoke(CHANNELS.PATH_INFO, filePath)
  },

  startup: {
    status: () => invoke(CHANNELS.STARTUP_STATUS),
    set: (enabled) => invoke(CHANNELS.STARTUP_SET, enabled)
  }
});