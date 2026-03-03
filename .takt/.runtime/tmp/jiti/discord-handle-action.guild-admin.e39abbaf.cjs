"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.tryHandleDiscordMessageActionGuildAdmin = tryHandleDiscordMessageActionGuildAdmin;var _common = require("../../../../agents/tools/common.js");
var _discordActions = require("../../../../agents/tools/discord-actions.js");
async function tryHandleDiscordMessageActionGuildAdmin(params) {
  const { ctx, resolveChannelId, readParentIdParam } = params;
  const { action, params: actionParams, cfg } = ctx;
  const accountId = ctx.accountId ?? (0, _common.readStringParam)(actionParams, "accountId");
  if (action === "member-info") {
    const userId = (0, _common.readStringParam)(actionParams, "userId", { required: true });
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    return await (0, _discordActions.handleDiscordAction)({ action: "memberInfo", accountId: accountId ?? undefined, guildId, userId }, cfg);
  }
  if (action === "role-info") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    return await (0, _discordActions.handleDiscordAction)({ action: "roleInfo", accountId: accountId ?? undefined, guildId }, cfg);
  }
  if (action === "emoji-list") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    return await (0, _discordActions.handleDiscordAction)({ action: "emojiList", accountId: accountId ?? undefined, guildId }, cfg);
  }
  if (action === "emoji-upload") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const name = (0, _common.readStringParam)(actionParams, "emojiName", { required: true });
    const mediaUrl = (0, _common.readStringParam)(actionParams, "media", {
      required: true,
      trim: false
    });
    const roleIds = (0, _common.readStringArrayParam)(actionParams, "roleIds");
    return await (0, _discordActions.handleDiscordAction)({
      action: "emojiUpload",
      accountId: accountId ?? undefined,
      guildId,
      name,
      mediaUrl,
      roleIds
    }, cfg);
  }
  if (action === "sticker-upload") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const name = (0, _common.readStringParam)(actionParams, "stickerName", {
      required: true
    });
    const description = (0, _common.readStringParam)(actionParams, "stickerDesc", {
      required: true
    });
    const tags = (0, _common.readStringParam)(actionParams, "stickerTags", {
      required: true
    });
    const mediaUrl = (0, _common.readStringParam)(actionParams, "media", {
      required: true,
      trim: false
    });
    return await (0, _discordActions.handleDiscordAction)({
      action: "stickerUpload",
      accountId: accountId ?? undefined,
      guildId,
      name,
      description,
      tags,
      mediaUrl
    }, cfg);
  }
  if (action === "role-add" || action === "role-remove") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const userId = (0, _common.readStringParam)(actionParams, "userId", { required: true });
    const roleId = (0, _common.readStringParam)(actionParams, "roleId", { required: true });
    return await (0, _discordActions.handleDiscordAction)({
      action: action === "role-add" ? "roleAdd" : "roleRemove",
      accountId: accountId ?? undefined,
      guildId,
      userId,
      roleId
    }, cfg);
  }
  if (action === "channel-info") {
    const channelId = (0, _common.readStringParam)(actionParams, "channelId", {
      required: true
    });
    return await (0, _discordActions.handleDiscordAction)({ action: "channelInfo", accountId: accountId ?? undefined, channelId }, cfg);
  }
  if (action === "channel-list") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    return await (0, _discordActions.handleDiscordAction)({ action: "channelList", accountId: accountId ?? undefined, guildId }, cfg);
  }
  if (action === "channel-create") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const name = (0, _common.readStringParam)(actionParams, "name", { required: true });
    const type = (0, _common.readNumberParam)(actionParams, "type", { integer: true });
    const parentId = readParentIdParam(actionParams);
    const topic = (0, _common.readStringParam)(actionParams, "topic");
    const position = (0, _common.readNumberParam)(actionParams, "position", {
      integer: true
    });
    const nsfw = typeof actionParams.nsfw === "boolean" ? actionParams.nsfw : undefined;
    return await (0, _discordActions.handleDiscordAction)({
      action: "channelCreate",
      accountId: accountId ?? undefined,
      guildId,
      name,
      type: type ?? undefined,
      parentId: parentId ?? undefined,
      topic: topic ?? undefined,
      position: position ?? undefined,
      nsfw
    }, cfg);
  }
  if (action === "channel-edit") {
    const channelId = (0, _common.readStringParam)(actionParams, "channelId", {
      required: true
    });
    const name = (0, _common.readStringParam)(actionParams, "name");
    const topic = (0, _common.readStringParam)(actionParams, "topic");
    const position = (0, _common.readNumberParam)(actionParams, "position", {
      integer: true
    });
    const parentId = readParentIdParam(actionParams);
    const nsfw = typeof actionParams.nsfw === "boolean" ? actionParams.nsfw : undefined;
    const rateLimitPerUser = (0, _common.readNumberParam)(actionParams, "rateLimitPerUser", {
      integer: true
    });
    return await (0, _discordActions.handleDiscordAction)({
      action: "channelEdit",
      accountId: accountId ?? undefined,
      channelId,
      name: name ?? undefined,
      topic: topic ?? undefined,
      position: position ?? undefined,
      parentId: parentId === undefined ? undefined : parentId,
      nsfw,
      rateLimitPerUser: rateLimitPerUser ?? undefined
    }, cfg);
  }
  if (action === "channel-delete") {
    const channelId = (0, _common.readStringParam)(actionParams, "channelId", {
      required: true
    });
    return await (0, _discordActions.handleDiscordAction)({ action: "channelDelete", accountId: accountId ?? undefined, channelId }, cfg);
  }
  if (action === "channel-move") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const channelId = (0, _common.readStringParam)(actionParams, "channelId", {
      required: true
    });
    const parentId = readParentIdParam(actionParams);
    const position = (0, _common.readNumberParam)(actionParams, "position", {
      integer: true
    });
    return await (0, _discordActions.handleDiscordAction)({
      action: "channelMove",
      accountId: accountId ?? undefined,
      guildId,
      channelId,
      parentId: parentId === undefined ? undefined : parentId,
      position: position ?? undefined
    }, cfg);
  }
  if (action === "category-create") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const name = (0, _common.readStringParam)(actionParams, "name", { required: true });
    const position = (0, _common.readNumberParam)(actionParams, "position", {
      integer: true
    });
    return await (0, _discordActions.handleDiscordAction)({
      action: "categoryCreate",
      accountId: accountId ?? undefined,
      guildId,
      name,
      position: position ?? undefined
    }, cfg);
  }
  if (action === "category-edit") {
    const categoryId = (0, _common.readStringParam)(actionParams, "categoryId", {
      required: true
    });
    const name = (0, _common.readStringParam)(actionParams, "name");
    const position = (0, _common.readNumberParam)(actionParams, "position", {
      integer: true
    });
    return await (0, _discordActions.handleDiscordAction)({
      action: "categoryEdit",
      accountId: accountId ?? undefined,
      categoryId,
      name: name ?? undefined,
      position: position ?? undefined
    }, cfg);
  }
  if (action === "category-delete") {
    const categoryId = (0, _common.readStringParam)(actionParams, "categoryId", {
      required: true
    });
    return await (0, _discordActions.handleDiscordAction)({ action: "categoryDelete", accountId: accountId ?? undefined, categoryId }, cfg);
  }
  if (action === "voice-status") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const userId = (0, _common.readStringParam)(actionParams, "userId", { required: true });
    return await (0, _discordActions.handleDiscordAction)({ action: "voiceStatus", accountId: accountId ?? undefined, guildId, userId }, cfg);
  }
  if (action === "event-list") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    return await (0, _discordActions.handleDiscordAction)({ action: "eventList", accountId: accountId ?? undefined, guildId }, cfg);
  }
  if (action === "event-create") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const name = (0, _common.readStringParam)(actionParams, "eventName", { required: true });
    const startTime = (0, _common.readStringParam)(actionParams, "startTime", {
      required: true
    });
    const endTime = (0, _common.readStringParam)(actionParams, "endTime");
    const description = (0, _common.readStringParam)(actionParams, "desc");
    const channelId = (0, _common.readStringParam)(actionParams, "channelId");
    const location = (0, _common.readStringParam)(actionParams, "location");
    const entityType = (0, _common.readStringParam)(actionParams, "eventType");
    return await (0, _discordActions.handleDiscordAction)({
      action: "eventCreate",
      accountId: accountId ?? undefined,
      guildId,
      name,
      startTime,
      endTime,
      description,
      channelId,
      location,
      entityType
    }, cfg);
  }
  if (action === "timeout" || action === "kick" || action === "ban") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const userId = (0, _common.readStringParam)(actionParams, "userId", { required: true });
    const durationMinutes = (0, _common.readNumberParam)(actionParams, "durationMin", {
      integer: true
    });
    const until = (0, _common.readStringParam)(actionParams, "until");
    const reason = (0, _common.readStringParam)(actionParams, "reason");
    const deleteMessageDays = (0, _common.readNumberParam)(actionParams, "deleteDays", {
      integer: true
    });
    const discordAction = action;
    return await (0, _discordActions.handleDiscordAction)({
      action: discordAction,
      accountId: accountId ?? undefined,
      guildId,
      userId,
      durationMinutes,
      until,
      reason,
      deleteMessageDays
    }, cfg);
  }
  // Some actions are conceptually "admin", but still act on a resolved channel.
  if (action === "thread-list") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const channelId = (0, _common.readStringParam)(actionParams, "channelId");
    const includeArchived = typeof actionParams.includeArchived === "boolean" ? actionParams.includeArchived : undefined;
    const before = (0, _common.readStringParam)(actionParams, "before");
    const limit = (0, _common.readNumberParam)(actionParams, "limit", { integer: true });
    return await (0, _discordActions.handleDiscordAction)({
      action: "threadList",
      accountId: accountId ?? undefined,
      guildId,
      channelId,
      includeArchived,
      before,
      limit
    }, cfg);
  }
  if (action === "thread-reply") {
    const content = (0, _common.readStringParam)(actionParams, "message", {
      required: true
    });
    const mediaUrl = (0, _common.readStringParam)(actionParams, "media", { trim: false });
    const replyTo = (0, _common.readStringParam)(actionParams, "replyTo");
    // `message.thread-reply` (tool) uses `threadId`, while the CLI historically used `to`/`channelId`.
    // Prefer `threadId` when present to avoid accidentally replying in the parent channel.
    const threadId = (0, _common.readStringParam)(actionParams, "threadId");
    const channelId = threadId ?? resolveChannelId();
    return await (0, _discordActions.handleDiscordAction)({
      action: "threadReply",
      accountId: accountId ?? undefined,
      channelId,
      content,
      mediaUrl: mediaUrl ?? undefined,
      replyTo: replyTo ?? undefined
    }, cfg);
  }
  if (action === "search") {
    const guildId = (0, _common.readStringParam)(actionParams, "guildId", {
      required: true
    });
    const query = (0, _common.readStringParam)(actionParams, "query", { required: true });
    return await (0, _discordActions.handleDiscordAction)({
      action: "searchMessages",
      accountId: accountId ?? undefined,
      guildId,
      content: query,
      channelId: (0, _common.readStringParam)(actionParams, "channelId"),
      channelIds: (0, _common.readStringArrayParam)(actionParams, "channelIds"),
      authorId: (0, _common.readStringParam)(actionParams, "authorId"),
      authorIds: (0, _common.readStringArrayParam)(actionParams, "authorIds"),
      limit: (0, _common.readNumberParam)(actionParams, "limit", { integer: true })
    }, cfg);
  }
  return undefined;
} /* v9-837b26a0169f2f0f */
