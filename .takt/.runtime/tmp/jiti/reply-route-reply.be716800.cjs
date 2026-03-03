"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isRoutableChannel = isRoutableChannel;exports.routeReply = routeReply;







var _agentScope = require("../../agents/agent-scope.js");
var _identity = require("../../agents/identity.js");
var _index = require("../../channels/plugins/index.js");
var _messageChannel = require("../../utils/message-channel.js");
var _normalizeReply = require("./normalize-reply.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);} /**
 * Provider-agnostic reply router.
 *
 * Routes replies to the originating channel based on OriginatingChannel/OriginatingTo
 * instead of using the session's lastChannel. This ensures replies go back to the
 * provider where the message originated, even when the main session is shared
 * across multiple providers.
 */ /**
 * Routes a reply payload to the specified channel.
 *
 * This function provides a unified interface for sending messages to any
 * supported provider. It's used by the followup queue to route replies
 * back to the originating channel when OriginatingChannel/OriginatingTo
 * are set.
 */async function routeReply(params) {const { payload, channel, to, accountId, threadId, cfg, abortSignal } = params; // Debug: `pnpm test src/auto-reply/reply/route-reply.test.ts`
  const responsePrefix = params.sessionKey ? (0, _identity.resolveEffectiveMessagesConfig)(cfg, (0, _agentScope.resolveSessionAgentId)({ sessionKey: params.sessionKey, config: cfg
      })).responsePrefix :
  cfg.messages?.responsePrefix === "auto" ?
  undefined :
  cfg.messages?.responsePrefix;
  const normalized = (0, _normalizeReply.normalizeReplyPayload)(payload, {
    responsePrefix
  });
  if (!normalized) {
    return { ok: true };
  }
  let text = normalized.text ?? "";
  let mediaUrls = (normalized.mediaUrls?.filter(Boolean) ?? []).length ?
  normalized.mediaUrls?.filter(Boolean) :
  normalized.mediaUrl ?
  [normalized.mediaUrl] :
  [];
  const replyToId = normalized.replyToId;
  // Skip empty replies.
  if (!text.trim() && mediaUrls.length === 0) {
    return { ok: true };
  }
  if (channel === _messageChannel.INTERNAL_MESSAGE_CHANNEL) {
    return {
      ok: false,
      error: "Webchat routing not supported for queued replies"
    };
  }
  const channelId = (0, _index.normalizeChannelId)(channel) ?? null;
  if (!channelId) {
    return { ok: false, error: `Unknown channel: ${String(channel)}` };
  }
  if (abortSignal?.aborted) {
    return { ok: false, error: "Reply routing aborted" };
  }
  const resolvedReplyToId = replyToId ?? (
  channelId === "slack" && threadId != null && threadId !== "" ? String(threadId) : undefined);
  const resolvedThreadId = channelId === "slack" ? null : threadId ?? null;
  try {
    // Provider docking: this is an execution boundary (we're about to send).
    // Keep the module cheap to import by loading outbound plumbing lazily.
    const { deliverOutboundPayloads } = await Promise.resolve().then(() => jitiImport("../../infra/outbound/deliver.js").then((m) => _interopRequireWildcard(m)));
    const results = await deliverOutboundPayloads({
      cfg,
      channel: channelId,
      to,
      accountId: accountId ?? undefined,
      payloads: [normalized],
      replyToId: resolvedReplyToId ?? null,
      threadId: resolvedThreadId,
      abortSignal,
      mirror: params.mirror !== false && params.sessionKey ?
      {
        sessionKey: params.sessionKey,
        agentId: (0, _agentScope.resolveSessionAgentId)({ sessionKey: params.sessionKey, config: cfg }),
        text,
        mediaUrls
      } :
      undefined
    });
    const last = results.at(-1);
    return { ok: true, messageId: last?.messageId };
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Failed to route reply to ${channel}: ${message}`
    };
  }
}
/**
 * Checks if a channel type is routable via routeReply.
 *
 * Some channels (webchat) require special handling and cannot be routed through
 * this generic interface.
 */
function isRoutableChannel(channel) {
  if (!channel || channel === _messageChannel.INTERNAL_MESSAGE_CHANNEL) {
    return false;
  }
  return (0, _index.normalizeChannelId)(channel) !== null;
} /* v9-1c30f46ef329f2d8 */
