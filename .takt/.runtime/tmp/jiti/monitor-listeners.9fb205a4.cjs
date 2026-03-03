"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DiscordReactionRemoveListener = exports.DiscordReactionListener = exports.DiscordPresenceListener = exports.DiscordMessageListener = void 0;exports.registerDiscordListener = registerDiscordListener;var _carbon = require("@buape/carbon");
var _globals = require("../../globals.js");
var _formatDuration = require("../../infra/format-duration.js");
var _systemEvents = require("../../infra/system-events.js");
var _subsystem = require("../../logging/subsystem.js");
var _resolveRoute = require("../../routing/resolve-route.js");
var _allowList = require("./allow-list.js");
var _format = require("./format.js");
var _messageUtils = require("./message-utils.js");
var _presenceCache = require("./presence-cache.js");
const DISCORD_SLOW_LISTENER_THRESHOLD_MS = 30_000;
const discordEventQueueLog = (0, _subsystem.createSubsystemLogger)("discord/event-queue");
function logSlowDiscordListener(params) {
  if (params.durationMs < DISCORD_SLOW_LISTENER_THRESHOLD_MS) {
    return;
  }
  const duration = (0, _formatDuration.formatDurationSeconds)(params.durationMs, {
    decimals: 1,
    unit: "seconds"
  });
  const message = `Slow listener detected: ${params.listener} took ${duration} for event ${params.event}`;
  const logger = params.logger ?? discordEventQueueLog;
  logger.warn("Slow listener detected", {
    listener: params.listener,
    event: params.event,
    durationMs: params.durationMs,
    duration,
    consoleMessage: message
  });
}
function registerDiscordListener(listeners, listener) {
  if (listeners.some((existing) => existing.constructor === listener.constructor)) {
    return false;
  }
  listeners.push(listener);
  return true;
}
class DiscordMessageListener extends _carbon.MessageCreateListener {
  handler;
  logger;
  constructor(handler, logger) {
    super();
    this.handler = handler;
    this.logger = logger;
  }
  async handle(data, client) {
    const startedAt = Date.now();
    const task = Promise.resolve(this.handler(data, client));
    void task.
    catch((err) => {
      const logger = this.logger ?? discordEventQueueLog;
      logger.error((0, _globals.danger)(`discord handler failed: ${String(err)}`));
    }).
    finally(() => {
      logSlowDiscordListener({
        logger: this.logger,
        listener: this.constructor.name,
        event: this.type,
        durationMs: Date.now() - startedAt
      });
    });
  }
}exports.DiscordMessageListener = DiscordMessageListener;
class DiscordReactionListener extends _carbon.MessageReactionAddListener {
  params;
  constructor(params) {
    super();
    this.params = params;
  }
  async handle(data, client) {
    const startedAt = Date.now();
    try {
      await handleDiscordReactionEvent({
        data,
        client,
        action: "added",
        cfg: this.params.cfg,
        accountId: this.params.accountId,
        botUserId: this.params.botUserId,
        guildEntries: this.params.guildEntries,
        logger: this.params.logger
      });
    } finally
    {
      logSlowDiscordListener({
        logger: this.params.logger,
        listener: this.constructor.name,
        event: this.type,
        durationMs: Date.now() - startedAt
      });
    }
  }
}exports.DiscordReactionListener = DiscordReactionListener;
class DiscordReactionRemoveListener extends _carbon.MessageReactionRemoveListener {
  params;
  constructor(params) {
    super();
    this.params = params;
  }
  async handle(data, client) {
    const startedAt = Date.now();
    try {
      await handleDiscordReactionEvent({
        data,
        client,
        action: "removed",
        cfg: this.params.cfg,
        accountId: this.params.accountId,
        botUserId: this.params.botUserId,
        guildEntries: this.params.guildEntries,
        logger: this.params.logger
      });
    } finally
    {
      logSlowDiscordListener({
        logger: this.params.logger,
        listener: this.constructor.name,
        event: this.type,
        durationMs: Date.now() - startedAt
      });
    }
  }
}exports.DiscordReactionRemoveListener = DiscordReactionRemoveListener;
async function handleDiscordReactionEvent(params) {
  try {
    const { data, client, action, botUserId, guildEntries } = params;
    if (!("user" in data)) {
      return;
    }
    const user = data.user;
    if (!user || user.bot) {
      return;
    }
    if (!data.guild_id) {
      return;
    }
    const guildInfo = (0, _allowList.resolveDiscordGuildEntry)({
      guild: data.guild ?? undefined,
      guildEntries
    });
    if (guildEntries && Object.keys(guildEntries).length > 0 && !guildInfo) {
      return;
    }
    const channel = await client.fetchChannel(data.channel_id);
    if (!channel) {
      return;
    }
    const channelName = "name" in channel ? channel.name ?? undefined : undefined;
    const channelSlug = channelName ? (0, _allowList.normalizeDiscordSlug)(channelName) : "";
    const channelType = "type" in channel ? channel.type : undefined;
    const isThreadChannel = channelType === _carbon.ChannelType.PublicThread ||
    channelType === _carbon.ChannelType.PrivateThread ||
    channelType === _carbon.ChannelType.AnnouncementThread;
    let parentId = "parentId" in channel ? channel.parentId ?? undefined : undefined;
    let parentName;
    let parentSlug = "";
    if (isThreadChannel) {
      if (!parentId) {
        const channelInfo = await (0, _messageUtils.resolveDiscordChannelInfo)(client, data.channel_id);
        parentId = channelInfo?.parentId;
      }
      if (parentId) {
        const parentInfo = await (0, _messageUtils.resolveDiscordChannelInfo)(client, parentId);
        parentName = parentInfo?.name;
        parentSlug = parentName ? (0, _allowList.normalizeDiscordSlug)(parentName) : "";
      }
    }
    const channelConfig = (0, _allowList.resolveDiscordChannelConfigWithFallback)({
      guildInfo,
      channelId: data.channel_id,
      channelName,
      channelSlug,
      parentId,
      parentName,
      parentSlug,
      scope: isThreadChannel ? "thread" : "channel"
    });
    if (channelConfig?.allowed === false) {
      return;
    }
    if (botUserId && user.id === botUserId) {
      return;
    }
    const reactionMode = guildInfo?.reactionNotifications ?? "own";
    const message = await data.message.fetch().catch(() => null);
    const messageAuthorId = message?.author?.id ?? undefined;
    const shouldNotify = (0, _allowList.shouldEmitDiscordReactionNotification)({
      mode: reactionMode,
      botId: botUserId,
      messageAuthorId,
      userId: user.id,
      userName: user.username,
      userTag: (0, _format.formatDiscordUserTag)(user),
      allowlist: guildInfo?.users
    });
    if (!shouldNotify) {
      return;
    }
    const emojiLabel = (0, _format.formatDiscordReactionEmoji)(data.emoji);
    const actorLabel = (0, _format.formatDiscordUserTag)(user);
    const guildSlug = guildInfo?.slug || (data.guild?.name ? (0, _allowList.normalizeDiscordSlug)(data.guild.name) : data.guild_id);
    const channelLabel = channelSlug ?
    `#${channelSlug}` :
    channelName ?
    `#${(0, _allowList.normalizeDiscordSlug)(channelName)}` :
    `#${data.channel_id}`;
    const authorLabel = message?.author ? (0, _format.formatDiscordUserTag)(message.author) : undefined;
    const baseText = `Discord reaction ${action}: ${emojiLabel} by ${actorLabel} on ${guildSlug} ${channelLabel} msg ${data.message_id}`;
    const text = authorLabel ? `${baseText} from ${authorLabel}` : baseText;
    const route = (0, _resolveRoute.resolveAgentRoute)({
      cfg: params.cfg,
      channel: "discord",
      accountId: params.accountId,
      guildId: data.guild_id ?? undefined,
      peer: { kind: "channel", id: data.channel_id },
      parentPeer: parentId ? { kind: "channel", id: parentId } : undefined
    });
    (0, _systemEvents.enqueueSystemEvent)(text, {
      sessionKey: route.sessionKey,
      contextKey: `discord:reaction:${action}:${data.message_id}:${user.id}:${emojiLabel}`
    });
  }
  catch (err) {
    params.logger.error((0, _globals.danger)(`discord reaction handler failed: ${String(err)}`));
  }
}
class DiscordPresenceListener extends _carbon.PresenceUpdateListener {
  logger;
  accountId;
  constructor(params) {
    super();
    this.logger = params.logger;
    this.accountId = params.accountId;
  }
  async handle(data) {
    try {
      const userId = "user" in data && data.user && typeof data.user === "object" && "id" in data.user ?
      String(data.user.id) :
      undefined;
      if (!userId) {
        return;
      }
      (0, _presenceCache.setPresence)(this.accountId, userId, data);
    }
    catch (err) {
      const logger = this.logger ?? discordEventQueueLog;
      logger.error((0, _globals.danger)(`discord presence handler failed: ${String(err)}`));
    }
  }
}exports.DiscordPresenceListener = DiscordPresenceListener; /* v9-06a9314701af6ea9 */
