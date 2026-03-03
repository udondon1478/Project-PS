"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.probeSignal = probeSignal;var _client = require("./client.js");
function parseSignalVersion(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "object" && value !== null) {
    const version = value.version;
    if (typeof version === "string" && version.trim()) {
      return version.trim();
    }
  }
  return null;
}
async function probeSignal(baseUrl, timeoutMs) {
  const started = Date.now();
  const result = {
    ok: false,
    status: null,
    error: null,
    elapsedMs: 0,
    version: null
  };
  const check = await (0, _client.signalCheck)(baseUrl, timeoutMs);
  if (!check.ok) {
    return {
      ...result,
      status: check.status ?? null,
      error: check.error ?? "unreachable",
      elapsedMs: Date.now() - started
    };
  }
  try {
    const version = await (0, _client.signalRpcRequest)("version", undefined, {
      baseUrl,
      timeoutMs
    });
    result.version = parseSignalVersion(version);
  }
  catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }
  return {
    ...result,
    ok: true,
    status: check.status ?? null,
    elapsedMs: Date.now() - started
  };
} /* v9-0f0312cfa6ef1962 */
