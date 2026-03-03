"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.WA_WEB_AUTH_DIR = void 0;exports.getWebAuthAgeMs = getWebAuthAgeMs;exports.hasWebCredsSync = hasWebCredsSync;exports.logWebSelfId = logWebSelfId;exports.logoutWeb = logoutWeb;exports.maybeRestoreCredsFromBackup = maybeRestoreCredsFromBackup;exports.pickWebChannel = pickWebChannel;exports.readWebSelfId = readWebSelfId;exports.resolveDefaultWebAuthDir = resolveDefaultWebAuthDir;exports.resolveWebCredsBackupPath = resolveWebCredsBackupPath;exports.resolveWebCredsPath = resolveWebCredsPath;exports.webAuthExists = webAuthExists;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _commandFormat = require("../cli/command-format.js");
var _paths = require("../config/paths.js");
var _globals = require("../globals.js");
var _logging = require("../logging.js");
var _sessionKey = require("../routing/session-key.js");
var _runtime = require("../runtime.js");
var _utils = require("../utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolveDefaultWebAuthDir() {
  return _nodePath.default.join((0, _paths.resolveOAuthDir)(), "whatsapp", _sessionKey.DEFAULT_ACCOUNT_ID);
}
const WA_WEB_AUTH_DIR = exports.WA_WEB_AUTH_DIR = resolveDefaultWebAuthDir();
function resolveWebCredsPath(authDir) {
  return _nodePath.default.join(authDir, "creds.json");
}
function resolveWebCredsBackupPath(authDir) {
  return _nodePath.default.join(authDir, "creds.json.bak");
}
function hasWebCredsSync(authDir) {
  try {
    const stats = _nodeFs.default.statSync(resolveWebCredsPath(authDir));
    return stats.isFile() && stats.size > 1;
  }
  catch {
    return false;
  }
}
function readCredsJsonRaw(filePath) {
  try {
    if (!_nodeFs.default.existsSync(filePath)) {
      return null;
    }
    const stats = _nodeFs.default.statSync(filePath);
    if (!stats.isFile() || stats.size <= 1) {
      return null;
    }
    return _nodeFs.default.readFileSync(filePath, "utf-8");
  }
  catch {
    return null;
  }
}
function maybeRestoreCredsFromBackup(authDir) {
  const logger = (0, _logging.getChildLogger)({ module: "web-session" });
  try {
    const credsPath = resolveWebCredsPath(authDir);
    const backupPath = resolveWebCredsBackupPath(authDir);
    const raw = readCredsJsonRaw(credsPath);
    if (raw) {
      // Validate that creds.json is parseable.
      JSON.parse(raw);
      return;
    }
    const backupRaw = readCredsJsonRaw(backupPath);
    if (!backupRaw) {
      return;
    }
    // Ensure backup is parseable before restoring.
    JSON.parse(backupRaw);
    _nodeFs.default.copyFileSync(backupPath, credsPath);
    logger.warn({ credsPath }, "restored corrupted WhatsApp creds.json from backup");
  }
  catch {

    // ignore
  }}
async function webAuthExists(authDir = resolveDefaultWebAuthDir()) {
  const resolvedAuthDir = (0, _utils.resolveUserPath)(authDir);
  maybeRestoreCredsFromBackup(resolvedAuthDir);
  const credsPath = resolveWebCredsPath(resolvedAuthDir);
  try {
    await _promises.default.access(resolvedAuthDir);
  }
  catch {
    return false;
  }
  try {
    const stats = await _promises.default.stat(credsPath);
    if (!stats.isFile() || stats.size <= 1) {
      return false;
    }
    const raw = await _promises.default.readFile(credsPath, "utf-8");
    JSON.parse(raw);
    return true;
  }
  catch {
    return false;
  }
}
async function clearLegacyBaileysAuthState(authDir) {
  const entries = await _promises.default.readdir(authDir, { withFileTypes: true });
  const shouldDelete = (name) => {
    if (name === "oauth.json") {
      return false;
    }
    if (name === "creds.json" || name === "creds.json.bak") {
      return true;
    }
    if (!name.endsWith(".json")) {
      return false;
    }
    return /^(app-state-sync|session|sender-key|pre-key)-/.test(name);
  };
  await Promise.all(entries.map(async (entry) => {
    if (!entry.isFile()) {
      return;
    }
    if (!shouldDelete(entry.name)) {
      return;
    }
    await _promises.default.rm(_nodePath.default.join(authDir, entry.name), { force: true });
  }));
}
async function logoutWeb(params) {
  const runtime = params.runtime ?? _runtime.defaultRuntime;
  const resolvedAuthDir = (0, _utils.resolveUserPath)(params.authDir ?? resolveDefaultWebAuthDir());
  const exists = await webAuthExists(resolvedAuthDir);
  if (!exists) {
    runtime.log((0, _globals.info)("No WhatsApp Web session found; nothing to delete."));
    return false;
  }
  if (params.isLegacyAuthDir) {
    await clearLegacyBaileysAuthState(resolvedAuthDir);
  } else
  {
    await _promises.default.rm(resolvedAuthDir, { recursive: true, force: true });
  }
  runtime.log((0, _globals.success)("Cleared WhatsApp Web credentials."));
  return true;
}
function readWebSelfId(authDir = resolveDefaultWebAuthDir()) {
  // Read the cached WhatsApp Web identity (jid + E.164) from disk if present.
  try {
    const credsPath = resolveWebCredsPath((0, _utils.resolveUserPath)(authDir));
    if (!_nodeFs.default.existsSync(credsPath)) {
      return { e164: null, jid: null };
    }
    const raw = _nodeFs.default.readFileSync(credsPath, "utf-8");
    const parsed = JSON.parse(raw);
    const jid = parsed?.me?.id ?? null;
    const e164 = jid ? (0, _utils.jidToE164)(jid, { authDir }) : null;
    return { e164, jid };
  }
  catch {
    return { e164: null, jid: null };
  }
}
/**
 * Return the age (in milliseconds) of the cached WhatsApp web auth state, or null when missing.
 * Helpful for heartbeats/observability to spot stale credentials.
 */
function getWebAuthAgeMs(authDir = resolveDefaultWebAuthDir()) {
  try {
    const stats = _nodeFs.default.statSync(resolveWebCredsPath((0, _utils.resolveUserPath)(authDir)));
    return Date.now() - stats.mtimeMs;
  }
  catch {
    return null;
  }
}
function logWebSelfId(authDir = resolveDefaultWebAuthDir(), runtime = _runtime.defaultRuntime, includeChannelPrefix = false) {
  // Human-friendly log of the currently linked personal web session.
  const { e164, jid } = readWebSelfId(authDir);
  const details = e164 || jid ? `${e164 ?? "unknown"}${jid ? ` (jid ${jid})` : ""}` : "unknown";
  const prefix = includeChannelPrefix ? "Web Channel: " : "";
  runtime.log((0, _globals.info)(`${prefix}${details}`));
}
async function pickWebChannel(pref, authDir = resolveDefaultWebAuthDir()) {
  const choice = pref === "auto" ? "web" : pref;
  const hasWeb = await webAuthExists(authDir);
  if (!hasWeb) {
    throw new Error(`No WhatsApp Web session found. Run \`${(0, _commandFormat.formatCliCommand)("openclaw channels login --channel whatsapp --verbose")}\` to link.`);
  }
  return choice;
} /* v9-b3b33aa52bff5976 */
