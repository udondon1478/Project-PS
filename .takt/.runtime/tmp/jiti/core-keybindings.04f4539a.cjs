"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.KeybindingsManager = exports.DEFAULT_KEYBINDINGS = exports.DEFAULT_APP_KEYBINDINGS = void 0;var _piTui = require("@mariozechner/pi-tui");
var _fs = require("fs");
var _path = require("path");
var _config = require("../config.js");
/**
 * Default application keybindings.
 */
const DEFAULT_APP_KEYBINDINGS = exports.DEFAULT_APP_KEYBINDINGS = {
  interrupt: "escape",
  clear: "ctrl+c",
  exit: "ctrl+d",
  suspend: "ctrl+z",
  cycleThinkingLevel: "shift+tab",
  cycleModelForward: "ctrl+p",
  cycleModelBackward: "shift+ctrl+p",
  selectModel: "ctrl+l",
  expandTools: "ctrl+o",
  toggleThinking: "ctrl+t",
  toggleSessionNamedFilter: "ctrl+n",
  externalEditor: "ctrl+g",
  followUp: "alt+enter",
  dequeue: "alt+up",
  pasteImage: "ctrl+v",
  newSession: [],
  tree: [],
  fork: []
};
/**
 * All default keybindings (app + editor).
 */
const DEFAULT_KEYBINDINGS = exports.DEFAULT_KEYBINDINGS = {
  ..._piTui.DEFAULT_EDITOR_KEYBINDINGS,
  ...DEFAULT_APP_KEYBINDINGS
};
// App actions list for type checking
const APP_ACTIONS = [
"interrupt",
"clear",
"exit",
"suspend",
"cycleThinkingLevel",
"cycleModelForward",
"cycleModelBackward",
"selectModel",
"expandTools",
"toggleThinking",
"toggleSessionNamedFilter",
"externalEditor",
"followUp",
"dequeue",
"pasteImage",
"newSession",
"tree",
"fork"];

function isAppAction(action) {
  return APP_ACTIONS.includes(action);
}
/**
 * Manages all keybindings (app + editor).
 */
class KeybindingsManager {
  config;
  appActionToKeys;
  constructor(config) {
    this.config = config;
    this.appActionToKeys = new Map();
    this.buildMaps();
  }
  /**
   * Create from config file and set up editor keybindings.
   */
  static create(agentDir = (0, _config.getAgentDir)()) {
    const configPath = (0, _path.join)(agentDir, "keybindings.json");
    const config = KeybindingsManager.loadFromFile(configPath);
    const manager = new KeybindingsManager(config);
    // Set up editor keybindings globally
    // Include both editor actions and expandTools (shared between app and editor)
    const editorConfig = {};
    for (const [action, keys] of Object.entries(config)) {
      if (!isAppAction(action) || action === "expandTools") {
        editorConfig[action] = keys;
      }
    }
    (0, _piTui.setEditorKeybindings)(new _piTui.EditorKeybindingsManager(editorConfig));
    return manager;
  }
  /**
   * Create in-memory.
   */
  static inMemory(config = {}) {
    return new KeybindingsManager(config);
  }
  static loadFromFile(path) {
    if (!(0, _fs.existsSync)(path))
    return {};
    try {
      return JSON.parse((0, _fs.readFileSync)(path, "utf-8"));
    }
    catch {
      return {};
    }
  }
  buildMaps() {
    this.appActionToKeys.clear();
    // Set defaults for app actions
    for (const [action, keys] of Object.entries(DEFAULT_APP_KEYBINDINGS)) {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      this.appActionToKeys.set(action, [...keyArray]);
    }
    // Override with user config (app actions only)
    for (const [action, keys] of Object.entries(this.config)) {
      if (keys === undefined || !isAppAction(action))
      continue;
      const keyArray = Array.isArray(keys) ? keys : [keys];
      this.appActionToKeys.set(action, keyArray);
    }
  }
  /**
   * Check if input matches an app action.
   */
  matches(data, action) {
    const keys = this.appActionToKeys.get(action);
    if (!keys)
    return false;
    for (const key of keys) {
      if ((0, _piTui.matchesKey)(data, key))
      return true;
    }
    return false;
  }
  /**
   * Get keys bound to an app action.
   */
  getKeys(action) {
    return this.appActionToKeys.get(action) ?? [];
  }
  /**
   * Get the full effective config.
   */
  getEffectiveConfig() {
    const result = { ...DEFAULT_KEYBINDINGS };
    for (const [action, keys] of Object.entries(this.config)) {
      if (keys !== undefined) {
        result[action] = keys;
      }
    }
    return result;
  }
}exports.KeybindingsManager = KeybindingsManager; /* v9-73ed1feeb27de6a8 */
