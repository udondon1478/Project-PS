"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildTelegramMessageContext = void 0;var _identity = require("../agents/identity.js");
var _modelCatalog = require("../agents/model-catalog.js");
var _modelSelection = require("../agents/model-selection.js");
var _commandDetection = require("../auto-reply/command-detection.js");
var _commandsRegistry = require("../auto-reply/commands-registry.js");
var _envelope = require("../auto-reply/envelope.js");
var _history = require("../auto-reply/reply/history.js");
var _inboundContext = require("../auto-reply/reply/inbound-context.js");
var _mentions = require("../auto-reply/reply/mentions.js");
var _ackReactions = require("../channels/ack-reactions.js");
var _commandGating = require("../channels/command-gating.js");
var _location = require("../channels/location.js");
var _logging = require("../channels/logging.js");
var _mentionGating = require("../channels/mention-gating.js");
var _session = require("../channels/session.js");
var _commandFormat = require("../cli/command-format.js");
var _sessions = require("../config/sessions.js");
var _globals = require("../globals.js");
var _channelActivity = require("../infra/channel-activity.js");
var _pairingStore = require("../pairing/pairing-store.js");
var _resolveRoute = require("../routing/resolve-route.js");
var _sessionKey = require("../routing/session-key.js");
var _apiLogging = require("./api-logging.js");
var _botAccess = require("./bot-access.js");
var _helpers = require("./bot/helpers.js");
async function resolveStickerVisionSupport(params) {
  try {
    const catalog = await (0, _modelCatalog.loadModelCatalog)({ config: params.cfg });
    const defaultModel = (0, _modelSelection.resolveDefaultModelForAgent)({
      cfg: params.cfg,
      agentId: params.agentId
    });
    const entry = (0, _modelCatalog.findModelInCatalog)(catalog, defaultModel.provider, defaultModel.model);
    if (!entry) {
      return false;
    }
    return (0, _modelCatalog.modelSupportsVision)(entry);
  }
  catch {
    return false;
  }
}
const buildTelegramMessageContext = async ({ primaryCtx, allMedia, storeAllowFrom, options, bot, cfg, account, historyLimit, groupHistories, dmPolicy, allowFrom, groupAllowFrom, ackReactionScope, logger, resolveGroupActivation, resolveGroupRequireMention, resolveTelegramGroupConfig }) => {
  const msg = primaryCtx.message;
  (0, _channelActivity.recordChannelActivity)({
    channel: "telegram",
    accountId: account.accountId,
    direction: "inbound"
  });
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
  const messageThreadId = msg.message_thread_id;
  const isForum = msg.chat.is_forum === true;
  const threadSpec = (0, _helpers.resolveTelegramThreadSpec)({
    isGroup,
    isForum,
    messageThreadId
  });
  const resolvedThreadId = threadSpec.scope === "forum" ? threadSpec.id : undefined;
  const replyThreadId = threadSpec.id;
  const { groupConfig, topicConfig } = resolveTelegramGroupConfig(chatId, resolvedThreadId);
  const peerId = isGroup ? (0, _helpers.buildTelegramGroupPeerId)(chatId, resolvedThreadId) : String(chatId);
  const route = (0, _resolveRoute.resolveAgentRoute)({
    cfg,
    channel: "telegram",
    accountId: account.accountId,
    peer: {
      kind: isGroup ? "group" : "dm",
      id: peerId
    }
  });
  const baseSessionKey = route.sessionKey;
  // DMs: use raw messageThreadId for thread sessions (not forum topic ids)
  const dmThreadId = threadSpec.scope === "dm" ? threadSpec.id : undefined;
  const threadKeys = dmThreadId != null ?
  (0, _sessionKey.resolveThreadSessionKeys)({ baseSessionKey, threadId: String(dmThreadId) }) :
  null;
  const sessionKey = threadKeys?.sessionKey ?? baseSessionKey;
  const mentionRegexes = (0, _mentions.buildMentionRegexes)(cfg, route.agentId);
  const effectiveDmAllow = (0, _botAccess.normalizeAllowFromWithStore)({ allowFrom, storeAllowFrom });
  const groupAllowOverride = (0, _botAccess.firstDefined)(topicConfig?.allowFrom, groupConfig?.allowFrom);
  const effectiveGroupAllow = (0, _botAccess.normalizeAllowFromWithStore)({
    allowFrom: groupAllowOverride ?? groupAllowFrom,
    storeAllowFrom
  });
  const hasGroupAllowOverride = typeof groupAllowOverride !== "undefined";
  if (isGroup && groupConfig?.enabled === false) {
    (0, _globals.logVerbose)(`Blocked telegram group ${chatId} (group disabled)`);
    return null;
  }
  if (isGroup && topicConfig?.enabled === false) {
    (0, _globals.logVerbose)(`Blocked telegram topic ${chatId} (${resolvedThreadId ?? "unknown"}) (topic disabled)`);
    return null;
  }
  const sendTyping = async () => {
    await (0, _apiLogging.withTelegramApiErrorLogging)({
      operation: "sendChatAction",
      fn: () => bot.api.sendChatAction(chatId, "typing", (0, _helpers.buildTypingThreadParams)(replyThreadId))
    });
  };
  const sendRecordVoice = async () => {
    try {
      await (0, _apiLogging.withTelegramApiErrorLogging)({
        operation: "sendChatAction",
        fn: () => bot.api.sendChatAction(chatId, "record_voice", (0, _helpers.buildTypingThreadParams)(replyThreadId))
      });
    }
    catch (err) {
      (0, _globals.logVerbose)(`telegram record_voice cue failed for chat ${chatId}: ${String(err)}`);
    }
  };
  // DM access control (secure defaults): "pairing" (default) / "allowlist" / "open" / "disabled"
  if (!isGroup) {
    if (dmPolicy === "disabled") {
      return null;
    }
    if (dmPolicy !== "open") {
      const candidate = String(chatId);
      const senderUsername = msg.from?.username ?? "";
      const allowMatch = (0, _botAccess.resolveSenderAllowMatch)({
        allow: effectiveDmAllow,
        senderId: candidate,
        senderUsername
      });
      const allowMatchMeta = `matchKey=${allowMatch.matchKey ?? "none"} matchSource=${allowMatch.matchSource ?? "none"}`;
      const allowed = effectiveDmAllow.hasWildcard || effectiveDmAllow.hasEntries && allowMatch.allowed;
      if (!allowed) {
        if (dmPolicy === "pairing") {
          try {
            const from = msg.from;
            const telegramUserId = from?.id ? String(from.id) : candidate;
            const { code, created } = await (0, _pairingStore.upsertChannelPairingRequest)({
              channel: "telegram",
              id: telegramUserId,
              meta: {
                username: from?.username,
                firstName: from?.first_name,
                lastName: from?.last_name
              }
            });
            if (created) {
              logger.info({
                chatId: candidate,
                username: from?.username,
                firstName: from?.first_name,
                lastName: from?.last_name,
                matchKey: allowMatch.matchKey ?? "none",
                matchSource: allowMatch.matchSource ?? "none"
              }, "telegram pairing request");
              await (0, _apiLogging.withTelegramApiErrorLogging)({
                operation: "sendMessage",
                fn: () => bot.api.sendMessage(chatId, [
                "OpenClaw: access not configured.",
                "",
                `Your Telegram user id: ${telegramUserId}`,
                "",
                `Pairing code: ${code}`,
                "",
                "Ask the bot owner to approve with:",
                (0, _commandFormat.formatCliCommand)("openclaw pairing approve telegram <code>")].
                join("\n"))
              });
            }
          }
          catch (err) {
            (0, _globals.logVerbose)(`telegram pairing reply failed for chat ${chatId}: ${String(err)}`);
          }
        } else
        {
          (0, _globals.logVerbose)(`Blocked unauthorized telegram sender ${candidate} (dmPolicy=${dmPolicy}, ${allowMatchMeta})`);
        }
        return null;
      }
    }
  }
  const botUsername = primaryCtx.me?.username?.toLowerCase();
  const senderId = msg.from?.id ? String(msg.from.id) : "";
  const senderUsername = msg.from?.username ?? "";
  if (isGroup && hasGroupAllowOverride) {
    const allowed = (0, _botAccess.isSenderAllowed)({
      allow: effectiveGroupAllow,
      senderId,
      senderUsername
    });
    if (!allowed) {
      (0, _globals.logVerbose)(`Blocked telegram group sender ${senderId || "unknown"} (group allowFrom override)`);
      return null;
    }
  }
  const allowForCommands = isGroup ? effectiveGroupAllow : effectiveDmAllow;
  const senderAllowedForCommands = (0, _botAccess.isSenderAllowed)({
    allow: allowForCommands,
    senderId,
    senderUsername
  });
  const useAccessGroups = cfg.commands?.useAccessGroups !== false;
  const hasControlCommandInMessage = (0, _commandDetection.hasControlCommand)(msg.text ?? msg.caption ?? "", cfg, {
    botUsername
  });
  const commandGate = (0, _commandGating.resolveControlCommandGate)({
    useAccessGroups,
    authorizers: [{ configured: allowForCommands.hasEntries, allowed: senderAllowedForCommands }],
    allowTextCommands: true,
    hasControlCommand: hasControlCommandInMessage
  });
  const commandAuthorized = commandGate.commandAuthorized;
  const historyKey = isGroup ? (0, _helpers.buildTelegramGroupPeerId)(chatId, resolvedThreadId) : undefined;
  let placeholder = "";
  if (msg.photo) {
    placeholder = "<media:image>";
  } else
  if (msg.video) {
    placeholder = "<media:video>";
  } else
  if (msg.video_note) {
    placeholder = "<media:video>";
  } else
  if (msg.audio || msg.voice) {
    placeholder = "<media:audio>";
  } else
  if (msg.document) {
    placeholder = "<media:document>";
  } else
  if (msg.sticker) {
    placeholder = "<media:sticker>";
  }
  // Check if sticker has a cached description - if so, use it instead of sending the image
  const cachedStickerDescription = allMedia[0]?.stickerMetadata?.cachedDescription;
  const stickerSupportsVision = msg.sticker ?
  await resolveStickerVisionSupport({ cfg, agentId: route.agentId }) :
  false;
  const stickerCacheHit = Boolean(cachedStickerDescription) && !stickerSupportsVision;
  if (stickerCacheHit) {
    // Format cached description with sticker context
    const emoji = allMedia[0]?.stickerMetadata?.emoji;
    const setName = allMedia[0]?.stickerMetadata?.setName;
    const stickerContext = [emoji, setName ? `from "${setName}"` : null].filter(Boolean).join(" ");
    placeholder = `[Sticker${stickerContext ? ` ${stickerContext}` : ""}] ${cachedStickerDescription}`;
  }
  const locationData = (0, _helpers.extractTelegramLocation)(msg);
  const locationText = locationData ? (0, _location.formatLocationText)(locationData) : undefined;
  const rawTextSource = msg.text ?? msg.caption ?? "";
  const rawText = (0, _helpers.expandTextLinks)(rawTextSource, msg.entities ?? msg.caption_entities).trim();
  let rawBody = [rawText, locationText].filter(Boolean).join("\n").trim();
  if (!rawBody) {
    rawBody = placeholder;
  }
  if (!rawBody && allMedia.length === 0) {
    return null;
  }
  let bodyText = rawBody;
  if (!bodyText && allMedia.length > 0) {
    bodyText = `<media:image>${allMedia.length > 1 ? ` (${allMedia.length} images)` : ""}`;
  }
  const hasAnyMention = (msg.entities ?? msg.caption_entities ?? []).some((ent) => ent.type === "mention");
  const explicitlyMentioned = botUsername ? (0, _helpers.hasBotMention)(msg, botUsername) : false;
  const computedWasMentioned = (0, _mentions.matchesMentionWithExplicit)({
    text: msg.text ?? msg.caption ?? "",
    mentionRegexes,
    explicit: {
      hasAnyMention,
      isExplicitlyMentioned: explicitlyMentioned,
      canResolveExplicit: Boolean(botUsername)
    }
  });
  const wasMentioned = options?.forceWasMentioned === true ? true : computedWasMentioned;
  if (isGroup && commandGate.shouldBlock) {
    (0, _logging.logInboundDrop)({
      log: _globals.logVerbose,
      channel: "telegram",
      reason: "control command (unauthorized)",
      target: senderId ?? "unknown"
    });
    return null;
  }
  const activationOverride = resolveGroupActivation({
    chatId,
    messageThreadId: resolvedThreadId,
    sessionKey: sessionKey,
    agentId: route.agentId
  });
  const baseRequireMention = resolveGroupRequireMention(chatId);
  const requireMention = (0, _botAccess.firstDefined)(activationOverride, topicConfig?.requireMention, groupConfig?.requireMention, baseRequireMention);
  // Reply-chain detection: replying to a bot message acts like an implicit mention.
  const botId = primaryCtx.me?.id;
  const replyFromId = msg.reply_to_message?.from?.id;
  const implicitMention = botId != null && replyFromId === botId;
  const canDetectMention = Boolean(botUsername) || mentionRegexes.length > 0;
  const mentionGate = (0, _mentionGating.resolveMentionGatingWithBypass)({
    isGroup,
    requireMention: Boolean(requireMention),
    canDetectMention,
    wasMentioned,
    implicitMention: isGroup && Boolean(requireMention) && implicitMention,
    hasAnyMention,
    allowTextCommands: true,
    hasControlCommand: hasControlCommandInMessage,
    commandAuthorized
  });
  const effectiveWasMentioned = mentionGate.effectiveWasMentioned;
  if (isGroup && requireMention && canDetectMention) {
    if (mentionGate.shouldSkip) {
      logger.info({ chatId, reason: "no-mention" }, "skipping group message");
      (0, _history.recordPendingHistoryEntryIfEnabled)({
        historyMap: groupHistories,
        historyKey: historyKey ?? "",
        limit: historyLimit,
        entry: historyKey ?
        {
          sender: (0, _helpers.buildSenderLabel)(msg, senderId || chatId),
          body: rawBody,
          timestamp: msg.date ? msg.date * 1000 : undefined,
          messageId: typeof msg.message_id === "number" ? String(msg.message_id) : undefined
        } :
        null
      });
      return null;
    }
  }
  // ACK reactions
  const ackReaction = (0, _identity.resolveAckReaction)(cfg, route.agentId);
  const removeAckAfterReply = cfg.messages?.removeAckAfterReply ?? false;
  const shouldAckReaction = () => Boolean(ackReaction &&
  (0, _ackReactions.shouldAckReaction)({
    scope: ackReactionScope,
    isDirect: !isGroup,
    isGroup,
    isMentionableGroup: isGroup,
    requireMention: Boolean(requireMention),
    canDetectMention,
    effectiveWasMentioned,
    shouldBypassMention: mentionGate.shouldBypassMention
  }));
  const api = bot.api;
  const reactionApi = typeof api.setMessageReaction === "function" ? api.setMessageReaction.bind(api) : null;
  const ackReactionPromise = shouldAckReaction() && msg.message_id && reactionApi ?
  (0, _apiLogging.withTelegramApiErrorLogging)({
    operation: "setMessageReaction",
    fn: () => reactionApi(chatId, msg.message_id, [{ type: "emoji", emoji: ackReaction }])
  }).then(() => true, (err) => {
    (0, _globals.logVerbose)(`telegram react failed for chat ${chatId}: ${String(err)}`);
    return false;
  }) :
  null;
  const replyTarget = (0, _helpers.describeReplyTarget)(msg);
  const forwardOrigin = (0, _helpers.normalizeForwardedContext)(msg);
  const replySuffix = replyTarget ?
  replyTarget.kind === "quote" ?
  `\n\n[Quoting ${replyTarget.sender}${replyTarget.id ? ` id:${replyTarget.id}` : ""}]\n"${replyTarget.body}"\n[/Quoting]` :
  `\n\n[Replying to ${replyTarget.sender}${replyTarget.id ? ` id:${replyTarget.id}` : ""}]\n${replyTarget.body}\n[/Replying]` :
  "";
  const forwardPrefix = forwardOrigin ?
  `[Forwarded from ${forwardOrigin.from}${forwardOrigin.date ? ` at ${new Date(forwardOrigin.date * 1000).toISOString()}` : ""}]\n` :
  "";
  const groupLabel = isGroup ? (0, _helpers.buildGroupLabel)(msg, chatId, resolvedThreadId) : undefined;
  const senderName = (0, _helpers.buildSenderName)(msg);
  const conversationLabel = isGroup ?
  groupLabel ?? `group:${chatId}` :
  (0, _helpers.buildSenderLabel)(msg, senderId || chatId);
  const storePath = (0, _sessions.resolveStorePath)(cfg.session?.store, {
    agentId: route.agentId
  });
  const envelopeOptions = (0, _envelope.resolveEnvelopeFormatOptions)(cfg);
  const previousTimestamp = (0, _sessions.readSessionUpdatedAt)({
    storePath,
    sessionKey: sessionKey
  });
  const body = (0, _envelope.formatInboundEnvelope)({
    channel: "Telegram",
    from: conversationLabel,
    timestamp: msg.date ? msg.date * 1000 : undefined,
    body: `${forwardPrefix}${bodyText}${replySuffix}`,
    chatType: isGroup ? "group" : "direct",
    sender: {
      name: senderName,
      username: senderUsername || undefined,
      id: senderId || undefined
    },
    previousTimestamp,
    envelope: envelopeOptions
  });
  let combinedBody = body;
  if (isGroup && historyKey && historyLimit > 0) {
    combinedBody = (0, _history.buildPendingHistoryContextFromMap)({
      historyMap: groupHistories,
      historyKey,
      limit: historyLimit,
      currentMessage: combinedBody,
      formatEntry: (entry) => (0, _envelope.formatInboundEnvelope)({
        channel: "Telegram",
        from: groupLabel ?? `group:${chatId}`,
        timestamp: entry.timestamp,
        body: `${entry.body} [id:${entry.messageId ?? "unknown"} chat:${chatId}]`,
        chatType: "group",
        senderLabel: entry.sender,
        envelope: envelopeOptions
      })
    });
  }
  const skillFilter = (0, _botAccess.firstDefined)(topicConfig?.skills, groupConfig?.skills);
  const systemPromptParts = [
  groupConfig?.systemPrompt?.trim() || null,
  topicConfig?.systemPrompt?.trim() || null].
  filter((entry) => Boolean(entry));
  const groupSystemPrompt = systemPromptParts.length > 0 ? systemPromptParts.join("\n\n") : undefined;
  const commandBody = (0, _commandsRegistry.normalizeCommandBody)(rawBody, { botUsername });
  const ctxPayload = (0, _inboundContext.finalizeInboundContext)({
    Body: combinedBody,
    RawBody: rawBody,
    CommandBody: commandBody,
    From: isGroup ? (0, _helpers.buildTelegramGroupFrom)(chatId, resolvedThreadId) : `telegram:${chatId}`,
    To: `telegram:${chatId}`,
    SessionKey: sessionKey,
    AccountId: route.accountId,
    ChatType: isGroup ? "group" : "direct",
    ConversationLabel: conversationLabel,
    GroupSubject: isGroup ? msg.chat.title ?? undefined : undefined,
    GroupSystemPrompt: isGroup ? groupSystemPrompt : undefined,
    SenderName: senderName,
    SenderId: senderId || undefined,
    SenderUsername: senderUsername || undefined,
    Provider: "telegram",
    Surface: "telegram",
    MessageSid: options?.messageIdOverride ?? String(msg.message_id),
    ReplyToId: replyTarget?.id,
    ReplyToBody: replyTarget?.body,
    ReplyToSender: replyTarget?.sender,
    ReplyToIsQuote: replyTarget?.kind === "quote" ? true : undefined,
    ForwardedFrom: forwardOrigin?.from,
    ForwardedFromType: forwardOrigin?.fromType,
    ForwardedFromId: forwardOrigin?.fromId,
    ForwardedFromUsername: forwardOrigin?.fromUsername,
    ForwardedFromTitle: forwardOrigin?.fromTitle,
    ForwardedFromSignature: forwardOrigin?.fromSignature,
    ForwardedDate: forwardOrigin?.date ? forwardOrigin.date * 1000 : undefined,
    Timestamp: msg.date ? msg.date * 1000 : undefined,
    WasMentioned: isGroup ? effectiveWasMentioned : undefined,
    // Filter out cached stickers from media - their description is already in the message body
    MediaPath: stickerCacheHit ? undefined : allMedia[0]?.path,
    MediaType: stickerCacheHit ? undefined : allMedia[0]?.contentType,
    MediaUrl: stickerCacheHit ? undefined : allMedia[0]?.path,
    MediaPaths: stickerCacheHit ?
    undefined :
    allMedia.length > 0 ?
    allMedia.map((m) => m.path) :
    undefined,
    MediaUrls: stickerCacheHit ?
    undefined :
    allMedia.length > 0 ?
    allMedia.map((m) => m.path) :
    undefined,
    MediaTypes: stickerCacheHit ?
    undefined :
    allMedia.length > 0 ?
    allMedia.map((m) => m.contentType).filter(Boolean) :
    undefined,
    Sticker: allMedia[0]?.stickerMetadata,
    ...(locationData ? (0, _location.toLocationContext)(locationData) : undefined),
    CommandAuthorized: commandAuthorized,
    // For groups: use resolved forum topic id; for DMs: use raw messageThreadId
    MessageThreadId: threadSpec.id,
    IsForum: isForum,
    // Originating channel for reply routing.
    OriginatingChannel: "telegram",
    OriginatingTo: `telegram:${chatId}`
  });
  await (0, _session.recordInboundSession)({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? sessionKey,
    ctx: ctxPayload,
    updateLastRoute: !isGroup ?
    {
      sessionKey: route.mainSessionKey,
      channel: "telegram",
      to: String(chatId),
      accountId: route.accountId
    } :
    undefined,
    onRecordError: (err) => {
      (0, _globals.logVerbose)(`telegram: failed updating session meta: ${String(err)}`);
    }
  });
  if (replyTarget && (0, _globals.shouldLogVerbose)()) {
    const preview = replyTarget.body.replace(/\s+/g, " ").slice(0, 120);
    (0, _globals.logVerbose)(`telegram reply-context: replyToId=${replyTarget.id} replyToSender=${replyTarget.sender} replyToBody="${preview}"`);
  }
  if (forwardOrigin && (0, _globals.shouldLogVerbose)()) {
    (0, _globals.logVerbose)(`telegram forward-context: forwardedFrom="${forwardOrigin.from}" type=${forwardOrigin.fromType}`);
  }
  if ((0, _globals.shouldLogVerbose)()) {
    const preview = body.slice(0, 200).replace(/\n/g, "\\n");
    const mediaInfo = allMedia.length > 1 ? ` mediaCount=${allMedia.length}` : "";
    const topicInfo = resolvedThreadId != null ? ` topic=${resolvedThreadId}` : "";
    (0, _globals.logVerbose)(`telegram inbound: chatId=${chatId} from=${ctxPayload.From} len=${body.length}${mediaInfo}${topicInfo} preview="${preview}"`);
  }
  return {
    ctxPayload,
    primaryCtx,
    msg,
    chatId,
    isGroup,
    resolvedThreadId,
    threadSpec,
    replyThreadId,
    isForum,
    historyKey,
    historyLimit,
    groupHistories,
    route,
    skillFilter,
    sendTyping,
    sendRecordVoice,
    ackReactionPromise,
    reactionApi,
    removeAckAfterReply,
    accountId: account.accountId
  };
};exports.buildTelegramMessageContext = buildTelegramMessageContext; /* v9-f267a8f6f39f9906 */
