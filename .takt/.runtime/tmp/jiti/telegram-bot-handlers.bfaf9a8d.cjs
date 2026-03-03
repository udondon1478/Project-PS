"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerTelegramHandlers = void 0;var _agentScope = require("../agents/agent-scope.js");

var _commandDetection = require("../auto-reply/command-detection.js");
var _inboundDebounce = require("../auto-reply/inbound-debounce.js");
var _commandsInfo = require("../auto-reply/reply/commands-info.js");
var _skillCommands = require("../auto-reply/skill-commands.js");
var _status = require("../auto-reply/status.js");
var _configWrites = require("../channels/plugins/config-writes.js");
var _config = require("../config/config.js");
var _io = require("../config/io.js");
var _globals = require("../globals.js");
var _pairingStore = require("../pairing/pairing-store.js");
var _apiLogging = require("./api-logging.js");
var _botAccess = require("./bot-access.js");
var _botUpdates = require("./bot-updates.js");
var _delivery = require("./bot/delivery.js");
var _helpers = require("./bot/helpers.js");
var _groupMigration = require("./group-migration.js");
var _inlineButtons = require("./inline-buttons.js");
var _send = require("./send.js"); // @ts-nocheck
const registerTelegramHandlers = ({ cfg, accountId, bot, opts, runtime, mediaMaxBytes, telegramCfg, groupAllowFrom, resolveGroupPolicy, resolveTelegramGroupConfig, shouldSkipUpdate, processMessage, logger }) => {
  const TELEGRAM_TEXT_FRAGMENT_START_THRESHOLD_CHARS = 4000;
  const TELEGRAM_TEXT_FRAGMENT_MAX_GAP_MS = 1500;
  const TELEGRAM_TEXT_FRAGMENT_MAX_ID_GAP = 1;
  const TELEGRAM_TEXT_FRAGMENT_MAX_PARTS = 12;
  const TELEGRAM_TEXT_FRAGMENT_MAX_TOTAL_CHARS = 50_000;
  const mediaGroupBuffer = new Map();
  let mediaGroupProcessing = Promise.resolve();
  const textFragmentBuffer = new Map();
  let textFragmentProcessing = Promise.resolve();
  const debounceMs = (0, _inboundDebounce.resolveInboundDebounceMs)({ cfg, channel: "telegram" });
  const inboundDebouncer = (0, _inboundDebounce.createInboundDebouncer)({
    debounceMs,
    buildKey: (entry) => entry.debounceKey,
    shouldDebounce: (entry) => {
      if (entry.allMedia.length > 0) {
        return false;
      }
      const text = entry.msg.text ?? entry.msg.caption ?? "";
      if (!text.trim()) {
        return false;
      }
      return !(0, _commandDetection.hasControlCommand)(text, cfg, { botUsername: entry.botUsername });
    },
    onFlush: async (entries) => {
      const last = entries.at(-1);
      if (!last) {
        return;
      }
      if (entries.length === 1) {
        await processMessage(last.ctx, last.allMedia, last.storeAllowFrom);
        return;
      }
      const combinedText = entries.
      map((entry) => entry.msg.text ?? entry.msg.caption ?? "").
      filter(Boolean).
      join("\n");
      if (!combinedText.trim()) {
        return;
      }
      const first = entries[0];
      const baseCtx = first.ctx;
      const getFile = typeof baseCtx.getFile === "function" ? baseCtx.getFile.bind(baseCtx) : async () => ({});
      const syntheticMessage = {
        ...first.msg,
        text: combinedText,
        caption: undefined,
        caption_entities: undefined,
        entities: undefined,
        date: last.msg.date ?? first.msg.date
      };
      const messageIdOverride = last.msg.message_id ? String(last.msg.message_id) : undefined;
      await processMessage({ message: syntheticMessage, me: baseCtx.me, getFile }, [], first.storeAllowFrom, messageIdOverride ? { messageIdOverride } : undefined);
    },
    onError: (err) => {
      runtime.error?.((0, _globals.danger)(`telegram debounce flush failed: ${String(err)}`));
    }
  });
  const processMediaGroup = async (entry) => {
    try {
      entry.messages.sort((a, b) => a.msg.message_id - b.msg.message_id);
      const captionMsg = entry.messages.find((m) => m.msg.caption || m.msg.text);
      const primaryEntry = captionMsg ?? entry.messages[0];
      const allMedia = [];
      for (const { ctx } of entry.messages) {
        const media = await (0, _delivery.resolveMedia)(ctx, mediaMaxBytes, opts.token, opts.proxyFetch);
        if (media) {
          allMedia.push({
            path: media.path,
            contentType: media.contentType,
            stickerMetadata: media.stickerMetadata
          });
        }
      }
      const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("telegram").catch(() => []);
      await processMessage(primaryEntry.ctx, allMedia, storeAllowFrom);
    }
    catch (err) {
      runtime.error?.((0, _globals.danger)(`media group handler failed: ${String(err)}`));
    }
  };
  const flushTextFragments = async (entry) => {
    try {
      entry.messages.sort((a, b) => a.msg.message_id - b.msg.message_id);
      const first = entry.messages[0];
      const last = entry.messages.at(-1);
      if (!first || !last) {
        return;
      }
      const combinedText = entry.messages.map((m) => m.msg.text ?? "").join("");
      if (!combinedText.trim()) {
        return;
      }
      const syntheticMessage = {
        ...first.msg,
        text: combinedText,
        caption: undefined,
        caption_entities: undefined,
        entities: undefined,
        date: last.msg.date ?? first.msg.date
      };
      const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("telegram").catch(() => []);
      const baseCtx = first.ctx;
      const getFile = typeof baseCtx.getFile === "function" ? baseCtx.getFile.bind(baseCtx) : async () => ({});
      await processMessage({ message: syntheticMessage, me: baseCtx.me, getFile }, [], storeAllowFrom, { messageIdOverride: String(last.msg.message_id) });
    }
    catch (err) {
      runtime.error?.((0, _globals.danger)(`text fragment handler failed: ${String(err)}`));
    }
  };
  const scheduleTextFragmentFlush = (entry) => {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(async () => {
      textFragmentBuffer.delete(entry.key);
      textFragmentProcessing = textFragmentProcessing.
      then(async () => {
        await flushTextFragments(entry);
      }).
      catch(() => undefined);
      await textFragmentProcessing;
    }, TELEGRAM_TEXT_FRAGMENT_MAX_GAP_MS);
  };
  bot.on("callback_query", async (ctx) => {
    const callback = ctx.callbackQuery;
    if (!callback) {
      return;
    }
    if (shouldSkipUpdate(ctx)) {
      return;
    }
    // Answer immediately to prevent Telegram from retrying while we process
    await (0, _apiLogging.withTelegramApiErrorLogging)({
      operation: "answerCallbackQuery",
      runtime,
      fn: () => bot.api.answerCallbackQuery(callback.id)
    }).catch(() => {});
    try {
      const data = (callback.data ?? "").trim();
      const callbackMessage = callback.message;
      if (!data || !callbackMessage) {
        return;
      }
      const inlineButtonsScope = (0, _inlineButtons.resolveTelegramInlineButtonsScope)({
        cfg,
        accountId
      });
      if (inlineButtonsScope === "off") {
        return;
      }
      const chatId = callbackMessage.chat.id;
      const isGroup = callbackMessage.chat.type === "group" || callbackMessage.chat.type === "supergroup";
      if (inlineButtonsScope === "dm" && isGroup) {
        return;
      }
      if (inlineButtonsScope === "group" && !isGroup) {
        return;
      }
      const messageThreadId = callbackMessage.message_thread_id;
      const isForum = callbackMessage.chat.is_forum === true;
      const resolvedThreadId = (0, _helpers.resolveTelegramForumThreadId)({
        isForum,
        messageThreadId
      });
      const { groupConfig, topicConfig } = resolveTelegramGroupConfig(chatId, resolvedThreadId);
      const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("telegram").catch(() => []);
      const groupAllowOverride = (0, _botAccess.firstDefined)(topicConfig?.allowFrom, groupConfig?.allowFrom);
      const effectiveGroupAllow = (0, _botAccess.normalizeAllowFromWithStore)({
        allowFrom: groupAllowOverride ?? groupAllowFrom,
        storeAllowFrom
      });
      const effectiveDmAllow = (0, _botAccess.normalizeAllowFromWithStore)({
        allowFrom: telegramCfg.allowFrom,
        storeAllowFrom
      });
      const dmPolicy = telegramCfg.dmPolicy ?? "pairing";
      const senderId = callback.from?.id ? String(callback.from.id) : "";
      const senderUsername = callback.from?.username ?? "";
      if (isGroup) {
        if (groupConfig?.enabled === false) {
          (0, _globals.logVerbose)(`Blocked telegram group ${chatId} (group disabled)`);
          return;
        }
        if (topicConfig?.enabled === false) {
          (0, _globals.logVerbose)(`Blocked telegram topic ${chatId} (${resolvedThreadId ?? "unknown"}) (topic disabled)`);
          return;
        }
        if (typeof groupAllowOverride !== "undefined") {
          const allowed = senderId &&
          (0, _botAccess.isSenderAllowed)({
            allow: effectiveGroupAllow,
            senderId,
            senderUsername
          });
          if (!allowed) {
            (0, _globals.logVerbose)(`Blocked telegram group sender ${senderId || "unknown"} (group allowFrom override)`);
            return;
          }
        }
        const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
        const groupPolicy = telegramCfg.groupPolicy ?? defaultGroupPolicy ?? "open";
        if (groupPolicy === "disabled") {
          (0, _globals.logVerbose)(`Blocked telegram group message (groupPolicy: disabled)`);
          return;
        }
        if (groupPolicy === "allowlist") {
          if (!senderId) {
            (0, _globals.logVerbose)(`Blocked telegram group message (no sender ID, groupPolicy: allowlist)`);
            return;
          }
          if (!effectiveGroupAllow.hasEntries) {
            (0, _globals.logVerbose)("Blocked telegram group message (groupPolicy: allowlist, no group allowlist entries)");
            return;
          }
          if (!(0, _botAccess.isSenderAllowed)({
            allow: effectiveGroupAllow,
            senderId,
            senderUsername
          })) {
            (0, _globals.logVerbose)(`Blocked telegram group message from ${senderId} (groupPolicy: allowlist)`);
            return;
          }
        }
        const groupAllowlist = resolveGroupPolicy(chatId);
        if (groupAllowlist.allowlistEnabled && !groupAllowlist.allowed) {
          logger.info({ chatId, title: callbackMessage.chat.title, reason: "not-allowed" }, "skipping group message");
          return;
        }
      }
      if (inlineButtonsScope === "allowlist") {
        if (!isGroup) {
          if (dmPolicy === "disabled") {
            return;
          }
          if (dmPolicy !== "open") {
            const allowed = effectiveDmAllow.hasWildcard ||
            effectiveDmAllow.hasEntries &&
            (0, _botAccess.isSenderAllowed)({
              allow: effectiveDmAllow,
              senderId,
              senderUsername
            });
            if (!allowed) {
              return;
            }
          }
        } else
        {
          const allowed = effectiveGroupAllow.hasWildcard ||
          effectiveGroupAllow.hasEntries &&
          (0, _botAccess.isSenderAllowed)({
            allow: effectiveGroupAllow,
            senderId,
            senderUsername
          });
          if (!allowed) {
            return;
          }
        }
      }
      const paginationMatch = data.match(/^commands_page_(\d+|noop)(?::(.+))?$/);
      if (paginationMatch) {
        const pageValue = paginationMatch[1];
        if (pageValue === "noop") {
          return;
        }
        const page = Number.parseInt(pageValue, 10);
        if (Number.isNaN(page) || page < 1) {
          return;
        }
        const agentId = paginationMatch[2]?.trim() || (0, _agentScope.resolveDefaultAgentId)(cfg) || undefined;
        const skillCommands = (0, _skillCommands.listSkillCommandsForAgents)({
          cfg,
          agentIds: agentId ? [agentId] : undefined
        });
        const result = (0, _status.buildCommandsMessagePaginated)(cfg, skillCommands, {
          page,
          surface: "telegram"
        });
        const keyboard = result.totalPages > 1 ?
        (0, _send.buildInlineKeyboard)((0, _commandsInfo.buildCommandsPaginationKeyboard)(result.currentPage, result.totalPages, agentId)) :
        undefined;
        try {
          await bot.api.editMessageText(callbackMessage.chat.id, callbackMessage.message_id, result.text, keyboard ? { reply_markup: keyboard } : undefined);
        }
        catch (editErr) {
          const errStr = String(editErr);
          if (!errStr.includes("message is not modified")) {
            throw editErr;
          }
        }
        return;
      }
      const syntheticMessage = {
        ...callbackMessage,
        from: callback.from,
        text: data,
        caption: undefined,
        caption_entities: undefined,
        entities: undefined
      };
      const getFile = typeof ctx.getFile === "function" ? ctx.getFile.bind(ctx) : async () => ({});
      await processMessage({ message: syntheticMessage, me: ctx.me, getFile }, [], storeAllowFrom, {
        forceWasMentioned: true,
        messageIdOverride: callback.id
      });
    }
    catch (err) {
      runtime.error?.((0, _globals.danger)(`callback handler failed: ${String(err)}`));
    }
  });
  // Handle group migration to supergroup (chat ID changes)
  bot.on("message:migrate_to_chat_id", async (ctx) => {
    try {
      const msg = ctx.message;
      if (!msg?.migrate_to_chat_id) {
        return;
      }
      if (shouldSkipUpdate(ctx)) {
        return;
      }
      const oldChatId = String(msg.chat.id);
      const newChatId = String(msg.migrate_to_chat_id);
      const chatTitle = msg.chat.title ?? "Unknown";
      runtime.log?.((0, _globals.warn)(`[telegram] Group migrated: "${chatTitle}" ${oldChatId} → ${newChatId}`));
      if (!(0, _configWrites.resolveChannelConfigWrites)({ cfg, channelId: "telegram", accountId })) {
        runtime.log?.((0, _globals.warn)("[telegram] Config writes disabled; skipping group config migration."));
        return;
      }
      // Check if old chat ID has config and migrate it
      const currentConfig = (0, _config.loadConfig)();
      const migration = (0, _groupMigration.migrateTelegramGroupConfig)({
        cfg: currentConfig,
        accountId,
        oldChatId,
        newChatId
      });
      if (migration.migrated) {
        runtime.log?.((0, _globals.warn)(`[telegram] Migrating group config from ${oldChatId} to ${newChatId}`));
        (0, _groupMigration.migrateTelegramGroupConfig)({ cfg, accountId, oldChatId, newChatId });
        await (0, _io.writeConfigFile)(currentConfig);
        runtime.log?.((0, _globals.warn)(`[telegram] Group config migrated and saved successfully`));
      } else
      if (migration.skippedExisting) {
        runtime.log?.((0, _globals.warn)(`[telegram] Group config already exists for ${newChatId}; leaving ${oldChatId} unchanged`));
      } else
      {
        runtime.log?.((0, _globals.warn)(`[telegram] No config found for old group ID ${oldChatId}, migration logged only`));
      }
    }
    catch (err) {
      runtime.error?.((0, _globals.danger)(`[telegram] Group migration handler failed: ${String(err)}`));
    }
  });
  bot.on("message", async (ctx) => {
    try {
      const msg = ctx.message;
      if (!msg) {
        return;
      }
      if (shouldSkipUpdate(ctx)) {
        return;
      }
      const chatId = msg.chat.id;
      const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
      const messageThreadId = msg.message_thread_id;
      const isForum = msg.chat.is_forum === true;
      const resolvedThreadId = (0, _helpers.resolveTelegramForumThreadId)({
        isForum,
        messageThreadId
      });
      const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("telegram").catch(() => []);
      const { groupConfig, topicConfig } = resolveTelegramGroupConfig(chatId, resolvedThreadId);
      const groupAllowOverride = (0, _botAccess.firstDefined)(topicConfig?.allowFrom, groupConfig?.allowFrom);
      const effectiveGroupAllow = (0, _botAccess.normalizeAllowFromWithStore)({
        allowFrom: groupAllowOverride ?? groupAllowFrom,
        storeAllowFrom
      });
      const hasGroupAllowOverride = typeof groupAllowOverride !== "undefined";
      if (isGroup) {
        if (groupConfig?.enabled === false) {
          (0, _globals.logVerbose)(`Blocked telegram group ${chatId} (group disabled)`);
          return;
        }
        if (topicConfig?.enabled === false) {
          (0, _globals.logVerbose)(`Blocked telegram topic ${chatId} (${resolvedThreadId ?? "unknown"}) (topic disabled)`);
          return;
        }
        if (hasGroupAllowOverride) {
          const senderId = msg.from?.id;
          const senderUsername = msg.from?.username ?? "";
          const allowed = senderId != null &&
          (0, _botAccess.isSenderAllowed)({
            allow: effectiveGroupAllow,
            senderId: String(senderId),
            senderUsername
          });
          if (!allowed) {
            (0, _globals.logVerbose)(`Blocked telegram group sender ${senderId ?? "unknown"} (group allowFrom override)`);
            return;
          }
        }
        // Group policy filtering: controls how group messages are handled
        // - "open": groups bypass allowFrom, only mention-gating applies
        // - "disabled": block all group messages entirely
        // - "allowlist": only allow group messages from senders in groupAllowFrom/allowFrom
        const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
        const groupPolicy = telegramCfg.groupPolicy ?? defaultGroupPolicy ?? "open";
        if (groupPolicy === "disabled") {
          (0, _globals.logVerbose)(`Blocked telegram group message (groupPolicy: disabled)`);
          return;
        }
        if (groupPolicy === "allowlist") {
          // For allowlist mode, the sender (msg.from.id) must be in allowFrom
          const senderId = msg.from?.id;
          if (senderId == null) {
            (0, _globals.logVerbose)(`Blocked telegram group message (no sender ID, groupPolicy: allowlist)`);
            return;
          }
          if (!effectiveGroupAllow.hasEntries) {
            (0, _globals.logVerbose)("Blocked telegram group message (groupPolicy: allowlist, no group allowlist entries)");
            return;
          }
          const senderUsername = msg.from?.username ?? "";
          if (!(0, _botAccess.isSenderAllowed)({
            allow: effectiveGroupAllow,
            senderId: String(senderId),
            senderUsername
          })) {
            (0, _globals.logVerbose)(`Blocked telegram group message from ${senderId} (groupPolicy: allowlist)`);
            return;
          }
        }
        // Group allowlist based on configured group IDs.
        const groupAllowlist = resolveGroupPolicy(chatId);
        if (groupAllowlist.allowlistEnabled && !groupAllowlist.allowed) {
          logger.info({ chatId, title: msg.chat.title, reason: "not-allowed" }, "skipping group message");
          return;
        }
      }
      // Text fragment handling - Telegram splits long pastes into multiple inbound messages (~4096 chars).
      // We buffer “near-limit” messages and append immediately-following parts.
      const text = typeof msg.text === "string" ? msg.text : undefined;
      const isCommandLike = (text ?? "").trim().startsWith("/");
      if (text && !isCommandLike) {
        const nowMs = Date.now();
        const senderId = msg.from?.id != null ? String(msg.from.id) : "unknown";
        const key = `text:${chatId}:${resolvedThreadId ?? "main"}:${senderId}`;
        const existing = textFragmentBuffer.get(key);
        if (existing) {
          const last = existing.messages.at(-1);
          const lastMsgId = last?.msg.message_id;
          const lastReceivedAtMs = last?.receivedAtMs ?? nowMs;
          const idGap = typeof lastMsgId === "number" ? msg.message_id - lastMsgId : Infinity;
          const timeGapMs = nowMs - lastReceivedAtMs;
          const canAppend = idGap > 0 &&
          idGap <= TELEGRAM_TEXT_FRAGMENT_MAX_ID_GAP &&
          timeGapMs >= 0 &&
          timeGapMs <= TELEGRAM_TEXT_FRAGMENT_MAX_GAP_MS;
          if (canAppend) {
            const currentTotalChars = existing.messages.reduce((sum, m) => sum + (m.msg.text?.length ?? 0), 0);
            const nextTotalChars = currentTotalChars + text.length;
            if (existing.messages.length + 1 <= TELEGRAM_TEXT_FRAGMENT_MAX_PARTS &&
            nextTotalChars <= TELEGRAM_TEXT_FRAGMENT_MAX_TOTAL_CHARS) {
              existing.messages.push({ msg, ctx, receivedAtMs: nowMs });
              scheduleTextFragmentFlush(existing);
              return;
            }
          }
          // Not appendable (or limits exceeded): flush buffered entry first, then continue normally.
          clearTimeout(existing.timer);
          textFragmentBuffer.delete(key);
          textFragmentProcessing = textFragmentProcessing.
          then(async () => {
            await flushTextFragments(existing);
          }).
          catch(() => undefined);
          await textFragmentProcessing;
        }
        const shouldStart = text.length >= TELEGRAM_TEXT_FRAGMENT_START_THRESHOLD_CHARS;
        if (shouldStart) {
          const entry = {
            key,
            messages: [{ msg, ctx, receivedAtMs: nowMs }],
            timer: setTimeout(() => {}, TELEGRAM_TEXT_FRAGMENT_MAX_GAP_MS)
          };
          textFragmentBuffer.set(key, entry);
          scheduleTextFragmentFlush(entry);
          return;
        }
      }
      // Media group handling - buffer multi-image messages
      const mediaGroupId = msg.media_group_id;
      if (mediaGroupId) {
        const existing = mediaGroupBuffer.get(mediaGroupId);
        if (existing) {
          clearTimeout(existing.timer);
          existing.messages.push({ msg, ctx });
          existing.timer = setTimeout(async () => {
            mediaGroupBuffer.delete(mediaGroupId);
            mediaGroupProcessing = mediaGroupProcessing.
            then(async () => {
              await processMediaGroup(existing);
            }).
            catch(() => undefined);
            await mediaGroupProcessing;
          }, _botUpdates.MEDIA_GROUP_TIMEOUT_MS);
        } else
        {
          const entry = {
            messages: [{ msg, ctx }],
            timer: setTimeout(async () => {
              mediaGroupBuffer.delete(mediaGroupId);
              mediaGroupProcessing = mediaGroupProcessing.
              then(async () => {
                await processMediaGroup(entry);
              }).
              catch(() => undefined);
              await mediaGroupProcessing;
            }, _botUpdates.MEDIA_GROUP_TIMEOUT_MS)
          };
          mediaGroupBuffer.set(mediaGroupId, entry);
        }
        return;
      }
      let media = null;
      try {
        media = await (0, _delivery.resolveMedia)(ctx, mediaMaxBytes, opts.token, opts.proxyFetch);
      }
      catch (mediaErr) {
        const errMsg = String(mediaErr);
        if (errMsg.includes("exceeds") && errMsg.includes("MB limit")) {
          const limitMb = Math.round(mediaMaxBytes / (1024 * 1024));
          await (0, _apiLogging.withTelegramApiErrorLogging)({
            operation: "sendMessage",
            runtime,
            fn: () => bot.api.sendMessage(chatId, `⚠️ File too large. Maximum size is ${limitMb}MB.`, {
              reply_to_message_id: msg.message_id
            })
          }).catch(() => {});
          logger.warn({ chatId, error: errMsg }, "media exceeds size limit");
          return;
        }
        throw mediaErr;
      }
      // Skip sticker-only messages where the sticker was skipped (animated/video)
      // These have no media and no text content to process.
      const hasText = Boolean((msg.text ?? msg.caption ?? "").trim());
      if (msg.sticker && !media && !hasText) {
        (0, _globals.logVerbose)("telegram: skipping sticker-only message (unsupported sticker type)");
        return;
      }
      const allMedia = media ?
      [
      {
        path: media.path,
        contentType: media.contentType,
        stickerMetadata: media.stickerMetadata
      }] :

      [];
      const senderId = msg.from?.id ? String(msg.from.id) : "";
      const conversationKey = resolvedThreadId != null ? `${chatId}:topic:${resolvedThreadId}` : String(chatId);
      const debounceKey = senderId ?
      `telegram:${accountId ?? "default"}:${conversationKey}:${senderId}` :
      null;
      await inboundDebouncer.enqueue({
        ctx,
        msg,
        allMedia,
        storeAllowFrom,
        debounceKey,
        botUsername: ctx.me?.username
      });
    }
    catch (err) {
      runtime.error?.((0, _globals.danger)(`handler failed: ${String(err)}`));
    }
  });
};exports.registerTelegramHandlers = registerTelegramHandlers; /* v9-35791e84927ec3fa */
