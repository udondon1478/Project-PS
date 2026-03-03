"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveGroupActivationFor = resolveGroupActivationFor;exports.resolveGroupPolicyFor = resolveGroupPolicyFor;exports.resolveGroupRequireMentionFor = resolveGroupRequireMentionFor;var _groupActivation = require("../../../auto-reply/group-activation.js");
var _groupPolicy = require("../../../config/group-policy.js");
var _sessions = require("../../../config/sessions.js");
function resolveGroupPolicyFor(cfg, conversationId) {
  const groupId = (0, _sessions.resolveGroupSessionKey)({
    From: conversationId,
    ChatType: "group",
    Provider: "whatsapp"
  })?.id;
  return (0, _groupPolicy.resolveChannelGroupPolicy)({
    cfg,
    channel: "whatsapp",
    groupId: groupId ?? conversationId
  });
}
function resolveGroupRequireMentionFor(cfg, conversationId) {
  const groupId = (0, _sessions.resolveGroupSessionKey)({
    From: conversationId,
    ChatType: "group",
    Provider: "whatsapp"
  })?.id;
  return (0, _groupPolicy.resolveChannelGroupRequireMention)({
    cfg,
    channel: "whatsapp",
    groupId: groupId ?? conversationId
  });
}
function resolveGroupActivationFor(params) {
  const storePath = (0, _sessions.resolveStorePath)(params.cfg.session?.store, {
    agentId: params.agentId
  });
  const store = (0, _sessions.loadSessionStore)(storePath);
  const entry = store[params.sessionKey];
  const requireMention = resolveGroupRequireMentionFor(params.cfg, params.conversationId);
  const defaultActivation = !requireMention ? "always" : "mention";
  return (0, _groupActivation.normalizeGroupActivation)(entry?.groupActivation) ?? defaultActivation;
} /* v9-927d00fcfdb8c2ba */
