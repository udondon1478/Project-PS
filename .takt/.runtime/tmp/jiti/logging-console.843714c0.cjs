"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.enableConsoleCapture = enableConsoleCapture;exports.getConsoleSettings = getConsoleSettings;exports.getResolvedConsoleSettings = getResolvedConsoleSettings;exports.routeLogsToStderr = routeLogsToStderr;exports.setConsoleSubsystemFilter = setConsoleSubsystemFilter;exports.setConsoleTimestampPrefix = setConsoleTimestampPrefix;exports.shouldLogSubsystemToConsole = shouldLogSubsystemToConsole;var _nodeModule = require("node:module");
var _nodeUtil = _interopRequireDefault(require("node:util"));
var _globals = require("../globals.js");
var _ansi = require("../terminal/ansi.js");
var _config = require("./config.js");
var _levels = require("./levels.js");
var _logger = require("./logger.js");
var _state = require("./state.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const requireConfig = (0, _nodeModule.createRequire)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/logging/console.js");
function normalizeConsoleLevel(level) {
  if ((0, _globals.isVerbose)()) {
    return "debug";
  }
  return (0, _levels.normalizeLogLevel)(level, "info");
}
function normalizeConsoleStyle(style) {
  if (style === "compact" || style === "json" || style === "pretty") {
    return style;
  }
  if (!process.stdout.isTTY) {
    return "compact";
  }
  return "pretty";
}
function resolveConsoleSettings() {
  let cfg = _state.loggingState.overrideSettings ?? (0, _config.readLoggingConfig)();
  if (!cfg) {
    if (_state.loggingState.resolvingConsoleSettings) {
      cfg = undefined;
    } else
    {
      _state.loggingState.resolvingConsoleSettings = true;
      try {
        const loaded = requireConfig("../config/config.js");
        cfg = loaded.loadConfig?.().logging;
      }
      catch {
        cfg = undefined;
      } finally
      {
        _state.loggingState.resolvingConsoleSettings = false;
      }
    }
  }
  const level = normalizeConsoleLevel(cfg?.consoleLevel);
  const style = normalizeConsoleStyle(cfg?.consoleStyle);
  return { level, style };
}
function consoleSettingsChanged(a, b) {
  if (!a) {
    return true;
  }
  return a.level !== b.level || a.style !== b.style;
}
function getConsoleSettings() {
  const settings = resolveConsoleSettings();
  const cached = _state.loggingState.cachedConsoleSettings;
  if (!cached || consoleSettingsChanged(cached, settings)) {
    _state.loggingState.cachedConsoleSettings = settings;
  }
  return _state.loggingState.cachedConsoleSettings;
}
function getResolvedConsoleSettings() {
  return getConsoleSettings();
}
// Route all console output (including tslog console writes) to stderr.
// This keeps stdout clean for RPC/JSON modes.
function routeLogsToStderr() {
  _state.loggingState.forceConsoleToStderr = true;
}
function setConsoleSubsystemFilter(filters) {
  if (!filters || filters.length === 0) {
    _state.loggingState.consoleSubsystemFilter = null;
    return;
  }
  const normalized = filters.map((value) => value.trim()).filter((value) => value.length > 0);
  _state.loggingState.consoleSubsystemFilter = normalized.length > 0 ? normalized : null;
}
function setConsoleTimestampPrefix(enabled) {
  _state.loggingState.consoleTimestampPrefix = enabled;
}
function shouldLogSubsystemToConsole(subsystem) {
  const filter = _state.loggingState.consoleSubsystemFilter;
  if (!filter || filter.length === 0) {
    return true;
  }
  return filter.some((prefix) => subsystem === prefix || subsystem.startsWith(`${prefix}/`));
}
const SUPPRESSED_CONSOLE_PREFIXES = [
"Closing session:",
"Opening session:",
"Removing old closed session:",
"Session already closed",
"Session already open"];

function shouldSuppressConsoleMessage(message) {
  if ((0, _globals.isVerbose)()) {
    return false;
  }
  if (SUPPRESSED_CONSOLE_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return true;
  }
  if (message.startsWith("[EventQueue] Slow listener detected") &&
  message.includes("DiscordMessageListener")) {
    return true;
  }
  return false;
}
function isEpipeError(err) {
  const code = err?.code;
  return code === "EPIPE" || code === "EIO";
}
function formatConsoleTimestamp(style) {
  const now = new Date().toISOString();
  if (style === "pretty") {
    return now.slice(11, 19);
  }
  return now;
}
function hasTimestampPrefix(value) {
  return /^(?:\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/.test(value);
}
function isJsonPayload(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return false;
  }
  try {
    JSON.parse(trimmed);
    return true;
  }
  catch {
    return false;
  }
}
/**
 * Route console.* calls through file logging while still emitting to stdout/stderr.
 * This keeps user-facing output unchanged but guarantees every console call is captured in log files.
 */
function enableConsoleCapture() {
  if (_state.loggingState.consolePatched) {
    return;
  }
  _state.loggingState.consolePatched = true;
  let logger = null;
  const getLoggerLazy = () => {
    if (!logger) {
      logger = (0, _logger.getLogger)();
    }
    return logger;
  };
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    trace: console.trace
  };
  _state.loggingState.rawConsole = {
    log: original.log,
    info: original.info,
    warn: original.warn,
    error: original.error
  };
  const forward = (level, orig) => (...args) => {
    const formatted = _nodeUtil.default.format(...args);
    if (shouldSuppressConsoleMessage(formatted)) {
      return;
    }
    const trimmed = (0, _ansi.stripAnsi)(formatted).trimStart();
    const shouldPrefixTimestamp = _state.loggingState.consoleTimestampPrefix &&
    trimmed.length > 0 &&
    !hasTimestampPrefix(trimmed) &&
    !isJsonPayload(trimmed);
    const timestamp = shouldPrefixTimestamp ?
    formatConsoleTimestamp(getConsoleSettings().style) :
    "";
    try {
      const resolvedLogger = getLoggerLazy();
      // Map console levels to file logger
      if (level === "trace") {
        resolvedLogger.trace(formatted);
      } else
      if (level === "debug") {
        resolvedLogger.debug(formatted);
      } else
      if (level === "info") {
        resolvedLogger.info(formatted);
      } else
      if (level === "warn") {
        resolvedLogger.warn(formatted);
      } else
      if (level === "error" || level === "fatal") {
        resolvedLogger.error(formatted);
      } else
      {
        resolvedLogger.info(formatted);
      }
    }
    catch {

      // never block console output on logging failures
    }if (_state.loggingState.forceConsoleToStderr) {
      // in RPC/JSON mode, keep stdout clean
      try {
        const line = timestamp ? `${timestamp} ${formatted}` : formatted;
        process.stderr.write(`${line}\n`);
      }
      catch (err) {
        if (isEpipeError(err)) {
          return;
        }
        throw err;
      }
    } else
    {
      try {
        if (!timestamp) {
          orig.apply(console, args);
          return;
        }
        if (args.length === 0) {
          orig.call(console, timestamp);
          return;
        }
        if (typeof args[0] === "string") {
          orig.call(console, `${timestamp} ${args[0]}`, ...args.slice(1));
          return;
        }
        orig.call(console, timestamp, ...args);
      }
      catch (err) {
        if (isEpipeError(err)) {
          return;
        }
        throw err;
      }
    }
  };
  console.log = forward("info", original.log);
  console.info = forward("info", original.info);
  console.warn = forward("warn", original.warn);
  console.error = forward("error", original.error);
  console.debug = forward("debug", original.debug);
  console.trace = forward("trace", original.trace);
} /* v9-4f03a0f337bf8a33 */
