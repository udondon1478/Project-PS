"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.prewarmSessionFile = prewarmSessionFile;exports.trackSessionManagerAccess = trackSessionManagerAccess;var _nodeBuffer = require("node:buffer");
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _cacheUtils = require("../../config/cache-utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const SESSION_MANAGER_CACHE = new Map();
const DEFAULT_SESSION_MANAGER_TTL_MS = 45_000; // 45 seconds
function getSessionManagerTtl() {
  return (0, _cacheUtils.resolveCacheTtlMs)({
    envValue: process.env.OPENCLAW_SESSION_MANAGER_CACHE_TTL_MS,
    defaultTtlMs: DEFAULT_SESSION_MANAGER_TTL_MS
  });
}
function isSessionManagerCacheEnabled() {
  return (0, _cacheUtils.isCacheEnabled)(getSessionManagerTtl());
}
function trackSessionManagerAccess(sessionFile) {
  if (!isSessionManagerCacheEnabled()) {
    return;
  }
  const now = Date.now();
  SESSION_MANAGER_CACHE.set(sessionFile, {
    sessionFile,
    loadedAt: now
  });
}
function isSessionManagerCached(sessionFile) {
  if (!isSessionManagerCacheEnabled()) {
    return false;
  }
  const entry = SESSION_MANAGER_CACHE.get(sessionFile);
  if (!entry) {
    return false;
  }
  const now = Date.now();
  const ttl = getSessionManagerTtl();
  return now - entry.loadedAt <= ttl;
}
async function prewarmSessionFile(sessionFile) {
  if (!isSessionManagerCacheEnabled()) {
    return;
  }
  if (isSessionManagerCached(sessionFile)) {
    return;
  }
  try {
    // Read a small chunk to encourage OS page cache warmup.
    const handle = await _promises.default.open(sessionFile, "r");
    try {
      const buffer = _nodeBuffer.Buffer.alloc(4096);
      await handle.read(buffer, 0, buffer.length, 0);
    } finally
    {
      await handle.close();
    }
    trackSessionManagerAccess(sessionFile);
  }
  catch {

    // File doesn't exist yet, SessionManager will create it
  }} /* v9-34f205b467a9770c */
