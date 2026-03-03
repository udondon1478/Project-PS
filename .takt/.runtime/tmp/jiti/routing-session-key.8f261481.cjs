"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_MAIN_KEY = exports.DEFAULT_AGENT_ID = exports.DEFAULT_ACCOUNT_ID = void 0;exports.buildAgentMainSessionKey = buildAgentMainSessionKey;exports.buildAgentPeerSessionKey = buildAgentPeerSessionKey;exports.buildGroupHistoryKey = buildGroupHistoryKey;Object.defineProperty(exports, "isAcpSessionKey", { enumerable: true, get: function () {return _sessionKeyUtils.isAcpSessionKey;} });Object.defineProperty(exports, "isSubagentSessionKey", { enumerable: true, get: function () {return _sessionKeyUtils.isSubagentSessionKey;} });exports.normalizeAccountId = normalizeAccountId;exports.normalizeAgentId = normalizeAgentId;exports.normalizeMainKey = normalizeMainKey;Object.defineProperty(exports, "parseAgentSessionKey", { enumerable: true, get: function () {return _sessionKeyUtils.parseAgentSessionKey;} });exports.resolveAgentIdFromSessionKey = resolveAgentIdFromSessionKey;exports.resolveThreadSessionKeys = resolveThreadSessionKeys;exports.sanitizeAgentId = sanitizeAgentId;exports.toAgentRequestSessionKey = toAgentRequestSessionKey;exports.toAgentStoreSessionKey = toAgentStoreSessionKey;var _sessionKeyUtils = require("../sessions/session-key-utils.js");

const DEFAULT_AGENT_ID = exports.DEFAULT_AGENT_ID = "main";
const DEFAULT_MAIN_KEY = exports.DEFAULT_MAIN_KEY = "main";
const DEFAULT_ACCOUNT_ID = exports.DEFAULT_ACCOUNT_ID = "default";
// Pre-compiled regex
const VALID_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const INVALID_CHARS_RE = /[^a-z0-9_-]+/g;
const LEADING_DASH_RE = /^-+/;
const TRAILING_DASH_RE = /-+$/;
function normalizeToken(value) {
  return (value ?? "").trim().toLowerCase();
}
function normalizeMainKey(value) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.toLowerCase() : DEFAULT_MAIN_KEY;
}
function toAgentRequestSessionKey(storeKey) {
  const raw = (storeKey ?? "").trim();
  if (!raw) {
    return undefined;
  }
  return (0, _sessionKeyUtils.parseAgentSessionKey)(raw)?.rest ?? raw;
}
function toAgentStoreSessionKey(params) {
  const raw = (params.requestKey ?? "").trim();
  if (!raw || raw === DEFAULT_MAIN_KEY) {
    return buildAgentMainSessionKey({ agentId: params.agentId, mainKey: params.mainKey });
  }
  const lowered = raw.toLowerCase();
  if (lowered.startsWith("agent:")) {
    return lowered;
  }
  if (lowered.startsWith("subagent:")) {
    return `agent:${normalizeAgentId(params.agentId)}:${lowered}`;
  }
  return `agent:${normalizeAgentId(params.agentId)}:${lowered}`;
}
function resolveAgentIdFromSessionKey(sessionKey) {
  const parsed = (0, _sessionKeyUtils.parseAgentSessionKey)(sessionKey);
  return normalizeAgentId(parsed?.agentId ?? DEFAULT_AGENT_ID);
}
function normalizeAgentId(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return DEFAULT_AGENT_ID;
  }
  // Keep it path-safe + shell-friendly.
  if (VALID_ID_RE.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  // Best-effort fallback: collapse invalid characters to "-"
  return trimmed.
  toLowerCase().
  replace(INVALID_CHARS_RE, "-").
  replace(LEADING_DASH_RE, "").
  replace(TRAILING_DASH_RE, "").
  slice(0, 64) || DEFAULT_AGENT_ID;
}
function sanitizeAgentId(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return DEFAULT_AGENT_ID;
  }
  if (VALID_ID_RE.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed.
  toLowerCase().
  replace(INVALID_CHARS_RE, "-").
  replace(LEADING_DASH_RE, "").
  replace(TRAILING_DASH_RE, "").
  slice(0, 64) || DEFAULT_AGENT_ID;
}
function normalizeAccountId(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return DEFAULT_ACCOUNT_ID;
  }
  if (VALID_ID_RE.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed.
  toLowerCase().
  replace(INVALID_CHARS_RE, "-").
  replace(LEADING_DASH_RE, "").
  replace(TRAILING_DASH_RE, "").
  slice(0, 64) || DEFAULT_ACCOUNT_ID;
}
function buildAgentMainSessionKey(params) {
  const agentId = normalizeAgentId(params.agentId);
  const mainKey = normalizeMainKey(params.mainKey);
  return `agent:${agentId}:${mainKey}`;
}
function buildAgentPeerSessionKey(params) {
  const peerKind = params.peerKind ?? "dm";
  if (peerKind === "dm") {
    const dmScope = params.dmScope ?? "main";
    let peerId = (params.peerId ?? "").trim();
    const linkedPeerId = dmScope === "main" ?
    null :
    resolveLinkedPeerId({
      identityLinks: params.identityLinks,
      channel: params.channel,
      peerId
    });
    if (linkedPeerId) {
      peerId = linkedPeerId;
    }
    peerId = peerId.toLowerCase();
    if (dmScope === "per-account-channel-peer" && peerId) {
      const channel = (params.channel ?? "").trim().toLowerCase() || "unknown";
      const accountId = normalizeAccountId(params.accountId);
      return `agent:${normalizeAgentId(params.agentId)}:${channel}:${accountId}:dm:${peerId}`;
    }
    if (dmScope === "per-channel-peer" && peerId) {
      const channel = (params.channel ?? "").trim().toLowerCase() || "unknown";
      return `agent:${normalizeAgentId(params.agentId)}:${channel}:dm:${peerId}`;
    }
    if (dmScope === "per-peer" && peerId) {
      return `agent:${normalizeAgentId(params.agentId)}:dm:${peerId}`;
    }
    return buildAgentMainSessionKey({
      agentId: params.agentId,
      mainKey: params.mainKey
    });
  }
  const channel = (params.channel ?? "").trim().toLowerCase() || "unknown";
  const peerId = ((params.peerId ?? "").trim() || "unknown").toLowerCase();
  return `agent:${normalizeAgentId(params.agentId)}:${channel}:${peerKind}:${peerId}`;
}
function resolveLinkedPeerId(params) {
  const identityLinks = params.identityLinks;
  if (!identityLinks) {
    return null;
  }
  const peerId = params.peerId.trim();
  if (!peerId) {
    return null;
  }
  const candidates = new Set();
  const rawCandidate = normalizeToken(peerId);
  if (rawCandidate) {
    candidates.add(rawCandidate);
  }
  const channel = normalizeToken(params.channel);
  if (channel) {
    const scopedCandidate = normalizeToken(`${channel}:${peerId}`);
    if (scopedCandidate) {
      candidates.add(scopedCandidate);
    }
  }
  if (candidates.size === 0) {
    return null;
  }
  for (const [canonical, ids] of Object.entries(identityLinks)) {
    const canonicalName = canonical.trim();
    if (!canonicalName) {
      continue;
    }
    if (!Array.isArray(ids)) {
      continue;
    }
    for (const id of ids) {
      const normalized = normalizeToken(id);
      if (normalized && candidates.has(normalized)) {
        return canonicalName;
      }
    }
  }
  return null;
}
function buildGroupHistoryKey(params) {
  const channel = normalizeToken(params.channel) || "unknown";
  const accountId = normalizeAccountId(params.accountId);
  const peerId = params.peerId.trim().toLowerCase() || "unknown";
  return `${channel}:${accountId}:${params.peerKind}:${peerId}`;
}
function resolveThreadSessionKeys(params) {
  const threadId = (params.threadId ?? "").trim();
  if (!threadId) {
    return { sessionKey: params.baseSessionKey, parentSessionKey: undefined };
  }
  const normalizedThreadId = threadId.toLowerCase();
  const useSuffix = params.useSuffix ?? true;
  const sessionKey = useSuffix ?
  `${params.baseSessionKey}:thread:${normalizedThreadId}` :
  params.baseSessionKey;
  return { sessionKey, parentSessionKey: params.parentSessionKey };
} /* v9-684af9d12146de6e */
