"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.dispatchReplyWithBufferedBlockDispatcher = dispatchReplyWithBufferedBlockDispatcher;exports.dispatchReplyWithDispatcher = dispatchReplyWithDispatcher;var _dispatch = require("../dispatch.js");
async function dispatchReplyWithBufferedBlockDispatcher(params) {
  return await (0, _dispatch.dispatchInboundMessageWithBufferedDispatcher)({
    ctx: params.ctx,
    cfg: params.cfg,
    dispatcherOptions: params.dispatcherOptions,
    replyResolver: params.replyResolver,
    replyOptions: params.replyOptions
  });
}
async function dispatchReplyWithDispatcher(params) {
  return await (0, _dispatch.dispatchInboundMessageWithDispatcher)({
    ctx: params.ctx,
    cfg: params.cfg,
    dispatcherOptions: params.dispatcherOptions,
    replyResolver: params.replyResolver,
    replyOptions: params.replyOptions
  });
} /* v9-e8164b88cfc53fed */
