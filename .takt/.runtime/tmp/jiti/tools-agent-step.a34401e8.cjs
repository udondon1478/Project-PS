"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.readLatestAssistantReply = readLatestAssistantReply;exports.runAgentStep = runAgentStep;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _call = require("../../gateway/call.js");
var _messageChannel = require("../../utils/message-channel.js");
var _lanes = require("../lanes.js");
var _sessionsHelpers = require("./sessions-helpers.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function readLatestAssistantReply(params) {
  const history = await (0, _call.callGateway)({
    method: "chat.history",
    params: { sessionKey: params.sessionKey, limit: params.limit ?? 50 }
  });
  const filtered = (0, _sessionsHelpers.stripToolMessages)(Array.isArray(history?.messages) ? history.messages : []);
  const last = filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
  return last ? (0, _sessionsHelpers.extractAssistantText)(last) : undefined;
}
async function runAgentStep(params) {
  const stepIdem = _nodeCrypto.default.randomUUID();
  const response = await (0, _call.callGateway)({
    method: "agent",
    params: {
      message: params.message,
      sessionKey: params.sessionKey,
      idempotencyKey: stepIdem,
      deliver: false,
      channel: params.channel ?? _messageChannel.INTERNAL_MESSAGE_CHANNEL,
      lane: params.lane ?? _lanes.AGENT_LANE_NESTED,
      extraSystemPrompt: params.extraSystemPrompt
    },
    timeoutMs: 10_000
  });
  const stepRunId = typeof response?.runId === "string" && response.runId ? response.runId : "";
  const resolvedRunId = stepRunId || stepIdem;
  const stepWaitMs = Math.min(params.timeoutMs, 60_000);
  const wait = await (0, _call.callGateway)({
    method: "agent.wait",
    params: {
      runId: resolvedRunId,
      timeoutMs: stepWaitMs
    },
    timeoutMs: stepWaitMs + 2000
  });
  if (wait?.status !== "ok") {
    return undefined;
  }
  return await readLatestAssistantReply({ sessionKey: params.sessionKey });
} /* v9-6366af5902f9558a */
