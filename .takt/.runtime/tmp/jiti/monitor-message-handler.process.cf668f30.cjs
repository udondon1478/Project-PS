"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.processDiscordMessage = processDiscordMessage;var _carbon = require("@buape/carbon");
var _identity = require("../../agents/identity.js");
var _chunk = require("../../auto-reply/chunk.js");
var _dispatch = require("../../auto-reply/dispatch.js");
var _envelope = require("../../auto-reply/envelope.js");
var _history = require("../../auto-reply/reply/history.js");
var _inboundContext = require("../../auto-reply/reply/inbound-context.js");
var _replyDispatcher = require("../../auto-reply/reply/reply-dispatcher.js");
var _ackReactions = require("../../channels/ack-reactions.js");
var _logging = require("../../channels/logging.js");
var _replyPrefix = require("../../channels/reply-prefix.js");
var _session = require("../../channels/session.js");
var _typing = require("../../channels/typing.js");
var _markdownTables = require("../../config/markdown-tables.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
var _resolveRoute = require("../../routing/resolve-route.js");
var _sessionKey = require("../../routing/session-key.js");
var _utils = require("../../utils.js");
var _send = require("../send.js");
var _allowList = require("./allow-list.js");
var _format = require("./format.js");
var _messageUtils = require("./message-utils.js");
var _replyContext = require("./reply-context.js");
var _replyDelivery = require("./reply-delivery.js");
var _threading = require("./threading.js");
var _typing2 = require("./typing.js");
async function processDiscordMessage(ctx) {
  const { cfg, discordConfig, accountId, token, runtime, guildHistories, historyLimit, mediaMaxBytes, textLimit, replyToMode, ackReactionScope, message, author, sender, data, client, channelInfo, channelName, isGuildMessage, isDirectMessage, isGroupDm, baseText, messageText, shouldRequireMention, canDetectMention, effectiveWasMentioned, shouldBypassMention, threadChannel, threadParentId, threadParentName, threadParentType, threadName, displayChannelSlug, guildInfo, guildSlug, channelConfig, baseSessionKey, route, commandAuthorized } = ctx;
  const mediaList = await (0, _messageUtils.resolveMediaList)(message, mediaMaxBytes);
  const text = messageText;
  if (!text) {
    (0, _globals.logVerbose)(`discord: drop message ${message.id} (empty content)`);
    return;
  }
  const ackReaction = (0, _identity.resolveAckReaction)(cfg, route.agentId);
  const removeAckAfterReply = cfg.messages?.removeAckAfterReply ?? false;
  const shouldAckReaction = () => Boolean(ackReaction &&
  (0, _ackReactions.shouldAckReaction)({
    scope: ackReactionScope,
    isDirect: isDirectMessage,
    isGroup: isGuildMessage || isGroupDm,
    isMentionableGroup: isGuildMessage,
    requireMention: Boolean(shouldRequireMention),
    canDetectMention,
    effectiveWasMentioned,
    shouldBypassMention
  }));
  const ackReactionPromise = shouldAckReaction() ?
  (0, _send.reactMessageDiscord)(message.channelId, message.id, ackReaction, {
    rest: client.rest
  }).then(() => true, (err) => {
    (0, _globals.logVerbose)(`discord react failed for channel ${message.channelId}: ${String(err)}`);
    return false;
  }) :
  null;
  const fromLabel = isDirectMessage ?
  (0, _replyContext.buildDirectLabel)(author) :
  (0, _replyContext.buildGuildLabel)({
    guild: data.guild ?? undefined,
    channelName: channelName ?? message.channelId,
    channelId: message.channelId
  });
  const senderLabel = sender.label;
  const isForumParent = threadParentType === _carbon.ChannelType.GuildForum || threadParentType === _carbon.ChannelType.GuildMedia;
  const forumParentSlug = isForumParent && threadParentName ? (0, _allowList.normalizeDiscordSlug)(threadParentName) : "";
  const threadChannelId = threadChannel?.id;
  const isForumStarter = Boolean(threadChannelId && isForumParent && forumParentSlug) && message.id === threadChannelId;
  const forumContextLine = isForumStarter ? `[Forum parent: #${forumParentSlug}]` : null;
  const groupChannel = isGuildMessage && displayChannelSlug ? `#${displayChannelSlug}` : undefined;
  const groupSubject = isDirectMessage ? undefined : groupChannel;
  const channelDescription = channelInfo?.topic?.trim();
  const senderName = sender.isPluralKit ?
  sender.name ?? author.username :
  data.member?.nickname ?? author.globalName ?? author.username;
  const senderUsername = sender.isPluralKit ?
  sender.tag ?? sender.name ?? author.username :
  author.username;
  const senderTag = sender.tag;
  const systemPromptParts = [
  channelDescription ? `Channel topic: ${channelDescription}` : null,
  channelConfig?.systemPrompt?.trim() || null].
  filter((entry) => Boolean(entry));
  const groupSystemPrompt = systemPromptParts.length > 0 ? systemPromptParts.join("\n\n") : undefined;
  const storePath = (0, _sessions.resolveStorePath)(cfg.session?.store, {
    agentId: route.agentId
  });
  const envelopeOptions = (0, _envelope.resolveEnvelopeFormatOptions)(cfg);
  const previousTimestamp = (0, _sessions.readSessionUpdatedAt)({
    storePath,
    sessionKey: route.sessionKey
  });
  let combinedBody = (0, _envelope.formatInboundEnvelope)({
    channel: "Discord",
    from: fromLabel,
    timestamp: (0, _format.resolveTimestampMs)(message.timestamp),
    body: text,
    chatType: isDirectMessage ? "direct" : "channel",
    senderLabel,
    previousTimestamp,
    envelope: envelopeOptions
  });
  const shouldIncludeChannelHistory = !isDirectMessage && !(isGuildMessage && channelConfig?.autoThread && !threadChannel);
  if (shouldIncludeChannelHistory) {
    combinedBody = (0, _history.buildPendingHistoryContextFromMap)({
      historyMap: guildHistories,
      historyKey: message.channelId,
      limit: historyLimit,
      currentMessage: combinedBody,
      formatEntry: (entry) => (0, _envelope.formatInboundEnvelope)({
        channel: "Discord",
        from: fromLabel,
        timestamp: entry.timestamp,
        body: `${entry.body} [id:${entry.messageId ?? "unknown"} channel:${message.channelId}]`,
        chatType: "channel",
        senderLabel: entry.sender,
        envelope: envelopeOptions
      })
    });
  }
  const replyContext = (0, _replyContext.resolveReplyContext)(message, _messageUtils.resolveDiscordMessageText, {
    envelope: envelopeOptions
  });
  if (replyContext) {
    combinedBody = `[Replied message - for context]\n${replyContext}\n\n${combinedBody}`;
  }
  if (forumContextLine) {
    combinedBody = `${combinedBody}\n${forumContextLine}`;
  }
  let threadStarterBody;
  let threadLabel;
  let parentSessionKey;
  if (threadChannel) {
    const starter = await (0, _threading.resolveDiscordThreadStarter)({
      channel: threadChannel,
      client,
      parentId: threadParentId,
      parentType: threadParentType,
      resolveTimestampMs: _format.resolveTimestampMs
    });
    if (starter?.text) {
      const starterEnvelope = (0, _envelope.formatThreadStarterEnvelope)({
        channel: "Discord",
        author: starter.author,
        timestamp: starter.timestamp,
        body: starter.text,
        envelope: envelopeOptions
      });
      threadStarterBody = starterEnvelope;
    }
    const parentName = threadParentName ?? "parent";
    threadLabel = threadName ?
    `Discord thread #${(0, _allowList.normalizeDiscordSlug)(parentName)} › ${threadName}` :
    `Discord thread #${(0, _allowList.normalizeDiscordSlug)(parentName)}`;
    if (threadParentId) {
      parentSessionKey = (0, _resolveRoute.buildAgentSessionKey)({
        agentId: route.agentId,
        channel: route.channel,
        peer: { kind: "channel", id: threadParentId }
      });
    }
  }
  const mediaPayload = (0, _messageUtils.buildDiscordMediaPayload)(mediaList);
  const threadKeys = (0, _sessionKey.resolveThreadSessionKeys)({
    baseSessionKey,
    threadId: threadChannel ? message.channelId : undefined,
    parentSessionKey,
    useSuffix: false
  });
  const replyPlan = await (0, _threading.resolveDiscordAutoThreadReplyPlan)({
    client,
    message,
    isGuildMessage,
    channelConfig,
    threadChannel,
    baseText: baseText ?? "",
    combinedBody,
    replyToMode,
    agentId: route.agentId,
    channel: route.channel
  });
  const deliverTarget = replyPlan.deliverTarget;
  const replyTarget = replyPlan.replyTarget;
  const replyReference = replyPlan.replyReference;
  const autoThreadContext = replyPlan.autoThreadContext;
  const effectiveFrom = isDirectMessage ?
  `discord:${author.id}` :
  autoThreadContext?.From ?? `discord:channel:${message.channelId}`;
  const effectiveTo = autoThreadContext?.To ?? replyTarget;
  if (!effectiveTo) {
    runtime.error?.((0, _globals.danger)("discord: missing reply target"));
    return;
  }
  const ctxPayload = (0, _inboundContext.finalizeInboundContext)({
    Body: combinedBody,
    RawBody: baseText,
    CommandBody: baseText,
    From: effectiveFrom,
    To: effectiveTo,
    SessionKey: autoThreadContext?.SessionKey ?? threadKeys.sessionKey,
    AccountId: route.accountId,
    ChatType: isDirectMessage ? "direct" : "channel",
    ConversationLabel: fromLabel,
    SenderName: senderName,
    SenderId: sender.id,
    SenderUsername: senderUsername,
    SenderTag: senderTag,
    GroupSubject: groupSubject,
    GroupChannel: groupChannel,
    GroupSystemPrompt: isGuildMessage ? groupSystemPrompt : undefined,
    GroupSpace: isGuildMessage ? (guildInfo?.id ?? guildSlug) || undefined : undefined,
    Provider: "discord",
    Surface: "discord",
    WasMentioned: effectiveWasMentioned,
    MessageSid: message.id,
    ParentSessionKey: autoThreadContext?.ParentSessionKey ?? threadKeys.parentSessionKey,
    ThreadStarterBody: threadStarterBody,
    ThreadLabel: threadLabel,
    Timestamp: (0, _format.resolveTimestampMs)(message.timestamp),
    ...mediaPayload,
    CommandAuthorized: commandAuthorized,
    CommandSource: "text",
    // Originating channel for reply routing.
    OriginatingChannel: "discord",
    OriginatingTo: autoThreadContext?.OriginatingTo ?? replyTarget
  });
  await (0, _session.recordInboundSession)({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
    ctx: ctxPayload,
    updateLastRoute: isDirectMessage ?
    {
      sessionKey: route.mainSessionKey,
      channel: "discord",
      to: `user:${author.id}`,
      accountId: route.accountId
    } :
    undefined,
    onRecordError: (err) => {
      (0, _globals.logVerbose)(`discord: failed updating session meta: ${String(err)}`);
    }
  });
  if ((0, _globals.shouldLogVerbose)()) {
    const preview = (0, _utils.truncateUtf16Safe)(combinedBody, 200).replace(/\n/g, "\\n");
    (0, _globals.logVerbose)(`discord inbound: channel=${message.channelId} deliver=${deliverTarget} from=${ctxPayload.From} preview="${preview}"`);
  }
  const typingChannelId = deliverTarget.startsWith("channel:") ?
  deliverTarget.slice("channel:".length) :
  message.channelId;
  const prefixContext = (0, _replyPrefix.createReplyPrefixContext)({ cfg, agentId: route.agentId });
  const tableMode = (0, _markdownTables.resolveMarkdownTableMode)({
    cfg,
    channel: "discord",
    accountId
  });
  const { dispatcher, replyOptions, markDispatchIdle } = (0, _replyDispatcher.createReplyDispatcherWithTyping)({
    responsePrefix: prefixContext.responsePrefix,
    responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
    humanDelay: (0, _identity.resolveHumanDelayConfig)(cfg, route.agentId),
    deliver: async (payload) => {
      const replyToId = replyReference.use();
      await (0, _replyDelivery.deliverDiscordReply)({
        replies: [payload],
        target: deliverTarget,
        token,
        accountId,
        rest: client.rest,
        runtime,
        replyToId,
        textLimit,
        maxLinesPerMessage: discordConfig?.maxLinesPerMessage,
        tableMode,
        chunkMode: (0, _chunk.resolveChunkMode)(cfg, "discord", accountId)
      });
      replyReference.markSent();
    },
    onError: (err, info) => {
      runtime.error?.((0, _globals.danger)(`discord ${info.kind} reply failed: ${String(err)}`));
    },
    onReplyStart: (0, _typing.createTypingCallbacks)({
      start: () => (0, _typing2.sendTyping)({ client, channelId: typingChannelId }),
      onStartError: (err) => {
        (0, _logging.logTypingFailure)({
          log: _globals.logVerbose,
          channel: "discord",
          target: typingChannelId,
          error: err
        });
      }
    }).onReplyStart
  });
  const { queuedFinal, counts } = await (0, _dispatch.dispatchInboundMessage)({
    ctx: ctxPayload,
    cfg,
    dispatcher,
    replyOptions: {
      ...replyOptions,
      skillFilter: channelConfig?.skills,
      disableBlockStreaming: typeof discordConfig?.blockStreaming === "boolean" ?
      !discordConfig.blockStreaming :
      undefined,
      onModelSelected: (ctx) => {
        prefixContext.onModelSelected(ctx);
      }
    }
  });
  markDispatchIdle();
  if (!queuedFinal) {
    if (isGuildMessage) {
      (0, _history.clearHistoryEntriesIfEnabled)({
        historyMap: guildHistories,
        historyKey: message.channelId,
        limit: historyLimit
      });
    }
    return;
  }
  if ((0, _globals.shouldLogVerbose)()) {
    const finalCount = counts.final;
    (0, _globals.logVerbose)(`discord: delivered ${finalCount} reply${finalCount === 1 ? "" : "ies"} to ${replyTarget}`);
  }
  (0, _ackReactions.removeAckReactionAfterReply)({
    removeAfterReply: removeAckAfterReply,
    ackReactionPromise,
    ackReactionValue: ackReaction,
    remove: async () => {
      await (0, _send.removeReactionDiscord)(message.channelId, message.id, ackReaction, {
        rest: client.rest
      });
    },
    onError: (err) => {
      (0, _logging.logAckFailure)({
        log: _globals.logVerbose,
        channel: "discord",
        target: `${message.channelId}/${message.id}`,
        error: err
      });
    }
  });
  if (isGuildMessage) {
    (0, _history.clearHistoryEntriesIfEnabled)({
      historyMap: guildHistories,
      historyKey: message.channelId,
      limit: historyLimit
    });
  }
} /* v9-1327556dc7a902a4 */
