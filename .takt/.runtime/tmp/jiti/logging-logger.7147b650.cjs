"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_LOG_FILE = exports.DEFAULT_LOG_DIR = void 0;exports.getChildLogger = getChildLogger;exports.getLogger = getLogger;exports.getResolvedLoggerSettings = getResolvedLoggerSettings;exports.isFileLogLevelEnabled = isFileLogLevelEnabled;exports.registerLogTransport = registerLogTransport;exports.resetLogger = resetLogger;exports.setLoggerOverride = setLoggerOverride;exports.toPinoLikeLogger = toPinoLikeLogger;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodeModule = require("node:module");
var _nodePath = _interopRequireDefault(require("node:path"));
var _tslog = require("tslog");
var _config = require("./config.js");
var _levels = require("./levels.js");
var _state = require("./state.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
// Pin to /tmp so mac Debug UI and docs match; os.tmpdir() can be a per-user
// randomized path on macOS which made the “Open log” button a no-op.
const DEFAULT_LOG_DIR = exports.DEFAULT_LOG_DIR = "/tmp/openclaw";
const DEFAULT_LOG_FILE = exports.DEFAULT_LOG_FILE = _nodePath.default.join(DEFAULT_LOG_DIR, "openclaw.log"); // legacy single-file path
const LOG_PREFIX = "openclaw";
const LOG_SUFFIX = ".log";
const MAX_LOG_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const requireConfig = (0, _nodeModule.createRequire)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/logging/logger.js");
const externalTransports = new Set();
function attachExternalTransport(logger, transport) {
  logger.attachTransport((logObj) => {
    if (!externalTransports.has(transport)) {
      return;
    }
    try {
      transport(logObj);
    }
    catch {

      // never block on logging failures
    }});
}
function resolveSettings() {
  let cfg = _state.loggingState.overrideSettings ?? (0, _config.readLoggingConfig)();
  if (!cfg) {
    try {
      const loaded = requireConfig("../config/config.js");
      cfg = loaded.loadConfig?.().logging;
    }
    catch {
      cfg = undefined;
    }
  }
  const level = (0, _levels.normalizeLogLevel)(cfg?.level, "info");
  const file = cfg?.file ?? defaultRollingPathForToday();
  return { level, file };
}
function settingsChanged(a, b) {
  if (!a) {
    return true;
  }
  return a.level !== b.level || a.file !== b.file;
}
function isFileLogLevelEnabled(level) {
  const settings = _state.loggingState.cachedSettings ?? resolveSettings();
  if (!_state.loggingState.cachedSettings) {
    _state.loggingState.cachedSettings = settings;
  }
  if (settings.level === "silent") {
    return false;
  }
  return (0, _levels.levelToMinLevel)(level) <= (0, _levels.levelToMinLevel)(settings.level);
}
function buildLogger(settings) {
  _nodeFs.default.mkdirSync(_nodePath.default.dirname(settings.file), { recursive: true });
  // Clean up stale rolling logs when using a dated log filename.
  if (isRollingPath(settings.file)) {
    pruneOldRollingLogs(_nodePath.default.dirname(settings.file));
  }
  const logger = new _tslog.Logger({
    name: "openclaw",
    minLevel: (0, _levels.levelToMinLevel)(settings.level),
    type: "hidden" // no ansi formatting
  });
  logger.attachTransport((logObj) => {
    try {
      const time = logObj.date?.toISOString?.() ?? new Date().toISOString();
      const line = JSON.stringify({ ...logObj, time });
      _nodeFs.default.appendFileSync(settings.file, `${line}\n`, { encoding: "utf8" });
    }
    catch {

      // never block on logging failures
    }});
  for (const transport of externalTransports) {
    attachExternalTransport(logger, transport);
  }
  return logger;
}
function getLogger() {
  const settings = resolveSettings();
  const cachedLogger = _state.loggingState.cachedLogger;
  const cachedSettings = _state.loggingState.cachedSettings;
  if (!cachedLogger || settingsChanged(cachedSettings, settings)) {
    _state.loggingState.cachedLogger = buildLogger(settings);
    _state.loggingState.cachedSettings = settings;
  }
  return _state.loggingState.cachedLogger;
}
function getChildLogger(bindings, opts) {
  const base = getLogger();
  const minLevel = opts?.level ? (0, _levels.levelToMinLevel)(opts.level) : undefined;
  const name = bindings ? JSON.stringify(bindings) : undefined;
  return base.getSubLogger({
    name,
    minLevel,
    prefix: bindings ? [name ?? ""] : []
  });
}
// Baileys expects a pino-like logger shape. Provide a lightweight adapter.
function toPinoLikeLogger(logger, level) {
  const buildChild = (bindings) => toPinoLikeLogger(logger.getSubLogger({
    name: bindings ? JSON.stringify(bindings) : undefined
  }), level);
  return {
    level,
    child: buildChild,
    trace: (...args) => logger.trace(...args),
    debug: (...args) => logger.debug(...args),
    info: (...args) => logger.info(...args),
    warn: (...args) => logger.warn(...args),
    error: (...args) => logger.error(...args),
    fatal: (...args) => logger.fatal(...args)
  };
}
function getResolvedLoggerSettings() {
  return resolveSettings();
}
// Test helpers
function setLoggerOverride(settings) {
  _state.loggingState.overrideSettings = settings;
  _state.loggingState.cachedLogger = null;
  _state.loggingState.cachedSettings = null;
  _state.loggingState.cachedConsoleSettings = null;
}
function resetLogger() {
  _state.loggingState.cachedLogger = null;
  _state.loggingState.cachedSettings = null;
  _state.loggingState.cachedConsoleSettings = null;
  _state.loggingState.overrideSettings = null;
}
function registerLogTransport(transport) {
  externalTransports.add(transport);
  const logger = _state.loggingState.cachedLogger;
  if (logger) {
    attachExternalTransport(logger, transport);
  }
  return () => {
    externalTransports.delete(transport);
  };
}
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function defaultRollingPathForToday() {
  const today = formatLocalDate(new Date());
  return _nodePath.default.join(DEFAULT_LOG_DIR, `${LOG_PREFIX}-${today}${LOG_SUFFIX}`);
}
function isRollingPath(file) {
  const base = _nodePath.default.basename(file);
  return base.startsWith(`${LOG_PREFIX}-`) &&
  base.endsWith(LOG_SUFFIX) &&
  base.length === `${LOG_PREFIX}-YYYY-MM-DD${LOG_SUFFIX}`.length;
}
function pruneOldRollingLogs(dir) {
  try {
    const entries = _nodeFs.default.readdirSync(dir, { withFileTypes: true });
    const cutoff = Date.now() - MAX_LOG_AGE_MS;
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      if (!entry.name.startsWith(`${LOG_PREFIX}-`) || !entry.name.endsWith(LOG_SUFFIX)) {
        continue;
      }
      const fullPath = _nodePath.default.join(dir, entry.name);
      try {
        const stat = _nodeFs.default.statSync(fullPath);
        if (stat.mtimeMs < cutoff) {
          _nodeFs.default.rmSync(fullPath, { force: true });
        }
      }
      catch {

        // ignore errors during pruning
      }}
  }
  catch {

    // ignore missing dir or read errors
  }} /* v9-342b99465a018c95 */
