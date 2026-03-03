"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_RECONNECT_POLICY = exports.DEFAULT_HEARTBEAT_SECONDS = void 0;Object.defineProperty(exports, "computeBackoff", { enumerable: true, get: function () {return _backoff.computeBackoff;} });exports.newConnectionId = newConnectionId;exports.resolveHeartbeatSeconds = resolveHeartbeatSeconds;exports.resolveReconnectPolicy = resolveReconnectPolicy;Object.defineProperty(exports, "sleepWithAbort", { enumerable: true, get: function () {return _backoff.sleepWithAbort;} });var _nodeCrypto = require("node:crypto");
var _backoff = require("../infra/backoff.js");
const DEFAULT_HEARTBEAT_SECONDS = exports.DEFAULT_HEARTBEAT_SECONDS = 60;
const DEFAULT_RECONNECT_POLICY = exports.DEFAULT_RECONNECT_POLICY = {
  initialMs: 2_000,
  maxMs: 30_000,
  factor: 1.8,
  jitter: 0.25,
  maxAttempts: 12
};
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
function resolveHeartbeatSeconds(cfg, overrideSeconds) {
  const candidate = overrideSeconds ?? cfg.web?.heartbeatSeconds;
  if (typeof candidate === "number" && candidate > 0) {
    return candidate;
  }
  return DEFAULT_HEARTBEAT_SECONDS;
}
function resolveReconnectPolicy(cfg, overrides) {
  const reconnectOverrides = cfg.web?.reconnect ?? {};
  const overrideConfig = overrides ?? {};
  const merged = {
    ...DEFAULT_RECONNECT_POLICY,
    ...reconnectOverrides,
    ...overrideConfig
  };
  merged.initialMs = Math.max(250, merged.initialMs);
  merged.maxMs = Math.max(merged.initialMs, merged.maxMs);
  merged.factor = clamp(merged.factor, 1.1, 10);
  merged.jitter = clamp(merged.jitter, 0, 1);
  merged.maxAttempts = Math.max(0, Math.floor(merged.maxAttempts));
  return merged;
}

function newConnectionId() {
  return (0, _nodeCrypto.randomUUID)();
} /* v9-189fcb0bb91f2316 */
