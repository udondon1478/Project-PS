"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_RESET_MODE = exports.DEFAULT_RESET_AT_HOUR = void 0;exports.evaluateSessionFreshness = evaluateSessionFreshness;exports.isThreadSessionKey = isThreadSessionKey;exports.resolveChannelResetConfig = resolveChannelResetConfig;exports.resolveDailyResetAtMs = resolveDailyResetAtMs;exports.resolveSessionResetPolicy = resolveSessionResetPolicy;exports.resolveSessionResetType = resolveSessionResetType;exports.resolveThreadFlag = resolveThreadFlag;var _messageChannel = require("../../utils/message-channel.js");
var _types = require("./types.js");
const DEFAULT_RESET_MODE = exports.DEFAULT_RESET_MODE = "daily";
const DEFAULT_RESET_AT_HOUR = exports.DEFAULT_RESET_AT_HOUR = 4;
const THREAD_SESSION_MARKERS = [":thread:", ":topic:"];
const GROUP_SESSION_MARKERS = [":group:", ":channel:"];
function isThreadSessionKey(sessionKey) {
  const normalized = (sessionKey ?? "").toLowerCase();
  if (!normalized) {
    return false;
  }
  return THREAD_SESSION_MARKERS.some((marker) => normalized.includes(marker));
}
function resolveSessionResetType(params) {
  if (params.isThread || isThreadSessionKey(params.sessionKey)) {
    return "thread";
  }
  if (params.isGroup) {
    return "group";
  }
  const normalized = (params.sessionKey ?? "").toLowerCase();
  if (GROUP_SESSION_MARKERS.some((marker) => normalized.includes(marker))) {
    return "group";
  }
  return "dm";
}
function resolveThreadFlag(params) {
  if (params.messageThreadId != null) {
    return true;
  }
  if (params.threadLabel?.trim()) {
    return true;
  }
  if (params.threadStarterBody?.trim()) {
    return true;
  }
  if (params.parentSessionKey?.trim()) {
    return true;
  }
  return isThreadSessionKey(params.sessionKey);
}
function resolveDailyResetAtMs(now, atHour) {
  const normalizedAtHour = normalizeResetAtHour(atHour);
  const resetAt = new Date(now);
  resetAt.setHours(normalizedAtHour, 0, 0, 0);
  if (now < resetAt.getTime()) {
    resetAt.setDate(resetAt.getDate() - 1);
  }
  return resetAt.getTime();
}
function resolveSessionResetPolicy(params) {
  const sessionCfg = params.sessionCfg;
  const baseReset = params.resetOverride ?? sessionCfg?.reset;
  const typeReset = params.resetOverride ? undefined : sessionCfg?.resetByType?.[params.resetType];
  const hasExplicitReset = Boolean(baseReset || sessionCfg?.resetByType);
  const legacyIdleMinutes = params.resetOverride ? undefined : sessionCfg?.idleMinutes;
  const mode = typeReset?.mode ??
  baseReset?.mode ?? (
  !hasExplicitReset && legacyIdleMinutes != null ? "idle" : DEFAULT_RESET_MODE);
  const atHour = normalizeResetAtHour(typeReset?.atHour ?? baseReset?.atHour ?? DEFAULT_RESET_AT_HOUR);
  const idleMinutesRaw = typeReset?.idleMinutes ?? baseReset?.idleMinutes ?? legacyIdleMinutes;
  let idleMinutes;
  if (idleMinutesRaw != null) {
    const normalized = Math.floor(idleMinutesRaw);
    if (Number.isFinite(normalized)) {
      idleMinutes = Math.max(normalized, 1);
    }
  } else
  if (mode === "idle") {
    idleMinutes = _types.DEFAULT_IDLE_MINUTES;
  }
  return { mode, atHour, idleMinutes };
}
function resolveChannelResetConfig(params) {
  const resetByChannel = params.sessionCfg?.resetByChannel;
  if (!resetByChannel) {
    return undefined;
  }
  const normalized = (0, _messageChannel.normalizeMessageChannel)(params.channel);
  const fallback = params.channel?.trim().toLowerCase();
  const key = normalized ?? fallback;
  if (!key) {
    return undefined;
  }
  return resetByChannel[key] ?? resetByChannel[key.toLowerCase()];
}
function evaluateSessionFreshness(params) {
  const dailyResetAt = params.policy.mode === "daily" ?
  resolveDailyResetAtMs(params.now, params.policy.atHour) :
  undefined;
  const idleExpiresAt = params.policy.idleMinutes != null ?
  params.updatedAt + params.policy.idleMinutes * 60_000 :
  undefined;
  const staleDaily = dailyResetAt != null && params.updatedAt < dailyResetAt;
  const staleIdle = idleExpiresAt != null && params.now > idleExpiresAt;
  return {
    fresh: !(staleDaily || staleIdle),
    dailyResetAt,
    idleExpiresAt
  };
}
function normalizeResetAtHour(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_RESET_AT_HOUR;
  }
  const normalized = Math.floor(value);
  if (!Number.isFinite(normalized)) {
    return DEFAULT_RESET_AT_HOUR;
  }
  if (normalized < 0) {
    return 0;
  }
  if (normalized > 23) {
    return 23;
  }
  return normalized;
} /* v9-b80142b759184587 */
