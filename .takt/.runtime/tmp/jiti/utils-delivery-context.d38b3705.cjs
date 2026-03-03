"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.deliveryContextFromSession = deliveryContextFromSession;exports.deliveryContextKey = deliveryContextKey;exports.mergeDeliveryContext = mergeDeliveryContext;exports.normalizeDeliveryContext = normalizeDeliveryContext;exports.normalizeSessionDeliveryFields = normalizeSessionDeliveryFields;var _accountId = require("./account-id.js");
var _messageChannel = require("./message-channel.js");
function normalizeDeliveryContext(context) {
  if (!context) {
    return undefined;
  }
  const channel = typeof context.channel === "string" ?
  (0, _messageChannel.normalizeMessageChannel)(context.channel) ?? context.channel.trim() :
  undefined;
  const to = typeof context.to === "string" ? context.to.trim() : undefined;
  const accountId = (0, _accountId.normalizeAccountId)(context.accountId);
  const threadId = typeof context.threadId === "number" && Number.isFinite(context.threadId) ?
  Math.trunc(context.threadId) :
  typeof context.threadId === "string" ?
  context.threadId.trim() :
  undefined;
  const normalizedThreadId = typeof threadId === "string" ? threadId ? threadId : undefined : threadId;
  if (!channel && !to && !accountId && normalizedThreadId == null) {
    return undefined;
  }
  const normalized = {
    channel: channel || undefined,
    to: to || undefined,
    accountId
  };
  if (normalizedThreadId != null) {
    normalized.threadId = normalizedThreadId;
  }
  return normalized;
}
function normalizeSessionDeliveryFields(source) {
  if (!source) {
    return {
      deliveryContext: undefined,
      lastChannel: undefined,
      lastTo: undefined,
      lastAccountId: undefined,
      lastThreadId: undefined
    };
  }
  const merged = mergeDeliveryContext(normalizeDeliveryContext({
    channel: source.lastChannel ?? source.channel,
    to: source.lastTo,
    accountId: source.lastAccountId,
    threadId: source.lastThreadId
  }), normalizeDeliveryContext(source.deliveryContext));
  if (!merged) {
    return {
      deliveryContext: undefined,
      lastChannel: undefined,
      lastTo: undefined,
      lastAccountId: undefined,
      lastThreadId: undefined
    };
  }
  return {
    deliveryContext: merged,
    lastChannel: merged.channel,
    lastTo: merged.to,
    lastAccountId: merged.accountId,
    lastThreadId: merged.threadId
  };
}
function deliveryContextFromSession(entry) {
  if (!entry) {
    return undefined;
  }
  const source = {
    channel: entry.channel,
    lastChannel: entry.lastChannel,
    lastTo: entry.lastTo,
    lastAccountId: entry.lastAccountId,
    lastThreadId: entry.lastThreadId ?? entry.deliveryContext?.threadId ?? entry.origin?.threadId,
    deliveryContext: entry.deliveryContext
  };
  return normalizeSessionDeliveryFields(source).deliveryContext;
}
function mergeDeliveryContext(primary, fallback) {
  const normalizedPrimary = normalizeDeliveryContext(primary);
  const normalizedFallback = normalizeDeliveryContext(fallback);
  if (!normalizedPrimary && !normalizedFallback) {
    return undefined;
  }
  return normalizeDeliveryContext({
    channel: normalizedPrimary?.channel ?? normalizedFallback?.channel,
    to: normalizedPrimary?.to ?? normalizedFallback?.to,
    accountId: normalizedPrimary?.accountId ?? normalizedFallback?.accountId,
    threadId: normalizedPrimary?.threadId ?? normalizedFallback?.threadId
  });
}
function deliveryContextKey(context) {
  const normalized = normalizeDeliveryContext(context);
  if (!normalized?.channel || !normalized?.to) {
    return undefined;
  }
  const threadId = normalized.threadId != null && normalized.threadId !== "" ? String(normalized.threadId) : "";
  return `${normalized.channel}|${normalized.to}|${normalized.accountId ?? ""}|${threadId}`;
} /* v9-f8bd07150e5658b7 */
