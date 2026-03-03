"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.extractMessageText = extractMessageText;exports.handleSubagentsCommand = void 0;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _lanes = require("../../agents/lanes.js");
var _piEmbedded = require("../../agents/pi-embedded.js");
var _subagentRegistry = require("../../agents/subagent-registry.js");
var _sessionsHelpers = require("../../agents/tools/sessions-helpers.js");
var _sessions = require("../../config/sessions.js");
var _call = require("../../gateway/call.js");
var _globals = require("../../globals.js");
var _sessionKey = require("../../routing/session-key.js");
var _messageChannel = require("../../utils/message-channel.js");
var _abort = require("./abort.js");
var _queue = require("./queue.js");
var _subagentsUtils = require("./subagents-utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const COMMAND = "/subagents";
const ACTIONS = new Set(["list", "stop", "log", "send", "info", "help"]);
function formatTimestamp(valueMs) {
  if (!valueMs || !Number.isFinite(valueMs) || valueMs <= 0) {
    return "n/a";
  }
  return new Date(valueMs).toISOString();
}
function formatTimestampWithAge(valueMs) {
  if (!valueMs || !Number.isFinite(valueMs) || valueMs <= 0) {
    return "n/a";
  }
  return `${formatTimestamp(valueMs)} (${(0, _subagentsUtils.formatAgeShort)(Date.now() - valueMs)})`;
}
function resolveRequesterSessionKey(params) {
  const raw = params.sessionKey?.trim() || params.ctx.CommandTargetSessionKey?.trim();
  if (!raw) {
    return undefined;
  }
  const { mainKey, alias } = (0, _sessionsHelpers.resolveMainSessionAlias)(params.cfg);
  return (0, _sessionsHelpers.resolveInternalSessionKey)({ key: raw, alias, mainKey });
}
function resolveSubagentTarget(runs, token) {
  const trimmed = token?.trim();
  if (!trimmed) {
    return { error: "Missing subagent id." };
  }
  if (trimmed === "last") {
    const sorted = (0, _subagentsUtils.sortSubagentRuns)(runs);
    return { entry: sorted[0] };
  }
  const sorted = (0, _subagentsUtils.sortSubagentRuns)(runs);
  if (/^\d+$/.test(trimmed)) {
    const idx = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(idx) || idx <= 0 || idx > sorted.length) {
      return { error: `Invalid subagent index: ${trimmed}` };
    }
    return { entry: sorted[idx - 1] };
  }
  if (trimmed.includes(":")) {
    const match = runs.find((entry) => entry.childSessionKey === trimmed);
    return match ? { entry: match } : { error: `Unknown subagent session: ${trimmed}` };
  }
  const byRunId = runs.filter((entry) => entry.runId.startsWith(trimmed));
  if (byRunId.length === 1) {
    return { entry: byRunId[0] };
  }
  if (byRunId.length > 1) {
    return { error: `Ambiguous run id prefix: ${trimmed}` };
  }
  return { error: `Unknown subagent id: ${trimmed}` };
}
function buildSubagentsHelp() {
  return [
  "🧭 Subagents",
  "Usage:",
  "- /subagents list",
  "- /subagents stop <id|#|all>",
  "- /subagents log <id|#> [limit] [tools]",
  "- /subagents info <id|#>",
  "- /subagents send <id|#> <message>",
  "",
  "Ids: use the list index (#), runId prefix, or full session key."].
  join("\n");
}
function normalizeMessageText(text) {
  return text.replace(/\s+/g, " ").trim();
}
function extractMessageText(message) {
  const role = typeof message.role === "string" ? message.role : "";
  const shouldSanitize = role === "assistant";
  const content = message.content;
  if (typeof content === "string") {
    const normalized = normalizeMessageText(shouldSanitize ? (0, _sessionsHelpers.sanitizeTextContent)(content) : content);
    return normalized ? { role, text: normalized } : null;
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const chunks = [];
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    if (block.type !== "text") {
      continue;
    }
    const text = block.text;
    if (typeof text === "string") {
      const value = shouldSanitize ? (0, _sessionsHelpers.sanitizeTextContent)(text) : text;
      if (value.trim()) {
        chunks.push(value);
      }
    }
  }
  const joined = normalizeMessageText(chunks.join(" "));
  return joined ? { role, text: joined } : null;
}
function formatLogLines(messages) {
  const lines = [];
  for (const msg of messages) {
    const extracted = extractMessageText(msg);
    if (!extracted) {
      continue;
    }
    const label = extracted.role === "assistant" ? "Assistant" : "User";
    lines.push(`${label}: ${extracted.text}`);
  }
  return lines;
}
function loadSubagentSessionEntry(params, childKey) {
  const parsed = (0, _sessionKey.parseAgentSessionKey)(childKey);
  const storePath = (0, _sessions.resolveStorePath)(params.cfg.session?.store, { agentId: parsed?.agentId });
  const store = (0, _sessions.loadSessionStore)(storePath);
  return { storePath, store, entry: store[childKey] };
}
const handleSubagentsCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const normalized = params.command.commandBodyNormalized;
  if (!normalized.startsWith(COMMAND)) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /subagents from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  const rest = normalized.slice(COMMAND.length).trim();
  const [actionRaw, ...restTokens] = rest.split(/\s+/).filter(Boolean);
  const action = actionRaw?.toLowerCase() || "list";
  if (!ACTIONS.has(action)) {
    return { shouldContinue: false, reply: { text: buildSubagentsHelp() } };
  }
  const requesterKey = resolveRequesterSessionKey(params);
  if (!requesterKey) {
    return { shouldContinue: false, reply: { text: "⚠️ Missing session key." } };
  }
  const runs = (0, _subagentRegistry.listSubagentRunsForRequester)(requesterKey);
  if (action === "help") {
    return { shouldContinue: false, reply: { text: buildSubagentsHelp() } };
  }
  if (action === "list") {
    if (runs.length === 0) {
      return { shouldContinue: false, reply: { text: "🧭 Subagents: none for this session." } };
    }
    const sorted = (0, _subagentsUtils.sortSubagentRuns)(runs);
    const active = sorted.filter((entry) => !entry.endedAt);
    const done = sorted.length - active.length;
    const lines = ["🧭 Subagents (current session)", `Active: ${active.length} · Done: ${done}`];
    sorted.forEach((entry, index) => {
      const status = (0, _subagentsUtils.formatRunStatus)(entry);
      const label = (0, _subagentsUtils.formatRunLabel)(entry);
      const runtime = entry.endedAt && entry.startedAt ?
      (0, _subagentsUtils.formatDurationShort)(entry.endedAt - entry.startedAt) :
      (0, _subagentsUtils.formatAgeShort)(Date.now() - (entry.startedAt ?? entry.createdAt));
      const runId = entry.runId.slice(0, 8);
      lines.push(`${index + 1}) ${status} · ${label} · ${runtime} · run ${runId} · ${entry.childSessionKey}`);
    });
    return { shouldContinue: false, reply: { text: lines.join("\n") } };
  }
  if (action === "stop") {
    const target = restTokens[0];
    if (!target) {
      return { shouldContinue: false, reply: { text: "⚙️ Usage: /subagents stop <id|#|all>" } };
    }
    if (target === "all" || target === "*") {
      const { stopped } = (0, _abort.stopSubagentsForRequester)({
        cfg: params.cfg,
        requesterSessionKey: requesterKey
      });
      const label = stopped === 1 ? "subagent" : "subagents";
      return {
        shouldContinue: false,
        reply: { text: `⚙️ Stopped ${stopped} ${label}.` }
      };
    }
    const resolved = resolveSubagentTarget(runs, target);
    if (!resolved.entry) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${resolved.error ?? "Unknown subagent."}` }
      };
    }
    if (resolved.entry.endedAt) {
      return {
        shouldContinue: false,
        reply: { text: "⚙️ Subagent already finished." }
      };
    }
    const childKey = resolved.entry.childSessionKey;
    const { storePath, store, entry } = loadSubagentSessionEntry(params, childKey);
    const sessionId = entry?.sessionId;
    if (sessionId) {
      (0, _piEmbedded.abortEmbeddedPiRun)(sessionId);
    }
    const cleared = (0, _queue.clearSessionQueues)([childKey, sessionId]);
    if (cleared.followupCleared > 0 || cleared.laneCleared > 0) {
      (0, _globals.logVerbose)(`subagents stop: cleared followups=${cleared.followupCleared} lane=${cleared.laneCleared} keys=${cleared.keys.join(",")}`);
    }
    if (entry) {
      entry.abortedLastRun = true;
      entry.updatedAt = Date.now();
      store[childKey] = entry;
      await (0, _sessions.updateSessionStore)(storePath, (nextStore) => {
        nextStore[childKey] = entry;
      });
    }
    return {
      shouldContinue: false,
      reply: { text: `⚙️ Stop requested for ${(0, _subagentsUtils.formatRunLabel)(resolved.entry)}.` }
    };
  }
  if (action === "info") {
    const target = restTokens[0];
    if (!target) {
      return { shouldContinue: false, reply: { text: "ℹ️ Usage: /subagents info <id|#>" } };
    }
    const resolved = resolveSubagentTarget(runs, target);
    if (!resolved.entry) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${resolved.error ?? "Unknown subagent."}` }
      };
    }
    const run = resolved.entry;
    const { entry: sessionEntry } = loadSubagentSessionEntry(params, run.childSessionKey);
    const runtime = run.startedAt && Number.isFinite(run.startedAt) ?
    (0, _subagentsUtils.formatDurationShort)((run.endedAt ?? Date.now()) - run.startedAt) :
    "n/a";
    const outcome = run.outcome ?
    `${run.outcome.status}${run.outcome.error ? ` (${run.outcome.error})` : ""}` :
    "n/a";
    const lines = [
    "ℹ️ Subagent info",
    `Status: ${(0, _subagentsUtils.formatRunStatus)(run)}`,
    `Label: ${(0, _subagentsUtils.formatRunLabel)(run)}`,
    `Task: ${run.task}`,
    `Run: ${run.runId}`,
    `Session: ${run.childSessionKey}`,
    `SessionId: ${sessionEntry?.sessionId ?? "n/a"}`,
    `Transcript: ${sessionEntry?.sessionFile ?? "n/a"}`,
    `Runtime: ${runtime}`,
    `Created: ${formatTimestampWithAge(run.createdAt)}`,
    `Started: ${formatTimestampWithAge(run.startedAt)}`,
    `Ended: ${formatTimestampWithAge(run.endedAt)}`,
    `Cleanup: ${run.cleanup}`,
    run.archiveAtMs ? `Archive: ${formatTimestampWithAge(run.archiveAtMs)}` : undefined,
    run.cleanupHandled ? "Cleanup handled: yes" : undefined,
    `Outcome: ${outcome}`].
    filter(Boolean);
    return { shouldContinue: false, reply: { text: lines.join("\n") } };
  }
  if (action === "log") {
    const target = restTokens[0];
    if (!target) {
      return { shouldContinue: false, reply: { text: "📜 Usage: /subagents log <id|#> [limit]" } };
    }
    const includeTools = restTokens.some((token) => token.toLowerCase() === "tools");
    const limitToken = restTokens.find((token) => /^\d+$/.test(token));
    const limit = limitToken ? Math.min(200, Math.max(1, Number.parseInt(limitToken, 10))) : 20;
    const resolved = resolveSubagentTarget(runs, target);
    if (!resolved.entry) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${resolved.error ?? "Unknown subagent."}` }
      };
    }
    const history = await (0, _call.callGateway)({
      method: "chat.history",
      params: { sessionKey: resolved.entry.childSessionKey, limit }
    });
    const rawMessages = Array.isArray(history?.messages) ? history.messages : [];
    const filtered = includeTools ? rawMessages : (0, _sessionsHelpers.stripToolMessages)(rawMessages);
    const lines = formatLogLines(filtered);
    const header = `📜 Subagent log: ${(0, _subagentsUtils.formatRunLabel)(resolved.entry)}`;
    if (lines.length === 0) {
      return { shouldContinue: false, reply: { text: `${header}\n(no messages)` } };
    }
    return { shouldContinue: false, reply: { text: [header, ...lines].join("\n") } };
  }
  if (action === "send") {
    const target = restTokens[0];
    const message = restTokens.slice(1).join(" ").trim();
    if (!target || !message) {
      return {
        shouldContinue: false,
        reply: { text: "✉️ Usage: /subagents send <id|#> <message>" }
      };
    }
    const resolved = resolveSubagentTarget(runs, target);
    if (!resolved.entry) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${resolved.error ?? "Unknown subagent."}` }
      };
    }
    const idempotencyKey = _nodeCrypto.default.randomUUID();
    let runId = idempotencyKey;
    try {
      const response = await (0, _call.callGateway)({
        method: "agent",
        params: {
          message,
          sessionKey: resolved.entry.childSessionKey,
          idempotencyKey,
          deliver: false,
          channel: _messageChannel.INTERNAL_MESSAGE_CHANNEL,
          lane: _lanes.AGENT_LANE_SUBAGENT
        },
        timeoutMs: 10_000
      });
      const responseRunId = typeof response?.runId === "string" ? response.runId : undefined;
      if (responseRunId) {
        runId = responseRunId;
      }
    }
    catch (err) {
      const messageText = err instanceof Error ? err.message : typeof err === "string" ? err : "error";
      return { shouldContinue: false, reply: { text: `⚠️ Send failed: ${messageText}` } };
    }
    const waitMs = 30_000;
    const wait = await (0, _call.callGateway)({
      method: "agent.wait",
      params: { runId, timeoutMs: waitMs },
      timeoutMs: waitMs + 2000
    });
    if (wait?.status === "timeout") {
      return {
        shouldContinue: false,
        reply: { text: `⏳ Subagent still running (run ${runId.slice(0, 8)}).` }
      };
    }
    if (wait?.status === "error") {
      const waitError = typeof wait.error === "string" ? wait.error : "unknown error";
      return {
        shouldContinue: false,
        reply: {
          text: `⚠️ Subagent error: ${waitError} (run ${runId.slice(0, 8)}).`
        }
      };
    }
    const history = await (0, _call.callGateway)({
      method: "chat.history",
      params: { sessionKey: resolved.entry.childSessionKey, limit: 50 }
    });
    const filtered = (0, _sessionsHelpers.stripToolMessages)(Array.isArray(history?.messages) ? history.messages : []);
    const last = filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
    const replyText = last ? (0, _sessionsHelpers.extractAssistantText)(last) : undefined;
    return {
      shouldContinue: false,
      reply: {
        text: replyText ?? `✅ Sent to ${(0, _subagentsUtils.formatRunLabel)(resolved.entry)} (run ${runId.slice(0, 8)}).`
      }
    };
  }
  return { shouldContinue: false, reply: { text: buildSubagentsHelp() } };
};exports.handleSubagentsCommand = handleSubagentsCommand; /* v9-abd0d1936dd9204e */
