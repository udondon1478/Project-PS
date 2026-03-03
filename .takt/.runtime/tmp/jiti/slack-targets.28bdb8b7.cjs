"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.parseSlackTarget = parseSlackTarget;exports.resolveSlackChannelId = resolveSlackChannelId;var _targets = require("../channels/targets.js");
function parseSlackTarget(raw, options = {}) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const mentionMatch = trimmed.match(/^<@([A-Z0-9]+)>$/i);
  if (mentionMatch) {
    return (0, _targets.buildMessagingTarget)("user", mentionMatch[1], trimmed);
  }
  if (trimmed.startsWith("user:")) {
    const id = trimmed.slice("user:".length).trim();
    return id ? (0, _targets.buildMessagingTarget)("user", id, trimmed) : undefined;
  }
  if (trimmed.startsWith("channel:")) {
    const id = trimmed.slice("channel:".length).trim();
    return id ? (0, _targets.buildMessagingTarget)("channel", id, trimmed) : undefined;
  }
  if (trimmed.startsWith("slack:")) {
    const id = trimmed.slice("slack:".length).trim();
    return id ? (0, _targets.buildMessagingTarget)("user", id, trimmed) : undefined;
  }
  if (trimmed.startsWith("@")) {
    const candidate = trimmed.slice(1).trim();
    const id = (0, _targets.ensureTargetId)({
      candidate,
      pattern: /^[A-Z0-9]+$/i,
      errorMessage: "Slack DMs require a user id (use user:<id> or <@id>)"
    });
    return (0, _targets.buildMessagingTarget)("user", id, trimmed);
  }
  if (trimmed.startsWith("#")) {
    const candidate = trimmed.slice(1).trim();
    const id = (0, _targets.ensureTargetId)({
      candidate,
      pattern: /^[A-Z0-9]+$/i,
      errorMessage: "Slack channels require a channel id (use channel:<id>)"
    });
    return (0, _targets.buildMessagingTarget)("channel", id, trimmed);
  }
  if (options.defaultKind) {
    return (0, _targets.buildMessagingTarget)(options.defaultKind, trimmed, trimmed);
  }
  return (0, _targets.buildMessagingTarget)("channel", trimmed, trimmed);
}
function resolveSlackChannelId(raw) {
  const target = parseSlackTarget(raw, { defaultKind: "channel" });
  return (0, _targets.requireTargetKind)({ platform: "Slack", target, kind: "channel" });
} /* v9-2733be883220c119 */
