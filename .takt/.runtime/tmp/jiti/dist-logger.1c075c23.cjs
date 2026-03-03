"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.logDebug = logDebug;exports.logError = logError;exports.logInfo = logInfo;exports.logSuccess = logSuccess;exports.logWarn = logWarn;var _globals = require("./globals.js");
var _logger = require("./logging/logger.js");
var _subsystem = require("./logging/subsystem.js");
var _runtime = require("./runtime.js");
const subsystemPrefixRe = /^([a-z][a-z0-9-]{1,20}):\s+(.*)$/i;
function splitSubsystem(message) {
  const match = message.match(subsystemPrefixRe);
  if (!match) {
    return null;
  }
  const [, subsystem, rest] = match;
  return { subsystem, rest };
}
function logInfo(message, runtime = _runtime.defaultRuntime) {
  const parsed = runtime === _runtime.defaultRuntime ? splitSubsystem(message) : null;
  if (parsed) {
    (0, _subsystem.createSubsystemLogger)(parsed.subsystem).info(parsed.rest);
    return;
  }
  runtime.log((0, _globals.info)(message));
  (0, _logger.getLogger)().info(message);
}
function logWarn(message, runtime = _runtime.defaultRuntime) {
  const parsed = runtime === _runtime.defaultRuntime ? splitSubsystem(message) : null;
  if (parsed) {
    (0, _subsystem.createSubsystemLogger)(parsed.subsystem).warn(parsed.rest);
    return;
  }
  runtime.log((0, _globals.warn)(message));
  (0, _logger.getLogger)().warn(message);
}
function logSuccess(message, runtime = _runtime.defaultRuntime) {
  const parsed = runtime === _runtime.defaultRuntime ? splitSubsystem(message) : null;
  if (parsed) {
    (0, _subsystem.createSubsystemLogger)(parsed.subsystem).info(parsed.rest);
    return;
  }
  runtime.log((0, _globals.success)(message));
  (0, _logger.getLogger)().info(message);
}
function logError(message, runtime = _runtime.defaultRuntime) {
  const parsed = runtime === _runtime.defaultRuntime ? splitSubsystem(message) : null;
  if (parsed) {
    (0, _subsystem.createSubsystemLogger)(parsed.subsystem).error(parsed.rest);
    return;
  }
  runtime.error((0, _globals.danger)(message));
  (0, _logger.getLogger)().error(message);
}
function logDebug(message) {
  // Always emit to file logger (level-filtered); console only when verbose.
  (0, _logger.getLogger)().debug(message);
  (0, _globals.logVerboseConsole)(message);
} /* v9-f3e6bf46e20a45c3 */
