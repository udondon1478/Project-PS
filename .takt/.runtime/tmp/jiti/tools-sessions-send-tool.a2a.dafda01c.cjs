"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.runSessionsSendA2AFlow = runSessionsSendA2AFlow;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _call = require("../../gateway/call.js");
var _errors = require("../../infra/errors.js");
var _subsystem = require("../../logging/subsystem.js");
var _lanes = require("../lanes.js");
var _agentStep = require("./agent-step.js");
var _sessionsAnnounceTarget = require("./sessions-announce-target.js");
var _sessionsSendHelpers = require("./sessions-send-helpers.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const log = (0, _subsystem.createSubsystemLogger)("agents/sessions-send");
async function runSessionsSendA2AFlow(params) {
  const runContextId = params.waitRunId ?? "unknown";
  try {
    let primaryReply = params.roundOneReply;
    let latestReply = params.roundOneReply;
    if (!primaryReply && params.waitRunId) {
      const waitMs = Math.min(params.announceTimeoutMs, 60_000);
      const wait = await (0, _call.callGateway)({
        method: "agent.wait",
        params: {
          runId: params.waitRunId,
          timeoutMs: waitMs
        },
        timeoutMs: waitMs + 2000
      });
      if (wait?.status === "ok") {
        primaryReply = await (0, _agentStep.readLatestAssistantReply)({
          sessionKey: params.targetSessionKey
        });
        latestReply = primaryReply;
      }
    }
    if (!latestReply) {
      return;
    }
    const announceTarget = await (0, _sessionsAnnounceTarget.resolveAnnounceTarget)({
      sessionKey: params.targetSessionKey,
      displayKey: params.displayKey
    });
    const targetChannel = announceTarget?.channel ?? "unknown";
    if (params.maxPingPongTurns > 0 &&
    params.requesterSessionKey &&
    params.requesterSessionKey !== params.targetSessionKey) {
      let currentSessionKey = params.requesterSessionKey;
      let nextSessionKey = params.targetSessionKey;
      let incomingMessage = latestReply;
      for (let turn = 1; turn <= params.maxPingPongTurns; turn += 1) {
        const currentRole = currentSessionKey === params.requesterSessionKey ? "requester" : "target";
        const replyPrompt = (0, _sessionsSendHelpers.buildAgentToAgentReplyContext)({
          requesterSessionKey: params.requesterSessionKey,
          requesterChannel: params.requesterChannel,
          targetSessionKey: params.displayKey,
          targetChannel,
          currentRole,
          turn,
          maxTurns: params.maxPingPongTurns
        });
        const replyText = await (0, _agentStep.runAgentStep)({
          sessionKey: currentSessionKey,
          message: incomingMessage,
          extraSystemPrompt: replyPrompt,
          timeoutMs: params.announceTimeoutMs,
          lane: _lanes.AGENT_LANE_NESTED
        });
        if (!replyText || (0, _sessionsSendHelpers.isReplySkip)(replyText)) {
          break;
        }
        latestReply = replyText;
        incomingMessage = replyText;
        const swap = currentSessionKey;
        currentSessionKey = nextSessionKey;
        nextSessionKey = swap;
      }
    }
    const announcePrompt = (0, _sessionsSendHelpers.buildAgentToAgentAnnounceContext)({
      requesterSessionKey: params.requesterSessionKey,
      requesterChannel: params.requesterChannel,
      targetSessionKey: params.displayKey,
      targetChannel,
      originalMessage: params.message,
      roundOneReply: primaryReply,
      latestReply
    });
    const announceReply = await (0, _agentStep.runAgentStep)({
      sessionKey: params.targetSessionKey,
      message: "Agent-to-agent announce step.",
      extraSystemPrompt: announcePrompt,
      timeoutMs: params.announceTimeoutMs,
      lane: _lanes.AGENT_LANE_NESTED
    });
    if (announceTarget && announceReply && announceReply.trim() && !(0, _sessionsSendHelpers.isAnnounceSkip)(announceReply)) {
      try {
        await (0, _call.callGateway)({
          method: "send",
          params: {
            to: announceTarget.to,
            message: announceReply.trim(),
            channel: announceTarget.channel,
            accountId: announceTarget.accountId,
            idempotencyKey: _nodeCrypto.default.randomUUID()
          },
          timeoutMs: 10_000
        });
      }
      catch (err) {
        log.warn("sessions_send announce delivery failed", {
          runId: runContextId,
          channel: announceTarget.channel,
          to: announceTarget.to,
          error: (0, _errors.formatErrorMessage)(err)
        });
      }
    }
  }
  catch (err) {
    log.warn("sessions_send announce flow failed", {
      runId: runContextId,
      error: (0, _errors.formatErrorMessage)(err)
    });
  }
} /* v9-fb5c22e283ed4bc8 */
