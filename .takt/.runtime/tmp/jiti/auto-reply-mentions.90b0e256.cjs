"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildMentionConfig = buildMentionConfig;exports.debugMention = debugMention;exports.isBotMentionedFromTargets = isBotMentionedFromTargets;exports.resolveMentionTargets = resolveMentionTargets;exports.resolveOwnerList = resolveOwnerList;var _mentions = require("../../auto-reply/reply/mentions.js");
var _utils = require("../../utils.js");
function buildMentionConfig(cfg, agentId) {
  const mentionRegexes = (0, _mentions.buildMentionRegexes)(cfg, agentId);
  return { mentionRegexes, allowFrom: cfg.channels?.whatsapp?.allowFrom };
}
function resolveMentionTargets(msg, authDir) {
  const jidOptions = authDir ? { authDir } : undefined;
  const normalizedMentions = msg.mentionedJids?.length ?
  msg.mentionedJids.map((jid) => (0, _utils.jidToE164)(jid, jidOptions) ?? jid).filter(Boolean) :
  [];
  const selfE164 = msg.selfE164 ?? (msg.selfJid ? (0, _utils.jidToE164)(msg.selfJid, jidOptions) : null);
  const selfJid = msg.selfJid ? msg.selfJid.replace(/:\\d+/, "") : null;
  return { normalizedMentions, selfE164, selfJid };
}
function isBotMentionedFromTargets(msg, mentionCfg, targets) {
  const clean = (text) =>
  // Remove zero-width and directionality markers WhatsApp injects around display names
  (0, _mentions.normalizeMentionText)(text);
  const isSelfChat = (0, _utils.isSelfChatMode)(targets.selfE164, mentionCfg.allowFrom);
  const hasMentions = (msg.mentionedJids?.length ?? 0) > 0;
  if (hasMentions && !isSelfChat) {
    if (targets.selfE164 && targets.normalizedMentions.includes(targets.selfE164)) {
      return true;
    }
    if (targets.selfJid) {
      // Some mentions use the bare JID; match on E.164 to be safe.
      if (targets.normalizedMentions.includes(targets.selfJid)) {
        return true;
      }
    }
    // If the message explicitly mentions someone else, do not fall back to regex matches.
    return false;
  } else
  if (hasMentions && isSelfChat) {

    // Self-chat mode: ignore WhatsApp @mention JIDs, otherwise @mentioning the owner in group chats triggers the bot.
  }const bodyClean = clean(msg.body);
  if (mentionCfg.mentionRegexes.some((re) => re.test(bodyClean))) {
    return true;
  }
  // Fallback: detect body containing our own number (with or without +, spacing)
  if (targets.selfE164) {
    const selfDigits = targets.selfE164.replace(/\D/g, "");
    if (selfDigits) {
      const bodyDigits = bodyClean.replace(/[^\d]/g, "");
      if (bodyDigits.includes(selfDigits)) {
        return true;
      }
      const bodyNoSpace = msg.body.replace(/[\s-]/g, "");
      const pattern = new RegExp(`\\+?${selfDigits}`, "i");
      if (pattern.test(bodyNoSpace)) {
        return true;
      }
    }
  }
  return false;
}
function debugMention(msg, mentionCfg, authDir) {
  const mentionTargets = resolveMentionTargets(msg, authDir);
  const result = isBotMentionedFromTargets(msg, mentionCfg, mentionTargets);
  const details = {
    from: msg.from,
    body: msg.body,
    bodyClean: (0, _mentions.normalizeMentionText)(msg.body),
    mentionedJids: msg.mentionedJids ?? null,
    normalizedMentionedJids: mentionTargets.normalizedMentions.length ?
    mentionTargets.normalizedMentions :
    null,
    selfJid: msg.selfJid ?? null,
    selfJidBare: mentionTargets.selfJid,
    selfE164: msg.selfE164 ?? null,
    resolvedSelfE164: mentionTargets.selfE164
  };
  return { wasMentioned: result, details };
}
function resolveOwnerList(mentionCfg, selfE164) {
  const allowFrom = mentionCfg.allowFrom;
  const raw = Array.isArray(allowFrom) && allowFrom.length > 0 ? allowFrom : selfE164 ? [selfE164] : [];
  return raw.
  filter((entry) => Boolean(entry && entry !== "*")).
  map((entry) => (0, _utils.normalizeE164)(entry)).
  filter((entry) => Boolean(entry));
} /* v9-006aec0929f55f01 */
