"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createTelegramBot = createTelegramBot;exports.createTelegramWebhookCallback = createTelegramWebhookCallback;exports.getTelegramSequentialKey = getTelegramSequentialKey;
var _runner = require("@grammyjs/runner");
var _transformerThrottler = require("@grammyjs/transformer-throttler");
var _grammy = require("grammy");
var _agentScope = require("../agents/agent-scope.js");
var _chunk = require("../auto-reply/chunk.js");
var _commandDetection = require("../auto-reply/command-detection.js");
var _history = require("../auto-reply/reply/history.js");
var _commands = require("../config/commands.js");
var _config = require("../config/config.js");
var _groupPolicy = require("../config/group-policy.js");
var _sessions = require("../config/sessions.js");
var _globals = require("../globals.js");
var _errors = require("../infra/errors.js");
var _systemEvents = require("../infra/system-events.js");
var _logging = require("../logging.js");
var _subsystem = require("../logging/subsystem.js");
var _resolveRoute = require("../routing/resolve-route.js");
var _sessionKey = require("../routing/session-key.js");
var _accounts = require("./accounts.js");
var _apiLogging = require("./api-logging.js");
var _botHandlers = require("./bot-handlers.js");
var _botMessage = require("./bot-message.js");
var _botNativeCommands = require("./bot-native-commands.js");
var _botUpdates = require("./bot-updates.js");
var _helpers = require("./bot/helpers.js");
var _fetch = require("./fetch.js");
var _sentMessageCache = require("./sent-message-cache.js"); // @ts-nocheck
function getTelegramSequentialKey(ctx) {
  // Handle reaction updates
  const reaction = ctx.update?.message_reaction;
  if (reaction?.chat?.id) {
    return `telegram:${reaction.chat.id}`;
  }
  const msg = ctx.message ??
  ctx.update?.message ??
  ctx.update?.edited_message ??
  ctx.update?.callback_query?.message;
  const chatId = msg?.chat?.id ?? ctx.chat?.id;
  const rawText = msg?.text ?? msg?.caption;
  const botUsername = ctx.me?.username;
  if (rawText &&
  (0, _commandDetection.isControlCommandMessage)(rawText, undefined, botUsername ? { botUsername } : undefined)) {
    if (typeof chatId === "number") {
      return `telegram:${chatId}:control`;
    }
    return "telegram:control";
  }
  const isGroup = msg?.chat?.type === "group" || msg?.chat?.type === "supergroup";
  const messageThreadId = msg?.message_thread_id;
  const isForum = msg?.chat?.is_forum;
  const threadId = isGroup ?
  (0, _helpers.resolveTelegramForumThreadId)({ isForum, messageThreadId }) :
  messageThreadId;
  if (typeof chatId === "number") {
    return threadId != null ? `telegram:${chatId}:topic:${threadId}` : `telegram:${chatId}`;
  }
  return "telegram:unknown";
}
function createTelegramBot(opts) {
  const runtime = opts.runtime ?? {
    log: console.log,
    error: console.error,
    exit: (code) => {
      throw new Error(`exit ${code}`);
    }
  };
  const cfg = opts.config ?? (0, _config.loadConfig)();
  const account = (0, _accounts.resolveTelegramAccount)({
    cfg,
    accountId: opts.accountId
  });
  const telegramCfg = account.config;
  const fetchImpl = (0, _fetch.resolveTelegramFetch)(opts.proxyFetch, {
    network: telegramCfg.network
  });
  const shouldProvideFetch = Boolean(fetchImpl);
  const timeoutSeconds = typeof telegramCfg?.timeoutSeconds === "number" && Number.isFinite(telegramCfg.timeoutSeconds) ?
  Math.max(1, Math.floor(telegramCfg.timeoutSeconds)) :
  undefined;
  const client = shouldProvideFetch || timeoutSeconds ?
  {
    ...(shouldProvideFetch && fetchImpl ?
    { fetch: fetchImpl } :
    {}),
    ...(timeoutSeconds ? { timeoutSeconds } : {})
  } :
  undefined;
  const bot = new _grammy.Bot(opts.token, client ? { client } : undefined);
  bot.api.config.use((0, _transformerThrottler.apiThrottler)());
  bot.use((0, _runner.sequentialize)(getTelegramSequentialKey));
  bot.catch((err) => {
    runtime.error?.((0, _globals.danger)(`telegram bot error: ${(0, _errors.formatUncaughtError)(err)}`));
  });
  // Catch all errors from bot middleware to prevent unhandled rejections
  bot.catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    runtime.error?.((0, _globals.danger)(`telegram bot error: ${message}`));
  });
  const recentUpdates = (0, _botUpdates.createTelegramUpdateDedupe)();
  let lastUpdateId = typeof opts.updateOffset?.lastUpdateId === "number" ? opts.updateOffset.lastUpdateId : null;
  const recordUpdateId = (ctx) => {
    const updateId = (0, _botUpdates.resolveTelegramUpdateId)(ctx);
    if (typeof updateId !== "number") {
      return;
    }
    if (lastUpdateId !== null && updateId <= lastUpdateId) {
      return;
    }
    lastUpdateId = updateId;
    void opts.updateOffset?.onUpdateId?.(updateId);
  };
  const shouldSkipUpdate = (ctx) => {
    const updateId = (0, _botUpdates.resolveTelegramUpdateId)(ctx);
    if (typeof updateId === "number" && lastUpdateId !== null) {
      if (updateId <= lastUpdateId) {
        return true;
      }
    }
    const key = (0, _botUpdates.buildTelegramUpdateKey)(ctx);
    const skipped = recentUpdates.check(key);
    if (skipped && key && (0, _globals.shouldLogVerbose)()) {
      (0, _globals.logVerbose)(`telegram dedupe: skipped ${key}`);
    }
    return skipped;
  };
  const rawUpdateLogger = (0, _subsystem.createSubsystemLogger)("gateway/channels/telegram/raw-update");
  const MAX_RAW_UPDATE_CHARS = 8000;
  const MAX_RAW_UPDATE_STRING = 500;
  const MAX_RAW_UPDATE_ARRAY = 20;
  const stringifyUpdate = (update) => {
    const seen = new WeakSet();
    return JSON.stringify(update ?? null, (key, value) => {
      if (typeof value === "string" && value.length > MAX_RAW_UPDATE_STRING) {
        return `${value.slice(0, MAX_RAW_UPDATE_STRING)}...`;
      }
      if (Array.isArray(value) && value.length > MAX_RAW_UPDATE_ARRAY) {
        return [
        ...value.slice(0, MAX_RAW_UPDATE_ARRAY),
        `...(${value.length - MAX_RAW_UPDATE_ARRAY} more)`];

      }
      if (value && typeof value === "object") {
        const obj = value;
        if (seen.has(obj)) {
          return "[Circular]";
        }
        seen.add(obj);
      }
      return value;
    });
  };
  bot.use(async (ctx, next) => {
    if ((0, _globals.shouldLogVerbose)()) {
      try {
        const raw = stringifyUpdate(ctx.update);
        const preview = raw.length > MAX_RAW_UPDATE_CHARS ? `${raw.slice(0, MAX_RAW_UPDATE_CHARS)}...` : raw;
        rawUpdateLogger.debug(`telegram update: ${preview}`);
      }
      catch (err) {
        rawUpdateLogger.debug(`telegram update log failed: ${String(err)}`);
      }
    }
    await next();
    recordUpdateId(ctx);
  });
  const historyLimit = Math.max(0, telegramCfg.historyLimit ??
  cfg.messages?.groupChat?.historyLimit ??
  _history.DEFAULT_GROUP_HISTORY_LIMIT);
  const groupHistories = new Map();
  const textLimit = (0, _chunk.resolveTextChunkLimit)(cfg, "telegram", account.accountId);
  const dmPolicy = telegramCfg.dmPolicy ?? "pairing";
  const allowFrom = opts.allowFrom ?? telegramCfg.allowFrom;
  const groupAllowFrom = opts.groupAllowFrom ??
  telegramCfg.groupAllowFrom ?? (
  telegramCfg.allowFrom && telegramCfg.allowFrom.length > 0 ?
  telegramCfg.allowFrom :
  undefined) ?? (
  opts.allowFrom && opts.allowFrom.length > 0 ? opts.allowFrom : undefined);
  const replyToMode = opts.replyToMode ?? telegramCfg.replyToMode ?? "first";
  const nativeEnabled = (0, _commands.resolveNativeCommandsEnabled)({
    providerId: "telegram",
    providerSetting: telegramCfg.commands?.native,
    globalSetting: cfg.commands?.native
  });
  const nativeSkillsEnabled = (0, _commands.resolveNativeSkillsEnabled)({
    providerId: "telegram",
    providerSetting: telegramCfg.commands?.nativeSkills,
    globalSetting: cfg.commands?.nativeSkills
  });
  const nativeDisabledExplicit = (0, _commands.isNativeCommandsExplicitlyDisabled)({
    providerSetting: telegramCfg.commands?.native,
    globalSetting: cfg.commands?.native
  });
  const useAccessGroups = cfg.commands?.useAccessGroups !== false;
  const ackReactionScope = cfg.messages?.ackReactionScope ?? "group-mentions";
  const mediaMaxBytes = (opts.mediaMaxMb ?? telegramCfg.mediaMaxMb ?? 5) * 1024 * 1024;
  const logger = (0, _logging.getChildLogger)({ module: "telegram-auto-reply" });
  const streamMode = (0, _helpers.resolveTelegramStreamMode)(telegramCfg);
  let botHasTopicsEnabled;
  const resolveBotTopicsEnabled = async (ctx) => {
    const fromCtx = ctx?.me;
    if (typeof fromCtx?.has_topics_enabled === "boolean") {
      botHasTopicsEnabled = fromCtx.has_topics_enabled;
      return botHasTopicsEnabled;
    }
    if (typeof botHasTopicsEnabled === "boolean") {
      return botHasTopicsEnabled;
    }
    if (typeof bot.api.getMe !== "function") {
      botHasTopicsEnabled = false;
      return botHasTopicsEnabled;
    }
    try {
      const me = await (0, _apiLogging.withTelegramApiErrorLogging)({
        operation: "getMe",
        runtime,
        fn: () => bot.api.getMe()
      });
      botHasTopicsEnabled = Boolean(me?.has_topics_enabled);
    }
    catch (err) {
      (0, _globals.logVerbose)(`telegram getMe failed: ${String(err)}`);
      botHasTopicsEnabled = false;
    }
    return botHasTopicsEnabled;
  };
  const resolveGroupPolicy = (chatId) => (0, _groupPolicy.resolveChannelGroupPolicy)({
    cfg,
    channel: "telegram",
    accountId: account.accountId,
    groupId: String(chatId)
  });
  const resolveGroupActivation = (params) => {
    const agentId = params.agentId ?? (0, _agentScope.resolveDefaultAgentId)(cfg);
    const sessionKey = params.sessionKey ??
    `agent:${agentId}:telegram:group:${(0, _helpers.buildTelegramGroupPeerId)(params.chatId, params.messageThreadId)}`;
    const storePath = (0, _sessions.resolveStorePath)(cfg.session?.store, { agentId });
    try {
      const store = (0, _sessions.loadSessionStore)(storePath);
      const entry = store[sessionKey];
      if (entry?.groupActivation === "always") {
        return false;
      }
      if (entry?.groupActivation === "mention") {
        return true;
      }
    }
    catch (err) {
      (0, _globals.logVerbose)(`Failed to load session for activation check: ${String(err)}`);
    }
    return undefined;
  };
  const resolveGroupRequireMention = (chatId) => (0, _groupPolicy.resolveChannelGroupRequireMention)({
    cfg,
    channel: "telegram",
    accountId: account.accountId,
    groupId: String(chatId),
    requireMentionOverride: opts.requireMention,
    overrideOrder: "after-config"
  });
  const resolveTelegramGroupConfig = (chatId, messageThreadId) => {
    const groups = telegramCfg.groups;
    if (!groups) {
      return { groupConfig: undefined, topicConfig: undefined };
    }
    const groupKey = String(chatId);
    const groupConfig = groups[groupKey] ?? groups["*"];
    const topicConfig = messageThreadId != null ? groupConfig?.topics?.[String(messageThreadId)] : undefined;
    return { groupConfig, topicConfig };
  };
  const processMessage = (0, _botMessage.createTelegramMessageProcessor)({
    bot,
    cfg,
    account,
    telegramCfg,
    historyLimit,
    groupHistories,
    dmPolicy,
    allowFrom,
    groupAllowFrom,
    ackReactionScope,
    logger,
    resolveGroupActivation,
    resolveGroupRequireMention,
    resolveTelegramGroupConfig,
    runtime,
    replyToMode,
    streamMode,
    textLimit,
    opts,
    resolveBotTopicsEnabled
  });
  (0, _botNativeCommands.registerTelegramNativeCommands)({
    bot,
    cfg,
    runtime,
    accountId: account.accountId,
    telegramCfg,
    allowFrom,
    groupAllowFrom,
    replyToMode,
    textLimit,
    useAccessGroups,
    nativeEnabled,
    nativeSkillsEnabled,
    nativeDisabledExplicit,
    resolveGroupPolicy,
    resolveTelegramGroupConfig,
    shouldSkipUpdate,
    opts
  });
  // Handle emoji reactions to messages
  bot.on("message_reaction", async (ctx) => {
    try {
      const reaction = ctx.messageReaction;
      if (!reaction) {
        return;
      }
      if (shouldSkipUpdate(ctx)) {
        return;
      }
      const chatId = reaction.chat.id;
      const messageId = reaction.message_id;
      const user = reaction.user;
      // Resolve reaction notification mode (default: "own")
      const reactionMode = telegramCfg.reactionNotifications ?? "own";
      if (reactionMode === "off") {
        return;
      }
      if (user?.is_bot) {
        return;
      }
      if (reactionMode === "own" && !(0, _sentMessageCache.wasSentByBot)(chatId, messageId)) {
        return;
      }
      // Detect added reactions
      const oldEmojis = new Set(reaction.old_reaction.
      filter((r) => r.type === "emoji").
      map((r) => r.emoji));
      const addedReactions = reaction.new_reaction.
      filter((r) => r.type === "emoji").
      filter((r) => !oldEmojis.has(r.emoji));
      if (addedReactions.length === 0) {
        return;
      }
      // Build sender label
      const senderName = user ?
      [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username :
      undefined;
      const senderUsername = user?.username ? `@${user.username}` : undefined;
      let senderLabel = senderName;
      if (senderName && senderUsername) {
        senderLabel = `${senderName} (${senderUsername})`;
      } else
      if (!senderName && senderUsername) {
        senderLabel = senderUsername;
      }
      if (!senderLabel && user?.id) {
        senderLabel = `id:${user.id}`;
      }
      senderLabel = senderLabel || "unknown";
      // Extract forum thread info (similar to message processing)
      // oxlint-disable-next-line typescript/no-explicit-any
      const messageThreadId = reaction.message_thread_id;
      // oxlint-disable-next-line typescript/no-explicit-any
      const isForum = reaction.chat.is_forum === true;
      const resolvedThreadId = (0, _helpers.resolveTelegramForumThreadId)({
        isForum,
        messageThreadId
      });
      // Resolve agent route for session
      const isGroup = reaction.chat.type === "group" || reaction.chat.type === "supergroup";
      const peerId = isGroup ? (0, _helpers.buildTelegramGroupPeerId)(chatId, resolvedThreadId) : String(chatId);
      const route = (0, _resolveRoute.resolveAgentRoute)({
        cfg,
        channel: "telegram",
        accountId: account.accountId,
        peer: { kind: isGroup ? "group" : "dm", id: peerId }
      });
      const baseSessionKey = route.sessionKey;
      // DMs: use raw messageThreadId for thread sessions (not resolvedThreadId which is for forums)
      const dmThreadId = !isGroup ? messageThreadId : undefined;
      const threadKeys = dmThreadId != null ?
      (0, _sessionKey.resolveThreadSessionKeys)({ baseSessionKey, threadId: String(dmThreadId) }) :
      null;
      const sessionKey = threadKeys?.sessionKey ?? baseSessionKey;
      // Enqueue system event for each added reaction
      for (const r of addedReactions) {
        const emoji = r.emoji;
        const text = `Telegram reaction added: ${emoji} by ${senderLabel} on msg ${messageId}`;
        (0, _systemEvents.enqueueSystemEvent)(text, {
          sessionKey: sessionKey,
          contextKey: `telegram:reaction:add:${chatId}:${messageId}:${user?.id ?? "anon"}:${emoji}`
        });
        (0, _globals.logVerbose)(`telegram: reaction event enqueued: ${text}`);
      }
    }
    catch (err) {
      runtime.error?.((0, _globals.danger)(`telegram reaction handler failed: ${String(err)}`));
    }
  });
  (0, _botHandlers.registerTelegramHandlers)({
    cfg,
    accountId: account.accountId,
    bot,
    opts,
    runtime,
    mediaMaxBytes,
    telegramCfg,
    groupAllowFrom,
    resolveGroupPolicy,
    resolveTelegramGroupConfig,
    shouldSkipUpdate,
    processMessage,
    logger
  });
  return bot;
}
function createTelegramWebhookCallback(bot, path = "/telegram-webhook") {
  return { path, handler: (0, _grammy.webhookCallback)(bot, "http") };
} /* v9-52be5fe48d6dd6c0 */
