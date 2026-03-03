"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getSessionSnapshot = getSessionSnapshot;var _sessions = require("../../config/sessions.js");
var _sessionKey = require("../../routing/session-key.js");
function getSessionSnapshot(cfg, from, _isHeartbeat = false, ctx) {
  const sessionCfg = cfg.session;
  const scope = sessionCfg?.scope ?? "per-sender";
  const key = ctx?.sessionKey?.trim() ??
  (0, _sessions.resolveSessionKey)(scope, { From: from, To: "", Body: "" }, (0, _sessionKey.normalizeMainKey)(sessionCfg?.mainKey));
  const store = (0, _sessions.loadSessionStore)((0, _sessions.resolveStorePath)(sessionCfg?.store));
  const entry = store[key];
  const isThread = (0, _sessions.resolveThreadFlag)({
    sessionKey: key,
    messageThreadId: ctx?.messageThreadId ?? null,
    threadLabel: ctx?.threadLabel ?? null,
    threadStarterBody: ctx?.threadStarterBody ?? null,
    parentSessionKey: ctx?.parentSessionKey ?? null
  });
  const resetType = (0, _sessions.resolveSessionResetType)({ sessionKey: key, isGroup: ctx?.isGroup, isThread });
  const channelReset = (0, _sessions.resolveChannelResetConfig)({
    sessionCfg,
    channel: entry?.lastChannel ?? entry?.channel
  });
  const resetPolicy = (0, _sessions.resolveSessionResetPolicy)({
    sessionCfg,
    resetType,
    resetOverride: channelReset
  });
  const now = Date.now();
  const freshness = entry ?
  (0, _sessions.evaluateSessionFreshness)({ updatedAt: entry.updatedAt, now, policy: resetPolicy }) :
  { fresh: false };
  return {
    key,
    entry,
    fresh: freshness.fresh,
    resetPolicy,
    resetType,
    dailyResetAt: freshness.dailyResetAt,
    idleExpiresAt: freshness.idleExpiresAt
  };
} /* v9-1779da3cf600c60f */
