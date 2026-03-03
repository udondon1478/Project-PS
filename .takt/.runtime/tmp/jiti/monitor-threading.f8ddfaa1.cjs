"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.__resetDiscordThreadStarterCacheForTest = __resetDiscordThreadStarterCacheForTest;exports.maybeCreateDiscordAutoThread = maybeCreateDiscordAutoThread;exports.resolveDiscordAutoThreadContext = resolveDiscordAutoThreadContext;exports.resolveDiscordAutoThreadReplyPlan = resolveDiscordAutoThreadReplyPlan;exports.resolveDiscordReplyDeliveryPlan = resolveDiscordReplyDeliveryPlan;exports.resolveDiscordReplyTarget = resolveDiscordReplyTarget;exports.resolveDiscordThreadChannel = resolveDiscordThreadChannel;exports.resolveDiscordThreadParentInfo = resolveDiscordThreadParentInfo;exports.resolveDiscordThreadStarter = resolveDiscordThreadStarter;exports.sanitizeDiscordThreadName = sanitizeDiscordThreadName;var _carbon = require("@buape/carbon");
var _v = require("discord-api-types/v10");
var _replyReference = require("../../auto-reply/reply/reply-reference.js");
var _globals = require("../../globals.js");
var _resolveRoute = require("../../routing/resolve-route.js");
var _utils = require("../../utils.js");
var _messageUtils = require("./message-utils.js");
const DISCORD_THREAD_STARTER_CACHE = new Map();
function __resetDiscordThreadStarterCacheForTest() {
  DISCORD_THREAD_STARTER_CACHE.clear();
}
function isDiscordThreadType(type) {
  return type === _carbon.ChannelType.PublicThread ||
  type === _carbon.ChannelType.PrivateThread ||
  type === _carbon.ChannelType.AnnouncementThread;
}
function resolveDiscordThreadChannel(params) {
  if (!params.isGuildMessage) {
    return null;
  }
  const { message, channelInfo } = params;
  const channel = "channel" in message ? message.channel : undefined;
  const isThreadChannel = channel &&
  typeof channel === "object" &&
  "isThread" in channel &&
  typeof channel.isThread === "function" &&
  channel.isThread();
  if (isThreadChannel) {
    return channel;
  }
  if (!isDiscordThreadType(channelInfo?.type)) {
    return null;
  }
  return {
    id: message.channelId,
    name: channelInfo?.name ?? undefined,
    parentId: channelInfo?.parentId ?? undefined,
    parent: undefined,
    ownerId: channelInfo?.ownerId ?? undefined
  };
}
async function resolveDiscordThreadParentInfo(params) {
  const { threadChannel, channelInfo, client } = params;
  const parentId = threadChannel.parentId ?? threadChannel.parent?.id ?? channelInfo?.parentId ?? undefined;
  if (!parentId) {
    return {};
  }
  let parentName = threadChannel.parent?.name;
  const parentInfo = await (0, _messageUtils.resolveDiscordChannelInfo)(client, parentId);
  parentName = parentName ?? parentInfo?.name;
  const parentType = parentInfo?.type;
  return { id: parentId, name: parentName, type: parentType };
}
async function resolveDiscordThreadStarter(params) {
  const cacheKey = params.channel.id;
  const cached = DISCORD_THREAD_STARTER_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }
  try {
    const parentType = params.parentType;
    const isForumParent = parentType === _carbon.ChannelType.GuildForum || parentType === _carbon.ChannelType.GuildMedia;
    const messageChannelId = isForumParent ? params.channel.id : params.parentId;
    if (!messageChannelId) {
      return null;
    }
    const starter = await params.client.rest.get(_v.Routes.channelMessage(messageChannelId, params.channel.id));
    if (!starter) {
      return null;
    }
    const text = starter.content?.trim() ?? starter.embeds?.[0]?.description?.trim() ?? "";
    if (!text) {
      return null;
    }
    const author = starter.member?.nick ??
    starter.member?.displayName ?? (
    starter.author ?
    starter.author.discriminator && starter.author.discriminator !== "0" ?
    `${starter.author.username ?? "Unknown"}#${starter.author.discriminator}` :
    starter.author.username ?? starter.author.id ?? "Unknown" :
    "Unknown");
    const timestamp = params.resolveTimestampMs(starter.timestamp);
    const payload = {
      text,
      author,
      timestamp: timestamp ?? undefined
    };
    DISCORD_THREAD_STARTER_CACHE.set(cacheKey, payload);
    return payload;
  }
  catch {
    return null;
  }
}
function resolveDiscordReplyTarget(opts) {
  if (opts.replyToMode === "off") {
    return undefined;
  }
  const replyToId = opts.replyToId?.trim();
  if (!replyToId) {
    return undefined;
  }
  if (opts.replyToMode === "all") {
    return replyToId;
  }
  return opts.hasReplied ? undefined : replyToId;
}
function sanitizeDiscordThreadName(rawName, fallbackId) {
  const cleanedName = rawName.
  replace(/<@!?\d+>/g, "") // user mentions
  .replace(/<@&\d+>/g, "") // role mentions
  .replace(/<#\d+>/g, "") // channel mentions
  .replace(/\s+/g, " ").
  trim();
  const baseSource = cleanedName || `Thread ${fallbackId}`;
  const base = (0, _utils.truncateUtf16Safe)(baseSource, 80);
  return (0, _utils.truncateUtf16Safe)(base, 100) || `Thread ${fallbackId}`;
}
function resolveDiscordAutoThreadContext(params) {
  const createdThreadId = String(params.createdThreadId ?? "").trim();
  if (!createdThreadId) {
    return null;
  }
  const messageChannelId = params.messageChannelId.trim();
  if (!messageChannelId) {
    return null;
  }
  const threadSessionKey = (0, _resolveRoute.buildAgentSessionKey)({
    agentId: params.agentId,
    channel: params.channel,
    peer: { kind: "channel", id: createdThreadId }
  });
  const parentSessionKey = (0, _resolveRoute.buildAgentSessionKey)({
    agentId: params.agentId,
    channel: params.channel,
    peer: { kind: "channel", id: messageChannelId }
  });
  return {
    createdThreadId,
    From: `${params.channel}:channel:${createdThreadId}`,
    To: `channel:${createdThreadId}`,
    OriginatingTo: `channel:${createdThreadId}`,
    SessionKey: threadSessionKey,
    ParentSessionKey: parentSessionKey
  };
}
async function resolveDiscordAutoThreadReplyPlan(params) {
  const originalReplyTarget = `channel:${params.message.channelId}`;
  const createdThreadId = await maybeCreateDiscordAutoThread({
    client: params.client,
    message: params.message,
    isGuildMessage: params.isGuildMessage,
    channelConfig: params.channelConfig,
    threadChannel: params.threadChannel,
    baseText: params.baseText,
    combinedBody: params.combinedBody
  });
  const deliveryPlan = resolveDiscordReplyDeliveryPlan({
    replyTarget: originalReplyTarget,
    replyToMode: params.replyToMode,
    messageId: params.message.id,
    threadChannel: params.threadChannel,
    createdThreadId
  });
  const autoThreadContext = params.isGuildMessage ?
  resolveDiscordAutoThreadContext({
    agentId: params.agentId,
    channel: params.channel,
    messageChannelId: params.message.channelId,
    createdThreadId
  }) :
  null;
  return { ...deliveryPlan, createdThreadId, autoThreadContext };
}
async function maybeCreateDiscordAutoThread(params) {
  if (!params.isGuildMessage) {
    return undefined;
  }
  if (!params.channelConfig?.autoThread) {
    return undefined;
  }
  if (params.threadChannel) {
    return undefined;
  }
  try {
    const threadName = sanitizeDiscordThreadName(params.baseText || params.combinedBody || "Thread", params.message.id);
    const created = await params.client.rest.post(`${_v.Routes.channelMessage(params.message.channelId, params.message.id)}/threads`, {
      body: {
        name: threadName,
        auto_archive_duration: 60
      }
    });
    const createdId = created?.id ? String(created.id) : "";
    return createdId || undefined;
  }
  catch (err) {
    (0, _globals.logVerbose)(`discord: autoThread failed for ${params.message.channelId}/${params.message.id}: ${String(err)}`);
    return undefined;
  }
}
function resolveDiscordReplyDeliveryPlan(params) {
  const originalReplyTarget = params.replyTarget;
  let deliverTarget = originalReplyTarget;
  let replyTarget = originalReplyTarget;
  if (params.createdThreadId) {
    deliverTarget = `channel:${params.createdThreadId}`;
    replyTarget = deliverTarget;
  }
  const allowReference = deliverTarget === originalReplyTarget;
  const replyReference = (0, _replyReference.createReplyReferencePlanner)({
    replyToMode: allowReference ? params.replyToMode : "off",
    existingId: params.threadChannel ? params.messageId : undefined,
    startId: params.messageId,
    allowReference
  });
  return { deliverTarget, replyTarget, replyReference };
} /* v9-848dbb86ef81550d */
