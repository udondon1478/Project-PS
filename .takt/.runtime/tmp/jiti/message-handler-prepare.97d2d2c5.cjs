"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.prepareSlackMessage = prepareSlackMessage;var _identity = require("../../../agents/identity.js");
var _commandDetection = require("../../../auto-reply/command-detection.js");
var _commandsRegistry = require("../../../auto-reply/commands-registry.js");
var _envelope = require("../../../auto-reply/envelope.js");
var _history = require("../../../auto-reply/reply/history.js");
var _inboundContext = require("../../../auto-reply/reply/inbound-context.js");
var _mentions = require("../../../auto-reply/reply/mentions.js");
var _ackReactions = require("../../../channels/ack-reactions.js");
var _allowlistMatch = require("../../../channels/allowlist-match.js");
var _commandGating = require("../../../channels/command-gating.js");
var _conversationLabel = require("../../../channels/conversation-label.js");
var _logging = require("../../../channels/logging.js");
var _mentionGating = require("../../../channels/mention-gating.js");
var _session = require("../../../channels/session.js");
var _sessions = require("../../../config/sessions.js");
var _globals = require("../../../globals.js");
var _systemEvents = require("../../../infra/system-events.js");
var _pairingMessages = require("../../../pairing/pairing-messages.js");
var _pairingStore = require("../../../pairing/pairing-store.js");
var _resolveRoute = require("../../../routing/resolve-route.js");
var _sessionKey = require("../../../routing/session-key.js");
var _actions = require("../../actions.js");
var _send = require("../../send.js");
var _threading = require("../../threading.js");
var _allowList = require("../allow-list.js");
var _auth = require("../auth.js");
var _channelConfig = require("../channel-config.js");
var _context = require("../context.js");
var _media = require("../media.js");
async function prepareSlackMessage(params) {
  const { ctx, account, message, opts } = params;
  const cfg = ctx.cfg;
  let channelInfo = {};
  let channelType = message.channel_type;
  if (!channelType || channelType !== "im") {
    channelInfo = await ctx.resolveChannelName(message.channel);
    channelType = channelType ?? channelInfo.type;
  }
  const channelName = channelInfo?.name;
  const resolvedChannelType = (0, _context.normalizeSlackChannelType)(channelType, message.channel);
  const isDirectMessage = resolvedChannelType === "im";
  const isGroupDm = resolvedChannelType === "mpim";
  const isRoom = resolvedChannelType === "channel" || resolvedChannelType === "group";
  const isRoomish = isRoom || isGroupDm;
  const channelConfig = isRoom ?
  (0, _channelConfig.resolveSlackChannelConfig)({
    channelId: message.channel,
    channelName,
    channels: ctx.channelsConfig,
    defaultRequireMention: ctx.defaultRequireMention
  }) :
  null;
  const allowBots = channelConfig?.allowBots ??
  account.config?.allowBots ??
  cfg.channels?.slack?.allowBots ??
  false;
  const isBotMessage = Boolean(message.bot_id);
  if (isBotMessage) {
    if (message.user && ctx.botUserId && message.user === ctx.botUserId) {
      return null;
    }
    if (!allowBots) {
      (0, _globals.logVerbose)(`slack: drop bot message ${message.bot_id ?? "unknown"} (allowBots=false)`);
      return null;
    }
  }
  if (isDirectMessage && !message.user) {
    (0, _globals.logVerbose)("slack: drop dm message (missing user id)");
    return null;
  }
  const senderId = message.user ?? (isBotMessage ? message.bot_id : undefined);
  if (!senderId) {
    (0, _globals.logVerbose)("slack: drop message (missing sender id)");
    return null;
  }
  if (!ctx.isChannelAllowed({
    channelId: message.channel,
    channelName,
    channelType: resolvedChannelType
  })) {
    (0, _globals.logVerbose)("slack: drop message (channel not allowed)");
    return null;
  }
  const { allowFromLower } = await (0, _auth.resolveSlackEffectiveAllowFrom)(ctx);
  if (isDirectMessage) {
    const directUserId = message.user;
    if (!directUserId) {
      (0, _globals.logVerbose)("slack: drop dm message (missing user id)");
      return null;
    }
    if (!ctx.dmEnabled || ctx.dmPolicy === "disabled") {
      (0, _globals.logVerbose)("slack: drop dm (dms disabled)");
      return null;
    }
    if (ctx.dmPolicy !== "open") {
      const allowMatch = (0, _allowList.resolveSlackAllowListMatch)({
        allowList: allowFromLower,
        id: directUserId
      });
      const allowMatchMeta = (0, _allowlistMatch.formatAllowlistMatchMeta)(allowMatch);
      if (!allowMatch.allowed) {
        if (ctx.dmPolicy === "pairing") {
          const sender = await ctx.resolveUserName(directUserId);
          const senderName = sender?.name ?? undefined;
          const { code, created } = await (0, _pairingStore.upsertChannelPairingRequest)({
            channel: "slack",
            id: directUserId,
            meta: { name: senderName }
          });
          if (created) {
            (0, _globals.logVerbose)(`slack pairing request sender=${directUserId} name=${senderName ?? "unknown"} (${allowMatchMeta})`);
            try {
              await (0, _send.sendMessageSlack)(message.channel, (0, _pairingMessages.buildPairingReply)({
                channel: "slack",
                idLine: `Your Slack user id: ${directUserId}`,
                code
              }), {
                token: ctx.botToken,
                client: ctx.app.client,
                accountId: account.accountId
              });
            }
            catch (err) {
              (0, _globals.logVerbose)(`slack pairing reply failed for ${message.user}: ${String(err)}`);
            }
          }
        } else
        {
          (0, _globals.logVerbose)(`Blocked unauthorized slack sender ${message.user} (dmPolicy=${ctx.dmPolicy}, ${allowMatchMeta})`);
        }
        return null;
      }
    }
  }
  const route = (0, _resolveRoute.resolveAgentRoute)({
    cfg,
    channel: "slack",
    accountId: account.accountId,
    teamId: ctx.teamId || undefined,
    peer: {
      kind: isDirectMessage ? "dm" : isRoom ? "channel" : "group",
      id: isDirectMessage ? message.user ?? "unknown" : message.channel
    }
  });
  const baseSessionKey = route.sessionKey;
  const threadContext = (0, _threading.resolveSlackThreadContext)({ message, replyToMode: ctx.replyToMode });
  const threadTs = threadContext.incomingThreadTs;
  const isThreadReply = threadContext.isThreadReply;
  const threadKeys = (0, _sessionKey.resolveThreadSessionKeys)({
    baseSessionKey,
    threadId: isThreadReply ? threadTs : undefined,
    parentSessionKey: isThreadReply && ctx.threadInheritParent ? baseSessionKey : undefined
  });
  const sessionKey = threadKeys.sessionKey;
  const historyKey = isThreadReply && ctx.threadHistoryScope === "thread" ? sessionKey : message.channel;
  const mentionRegexes = (0, _mentions.buildMentionRegexes)(cfg, route.agentId);
  const hasAnyMention = /<@[^>]+>/.test(message.text ?? "");
  const explicitlyMentioned = Boolean(ctx.botUserId && message.text?.includes(`<@${ctx.botUserId}>`));
  const wasMentioned = opts.wasMentioned ?? (
  !isDirectMessage &&
  (0, _mentions.matchesMentionWithExplicit)({
    text: message.text ?? "",
    mentionRegexes,
    explicit: {
      hasAnyMention,
      isExplicitlyMentioned: explicitlyMentioned,
      canResolveExplicit: Boolean(ctx.botUserId)
    }
  }));
  const implicitMention = Boolean(!isDirectMessage &&
  ctx.botUserId &&
  message.thread_ts &&
  message.parent_user_id === ctx.botUserId);
  const sender = message.user ? await ctx.resolveUserName(message.user) : null;
  const senderName = sender?.name ?? message.username?.trim() ?? message.user ?? message.bot_id ?? "unknown";
  const channelUserAuthorized = isRoom ?
  (0, _allowList.resolveSlackUserAllowed)({
    allowList: channelConfig?.users,
    userId: senderId,
    userName: senderName
  }) :
  true;
  if (isRoom && !channelUserAuthorized) {
    (0, _globals.logVerbose)(`Blocked unauthorized slack sender ${senderId} (not in channel users)`);
    return null;
  }
  const allowTextCommands = (0, _commandsRegistry.shouldHandleTextCommands)({
    cfg,
    surface: "slack"
  });
  const hasControlCommandInMessage = (0, _commandDetection.hasControlCommand)(message.text ?? "", cfg);
  const ownerAuthorized = (0, _allowList.resolveSlackAllowListMatch)({
    allowList: allowFromLower,
    id: senderId,
    name: senderName
  }).allowed;
  const channelUsersAllowlistConfigured = isRoom && Array.isArray(channelConfig?.users) && channelConfig.users.length > 0;
  const channelCommandAuthorized = isRoom && channelUsersAllowlistConfigured ?
  (0, _allowList.resolveSlackUserAllowed)({
    allowList: channelConfig?.users,
    userId: senderId,
    userName: senderName
  }) :
  false;
  const commandGate = (0, _commandGating.resolveControlCommandGate)({
    useAccessGroups: ctx.useAccessGroups,
    authorizers: [
    { configured: allowFromLower.length > 0, allowed: ownerAuthorized },
    { configured: channelUsersAllowlistConfigured, allowed: channelCommandAuthorized }],

    allowTextCommands,
    hasControlCommand: hasControlCommandInMessage
  });
  const commandAuthorized = commandGate.commandAuthorized;
  if (isRoomish && commandGate.shouldBlock) {
    (0, _logging.logInboundDrop)({
      log: _globals.logVerbose,
      channel: "slack",
      reason: "control command (unauthorized)",
      target: senderId
    });
    return null;
  }
  const shouldRequireMention = isRoom ?
  channelConfig?.requireMention ?? ctx.defaultRequireMention :
  false;
  // Allow "control commands" to bypass mention gating if sender is authorized.
  const canDetectMention = Boolean(ctx.botUserId) || mentionRegexes.length > 0;
  const mentionGate = (0, _mentionGating.resolveMentionGatingWithBypass)({
    isGroup: isRoom,
    requireMention: Boolean(shouldRequireMention),
    canDetectMention,
    wasMentioned,
    implicitMention,
    hasAnyMention,
    allowTextCommands,
    hasControlCommand: hasControlCommandInMessage,
    commandAuthorized
  });
  const effectiveWasMentioned = mentionGate.effectiveWasMentioned;
  if (isRoom && shouldRequireMention && mentionGate.shouldSkip) {
    ctx.logger.info({ channel: message.channel, reason: "no-mention" }, "skipping channel message");
    const pendingText = (message.text ?? "").trim();
    const fallbackFile = message.files?.[0]?.name ?
    `[Slack file: ${message.files[0].name}]` :
    message.files?.length ?
    "[Slack file]" :
    "";
    const pendingBody = pendingText || fallbackFile;
    (0, _history.recordPendingHistoryEntryIfEnabled)({
      historyMap: ctx.channelHistories,
      historyKey,
      limit: ctx.historyLimit,
      entry: pendingBody ?
      {
        sender: senderName,
        body: pendingBody,
        timestamp: message.ts ? Math.round(Number(message.ts) * 1000) : undefined,
        messageId: message.ts
      } :
      null
    });
    return null;
  }
  const media = await (0, _media.resolveSlackMedia)({
    files: message.files,
    token: ctx.botToken,
    maxBytes: ctx.mediaMaxBytes
  });
  const rawBody = (message.text ?? "").trim() || media?.placeholder || "";
  if (!rawBody) {
    return null;
  }
  const ackReaction = (0, _identity.resolveAckReaction)(cfg, route.agentId);
  const ackReactionValue = ackReaction ?? "";
  const shouldAckReaction = () => Boolean(ackReaction &&
  (0, _ackReactions.shouldAckReaction)({
    scope: ctx.ackReactionScope,
    isDirect: isDirectMessage,
    isGroup: isRoomish,
    isMentionableGroup: isRoom,
    requireMention: Boolean(shouldRequireMention),
    canDetectMention,
    effectiveWasMentioned,
    shouldBypassMention: mentionGate.shouldBypassMention
  }));
  const ackReactionMessageTs = message.ts;
  const ackReactionPromise = shouldAckReaction() && ackReactionMessageTs && ackReactionValue ?
  (0, _actions.reactSlackMessage)(message.channel, ackReactionMessageTs, ackReactionValue, {
    token: ctx.botToken,
    client: ctx.app.client
  }).then(() => true, (err) => {
    (0, _globals.logVerbose)(`slack react failed for channel ${message.channel}: ${String(err)}`);
    return false;
  }) :
  null;
  const roomLabel = channelName ? `#${channelName}` : `#${message.channel}`;
  const preview = rawBody.replace(/\s+/g, " ").slice(0, 160);
  const inboundLabel = isDirectMessage ?
  `Slack DM from ${senderName}` :
  `Slack message in ${roomLabel} from ${senderName}`;
  const slackFrom = isDirectMessage ?
  `slack:${message.user}` :
  isRoom ?
  `slack:channel:${message.channel}` :
  `slack:group:${message.channel}`;
  (0, _systemEvents.enqueueSystemEvent)(`${inboundLabel}: ${preview}`, {
    sessionKey,
    contextKey: `slack:message:${message.channel}:${message.ts ?? "unknown"}`
  });
  const envelopeFrom = (0, _conversationLabel.resolveConversationLabel)({
    ChatType: isDirectMessage ? "direct" : "channel",
    SenderName: senderName,
    GroupSubject: isRoomish ? roomLabel : undefined,
    From: slackFrom
  }) ?? (isDirectMessage ? senderName : roomLabel);
  const textWithId = `${rawBody}\n[slack message id: ${message.ts} channel: ${message.channel}]`;
  const storePath = (0, _sessions.resolveStorePath)(ctx.cfg.session?.store, {
    agentId: route.agentId
  });
  const envelopeOptions = (0, _envelope.resolveEnvelopeFormatOptions)(ctx.cfg);
  const previousTimestamp = (0, _sessions.readSessionUpdatedAt)({
    storePath,
    sessionKey: route.sessionKey
  });
  const body = (0, _envelope.formatInboundEnvelope)({
    channel: "Slack",
    from: envelopeFrom,
    timestamp: message.ts ? Math.round(Number(message.ts) * 1000) : undefined,
    body: textWithId,
    chatType: isDirectMessage ? "direct" : "channel",
    sender: { name: senderName, id: senderId },
    previousTimestamp,
    envelope: envelopeOptions
  });
  let combinedBody = body;
  if (isRoomish && ctx.historyLimit > 0) {
    combinedBody = (0, _history.buildPendingHistoryContextFromMap)({
      historyMap: ctx.channelHistories,
      historyKey,
      limit: ctx.historyLimit,
      currentMessage: combinedBody,
      formatEntry: (entry) => (0, _envelope.formatInboundEnvelope)({
        channel: "Slack",
        from: roomLabel,
        timestamp: entry.timestamp,
        body: `${entry.body}${entry.messageId ? ` [id:${entry.messageId} channel:${message.channel}]` : ""}`,
        chatType: "channel",
        senderLabel: entry.sender,
        envelope: envelopeOptions
      })
    });
  }
  const slackTo = isDirectMessage ? `user:${message.user}` : `channel:${message.channel}`;
  const channelDescription = [channelInfo?.topic, channelInfo?.purpose].
  map((entry) => entry?.trim()).
  filter((entry) => Boolean(entry)).
  filter((entry, index, list) => list.indexOf(entry) === index).
  join("\n");
  const systemPromptParts = [
  channelDescription ? `Channel description: ${channelDescription}` : null,
  channelConfig?.systemPrompt?.trim() || null].
  filter((entry) => Boolean(entry));
  const groupSystemPrompt = systemPromptParts.length > 0 ? systemPromptParts.join("\n\n") : undefined;
  let threadStarterBody;
  let threadLabel;
  let threadStarterMedia = null;
  if (isThreadReply && threadTs) {
    const starter = await (0, _media.resolveSlackThreadStarter)({
      channelId: message.channel,
      threadTs,
      client: ctx.app.client
    });
    if (starter?.text) {
      const starterUser = starter.userId ? await ctx.resolveUserName(starter.userId) : null;
      const starterName = starterUser?.name ?? starter.userId ?? "Unknown";
      const starterWithId = `${starter.text}\n[slack message id: ${starter.ts ?? threadTs} channel: ${message.channel}]`;
      threadStarterBody = (0, _envelope.formatThreadStarterEnvelope)({
        channel: "Slack",
        author: starterName,
        timestamp: starter.ts ? Math.round(Number(starter.ts) * 1000) : undefined,
        body: starterWithId,
        envelope: envelopeOptions
      });
      const snippet = starter.text.replace(/\s+/g, " ").slice(0, 80);
      threadLabel = `Slack thread ${roomLabel}${snippet ? `: ${snippet}` : ""}`;
      // If current message has no files but thread starter does, fetch starter's files
      if (!media && starter.files && starter.files.length > 0) {
        threadStarterMedia = await (0, _media.resolveSlackMedia)({
          files: starter.files,
          token: ctx.botToken,
          maxBytes: ctx.mediaMaxBytes
        });
        if (threadStarterMedia) {
          (0, _globals.logVerbose)(`slack: hydrated thread starter file ${threadStarterMedia.placeholder} from root message`);
        }
      }
    } else
    {
      threadLabel = `Slack thread ${roomLabel}`;
    }
  }
  // Use thread starter media if current message has none
  const effectiveMedia = media ?? threadStarterMedia;
  const ctxPayload = (0, _inboundContext.finalizeInboundContext)({
    Body: combinedBody,
    RawBody: rawBody,
    CommandBody: rawBody,
    From: slackFrom,
    To: slackTo,
    SessionKey: sessionKey,
    AccountId: route.accountId,
    ChatType: isDirectMessage ? "direct" : "channel",
    ConversationLabel: envelopeFrom,
    GroupSubject: isRoomish ? roomLabel : undefined,
    GroupSystemPrompt: isRoomish ? groupSystemPrompt : undefined,
    SenderName: senderName,
    SenderId: senderId,
    Provider: "slack",
    Surface: "slack",
    MessageSid: message.ts,
    ReplyToId: threadContext.replyToId,
    // Preserve thread context for routed tool notifications.
    MessageThreadId: threadContext.messageThreadId,
    ParentSessionKey: threadKeys.parentSessionKey,
    ThreadStarterBody: threadStarterBody,
    ThreadLabel: threadLabel,
    Timestamp: message.ts ? Math.round(Number(message.ts) * 1000) : undefined,
    WasMentioned: isRoomish ? effectiveWasMentioned : undefined,
    MediaPath: effectiveMedia?.path,
    MediaType: effectiveMedia?.contentType,
    MediaUrl: effectiveMedia?.path,
    CommandAuthorized: commandAuthorized,
    OriginatingChannel: "slack",
    OriginatingTo: slackTo
  });
  await (0, _session.recordInboundSession)({
    storePath,
    sessionKey,
    ctx: ctxPayload,
    updateLastRoute: isDirectMessage ?
    {
      sessionKey: route.mainSessionKey,
      channel: "slack",
      to: `user:${message.user}`,
      accountId: route.accountId
    } :
    undefined,
    onRecordError: (err) => {
      ctx.logger.warn({
        error: String(err),
        storePath,
        sessionKey
      }, "failed updating session meta");
    }
  });
  const replyTarget = ctxPayload.To ?? undefined;
  if (!replyTarget) {
    return null;
  }
  if ((0, _globals.shouldLogVerbose)()) {
    (0, _globals.logVerbose)(`slack inbound: channel=${message.channel} from=${slackFrom} preview="${preview}"`);
  }
  return {
    ctx,
    account,
    message,
    route,
    channelConfig,
    replyTarget,
    ctxPayload,
    isDirectMessage,
    isRoomish,
    historyKey,
    preview,
    ackReactionMessageTs,
    ackReactionValue,
    ackReactionPromise
  };
} /* v9-0333a39fb0a484de */
