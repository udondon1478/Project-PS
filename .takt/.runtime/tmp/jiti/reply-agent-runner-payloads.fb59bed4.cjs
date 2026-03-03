"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildReplyPayloads = buildReplyPayloads;var _globals = require("../../globals.js");
var _heartbeat = require("../heartbeat.js");
var _tokens = require("../tokens.js");
var _agentRunnerUtils = require("./agent-runner-utils.js");
var _blockReplyPipeline = require("./block-reply-pipeline.js");
var _replyDirectives = require("./reply-directives.js");
var _replyPayloads = require("./reply-payloads.js");
function buildReplyPayloads(params) {
  let didLogHeartbeatStrip = params.didLogHeartbeatStrip;
  const sanitizedPayloads = params.isHeartbeat ?
  params.payloads :
  params.payloads.flatMap((payload) => {
    let text = payload.text;
    if (payload.isError && text && (0, _agentRunnerUtils.isBunFetchSocketError)(text)) {
      text = (0, _agentRunnerUtils.formatBunFetchSocketError)(text);
    }
    if (!text || !text.includes("HEARTBEAT_OK")) {
      return [{ ...payload, text }];
    }
    const stripped = (0, _heartbeat.stripHeartbeatToken)(text, { mode: "message" });
    if (stripped.didStrip && !didLogHeartbeatStrip) {
      didLogHeartbeatStrip = true;
      (0, _globals.logVerbose)("Stripped stray HEARTBEAT_OK token from reply");
    }
    const hasMedia = Boolean(payload.mediaUrl) || (payload.mediaUrls?.length ?? 0) > 0;
    if (stripped.shouldSkip && !hasMedia) {
      return [];
    }
    return [{ ...payload, text: stripped.text }];
  });
  const replyTaggedPayloads = (0, _replyPayloads.applyReplyThreading)({
    payloads: sanitizedPayloads,
    replyToMode: params.replyToMode,
    replyToChannel: params.replyToChannel,
    currentMessageId: params.currentMessageId
  }).
  map((payload) => {
    const parsed = (0, _replyDirectives.parseReplyDirectives)(payload.text ?? "", {
      currentMessageId: params.currentMessageId,
      silentToken: _tokens.SILENT_REPLY_TOKEN
    });
    const mediaUrls = payload.mediaUrls ?? parsed.mediaUrls;
    const mediaUrl = payload.mediaUrl ?? parsed.mediaUrl ?? mediaUrls?.[0];
    return {
      ...payload,
      text: parsed.text ? parsed.text : undefined,
      mediaUrls,
      mediaUrl,
      replyToId: payload.replyToId ?? parsed.replyToId,
      replyToTag: payload.replyToTag || parsed.replyToTag,
      replyToCurrent: payload.replyToCurrent || parsed.replyToCurrent,
      audioAsVoice: Boolean(payload.audioAsVoice || parsed.audioAsVoice)
    };
  }).
  filter(_replyPayloads.isRenderablePayload);
  // Drop final payloads only when block streaming succeeded end-to-end.
  // If streaming aborted (e.g., timeout), fall back to final payloads.
  const shouldDropFinalPayloads = params.blockStreamingEnabled &&
  Boolean(params.blockReplyPipeline?.didStream()) &&
  !params.blockReplyPipeline?.isAborted();
  const messagingToolSentTexts = params.messagingToolSentTexts ?? [];
  const messagingToolSentTargets = params.messagingToolSentTargets ?? [];
  const suppressMessagingToolReplies = (0, _replyPayloads.shouldSuppressMessagingToolReplies)({
    messageProvider: params.messageProvider,
    messagingToolSentTargets,
    originatingTo: params.originatingTo,
    accountId: params.accountId
  });
  const dedupedPayloads = (0, _replyPayloads.filterMessagingToolDuplicates)({
    payloads: replyTaggedPayloads,
    sentTexts: messagingToolSentTexts
  });
  // Filter out payloads already sent via pipeline or directly during tool flush.
  const filteredPayloads = shouldDropFinalPayloads ?
  [] :
  params.blockStreamingEnabled ?
  dedupedPayloads.filter((payload) => !params.blockReplyPipeline?.hasSentPayload(payload)) :
  params.directlySentBlockKeys?.size ?
  dedupedPayloads.filter((payload) => !params.directlySentBlockKeys.has((0, _blockReplyPipeline.createBlockReplyPayloadKey)(payload))) :
  dedupedPayloads;
  const replyPayloads = suppressMessagingToolReplies ? [] : filteredPayloads;
  return {
    replyPayloads,
    didLogHeartbeatStrip
  };
} /* v9-547b145519948590 */
