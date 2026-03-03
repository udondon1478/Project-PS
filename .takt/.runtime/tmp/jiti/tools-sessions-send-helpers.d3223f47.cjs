"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildAgentToAgentAnnounceContext = buildAgentToAgentAnnounceContext;exports.buildAgentToAgentMessageContext = buildAgentToAgentMessageContext;exports.buildAgentToAgentReplyContext = buildAgentToAgentReplyContext;exports.isAnnounceSkip = isAnnounceSkip;exports.isReplySkip = isReplySkip;exports.resolveAnnounceTargetFromKey = resolveAnnounceTargetFromKey;exports.resolvePingPongTurns = resolvePingPongTurns;var _index = require("../../channels/plugins/index.js");
var _registry = require("../../channels/registry.js");
const ANNOUNCE_SKIP_TOKEN = "ANNOUNCE_SKIP";
const REPLY_SKIP_TOKEN = "REPLY_SKIP";
const DEFAULT_PING_PONG_TURNS = 5;
const MAX_PING_PONG_TURNS = 5;
function resolveAnnounceTargetFromKey(sessionKey) {
  const rawParts = sessionKey.split(":").filter(Boolean);
  const parts = rawParts.length >= 3 && rawParts[0] === "agent" ? rawParts.slice(2) : rawParts;
  if (parts.length < 3) {
    return null;
  }
  const [channelRaw, kind, ...rest] = parts;
  if (kind !== "group" && kind !== "channel") {
    return null;
  }
  // Extract topic/thread ID from rest (supports both :topic: and :thread:)
  // Telegram uses :topic:, other platforms use :thread:
  let threadId;
  const restJoined = rest.join(":");
  const topicMatch = restJoined.match(/:topic:(\d+)$/);
  const threadMatch = restJoined.match(/:thread:(\d+)$/);
  const match = topicMatch || threadMatch;
  if (match) {
    threadId = match[1]; // Keep as string to match AgentCommandOpts.threadId
  }
  // Remove :topic:N or :thread:N suffix from ID for target
  const id = match ? restJoined.replace(/:(topic|thread):\d+$/, "") : restJoined.trim();
  if (!id) {
    return null;
  }
  if (!channelRaw) {
    return null;
  }
  const normalizedChannel = (0, _index.normalizeChannelId)(channelRaw) ?? (0, _registry.normalizeChannelId)(channelRaw);
  const channel = normalizedChannel ?? channelRaw.toLowerCase();
  const kindTarget = (() => {
    if (!normalizedChannel) {
      return id;
    }
    if (normalizedChannel === "discord" || normalizedChannel === "slack") {
      return `channel:${id}`;
    }
    return kind === "channel" ? `channel:${id}` : `group:${id}`;
  })();
  const normalized = normalizedChannel ?
  (0, _index.getChannelPlugin)(normalizedChannel)?.messaging?.normalizeTarget?.(kindTarget) :
  undefined;
  return {
    channel,
    to: normalized ?? kindTarget,
    threadId
  };
}
function buildAgentToAgentMessageContext(params) {
  const lines = [
  "Agent-to-agent message context:",
  params.requesterSessionKey ?
  `Agent 1 (requester) session: ${params.requesterSessionKey}.` :
  undefined,
  params.requesterChannel ?
  `Agent 1 (requester) channel: ${params.requesterChannel}.` :
  undefined,
  `Agent 2 (target) session: ${params.targetSessionKey}.`].
  filter(Boolean);
  return lines.join("\n");
}
function buildAgentToAgentReplyContext(params) {
  const currentLabel = params.currentRole === "requester" ? "Agent 1 (requester)" : "Agent 2 (target)";
  const lines = [
  "Agent-to-agent reply step:",
  `Current agent: ${currentLabel}.`,
  `Turn ${params.turn} of ${params.maxTurns}.`,
  params.requesterSessionKey ?
  `Agent 1 (requester) session: ${params.requesterSessionKey}.` :
  undefined,
  params.requesterChannel ?
  `Agent 1 (requester) channel: ${params.requesterChannel}.` :
  undefined,
  `Agent 2 (target) session: ${params.targetSessionKey}.`,
  params.targetChannel ? `Agent 2 (target) channel: ${params.targetChannel}.` : undefined,
  `If you want to stop the ping-pong, reply exactly "${REPLY_SKIP_TOKEN}".`].
  filter(Boolean);
  return lines.join("\n");
}
function buildAgentToAgentAnnounceContext(params) {
  const lines = [
  "Agent-to-agent announce step:",
  params.requesterSessionKey ?
  `Agent 1 (requester) session: ${params.requesterSessionKey}.` :
  undefined,
  params.requesterChannel ?
  `Agent 1 (requester) channel: ${params.requesterChannel}.` :
  undefined,
  `Agent 2 (target) session: ${params.targetSessionKey}.`,
  params.targetChannel ? `Agent 2 (target) channel: ${params.targetChannel}.` : undefined,
  `Original request: ${params.originalMessage}`,
  params.roundOneReply ?
  `Round 1 reply: ${params.roundOneReply}` :
  "Round 1 reply: (not available).",
  params.latestReply ? `Latest reply: ${params.latestReply}` : "Latest reply: (not available).",
  `If you want to remain silent, reply exactly "${ANNOUNCE_SKIP_TOKEN}".`,
  "Any other reply will be posted to the target channel.",
  "After this reply, the agent-to-agent conversation is over."].
  filter(Boolean);
  return lines.join("\n");
}
function isAnnounceSkip(text) {
  return (text ?? "").trim() === ANNOUNCE_SKIP_TOKEN;
}
function isReplySkip(text) {
  return (text ?? "").trim() === REPLY_SKIP_TOKEN;
}
function resolvePingPongTurns(cfg) {
  const raw = cfg?.session?.agentToAgent?.maxPingPongTurns;
  const fallback = DEFAULT_PING_PONG_TURNS;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback;
  }
  const rounded = Math.floor(raw);
  return Math.max(0, Math.min(MAX_PING_PONG_TURNS, rounded));
} /* v9-a5c78110554c75a3 */
