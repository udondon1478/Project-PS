"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildCommandContext = buildCommandContext;var _commandAuth = require("../command-auth.js");
var _commandsRegistry = require("../commands-registry.js");
var _mentions = require("./mentions.js");
function buildCommandContext(params) {
  const { ctx, cfg, agentId, sessionKey, isGroup, triggerBodyNormalized } = params;
  const auth = (0, _commandAuth.resolveCommandAuthorization)({
    ctx,
    cfg,
    commandAuthorized: params.commandAuthorized
  });
  const surface = (ctx.Surface ?? ctx.Provider ?? "").trim().toLowerCase();
  const channel = (ctx.Provider ?? surface).trim().toLowerCase();
  const abortKey = sessionKey ?? (auth.from || undefined) ?? (auth.to || undefined);
  const rawBodyNormalized = triggerBodyNormalized;
  const commandBodyNormalized = (0, _commandsRegistry.normalizeCommandBody)(isGroup ? (0, _mentions.stripMentions)(rawBodyNormalized, ctx, cfg, agentId) : rawBodyNormalized);
  return {
    surface,
    channel,
    channelId: auth.providerId,
    ownerList: auth.ownerList,
    isAuthorizedSender: auth.isAuthorizedSender,
    senderId: auth.senderId,
    abortKey,
    rawBodyNormalized,
    commandBodyNormalized,
    from: auth.from,
    to: auth.to
  };
} /* v9-96f27e509d6547c8 */
