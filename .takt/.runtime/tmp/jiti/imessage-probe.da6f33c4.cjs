"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.probeIMessage = probeIMessage;var _onboardHelpers = require("../commands/onboard-helpers.js");
var _config = require("../config/config.js");
var _exec = require("../process/exec.js");
var _client = require("./client.js");
const rpcSupportCache = new Map();
async function probeRpcSupport(cliPath) {
  const cached = rpcSupportCache.get(cliPath);
  if (cached) {
    return cached;
  }
  try {
    const result = await (0, _exec.runCommandWithTimeout)([cliPath, "rpc", "--help"], { timeoutMs: 2000 });
    const combined = `${result.stdout}\n${result.stderr}`.trim();
    const normalized = combined.toLowerCase();
    if (normalized.includes("unknown command") && normalized.includes("rpc")) {
      const fatal = {
        supported: false,
        fatal: true,
        error: 'imsg CLI does not support the "rpc" subcommand (update imsg)'
      };
      rpcSupportCache.set(cliPath, fatal);
      return fatal;
    }
    if (result.code === 0) {
      const supported = { supported: true };
      rpcSupportCache.set(cliPath, supported);
      return supported;
    }
    return {
      supported: false,
      error: combined || `imsg rpc --help failed (code ${String(result.code ?? "unknown")})`
    };
  }
  catch (err) {
    return { supported: false, error: String(err) };
  }
}
async function probeIMessage(timeoutMs = 2000, opts = {}) {
  const cfg = opts.cliPath || opts.dbPath ? undefined : (0, _config.loadConfig)();
  const cliPath = opts.cliPath?.trim() || cfg?.channels?.imessage?.cliPath?.trim() || "imsg";
  const dbPath = opts.dbPath?.trim() || cfg?.channels?.imessage?.dbPath?.trim();
  const detected = await (0, _onboardHelpers.detectBinary)(cliPath);
  if (!detected) {
    return { ok: false, error: `imsg not found (${cliPath})` };
  }
  const rpcSupport = await probeRpcSupport(cliPath);
  if (!rpcSupport.supported) {
    return {
      ok: false,
      error: rpcSupport.error ?? "imsg rpc unavailable",
      fatal: rpcSupport.fatal
    };
  }
  const client = await (0, _client.createIMessageRpcClient)({
    cliPath,
    dbPath,
    runtime: opts.runtime
  });
  try {
    await client.request("chats.list", { limit: 1 }, { timeoutMs });
    return { ok: true };
  }
  catch (err) {
    return { ok: false, error: String(err) };
  } finally
  {
    await client.stop();
  }
} /* v9-74619c6cce4510af */
