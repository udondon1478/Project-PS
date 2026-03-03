"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerTelegramNativeCommands = void 0;var _identity = require("../agents/identity.js");
var _chunk = require("../auto-reply/chunk.js");
var _commandsRegistry = require("../auto-reply/commands-registry.js");
var _inboundContext = require("../auto-reply/reply/inbound-context.js");
var _providerDispatcher = require("../auto-reply/reply/provider-dispatcher.js");
var _skillCommands = require("../auto-reply/skill-commands.js");
var _commandGating = require("../channels/command-gating.js");
var _markdownTables = require("../config/markdown-tables.js");
var _telegramCustomCommands = require("../config/telegram-custom-commands.js");

var _globals = require("../globals.js");
var _pairingStore = require("../pairing/pairing-store.js");
var _commands = require("../plugins/commands.js");
var _resolveRoute = require("../routing/resolve-route.js");
var _sessionKey = require("../routing/session-key.js");
var _apiLogging = require("./api-logging.js");
var _botAccess = require("./bot-access.js");
var _delivery = require("./bot/delivery.js");
var _helpers = require("./bot/helpers.js");
var _send = require("./send.js");
const EMPTY_RESPONSE_FALLBACK = "No response generated. Please try again.";
async function resolveTelegramCommandAuth(params) {
  const { msg, bot, cfg, telegramCfg, allowFrom, groupAllowFrom, useAccessGroups, resolveGroupPolicy, resolveTelegramGroupConfig, requireAuth } = params;
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
  const senderIdRaw = msg.from?.id;
  const senderId = senderIdRaw ? String(senderIdRaw) : "";
  const senderUsername = msg.from?.username ?? "";
  if (isGroup && groupConfig?.enabled === false) {
    await (0, _apiLogging.withTelegramApiErrorLogging)({
      operation: "sendMessage",
      fn: () => bot.api.sendMessage(chatId, "This group is disabled.")
    });
    return null;
  }
  if (isGroup && topicConfig?.enabled === false) {
    await (0, _apiLogging.withTelegramApiErrorLogging)({
      operation: "sendMessage",
      fn: () => bot.api.sendMessage(chatId, "This topic is disabled.")
    });
    return null;
  }
  if (requireAuth && isGroup && hasGroupAllowOverride) {
    if (senderIdRaw == null ||
    !(0, _botAccess.isSenderAllowed)({
      allow: effectiveGroupAllow,
      senderId: String(senderIdRaw),
      senderUsername
    })) {
      await (0, _apiLogging.withTelegramApiErrorLogging)({
        operation: "sendMessage",
        fn: () => bot.api.sendMessage(chatId, "You are not authorized to use this command.")
      });
      return null;
    }
  }
  if (isGroup && useAccessGroups) {
    const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
    const groupPolicy = telegramCfg.groupPolicy ?? defaultGroupPolicy ?? "open";
    if (groupPolicy === "disabled") {
      await (0, _apiLogging.withTelegramApiErrorLogging)({
        operation: "sendMessage",
        fn: () => bot.api.sendMessage(chatId, "Telegram group commands are disabled.")
      });
      return null;
    }
    if (groupPolicy === "allowlist" && requireAuth) {
      if (senderIdRaw == null ||
      !(0, _botAccess.isSenderAllowed)({
        allow: effectiveGroupAllow,
        senderId: String(senderIdRaw),
        senderUsername
      })) {
        await (0, _apiLogging.withTelegramApiErrorLogging)({
          operation: "sendMessage",
          fn: () => bot.api.sendMessage(chatId, "You are not authorized to use this command.")
        });
        return null;
      }
    }
    const groupAllowlist = resolveGroupPolicy(chatId);
    if (groupAllowlist.allowlistEnabled && !groupAllowlist.allowed) {
      await (0, _apiLogging.withTelegramApiErrorLogging)({
        operation: "sendMessage",
        fn: () => bot.api.sendMessage(chatId, "This group is not allowed.")
      });
      return null;
    }
  }
  const dmAllow = (0, _botAccess.normalizeAllowFromWithStore)({
    allowFrom: allowFrom,
    storeAllowFrom
  });
  const senderAllowed = (0, _botAccess.isSenderAllowed)({
    allow: dmAllow,
    senderId,
    senderUsername
  });
  const commandAuthorized = (0, _commandGating.resolveCommandAuthorizedFromAuthorizers)({
    useAccessGroups,
    authorizers: [{ configured: dmAllow.hasEntries, allowed: senderAllowed }],
    modeWhenAccessGroupsOff: "configured"
  });
  if (requireAuth && !commandAuthorized) {
    await (0, _apiLogging.withTelegramApiErrorLogging)({
      operation: "sendMessage",
      fn: () => bot.api.sendMessage(chatId, "You are not authorized to use this command.")
    });
    return null;
  }
  return {
    chatId,
    isGroup,
    isForum,
    resolvedThreadId,
    senderId,
    senderUsername,
    groupConfig,
    topicConfig,
    commandAuthorized
  };
}
const registerTelegramNativeCommands = ({ bot, cfg, runtime, accountId, telegramCfg, allowFrom, groupAllowFrom, replyToMode, textLimit, useAccessGroups, nativeEnabled, nativeSkillsEnabled, nativeDisabledExplicit, resolveGroupPolicy, resolveTelegramGroupConfig, shouldSkipUpdate, opts }) => {
  const boundRoute = nativeEnabled && nativeSkillsEnabled ?
  (0, _resolveRoute.resolveAgentRoute)({ cfg, channel: "telegram", accountId }) :
  null;
  const boundAgentIds = boundRoute && boundRoute.matchedBy.startsWith("binding.") ? [boundRoute.agentId] : null;
  const skillCommands = nativeEnabled && nativeSkillsEnabled ?
  (0, _skillCommands.listSkillCommandsForAgents)(boundAgentIds ? { cfg, agentIds: boundAgentIds } : { cfg }) :
  [];
  const nativeCommands = nativeEnabled ?
  (0, _commandsRegistry.listNativeCommandSpecsForConfig)(cfg, {
    skillCommands,
    provider: "telegram"
  }) :
  [];
  const reservedCommands = new Set((0, _commandsRegistry.listNativeCommandSpecs)().map((command) => command.name.toLowerCase()));
  for (const command of skillCommands) {
    reservedCommands.add(command.name.toLowerCase());
  }
  const customResolution = (0, _telegramCustomCommands.resolveTelegramCustomCommands)({
    commands: telegramCfg.customCommands,
    reservedCommands
  });
  for (const issue of customResolution.issues) {
    runtime.error?.((0, _globals.danger)(issue.message));
  }
  const customCommands = customResolution.commands;
  const pluginCommandSpecs = (0, _commands.getPluginCommandSpecs)();
  const pluginCommands = [];
  const existingCommands = new Set([
  ...nativeCommands.map((command) => command.name),
  ...customCommands.map((command) => command.command)].
  map((command) => command.toLowerCase()));
  const pluginCommandNames = new Set();
  for (const spec of pluginCommandSpecs) {
    const normalized = (0, _telegramCustomCommands.normalizeTelegramCommandName)(spec.name);
    if (!normalized || !_telegramCustomCommands.TELEGRAM_COMMAND_NAME_PATTERN.test(normalized)) {
      runtime.error?.((0, _globals.danger)(`Plugin command "/${spec.name}" is invalid for Telegram (use a-z, 0-9, underscore; max 32 chars).`));
      continue;
    }
    const description = spec.description.trim();
    if (!description) {
      runtime.error?.((0, _globals.danger)(`Plugin command "/${normalized}" is missing a description.`));
      continue;
    }
    if (existingCommands.has(normalized)) {
      runtime.error?.((0, _globals.danger)(`Plugin command "/${normalized}" conflicts with an existing Telegram command.`));
      continue;
    }
    if (pluginCommandNames.has(normalized)) {
      runtime.error?.((0, _globals.danger)(`Plugin command "/${normalized}" is duplicated.`));
      continue;
    }
    pluginCommandNames.add(normalized);
    existingCommands.add(normalized);
    pluginCommands.push({ command: normalized, description });
  }
  const allCommands = [
  ...nativeCommands.map((command) => ({
    command: command.name,
    description: command.description
  })),
  ...pluginCommands,
  ...customCommands];

  if (allCommands.length > 0) {
    (0, _apiLogging.withTelegramApiErrorLogging)({
      operation: "setMyCommands",
      runtime,
      fn: () => bot.api.setMyCommands(allCommands)
    }).catch(() => {});
    if (typeof bot.command !== "function") {
      (0, _globals.logVerbose)("telegram: bot.command unavailable; skipping native handlers");
    } else
    {
      for (const command of nativeCommands) {
        bot.command(command.name, async (ctx) => {
          const msg = ctx.message;
          if (!msg) {
            return;
          }
          if (shouldSkipUpdate(ctx)) {
            return;
          }
          const auth = await resolveTelegramCommandAuth({
            msg,
            bot,
            cfg,
            telegramCfg,
            allowFrom,
            groupAllowFrom,
            useAccessGroups,
            resolveGroupPolicy,
            resolveTelegramGroupConfig,
            requireAuth: true
          });
          if (!auth) {
            return;
          }
          const { chatId, isGroup, isForum, resolvedThreadId, senderId, senderUsername, groupConfig, topicConfig, commandAuthorized } = auth;
          const messageThreadId = msg.message_thread_id;
          const threadSpec = (0, _helpers.resolveTelegramThreadSpec)({
            isGroup,
            isForum,
            messageThreadId
          });
          const threadParams = (0, _helpers.buildTelegramThreadParams)(threadSpec) ?? {};
          const commandDefinition = (0, _commandsRegistry.findCommandByNativeName)(command.name, "telegram");
          const rawText = ctx.match?.trim() ?? "";
          const commandArgs = commandDefinition ?
          (0, _commandsRegistry.parseCommandArgs)(commandDefinition, rawText) :
          rawText ?
          { raw: rawText } :
          undefined;
          const prompt = commandDefinition ?
          (0, _commandsRegistry.buildCommandTextFromArgs)(commandDefinition, commandArgs) :
          rawText ?
          `/${command.name} ${rawText}` :
          `/${command.name}`;
          const menu = commandDefinition ?
          (0, _commandsRegistry.resolveCommandArgMenu)({
            command: commandDefinition,
            args: commandArgs,
            cfg
          }) :
          null;
          if (menu && commandDefinition) {
            const title = menu.title ??
            `Choose ${menu.arg.description || menu.arg.name} for /${commandDefinition.nativeName ?? commandDefinition.key}.`;
            const rows = [];
            for (let i = 0; i < menu.choices.length; i += 2) {
              const slice = menu.choices.slice(i, i + 2);
              rows.push(slice.map((choice) => {
                const args = {
                  values: { [menu.arg.name]: choice.value }
                };
                return {
                  text: choice.label,
                  callback_data: (0, _commandsRegistry.buildCommandTextFromArgs)(commandDefinition, args)
                };
              }));
            }
            const replyMarkup = (0, _send.buildInlineKeyboard)(rows);
            await (0, _apiLogging.withTelegramApiErrorLogging)({
              operation: "sendMessage",
              runtime,
              fn: () => bot.api.sendMessage(chatId, title, {
                ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
                ...threadParams
              })
            });
            return;
          }
          const route = (0, _resolveRoute.resolveAgentRoute)({
            cfg,
            channel: "telegram",
            accountId,
            peer: {
              kind: isGroup ? "group" : "dm",
              id: isGroup ? (0, _helpers.buildTelegramGroupPeerId)(chatId, resolvedThreadId) : String(chatId)
            }
          });
          const baseSessionKey = route.sessionKey;
          // DMs: use raw messageThreadId for thread sessions (not resolvedThreadId which is for forums)
          const dmThreadId = threadSpec.scope === "dm" ? threadSpec.id : undefined;
          const threadKeys = dmThreadId != null ?
          (0, _sessionKey.resolveThreadSessionKeys)({
            baseSessionKey,
            threadId: String(dmThreadId)
          }) :
          null;
          const sessionKey = threadKeys?.sessionKey ?? baseSessionKey;
          const tableMode = (0, _markdownTables.resolveMarkdownTableMode)({
            cfg,
            channel: "telegram",
            accountId: route.accountId
          });
          const skillFilter = (0, _botAccess.firstDefined)(topicConfig?.skills, groupConfig?.skills);
          const systemPromptParts = [
          groupConfig?.systemPrompt?.trim() || null,
          topicConfig?.systemPrompt?.trim() || null].
          filter((entry) => Boolean(entry));
          const groupSystemPrompt = systemPromptParts.length > 0 ? systemPromptParts.join("\n\n") : undefined;
          const conversationLabel = isGroup ?
          msg.chat.title ?
          `${msg.chat.title} id:${chatId}` :
          `group:${chatId}` :
          (0, _helpers.buildSenderName)(msg) ?? String(senderId || chatId);
          const ctxPayload = (0, _inboundContext.finalizeInboundContext)({
            Body: prompt,
            RawBody: prompt,
            CommandBody: prompt,
            CommandArgs: commandArgs,
            From: isGroup ? (0, _helpers.buildTelegramGroupFrom)(chatId, resolvedThreadId) : `telegram:${chatId}`,
            To: `slash:${senderId || chatId}`,
            ChatType: isGroup ? "group" : "direct",
            ConversationLabel: conversationLabel,
            GroupSubject: isGroup ? msg.chat.title ?? undefined : undefined,
            GroupSystemPrompt: isGroup ? groupSystemPrompt : undefined,
            SenderName: (0, _helpers.buildSenderName)(msg),
            SenderId: senderId || undefined,
            SenderUsername: senderUsername || undefined,
            Surface: "telegram",
            MessageSid: String(msg.message_id),
            Timestamp: msg.date ? msg.date * 1000 : undefined,
            WasMentioned: true,
            CommandAuthorized: commandAuthorized,
            CommandSource: "native",
            SessionKey: `telegram:slash:${senderId || chatId}`,
            AccountId: route.accountId,
            CommandTargetSessionKey: sessionKey,
            MessageThreadId: threadSpec.id,
            IsForum: isForum,
            // Originating context for sub-agent announce routing
            OriginatingChannel: "telegram",
            OriginatingTo: `telegram:${chatId}`
          });
          const disableBlockStreaming = typeof telegramCfg.blockStreaming === "boolean" ?
          !telegramCfg.blockStreaming :
          undefined;
          const chunkMode = (0, _chunk.resolveChunkMode)(cfg, "telegram", route.accountId);
          const deliveryState = {
            delivered: false,
            skippedNonSilent: 0
          };
          await (0, _providerDispatcher.dispatchReplyWithBufferedBlockDispatcher)({
            ctx: ctxPayload,
            cfg,
            dispatcherOptions: {
              responsePrefix: (0, _identity.resolveEffectiveMessagesConfig)(cfg, route.agentId).responsePrefix,
              deliver: async (payload, _info) => {
                const result = await (0, _delivery.deliverReplies)({
                  replies: [payload],
                  chatId: String(chatId),
                  token: opts.token,
                  runtime,
                  bot,
                  replyToMode,
                  textLimit,
                  thread: threadSpec,
                  tableMode,
                  chunkMode,
                  linkPreview: telegramCfg.linkPreview
                });
                if (result.delivered) {
                  deliveryState.delivered = true;
                }
              },
              onSkip: (_payload, info) => {
                if (info.reason !== "silent") {
                  deliveryState.skippedNonSilent += 1;
                }
              },
              onError: (err, info) => {
                runtime.error?.((0, _globals.danger)(`telegram slash ${info.kind} reply failed: ${String(err)}`));
              }
            },
            replyOptions: {
              skillFilter,
              disableBlockStreaming
            }
          });
          if (!deliveryState.delivered && deliveryState.skippedNonSilent > 0) {
            await (0, _delivery.deliverReplies)({
              replies: [{ text: EMPTY_RESPONSE_FALLBACK }],
              chatId: String(chatId),
              token: opts.token,
              runtime,
              bot,
              replyToMode,
              textLimit,
              thread: threadSpec,
              tableMode,
              chunkMode,
              linkPreview: telegramCfg.linkPreview
            });
          }
        });
      }
      for (const pluginCommand of pluginCommands) {
        bot.command(pluginCommand.command, async (ctx) => {
          const msg = ctx.message;
          if (!msg) {
            return;
          }
          if (shouldSkipUpdate(ctx)) {
            return;
          }
          const chatId = msg.chat.id;
          const rawText = ctx.match?.trim() ?? "";
          const commandBody = `/${pluginCommand.command}${rawText ? ` ${rawText}` : ""}`;
          const match = (0, _commands.matchPluginCommand)(commandBody);
          if (!match) {
            await (0, _apiLogging.withTelegramApiErrorLogging)({
              operation: "sendMessage",
              runtime,
              fn: () => bot.api.sendMessage(chatId, "Command not found.")
            });
            return;
          }
          const auth = await resolveTelegramCommandAuth({
            msg,
            bot,
            cfg,
            telegramCfg,
            allowFrom,
            groupAllowFrom,
            useAccessGroups,
            resolveGroupPolicy,
            resolveTelegramGroupConfig,
            requireAuth: match.command.requireAuth !== false
          });
          if (!auth) {
            return;
          }
          const { senderId, commandAuthorized, isGroup, isForum } = auth;
          const messageThreadId = msg.message_thread_id;
          const threadSpec = (0, _helpers.resolveTelegramThreadSpec)({
            isGroup,
            isForum,
            messageThreadId
          });
          const result = await (0, _commands.executePluginCommand)({
            command: match.command,
            args: match.args,
            senderId,
            channel: "telegram",
            isAuthorizedSender: commandAuthorized,
            commandBody,
            config: cfg
          });
          const tableMode = (0, _markdownTables.resolveMarkdownTableMode)({
            cfg,
            channel: "telegram",
            accountId
          });
          const chunkMode = (0, _chunk.resolveChunkMode)(cfg, "telegram", accountId);
          await (0, _delivery.deliverReplies)({
            replies: [result],
            chatId: String(chatId),
            token: opts.token,
            runtime,
            bot,
            replyToMode,
            textLimit,
            thread: threadSpec,
            tableMode,
            chunkMode,
            linkPreview: telegramCfg.linkPreview
          });
        });
      }
    }
  } else
  if (nativeDisabledExplicit) {
    (0, _apiLogging.withTelegramApiErrorLogging)({
      operation: "setMyCommands",
      runtime,
      fn: () => bot.api.setMyCommands([])
    }).catch(() => {});
  }
};exports.registerTelegramNativeCommands = registerTelegramNativeCommands; /* v9-cb1a00bada7912f4 */
