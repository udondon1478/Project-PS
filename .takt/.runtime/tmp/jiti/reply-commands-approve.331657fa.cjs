"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleApproveCommand = void 0;var _call = require("../../gateway/call.js");
var _globals = require("../../globals.js");
var _messageChannel = require("../../utils/message-channel.js");
const COMMAND = "/approve";
const DECISION_ALIASES = {
  allow: "allow-once",
  once: "allow-once",
  "allow-once": "allow-once",
  allowonce: "allow-once",
  always: "allow-always",
  "allow-always": "allow-always",
  allowalways: "allow-always",
  deny: "deny",
  reject: "deny",
  block: "deny"
};
function parseApproveCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith(COMMAND)) {
    return null;
  }
  const rest = trimmed.slice(COMMAND.length).trim();
  if (!rest) {
    return { ok: false, error: "Usage: /approve <id> allow-once|allow-always|deny" };
  }
  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return { ok: false, error: "Usage: /approve <id> allow-once|allow-always|deny" };
  }
  const first = tokens[0].toLowerCase();
  const second = tokens[1].toLowerCase();
  if (DECISION_ALIASES[first]) {
    return {
      ok: true,
      decision: DECISION_ALIASES[first],
      id: tokens.slice(1).join(" ").trim()
    };
  }
  if (DECISION_ALIASES[second]) {
    return {
      ok: true,
      decision: DECISION_ALIASES[second],
      id: tokens[0]
    };
  }
  return { ok: false, error: "Usage: /approve <id> allow-once|allow-always|deny" };
}
function buildResolvedByLabel(params) {
  const channel = params.command.channel;
  const sender = params.command.senderId ?? "unknown";
  return `${channel}:${sender}`;
}
const handleApproveCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const normalized = params.command.commandBodyNormalized;
  const parsed = parseApproveCommand(normalized);
  if (!parsed) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /approve from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  if (!parsed.ok) {
    return { shouldContinue: false, reply: { text: parsed.error } };
  }
  const resolvedBy = buildResolvedByLabel(params);
  try {
    await (0, _call.callGateway)({
      method: "exec.approval.resolve",
      params: { id: parsed.id, decision: parsed.decision },
      clientName: _messageChannel.GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
      clientDisplayName: `Chat approval (${resolvedBy})`,
      mode: _messageChannel.GATEWAY_CLIENT_MODES.BACKEND
    });
  }
  catch (err) {
    return {
      shouldContinue: false,
      reply: {
        text: `❌ Failed to submit approval: ${String(err)}`
      }
    };
  }
  return {
    shouldContinue: false,
    reply: { text: `✅ Exec approval ${parsed.decision} submitted for ${parsed.id}.` }
  };
};exports.handleApproveCommand = handleApproveCommand; /* v9-e23cbcb5780efcc9 */
