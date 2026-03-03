"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createTelegramMessageProcessor = void 0;
var _botMessageContext = require("./bot-message-context.js");
var _botMessageDispatch = require("./bot-message-dispatch.js"); // @ts-nocheck
const createTelegramMessageProcessor = (deps) => {
  const { bot, cfg, account, telegramCfg, historyLimit, groupHistories, dmPolicy, allowFrom, groupAllowFrom, ackReactionScope, logger, resolveGroupActivation, resolveGroupRequireMention, resolveTelegramGroupConfig, runtime, replyToMode, streamMode, textLimit, opts, resolveBotTopicsEnabled } = deps;
  return async (primaryCtx, allMedia, storeAllowFrom, options) => {
    const context = await (0, _botMessageContext.buildTelegramMessageContext)({
      primaryCtx,
      allMedia,
      storeAllowFrom,
      options,
      bot,
      cfg,
      account,
      historyLimit,
      groupHistories,
      dmPolicy,
      allowFrom,
      groupAllowFrom,
      ackReactionScope,
      logger,
      resolveGroupActivation,
      resolveGroupRequireMention,
      resolveTelegramGroupConfig
    });
    if (!context) {
      return;
    }
    await (0, _botMessageDispatch.dispatchTelegramMessage)({
      context,
      bot,
      cfg,
      runtime,
      replyToMode,
      streamMode,
      textLimit,
      telegramCfg,
      opts,
      resolveBotTopicsEnabled
    });
  };
};exports.createTelegramMessageProcessor = createTelegramMessageProcessor; /* v9-017f245e2cb5e461 */
