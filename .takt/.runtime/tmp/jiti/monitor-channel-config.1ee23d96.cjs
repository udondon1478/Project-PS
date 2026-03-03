"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveSlackChannelConfig = resolveSlackChannelConfig;exports.resolveSlackChannelLabel = resolveSlackChannelLabel;exports.shouldEmitSlackReactionNotification = shouldEmitSlackReactionNotification;var _channelConfig = require("../../channels/channel-config.js");
var _allowList = require("./allow-list.js");
function firstDefined(...values) {
  for (const value of values) {
    if (typeof value !== "undefined") {
      return value;
    }
  }
  return undefined;
}
function shouldEmitSlackReactionNotification(params) {
  const { mode, botId, messageAuthorId, userId, userName, allowlist } = params;
  const effectiveMode = mode ?? "own";
  if (effectiveMode === "off") {
    return false;
  }
  if (effectiveMode === "own") {
    if (!botId || !messageAuthorId) {
      return false;
    }
    return messageAuthorId === botId;
  }
  if (effectiveMode === "allowlist") {
    if (!Array.isArray(allowlist) || allowlist.length === 0) {
      return false;
    }
    const users = (0, _allowList.normalizeAllowListLower)(allowlist);
    return (0, _allowList.allowListMatches)({
      allowList: users,
      id: userId,
      name: userName ?? undefined
    });
  }
  return true;
}
function resolveSlackChannelLabel(params) {
  const channelName = params.channelName?.trim();
  if (channelName) {
    const slug = (0, _allowList.normalizeSlackSlug)(channelName);
    return `#${slug || channelName}`;
  }
  const channelId = params.channelId?.trim();
  return channelId ? `#${channelId}` : "unknown channel";
}
function resolveSlackChannelConfig(params) {
  const { channelId, channelName, channels, defaultRequireMention } = params;
  const entries = channels ?? {};
  const keys = Object.keys(entries);
  const normalizedName = channelName ? (0, _allowList.normalizeSlackSlug)(channelName) : "";
  const directName = channelName ? channelName.trim() : "";
  const candidates = (0, _channelConfig.buildChannelKeyCandidates)(channelId, channelName ? `#${directName}` : undefined, directName, normalizedName);
  const match = (0, _channelConfig.resolveChannelEntryMatchWithFallback)({
    entries,
    keys: candidates,
    wildcardKey: "*"
  });
  const { entry: matched, wildcardEntry: fallback } = match;
  const requireMentionDefault = defaultRequireMention ?? true;
  if (keys.length === 0) {
    return { allowed: true, requireMention: requireMentionDefault };
  }
  if (!matched && !fallback) {
    return { allowed: false, requireMention: requireMentionDefault };
  }
  const resolved = matched ?? fallback ?? {};
  const allowed = firstDefined(resolved.enabled, resolved.allow, fallback?.enabled, fallback?.allow, true) ??
  true;
  const requireMention = firstDefined(resolved.requireMention, fallback?.requireMention, requireMentionDefault) ??
  requireMentionDefault;
  const allowBots = firstDefined(resolved.allowBots, fallback?.allowBots);
  const users = firstDefined(resolved.users, fallback?.users);
  const skills = firstDefined(resolved.skills, fallback?.skills);
  const systemPrompt = firstDefined(resolved.systemPrompt, fallback?.systemPrompt);
  const result = {
    allowed,
    requireMention,
    allowBots,
    users,
    skills,
    systemPrompt
  };
  return (0, _channelConfig.applyChannelMatchMeta)(result, match);
} /* v9-20a0947ba0cc7608 */
