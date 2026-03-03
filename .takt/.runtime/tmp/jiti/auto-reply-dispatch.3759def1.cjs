"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.dispatchInboundMessage = dispatchInboundMessage;exports.dispatchInboundMessageWithBufferedDispatcher = dispatchInboundMessageWithBufferedDispatcher;exports.dispatchInboundMessageWithDispatcher = dispatchInboundMessageWithDispatcher;var _dispatchFromConfig = require("./reply/dispatch-from-config.js");
var _inboundContext = require("./reply/inbound-context.js");
var _replyDispatcher = require("./reply/reply-dispatcher.js");
async function dispatchInboundMessage(params) {
  const finalized = (0, _inboundContext.finalizeInboundContext)(params.ctx);
  return await (0, _dispatchFromConfig.dispatchReplyFromConfig)({
    ctx: finalized,
    cfg: params.cfg,
    dispatcher: params.dispatcher,
    replyOptions: params.replyOptions,
    replyResolver: params.replyResolver
  });
}
async function dispatchInboundMessageWithBufferedDispatcher(params) {
  const { dispatcher, replyOptions, markDispatchIdle } = (0, _replyDispatcher.createReplyDispatcherWithTyping)(params.dispatcherOptions);
  const result = await dispatchInboundMessage({
    ctx: params.ctx,
    cfg: params.cfg,
    dispatcher,
    replyResolver: params.replyResolver,
    replyOptions: {
      ...params.replyOptions,
      ...replyOptions
    }
  });
  markDispatchIdle();
  return result;
}
async function dispatchInboundMessageWithDispatcher(params) {
  const dispatcher = (0, _replyDispatcher.createReplyDispatcher)(params.dispatcherOptions);
  const result = await dispatchInboundMessage({
    ctx: params.ctx,
    cfg: params.cfg,
    dispatcher,
    replyResolver: params.replyResolver,
    replyOptions: params.replyOptions
  });
  await dispatcher.waitForIdle();
  return result;
} /* v9-042172bfdd9470f1 */
