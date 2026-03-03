"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.info = exports.danger = void 0;exports.isVerbose = isVerbose;exports.isYes = isYes;exports.logVerbose = logVerbose;exports.logVerboseConsole = logVerboseConsole;exports.setVerbose = setVerbose;exports.setYes = setYes;exports.shouldLogVerbose = shouldLogVerbose;exports.warn = exports.success = void 0;var _logger = require("./logging/logger.js");
var _theme = require("./terminal/theme.js");
let globalVerbose = false;
let globalYes = false;
function setVerbose(v) {
  globalVerbose = v;
}
function isVerbose() {
  return globalVerbose;
}
function shouldLogVerbose() {
  return globalVerbose || (0, _logger.isFileLogLevelEnabled)("debug");
}
function logVerbose(message) {
  if (!shouldLogVerbose()) {
    return;
  }
  try {
    (0, _logger.getLogger)().debug({ message }, "verbose");
  }
  catch {

    // ignore logger failures to avoid breaking verbose printing
  }if (!globalVerbose) {
    return;
  }
  console.log(_theme.theme.muted(message));
}
function logVerboseConsole(message) {
  if (!globalVerbose) {
    return;
  }
  console.log(_theme.theme.muted(message));
}
function setYes(v) {
  globalYes = v;
}
function isYes() {
  return globalYes;
}
const success = exports.success = _theme.theme.success;
const warn = exports.warn = _theme.theme.warn;
const info = exports.info = _theme.theme.info;
const danger = exports.danger = _theme.theme.error; /* v9-0e29e433df71bd12 */
