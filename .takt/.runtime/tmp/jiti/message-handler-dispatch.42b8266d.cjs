"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.dispatchPreparedSlackMessage = dispatchPreparedSlackMessage;var _identity = require("../../../agents/identity.js");
var _dispatch = require("../../../auto-reply/dispatch.js");
var _history = require("../../../auto-reply/reply/history.js");
var _replyDispatcher = require("../../../auto-reply/reply/reply-dispatcher.js");
var _ackReactions = require("../../../channels/ack-reactions.js");
var _logging = require("../../../channels/logging.js");
var _replyPrefix = require("../../../channels/reply-prefix.js");
var _typing = require("../../../channels/typing.js");
var _sessions = require("../../../config/sessions.js");
var _globals = require("../../../globals.js");
var _actions = require("../../actions.js");
var _threading = require("../../threading.js");
var _replies = require("../replies.js");
async function dispatchPreparedSlackMessage(prepared) {
  const { ctx, account, message, route } = prepared;
  const cfg = ctx.cfg;
  const runtime = ctx.runtime;
  if (prepared.isDirectMessage) {
    const sessionCfg = cfg.session;
    const storePath = (0, _sessions.resolveStorePath)(sessionCfg?.store, {
      agentId: route.agentId
    });
    await (0, _sessions.updateLastRoute)({
      storePath,
      sessionKey: route.mainSessionKey,
      deliveryContext: {
        channel: "slack",
        to: `user:${message.user}`,
        accountId: route.accountId
      },
      ctx: prepared.ctxPayload
    });
  }
  const { statusThreadTs } = (0, _threading.resolveSlackThreadTargets)({
    message,
    replyToMode: ctx.replyToMode
  });
  const messageTs = message.ts ?? message.event_ts;
  const incomingThreadTs = message.thread_ts;
  let didSetStatus = false;
  // Shared mutable ref for "replyToMode=first". Both tool + auto-reply flows
  // mark this to ensure only the first reply is threaded.
  const hasRepliedRef = { value: false };
  const replyPlan = (0, _replies.createSlackReplyDeliveryPlan)({
    replyToMode: ctx.replyToMode,
    incomingThreadTs,
    messageTs,
    hasRepliedRef
  });
  const typingTarget = statusThreadTs ? `${message.channel}/${statusThreadTs}` : message.channel;
  const typingCallbacks = (0, _typing.createTypingCallbacks)({
    start: async () => {
      didSetStatus = true;
      await ctx.setSlackThreadStatus({
        channelId: message.channel,
        threadTs: statusThreadTs,
        status: "is typing..."
      });
    },
    stop: async () => {
      if (!didSetStatus) {
        return;
      }
      didSetStatus = false;
      await ctx.setSlackThreadStatus({
        channelId: message.channel,
        threadTs: statusThreadTs,
        status: ""
      });
    },
    onStartError: (err) => {
      (0, _logging.logTypingFailure)({
        log: (message) => runtime.error?.((0, _globals.danger)(message)),
        channel: "slack",
        action: "start",
        target: typingTarget,
        error: err
      });
    },
    onStopError: (err) => {
      (0, _logging.logTypingFailure)({
        log: (message) => runtime.error?.((0, _globals.danger)(message)),
        channel: "slack",
        action: "stop",
        target: typingTarget,
        error: err
      });
    }
  });
  const prefixContext = (0, _replyPrefix.createReplyPrefixContext)({ cfg, agentId: route.agentId });
  const { dispatcher, replyOptions, markDispatchIdle } = (0, _replyDispatcher.createReplyDispatcherWithTyping)({
    responsePrefix: prefixContext.responsePrefix,
    responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
    humanDelay: (0, _identity.resolveHumanDelayConfig)(cfg, route.agentId),
    deliver: async (payload) => {
      const replyThreadTs = replyPlan.nextThreadTs();
      await (0, _replies.deliverReplies)({
        replies: [payload],
        target: prepared.replyTarget,
        token: ctx.botToken,
        accountId: account.accountId,
        runtime,
        textLimit: ctx.textLimit,
        replyThreadTs
      });
      replyPlan.markSent();
    },
    onError: (err, info) => {
      runtime.error?.((0, _globals.danger)(`slack ${info.kind} reply failed: ${String(err)}`));
      typingCallbacks.onIdle?.();
    },
    onReplyStart: typingCallbacks.onReplyStart,
    onIdle: typingCallbacks.onIdle
  });
  const { queuedFinal, counts } = await (0, _dispatch.dispatchInboundMessage)({
    ctx: prepared.ctxPayload,
    cfg,
    dispatcher,
    replyOptions: {
      ...replyOptions,
      skillFilter: prepared.channelConfig?.skills,
      hasRepliedRef,
      disableBlockStreaming: typeof account.config.blockStreaming === "boolean" ?
      !account.config.blockStreaming :
      undefined,
      onModelSelected: (ctx) => {
        prefixContext.onModelSelected(ctx);
      }
    }
  });
  markDispatchIdle();
  const anyReplyDelivered = queuedFinal || (counts.block ?? 0) > 0 || (counts.final ?? 0) > 0;
  if (!anyReplyDelivered) {
    if (prepared.isRoomish) {
      (0, _history.clearHistoryEntriesIfEnabled)({
        historyMap: ctx.channelHistories,
        historyKey: prepared.historyKey,
        limit: ctx.historyLimit
      });
    }
    return;
  }
  if ((0, _globals.shouldLogVerbose)()) {
    const finalCount = counts.final;
    (0, _globals.logVerbose)(`slack: delivered ${finalCount} reply${finalCount === 1 ? "" : "ies"} to ${prepared.replyTarget}`);
  }
  (0, _ackReactions.removeAckReactionAfterReply)({
    removeAfterReply: ctx.removeAckAfterReply,
    ackReactionPromise: prepared.ackReactionPromise,
    ackReactionValue: prepared.ackReactionValue,
    remove: () => (0, _actions.removeSlackReaction)(message.channel, prepared.ackReactionMessageTs ?? "", prepared.ackReactionValue, {
      token: ctx.botToken,
      client: ctx.app.client
    }),
    onError: (err) => {
      (0, _logging.logAckFailure)({
        log: _globals.logVerbose,
        channel: "slack",
        target: `${message.channel}/${message.ts}`,
        error: err
      });
    }
  });
  if (prepared.isRoomish) {
    (0, _history.clearHistoryEntriesIfEnabled)({
      historyMap: ctx.channelHistories,
      historyKey: prepared.historyKey,
      limit: ctx.historyLimit
    });
  }
} /* v9-072c4644f3cfae49 */
