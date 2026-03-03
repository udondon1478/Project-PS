"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildSlackThreadingToolContext = buildSlackThreadingToolContext;var _accounts = require("./accounts.js");
function buildSlackThreadingToolContext(params) {
  const account = (0, _accounts.resolveSlackAccount)({
    cfg: params.cfg,
    accountId: params.accountId
  });
  const configuredReplyToMode = (0, _accounts.resolveSlackReplyToMode)(account, params.context.ChatType);
  const effectiveReplyToMode = params.context.ThreadLabel ? "all" : configuredReplyToMode;
  const threadId = params.context.MessageThreadId ?? params.context.ReplyToId;
  return {
    currentChannelId: params.context.To?.startsWith("channel:") ?
    params.context.To.slice("channel:".length) :
    undefined,
    currentThreadTs: threadId != null ? String(threadId) : undefined,
    replyToMode: effectiveReplyToMode,
    hasRepliedRef: params.hasRepliedRef
  };
} /* v9-3f464f96169e2af7 */
