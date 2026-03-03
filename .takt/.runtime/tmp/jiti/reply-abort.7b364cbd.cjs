"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatAbortReplyText = formatAbortReplyText;exports.getAbortMemory = getAbortMemory;exports.isAbortTrigger = isAbortTrigger;exports.setAbortMemory = setAbortMemory;exports.stopSubagentsForRequester = stopSubagentsForRequester;exports.tryFastAbortFromMessage = tryFastAbortFromMessage;var _agentScope = require("../../agents/agent-scope.js");
var _piEmbedded = require("../../agents/pi-embedded.js");
var _subagentRegistry = require("../../agents/subagent-registry.js");
var _sessionsHelpers = require("../../agents/tools/sessions-helpers.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
var _sessionKey = require("../../routing/session-key.js");
var _commandAuth = require("../command-auth.js");
var _commandsRegistry = require("../commands-registry.js");
var _mentions = require("./mentions.js");
var _queue = require("./queue.js");
const ABORT_TRIGGERS = new Set(["stop", "esc", "abort", "wait", "exit", "interrupt"]);
const ABORT_MEMORY = new Map();
function isAbortTrigger(text) {
  if (!text) {
    return false;
  }
  const normalized = text.trim().toLowerCase();
  return ABORT_TRIGGERS.has(normalized);
}
function getAbortMemory(key) {
  return ABORT_MEMORY.get(key);
}
function setAbortMemory(key, value) {
  ABORT_MEMORY.set(key, value);
}
function formatAbortReplyText(stoppedSubagents) {
  if (typeof stoppedSubagents !== "number" || stoppedSubagents <= 0) {
    return "⚙️ Agent was aborted.";
  }
  const label = stoppedSubagents === 1 ? "sub-agent" : "sub-agents";
  return `⚙️ Agent was aborted. Stopped ${stoppedSubagents} ${label}.`;
}
function resolveSessionEntryForKey(store, sessionKey) {
  if (!store || !sessionKey) {
    return {};
  }
  const direct = store[sessionKey];
  if (direct) {
    return { entry: direct, key: sessionKey };
  }
  return {};
}
function resolveAbortTargetKey(ctx) {
  const target = ctx.CommandTargetSessionKey?.trim();
  if (target) {
    return target;
  }
  const sessionKey = ctx.SessionKey?.trim();
  return sessionKey || undefined;
}
function normalizeRequesterSessionKey(cfg, key) {
  const cleaned = key?.trim();
  if (!cleaned) {
    return undefined;
  }
  const { mainKey, alias } = (0, _sessionsHelpers.resolveMainSessionAlias)(cfg);
  return (0, _sessionsHelpers.resolveInternalSessionKey)({ key: cleaned, alias, mainKey });
}
function stopSubagentsForRequester(params) {
  const requesterKey = normalizeRequesterSessionKey(params.cfg, params.requesterSessionKey);
  if (!requesterKey) {
    return { stopped: 0 };
  }
  const runs = (0, _subagentRegistry.listSubagentRunsForRequester)(requesterKey);
  if (runs.length === 0) {
    return { stopped: 0 };
  }
  const storeCache = new Map();
  const seenChildKeys = new Set();
  let stopped = 0;
  for (const run of runs) {
    if (run.endedAt) {
      continue;
    }
    const childKey = run.childSessionKey?.trim();
    if (!childKey || seenChildKeys.has(childKey)) {
      continue;
    }
    seenChildKeys.add(childKey);
    const cleared = (0, _queue.clearSessionQueues)([childKey]);
    const parsed = (0, _sessionKey.parseAgentSessionKey)(childKey);
    const storePath = (0, _sessions.resolveStorePath)(params.cfg.session?.store, { agentId: parsed?.agentId });
    let store = storeCache.get(storePath);
    if (!store) {
      store = (0, _sessions.loadSessionStore)(storePath);
      storeCache.set(storePath, store);
    }
    const entry = store[childKey];
    const sessionId = entry?.sessionId;
    const aborted = sessionId ? (0, _piEmbedded.abortEmbeddedPiRun)(sessionId) : false;
    if (aborted || cleared.followupCleared > 0 || cleared.laneCleared > 0) {
      stopped += 1;
    }
  }
  if (stopped > 0) {
    (0, _globals.logVerbose)(`abort: stopped ${stopped} subagent run(s) for ${requesterKey}`);
  }
  return { stopped };
}
async function tryFastAbortFromMessage(params) {
  const { ctx, cfg } = params;
  const targetKey = resolveAbortTargetKey(ctx);
  const agentId = (0, _agentScope.resolveSessionAgentId)({
    sessionKey: targetKey ?? ctx.SessionKey ?? "",
    config: cfg
  });
  // Use RawBody/CommandBody for abort detection (clean message without structural context).
  const raw = (0, _mentions.stripStructuralPrefixes)(ctx.CommandBody ?? ctx.RawBody ?? ctx.Body ?? "");
  const isGroup = ctx.ChatType?.trim().toLowerCase() === "group";
  const stripped = isGroup ? (0, _mentions.stripMentions)(raw, ctx, cfg, agentId) : raw;
  const normalized = (0, _commandsRegistry.normalizeCommandBody)(stripped);
  const abortRequested = normalized === "/stop" || isAbortTrigger(stripped);
  if (!abortRequested) {
    return { handled: false, aborted: false };
  }
  const commandAuthorized = ctx.CommandAuthorized;
  const auth = (0, _commandAuth.resolveCommandAuthorization)({
    ctx,
    cfg,
    commandAuthorized
  });
  if (!auth.isAuthorizedSender) {
    return { handled: false, aborted: false };
  }
  const abortKey = targetKey ?? auth.from ?? auth.to;
  const requesterSessionKey = targetKey ?? ctx.SessionKey ?? abortKey;
  if (targetKey) {
    const storePath = (0, _sessions.resolveStorePath)(cfg.session?.store, { agentId });
    const store = (0, _sessions.loadSessionStore)(storePath);
    const { entry, key } = resolveSessionEntryForKey(store, targetKey);
    const sessionId = entry?.sessionId;
    const aborted = sessionId ? (0, _piEmbedded.abortEmbeddedPiRun)(sessionId) : false;
    const cleared = (0, _queue.clearSessionQueues)([key ?? targetKey, sessionId]);
    if (cleared.followupCleared > 0 || cleared.laneCleared > 0) {
      (0, _globals.logVerbose)(`abort: cleared followups=${cleared.followupCleared} lane=${cleared.laneCleared} keys=${cleared.keys.join(",")}`);
    }
    if (entry && key) {
      entry.abortedLastRun = true;
      entry.updatedAt = Date.now();
      store[key] = entry;
      await (0, _sessions.updateSessionStore)(storePath, (nextStore) => {
        const nextEntry = nextStore[key] ?? entry;
        if (!nextEntry) {
          return;
        }
        nextEntry.abortedLastRun = true;
        nextEntry.updatedAt = Date.now();
        nextStore[key] = nextEntry;
      });
    } else
    if (abortKey) {
      setAbortMemory(abortKey, true);
    }
    const { stopped } = stopSubagentsForRequester({ cfg, requesterSessionKey });
    return { handled: true, aborted, stoppedSubagents: stopped };
  }
  if (abortKey) {
    setAbortMemory(abortKey, true);
  }
  const { stopped } = stopSubagentsForRequester({ cfg, requesterSessionKey });
  return { handled: true, aborted: false, stoppedSubagents: stopped };
} /* v9-b6971c2a4ae689ab */
