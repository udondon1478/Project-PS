"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.preflightDiscordMessage = preflightDiscordMessage;var _carbon = require("@buape/carbon");
var _commandDetection = require("../../auto-reply/command-detection.js");
var _commandsRegistry = require("../../auto-reply/commands-registry.js");
var _history = require("../../auto-reply/reply/history.js");
var _mentions = require("../../auto-reply/reply/mentions.js");
var _allowlistMatch = require("../../channels/allowlist-match.js");
var _commandGating = require("../../channels/command-gating.js");
var _logging = require("../../channels/logging.js");
var _mentionGating = require("../../channels/mention-gating.js");
var _globals = require("../../globals.js");
var _channelActivity = require("../../infra/channel-activity.js");
var _systemEvents = require("../../infra/system-events.js");
var _logging2 = require("../../logging.js");
var _pairingMessages = require("../../pairing/pairing-messages.js");
var _pairingStore = require("../../pairing/pairing-store.js");
var _resolveRoute = require("../../routing/resolve-route.js");
var _pluralkit = require("../pluralkit.js");
var _send = require("../send.js");
var _allowList = require("./allow-list.js");
var _format = require("./format.js");
var _messageUtils = require("./message-utils.js");
var _senderIdentity = require("./sender-identity.js");
var _systemEvents2 = require("./system-events.js");
var _threading = require("./threading.js");
async function preflightDiscordMessage(params) {
  const logger = (0, _logging2.getChildLogger)({ module: "discord-auto-reply" });
  const message = params.data.message;
  const author = params.data.author;
  if (!author) {
    return null;
  }
  const allowBots = params.discordConfig?.allowBots ?? false;
  if (params.botUserId && author.id === params.botUserId) {
    // Always ignore own messages to prevent self-reply loops
    return null;
  }
  const pluralkitConfig = params.discordConfig?.pluralkit;
  const webhookId = (0, _senderIdentity.resolveDiscordWebhookId)(message);
  const shouldCheckPluralKit = Boolean(pluralkitConfig?.enabled) && !webhookId;
  let pluralkitInfo = null;
  if (shouldCheckPluralKit) {
    try {
      pluralkitInfo = await (0, _pluralkit.fetchPluralKitMessageInfo)({
        messageId: message.id,
        config: pluralkitConfig
      });
    }
    catch (err) {
      (0, _globals.logVerbose)(`discord: pluralkit lookup failed for ${message.id}: ${String(err)}`);
    }
  }
  const sender = (0, _senderIdentity.resolveDiscordSenderIdentity)({
    author,
    member: params.data.member,
    pluralkitInfo
  });
  if (author.bot) {
    if (!allowBots && !sender.isPluralKit) {
      (0, _globals.logVerbose)("discord: drop bot message (allowBots=false)");
      return null;
    }
  }
  const isGuildMessage = Boolean(params.data.guild_id);
  const channelInfo = await (0, _messageUtils.resolveDiscordChannelInfo)(params.client, message.channelId);
  const isDirectMessage = channelInfo?.type === _carbon.ChannelType.DM;
  const isGroupDm = channelInfo?.type === _carbon.ChannelType.GroupDM;
  if (isGroupDm && !params.groupDmEnabled) {
    (0, _globals.logVerbose)("discord: drop group dm (group dms disabled)");
    return null;
  }
  if (isDirectMessage && !params.dmEnabled) {
    (0, _globals.logVerbose)("discord: drop dm (dms disabled)");
    return null;
  }
  const dmPolicy = params.discordConfig?.dm?.policy ?? "pairing";
  let commandAuthorized = true;
  if (isDirectMessage) {
    if (dmPolicy === "disabled") {
      (0, _globals.logVerbose)("discord: drop dm (dmPolicy: disabled)");
      return null;
    }
    if (dmPolicy !== "open") {
      const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("discord").catch(() => []);
      const effectiveAllowFrom = [...(params.allowFrom ?? []), ...storeAllowFrom];
      const allowList = (0, _allowList.normalizeDiscordAllowList)(effectiveAllowFrom, ["discord:", "user:", "pk:"]);
      const allowMatch = allowList ?
      (0, _allowList.resolveDiscordAllowListMatch)({
        allowList,
        candidate: {
          id: sender.id,
          name: sender.name,
          tag: sender.tag
        }
      }) :
      { allowed: false };
      const allowMatchMeta = (0, _allowlistMatch.formatAllowlistMatchMeta)(allowMatch);
      const permitted = allowMatch.allowed;
      if (!permitted) {
        commandAuthorized = false;
        if (dmPolicy === "pairing") {
          const { code, created } = await (0, _pairingStore.upsertChannelPairingRequest)({
            channel: "discord",
            id: author.id,
            meta: {
              tag: (0, _format.formatDiscordUserTag)(author),
              name: author.username ?? undefined
            }
          });
          if (created) {
            (0, _globals.logVerbose)(`discord pairing request sender=${author.id} tag=${(0, _format.formatDiscordUserTag)(author)} (${allowMatchMeta})`);
            try {
              await (0, _send.sendMessageDiscord)(`user:${author.id}`, (0, _pairingMessages.buildPairingReply)({
                channel: "discord",
                idLine: `Your Discord user id: ${author.id}`,
                code
              }), {
                token: params.token,
                rest: params.client.rest,
                accountId: params.accountId
              });
            }
            catch (err) {
              (0, _globals.logVerbose)(`discord pairing reply failed for ${author.id}: ${String(err)}`);
            }
          }
        } else
        {
          (0, _globals.logVerbose)(`Blocked unauthorized discord sender ${sender.id} (dmPolicy=${dmPolicy}, ${allowMatchMeta})`);
        }
        return null;
      }
      commandAuthorized = true;
    }
  }
  const botId = params.botUserId;
  const baseText = (0, _messageUtils.resolveDiscordMessageText)(message, {
    includeForwarded: false
  });
  const messageText = (0, _messageUtils.resolveDiscordMessageText)(message, {
    includeForwarded: true
  });
  (0, _channelActivity.recordChannelActivity)({
    channel: "discord",
    accountId: params.accountId,
    direction: "inbound"
  });
  // Resolve thread parent early for binding inheritance
  const channelName = channelInfo?.name ?? (
  (isGuildMessage || isGroupDm) && message.channel && "name" in message.channel ?
  message.channel.name :
  undefined);
  const earlyThreadChannel = (0, _threading.resolveDiscordThreadChannel)({
    isGuildMessage,
    message,
    channelInfo
  });
  let earlyThreadParentId;
  let earlyThreadParentName;
  let earlyThreadParentType;
  if (earlyThreadChannel) {
    const parentInfo = await (0, _threading.resolveDiscordThreadParentInfo)({
      client: params.client,
      threadChannel: earlyThreadChannel,
      channelInfo
    });
    earlyThreadParentId = parentInfo.id;
    earlyThreadParentName = parentInfo.name;
    earlyThreadParentType = parentInfo.type;
  }
  const route = (0, _resolveRoute.resolveAgentRoute)({
    cfg: params.cfg,
    channel: "discord",
    accountId: params.accountId,
    guildId: params.data.guild_id ?? undefined,
    peer: {
      kind: isDirectMessage ? "dm" : isGroupDm ? "group" : "channel",
      id: isDirectMessage ? author.id : message.channelId
    },
    // Pass parent peer for thread binding inheritance
    parentPeer: earlyThreadParentId ? { kind: "channel", id: earlyThreadParentId } : undefined
  });
  const mentionRegexes = (0, _mentions.buildMentionRegexes)(params.cfg, route.agentId);
  const explicitlyMentioned = Boolean(botId && message.mentionedUsers?.some((user) => user.id === botId));
  const hasAnyMention = Boolean(!isDirectMessage && (
  message.mentionedEveryone ||
  (message.mentionedUsers?.length ?? 0) > 0 ||
  (message.mentionedRoles?.length ?? 0) > 0));
  const wasMentioned = !isDirectMessage &&
  (0, _mentions.matchesMentionWithExplicit)({
    text: baseText,
    mentionRegexes,
    explicit: {
      hasAnyMention,
      isExplicitlyMentioned: explicitlyMentioned,
      canResolveExplicit: Boolean(botId)
    }
  });
  const implicitMention = Boolean(!isDirectMessage &&
  botId &&
  message.referencedMessage?.author?.id &&
  message.referencedMessage.author.id === botId);
  if ((0, _globals.shouldLogVerbose)()) {
    (0, _globals.logVerbose)(`discord: inbound id=${message.id} guild=${message.guild?.id ?? "dm"} channel=${message.channelId} mention=${wasMentioned ? "yes" : "no"} type=${isDirectMessage ? "dm" : isGroupDm ? "group-dm" : "guild"} content=${messageText ? "yes" : "no"}`);
  }
  if (isGuildMessage && (
  message.type === _carbon.MessageType.ChatInputCommand ||
  message.type === _carbon.MessageType.ContextMenuCommand)) {
    (0, _globals.logVerbose)("discord: drop channel command message");
    return null;
  }
  const guildInfo = isGuildMessage ?
  (0, _allowList.resolveDiscordGuildEntry)({
    guild: params.data.guild ?? undefined,
    guildEntries: params.guildEntries
  }) :
  null;
  if (isGuildMessage &&
  params.guildEntries &&
  Object.keys(params.guildEntries).length > 0 &&
  !guildInfo) {
    (0, _globals.logVerbose)(`Blocked discord guild ${params.data.guild_id ?? "unknown"} (not in discord.guilds)`);
    return null;
  }
  // Reuse early thread resolution from above (for binding inheritance)
  const threadChannel = earlyThreadChannel;
  const threadParentId = earlyThreadParentId;
  const threadParentName = earlyThreadParentName;
  const threadParentType = earlyThreadParentType;
  const threadName = threadChannel?.name;
  const configChannelName = threadParentName ?? channelName;
  const configChannelSlug = configChannelName ? (0, _allowList.normalizeDiscordSlug)(configChannelName) : "";
  const displayChannelName = threadName ?? channelName;
  const displayChannelSlug = displayChannelName ? (0, _allowList.normalizeDiscordSlug)(displayChannelName) : "";
  const guildSlug = guildInfo?.slug || (
  params.data.guild?.name ? (0, _allowList.normalizeDiscordSlug)(params.data.guild.name) : "");
  const threadChannelSlug = channelName ? (0, _allowList.normalizeDiscordSlug)(channelName) : "";
  const threadParentSlug = threadParentName ? (0, _allowList.normalizeDiscordSlug)(threadParentName) : "";
  const baseSessionKey = route.sessionKey;
  const channelConfig = isGuildMessage ?
  (0, _allowList.resolveDiscordChannelConfigWithFallback)({
    guildInfo,
    channelId: message.channelId,
    channelName,
    channelSlug: threadChannelSlug,
    parentId: threadParentId ?? undefined,
    parentName: threadParentName ?? undefined,
    parentSlug: threadParentSlug,
    scope: threadChannel ? "thread" : "channel"
  }) :
  null;
  const channelMatchMeta = (0, _allowlistMatch.formatAllowlistMatchMeta)(channelConfig);
  if (isGuildMessage && channelConfig?.enabled === false) {
    (0, _globals.logVerbose)(`Blocked discord channel ${message.channelId} (channel disabled, ${channelMatchMeta})`);
    return null;
  }
  const groupDmAllowed = isGroupDm &&
  (0, _allowList.resolveGroupDmAllow)({
    channels: params.groupDmChannels,
    channelId: message.channelId,
    channelName: displayChannelName,
    channelSlug: displayChannelSlug
  });
  if (isGroupDm && !groupDmAllowed) {
    return null;
  }
  const channelAllowlistConfigured = Boolean(guildInfo?.channels) && Object.keys(guildInfo?.channels ?? {}).length > 0;
  const channelAllowed = channelConfig?.allowed !== false;
  if (isGuildMessage &&
  !(0, _allowList.isDiscordGroupAllowedByPolicy)({
    groupPolicy: params.groupPolicy,
    guildAllowlisted: Boolean(guildInfo),
    channelAllowlistConfigured,
    channelAllowed
  })) {
    if (params.groupPolicy === "disabled") {
      (0, _globals.logVerbose)(`discord: drop guild message (groupPolicy: disabled, ${channelMatchMeta})`);
    } else
    if (!channelAllowlistConfigured) {
      (0, _globals.logVerbose)(`discord: drop guild message (groupPolicy: allowlist, no channel allowlist, ${channelMatchMeta})`);
    } else
    {
      (0, _globals.logVerbose)(`Blocked discord channel ${message.channelId} not in guild channel allowlist (groupPolicy: allowlist, ${channelMatchMeta})`);
    }
    return null;
  }
  if (isGuildMessage && channelConfig?.allowed === false) {
    (0, _globals.logVerbose)(`Blocked discord channel ${message.channelId} not in guild channel allowlist (${channelMatchMeta})`);
    return null;
  }
  if (isGuildMessage) {
    (0, _globals.logVerbose)(`discord: allow channel ${message.channelId} (${channelMatchMeta})`);
  }
  const textForHistory = (0, _messageUtils.resolveDiscordMessageText)(message, {
    includeForwarded: true
  });
  const historyEntry = isGuildMessage && params.historyLimit > 0 && textForHistory ?
  {
    sender: sender.label,
    body: textForHistory,
    timestamp: (0, _format.resolveTimestampMs)(message.timestamp),
    messageId: message.id
  } :
  undefined;
  const threadOwnerId = threadChannel ? threadChannel.ownerId ?? channelInfo?.ownerId : undefined;
  const shouldRequireMention = (0, _allowList.resolveDiscordShouldRequireMention)({
    isGuildMessage,
    isThread: Boolean(threadChannel),
    botId,
    threadOwnerId,
    channelConfig,
    guildInfo
  });
  const allowTextCommands = (0, _commandsRegistry.shouldHandleTextCommands)({
    cfg: params.cfg,
    surface: "discord"
  });
  const hasControlCommandInMessage = (0, _commandDetection.hasControlCommand)(baseText, params.cfg);
  if (!isDirectMessage) {
    const ownerAllowList = (0, _allowList.normalizeDiscordAllowList)(params.allowFrom, [
    "discord:",
    "user:",
    "pk:"]
    );
    const ownerOk = ownerAllowList ?
    (0, _allowList.allowListMatches)(ownerAllowList, {
      id: sender.id,
      name: sender.name,
      tag: sender.tag
    }) :
    false;
    const channelUsers = channelConfig?.users ?? guildInfo?.users;
    const usersOk = Array.isArray(channelUsers) && channelUsers.length > 0 ?
    (0, _allowList.resolveDiscordUserAllowed)({
      allowList: channelUsers,
      userId: sender.id,
      userName: sender.name,
      userTag: sender.tag
    }) :
    false;
    const useAccessGroups = params.cfg.commands?.useAccessGroups !== false;
    const commandGate = (0, _commandGating.resolveControlCommandGate)({
      useAccessGroups,
      authorizers: [
      { configured: ownerAllowList != null, allowed: ownerOk },
      { configured: Array.isArray(channelUsers) && channelUsers.length > 0, allowed: usersOk }],

      modeWhenAccessGroupsOff: "configured",
      allowTextCommands,
      hasControlCommand: hasControlCommandInMessage
    });
    commandAuthorized = commandGate.commandAuthorized;
    if (commandGate.shouldBlock) {
      (0, _logging.logInboundDrop)({
        log: _globals.logVerbose,
        channel: "discord",
        reason: "control command (unauthorized)",
        target: sender.id
      });
      return null;
    }
  }
  const canDetectMention = Boolean(botId) || mentionRegexes.length > 0;
  const mentionGate = (0, _mentionGating.resolveMentionGatingWithBypass)({
    isGroup: isGuildMessage,
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
  if (isGuildMessage && shouldRequireMention) {
    if (botId && mentionGate.shouldSkip) {
      (0, _globals.logVerbose)(`discord: drop guild message (mention required, botId=${botId})`);
      logger.info({
        channelId: message.channelId,
        reason: "no-mention"
      }, "discord: skipping guild message");
      (0, _history.recordPendingHistoryEntryIfEnabled)({
        historyMap: params.guildHistories,
        historyKey: message.channelId,
        limit: params.historyLimit,
        entry: historyEntry ?? null
      });
      return null;
    }
  }
  if (isGuildMessage) {
    const channelUsers = channelConfig?.users ?? guildInfo?.users;
    if (Array.isArray(channelUsers) && channelUsers.length > 0) {
      const userOk = (0, _allowList.resolveDiscordUserAllowed)({
        allowList: channelUsers,
        userId: sender.id,
        userName: sender.name,
        userTag: sender.tag
      });
      if (!userOk) {
        (0, _globals.logVerbose)(`Blocked discord guild sender ${sender.id} (not in channel users allowlist)`);
        return null;
      }
    }
  }
  const systemLocation = (0, _format.resolveDiscordSystemLocation)({
    isDirectMessage,
    isGroupDm,
    guild: params.data.guild ?? undefined,
    channelName: channelName ?? message.channelId
  });
  const systemText = (0, _systemEvents2.resolveDiscordSystemEvent)(message, systemLocation);
  if (systemText) {
    (0, _systemEvents.enqueueSystemEvent)(systemText, {
      sessionKey: route.sessionKey,
      contextKey: `discord:system:${message.channelId}:${message.id}`
    });
    return null;
  }
  if (!messageText) {
    (0, _globals.logVerbose)(`discord: drop message ${message.id} (empty content)`);
    return null;
  }
  return {
    cfg: params.cfg,
    discordConfig: params.discordConfig,
    accountId: params.accountId,
    token: params.token,
    runtime: params.runtime,
    botUserId: params.botUserId,
    guildHistories: params.guildHistories,
    historyLimit: params.historyLimit,
    mediaMaxBytes: params.mediaMaxBytes,
    textLimit: params.textLimit,
    replyToMode: params.replyToMode,
    ackReactionScope: params.ackReactionScope,
    groupPolicy: params.groupPolicy,
    data: params.data,
    client: params.client,
    message,
    author,
    sender,
    channelInfo,
    channelName,
    isGuildMessage,
    isDirectMessage,
    isGroupDm,
    commandAuthorized,
    baseText,
    messageText,
    wasMentioned,
    route,
    guildInfo,
    guildSlug,
    threadChannel,
    threadParentId,
    threadParentName,
    threadParentType,
    threadName,
    configChannelName,
    configChannelSlug,
    displayChannelName,
    displayChannelSlug,
    baseSessionKey,
    channelConfig,
    channelAllowlistConfigured,
    channelAllowed,
    shouldRequireMention,
    hasAnyMention,
    allowTextCommands,
    shouldBypassMention: mentionGate.shouldBypassMention,
    effectiveWasMentioned,
    canDetectMention,
    historyEntry
  };
} /* v9-a1d7d5c9a5bcec94 */
