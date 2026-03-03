"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeMediaUnderstandingChatType = normalizeMediaUnderstandingChatType;exports.resolveMediaUnderstandingScope = resolveMediaUnderstandingScope;var _chatType = require("../channels/chat-type.js");
function normalizeDecision(value) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "allow") {
    return "allow";
  }
  if (normalized === "deny") {
    return "deny";
  }
  return undefined;
}
function normalizeMatch(value) {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}
function normalizeMediaUnderstandingChatType(raw) {
  return (0, _chatType.normalizeChatType)(raw ?? undefined);
}
function resolveMediaUnderstandingScope(params) {
  const scope = params.scope;
  if (!scope) {
    return "allow";
  }
  const channel = normalizeMatch(params.channel);
  const chatType = normalizeMediaUnderstandingChatType(params.chatType);
  const sessionKey = normalizeMatch(params.sessionKey) ?? "";
  for (const rule of scope.rules ?? []) {
    if (!rule) {
      continue;
    }
    const action = normalizeDecision(rule.action) ?? "allow";
    const match = rule.match ?? {};
    const matchChannel = normalizeMatch(match.channel);
    const matchChatType = normalizeMediaUnderstandingChatType(match.chatType);
    const matchPrefix = normalizeMatch(match.keyPrefix);
    if (matchChannel && matchChannel !== channel) {
      continue;
    }
    if (matchChatType && matchChatType !== chatType) {
      continue;
    }
    if (matchPrefix && !sessionKey.startsWith(matchPrefix)) {
      continue;
    }
    return action;
  }
  return normalizeDecision(scope.default) ?? "allow";
} /* v9-625f2ceea9a2cd37 */
