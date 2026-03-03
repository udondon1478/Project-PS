"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.parseEnvPairs = parseEnvPairs;Object.defineProperty(exports, "parseTimeoutMs", { enumerable: true, get: function () {return _parseTimeout.parseTimeoutMs;} });var _parseTimeout = require("./parse-timeout.js");
function parseEnvPairs(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return undefined;
  }
  const env = {};
  for (const pair of pairs) {
    if (typeof pair !== "string") {
      continue;
    }
    const idx = pair.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = pair.slice(0, idx).trim();
    if (!key) {
      continue;
    }
    env[key] = pair.slice(idx + 1);
  }
  return Object.keys(env).length > 0 ? env : undefined;
} /* v9-1f1233e2a77eaed5 */
