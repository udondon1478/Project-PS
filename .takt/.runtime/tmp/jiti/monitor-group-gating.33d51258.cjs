"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applyGroupGating = applyGroupGating;var _commandDetection = require("../../../auto-reply/command-detection.js");
var _groupActivation = require("../../../auto-reply/group-activation.js");
var _history = require("../../../auto-reply/reply/history.js");
var _mentionGating = require("../../../channels/mention-gating.js");
var _utils = require("../../../utils.js");
var _mentions = require("../mentions.js");
var _commands = require("./commands.js");
var _groupActivation2 = require("./group-activation.js");
var _groupMembers = require("./group-members.js");
function isOwnerSender(baseMentionConfig, msg) {
  const sender = (0, _utils.normalizeE164)(msg.senderE164 ?? "");
  if (!sender) {
    return false;
  }
  const owners = (0, _mentions.resolveOwnerList)(baseMentionConfig, msg.selfE164 ?? undefined);
  return owners.includes(sender);
}
function applyGroupGating(params) {
  const groupPolicy = (0, _groupActivation2.resolveGroupPolicyFor)(params.cfg, params.conversationId);
  if (groupPolicy.allowlistEnabled && !groupPolicy.allowed) {
    params.logVerbose(`Skipping group message ${params.conversationId} (not in allowlist)`);
    return { shouldProcess: false };
  }
  (0, _groupMembers.noteGroupMember)(params.groupMemberNames, params.groupHistoryKey, params.msg.senderE164, params.msg.senderName);
  const mentionConfig = (0, _mentions.buildMentionConfig)(params.cfg, params.agentId);
  const commandBody = (0, _commands.stripMentionsForCommand)(params.msg.body, mentionConfig.mentionRegexes, params.msg.selfE164);
  const activationCommand = (0, _groupActivation.parseActivationCommand)(commandBody);
  const owner = isOwnerSender(params.baseMentionConfig, params.msg);
  const shouldBypassMention = owner && (0, _commandDetection.hasControlCommand)(commandBody, params.cfg);
  if (activationCommand.hasCommand && !owner) {
    params.logVerbose(`Ignoring /activation from non-owner in group ${params.conversationId}`);
    const sender = params.msg.senderName && params.msg.senderE164 ?
    `${params.msg.senderName} (${params.msg.senderE164})` :
    params.msg.senderName ?? params.msg.senderE164 ?? "Unknown";
    (0, _history.recordPendingHistoryEntryIfEnabled)({
      historyMap: params.groupHistories,
      historyKey: params.groupHistoryKey,
      limit: params.groupHistoryLimit,
      entry: {
        sender,
        body: params.msg.body,
        timestamp: params.msg.timestamp,
        id: params.msg.id,
        senderJid: params.msg.senderJid
      }
    });
    return { shouldProcess: false };
  }
  const mentionDebug = (0, _mentions.debugMention)(params.msg, mentionConfig, params.authDir);
  params.replyLogger.debug({
    conversationId: params.conversationId,
    wasMentioned: mentionDebug.wasMentioned,
    ...mentionDebug.details
  }, "group mention debug");
  const wasMentioned = mentionDebug.wasMentioned;
  const activation = (0, _groupActivation2.resolveGroupActivationFor)({
    cfg: params.cfg,
    agentId: params.agentId,
    sessionKey: params.sessionKey,
    conversationId: params.conversationId
  });
  const requireMention = activation !== "always";
  const selfJid = params.msg.selfJid?.replace(/:\\d+/, "");
  const replySenderJid = params.msg.replyToSenderJid?.replace(/:\\d+/, "");
  const selfE164 = params.msg.selfE164 ? (0, _utils.normalizeE164)(params.msg.selfE164) : null;
  const replySenderE164 = params.msg.replyToSenderE164 ?
  (0, _utils.normalizeE164)(params.msg.replyToSenderE164) :
  null;
  const implicitMention = Boolean(selfJid && replySenderJid && selfJid === replySenderJid ||
  selfE164 && replySenderE164 && selfE164 === replySenderE164);
  const mentionGate = (0, _mentionGating.resolveMentionGating)({
    requireMention,
    canDetectMention: true,
    wasMentioned,
    implicitMention,
    shouldBypassMention
  });
  params.msg.wasMentioned = mentionGate.effectiveWasMentioned;
  if (!shouldBypassMention && requireMention && mentionGate.shouldSkip) {
    params.logVerbose(`Group message stored for context (no mention detected) in ${params.conversationId}: ${params.msg.body}`);
    const sender = params.msg.senderName && params.msg.senderE164 ?
    `${params.msg.senderName} (${params.msg.senderE164})` :
    params.msg.senderName ?? params.msg.senderE164 ?? "Unknown";
    (0, _history.recordPendingHistoryEntryIfEnabled)({
      historyMap: params.groupHistories,
      historyKey: params.groupHistoryKey,
      limit: params.groupHistoryLimit,
      entry: {
        sender,
        body: params.msg.body,
        timestamp: params.msg.timestamp,
        id: params.msg.id,
        senderJid: params.msg.senderJid
      }
    });
    return { shouldProcess: false };
  }
  return { shouldProcess: true };
} /* v9-128c37dd7a019847 */
