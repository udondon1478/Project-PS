"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DirectoryCache = void 0;exports.buildDirectoryCacheKey = buildDirectoryCacheKey;function buildDirectoryCacheKey(key) {
  const signature = key.signature ?? "default";
  return `${key.channel}:${key.accountId ?? "default"}:${key.kind}:${key.source}:${signature}`;
}
class DirectoryCache {
  ttlMs;
  cache = new Map();
  lastConfigRef = null;
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
  }
  get(key, cfg) {
    this.resetIfConfigChanged(cfg);
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() - entry.fetchedAt > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key, value, cfg) {
    this.resetIfConfigChanged(cfg);
    this.cache.set(key, { value, fetchedAt: Date.now() });
  }
  clearMatching(match) {
    for (const key of this.cache.keys()) {
      if (match(key)) {
        this.cache.delete(key);
      }
    }
  }
  clear(cfg) {
    this.cache.clear();
    if (cfg) {
      this.lastConfigRef = cfg;
    }
  }
  resetIfConfigChanged(cfg) {
    if (this.lastConfigRef && this.lastConfigRef !== cfg) {
      this.cache.clear();
    }
    this.lastConfigRef = cfg;
  }
}exports.DirectoryCache = DirectoryCache; /* v9-ba310c4de0bc547f */
