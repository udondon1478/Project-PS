"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getFileMtimeMs = getFileMtimeMs;exports.isCacheEnabled = isCacheEnabled;exports.resolveCacheTtlMs = resolveCacheTtlMs;var _nodeFs = _interopRequireDefault(require("node:fs"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolveCacheTtlMs(params) {
  const { envValue, defaultTtlMs } = params;
  if (envValue) {
    const parsed = Number.parseInt(envValue, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return defaultTtlMs;
}
function isCacheEnabled(ttlMs) {
  return ttlMs > 0;
}
function getFileMtimeMs(filePath) {
  try {
    return _nodeFs.default.statSync(filePath).mtimeMs;
  }
  catch {
    return undefined;
  }
} /* v9-85056f3c070dfecf */
