"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_TIMEOUT_SECONDS = exports.DEFAULT_CACHE_TTL_MINUTES = void 0;exports.normalizeCacheKey = normalizeCacheKey;exports.readCache = readCache;exports.readResponseText = readResponseText;exports.resolveCacheTtlMs = resolveCacheTtlMs;exports.resolveTimeoutSeconds = resolveTimeoutSeconds;exports.withTimeout = withTimeout;exports.writeCache = writeCache;const DEFAULT_TIMEOUT_SECONDS = exports.DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_CACHE_TTL_MINUTES = exports.DEFAULT_CACHE_TTL_MINUTES = 15;
const DEFAULT_CACHE_MAX_ENTRIES = 100;
function resolveTimeoutSeconds(value, fallback) {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(1, Math.floor(parsed));
}
function resolveCacheTtlMs(value, fallbackMinutes) {
  const minutes = typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallbackMinutes;
  return Math.round(minutes * 60_000);
}
function normalizeCacheKey(value) {
  return value.trim().toLowerCase();
}
function readCache(cache, key) {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { value: entry.value, cached: true };
}
function writeCache(cache, key, value, ttlMs) {
  if (ttlMs <= 0) {
    return;
  }
  if (cache.size >= DEFAULT_CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) {
      cache.delete(oldest.value);
    }
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    insertedAt: Date.now()
  });
}
function withTimeout(signal, timeoutMs) {
  if (timeoutMs <= 0) {
    return signal ?? new AbortController().signal;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      controller.abort();
    }, { once: true });
  }
  controller.signal.addEventListener("abort", () => {
    clearTimeout(timer);
  }, { once: true });
  return controller.signal;
}
async function readResponseText(res) {
  try {
    return await res.text();
  }
  catch {
    return "";
  }
} /* v9-b58ad72ba9d74123 */
