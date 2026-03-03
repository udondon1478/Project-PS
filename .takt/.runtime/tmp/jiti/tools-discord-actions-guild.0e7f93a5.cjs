"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleDiscordGuildAction = handleDiscordGuildAction;var _presenceCache = require("../../discord/monitor/presence-cache.js");
var _send = require("../../discord/send.js");
var _common = require("./common.js");
function readParentIdParam(params) {
  if (params.clearParent === true) {
    return null;
  }
  if (params.parentId === null) {
    return null;
  }
  return (0, _common.readStringParam)(params, "parentId");
}
async function handleDiscordGuildAction(action, params, isActionEnabled) {
  const accountId = (0, _common.readStringParam)(params, "accountId");
  switch (action) {
    case "memberInfo":{
        if (!isActionEnabled("memberInfo")) {
          throw new Error("Discord member info is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const userId = (0, _common.readStringParam)(params, "userId", {
          required: true
        });
        const member = accountId ?
        await (0, _send.fetchMemberInfoDiscord)(guildId, userId, { accountId }) :
        await (0, _send.fetchMemberInfoDiscord)(guildId, userId);
        const presence = (0, _presenceCache.getPresence)(accountId, userId);
        const activities = presence?.activities ?? undefined;
        const status = presence?.status ?? undefined;
        return (0, _common.jsonResult)({ ok: true, member, ...(presence ? { status, activities } : {}) });
      }
    case "roleInfo":{
        if (!isActionEnabled("roleInfo")) {
          throw new Error("Discord role info is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const roles = accountId ?
        await (0, _send.fetchRoleInfoDiscord)(guildId, { accountId }) :
        await (0, _send.fetchRoleInfoDiscord)(guildId);
        return (0, _common.jsonResult)({ ok: true, roles });
      }
    case "emojiList":{
        if (!isActionEnabled("reactions")) {
          throw new Error("Discord reactions are disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const emojis = accountId ?
        await (0, _send.listGuildEmojisDiscord)(guildId, { accountId }) :
        await (0, _send.listGuildEmojisDiscord)(guildId);
        return (0, _common.jsonResult)({ ok: true, emojis });
      }
    case "emojiUpload":{
        if (!isActionEnabled("emojiUploads")) {
          throw new Error("Discord emoji uploads are disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const name = (0, _common.readStringParam)(params, "name", { required: true });
        const mediaUrl = (0, _common.readStringParam)(params, "mediaUrl", {
          required: true
        });
        const roleIds = (0, _common.readStringArrayParam)(params, "roleIds");
        const emoji = accountId ?
        await (0, _send.uploadEmojiDiscord)({
          guildId,
          name,
          mediaUrl,
          roleIds: roleIds?.length ? roleIds : undefined
        }, { accountId }) :
        await (0, _send.uploadEmojiDiscord)({
          guildId,
          name,
          mediaUrl,
          roleIds: roleIds?.length ? roleIds : undefined
        });
        return (0, _common.jsonResult)({ ok: true, emoji });
      }
    case "stickerUpload":{
        if (!isActionEnabled("stickerUploads")) {
          throw new Error("Discord sticker uploads are disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const name = (0, _common.readStringParam)(params, "name", { required: true });
        const description = (0, _common.readStringParam)(params, "description", {
          required: true
        });
        const tags = (0, _common.readStringParam)(params, "tags", { required: true });
        const mediaUrl = (0, _common.readStringParam)(params, "mediaUrl", {
          required: true
        });
        const sticker = accountId ?
        await (0, _send.uploadStickerDiscord)({
          guildId,
          name,
          description,
          tags,
          mediaUrl
        }, { accountId }) :
        await (0, _send.uploadStickerDiscord)({
          guildId,
          name,
          description,
          tags,
          mediaUrl
        });
        return (0, _common.jsonResult)({ ok: true, sticker });
      }
    case "roleAdd":{
        if (!isActionEnabled("roles", false)) {
          throw new Error("Discord role changes are disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const userId = (0, _common.readStringParam)(params, "userId", {
          required: true
        });
        const roleId = (0, _common.readStringParam)(params, "roleId", { required: true });
        if (accountId) {
          await (0, _send.addRoleDiscord)({ guildId, userId, roleId }, { accountId });
        } else
        {
          await (0, _send.addRoleDiscord)({ guildId, userId, roleId });
        }
        return (0, _common.jsonResult)({ ok: true });
      }
    case "roleRemove":{
        if (!isActionEnabled("roles", false)) {
          throw new Error("Discord role changes are disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const userId = (0, _common.readStringParam)(params, "userId", {
          required: true
        });
        const roleId = (0, _common.readStringParam)(params, "roleId", { required: true });
        if (accountId) {
          await (0, _send.removeRoleDiscord)({ guildId, userId, roleId }, { accountId });
        } else
        {
          await (0, _send.removeRoleDiscord)({ guildId, userId, roleId });
        }
        return (0, _common.jsonResult)({ ok: true });
      }
    case "channelInfo":{
        if (!isActionEnabled("channelInfo")) {
          throw new Error("Discord channel info is disabled.");
        }
        const channelId = (0, _common.readStringParam)(params, "channelId", {
          required: true
        });
        const channel = accountId ?
        await (0, _send.fetchChannelInfoDiscord)(channelId, { accountId }) :
        await (0, _send.fetchChannelInfoDiscord)(channelId);
        return (0, _common.jsonResult)({ ok: true, channel });
      }
    case "channelList":{
        if (!isActionEnabled("channelInfo")) {
          throw new Error("Discord channel info is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const channels = accountId ?
        await (0, _send.listGuildChannelsDiscord)(guildId, { accountId }) :
        await (0, _send.listGuildChannelsDiscord)(guildId);
        return (0, _common.jsonResult)({ ok: true, channels });
      }
    case "voiceStatus":{
        if (!isActionEnabled("voiceStatus")) {
          throw new Error("Discord voice status is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const userId = (0, _common.readStringParam)(params, "userId", {
          required: true
        });
        const voice = accountId ?
        await (0, _send.fetchVoiceStatusDiscord)(guildId, userId, { accountId }) :
        await (0, _send.fetchVoiceStatusDiscord)(guildId, userId);
        return (0, _common.jsonResult)({ ok: true, voice });
      }
    case "eventList":{
        if (!isActionEnabled("events")) {
          throw new Error("Discord events are disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const events = accountId ?
        await (0, _send.listScheduledEventsDiscord)(guildId, { accountId }) :
        await (0, _send.listScheduledEventsDiscord)(guildId);
        return (0, _common.jsonResult)({ ok: true, events });
      }
    case "eventCreate":{
        if (!isActionEnabled("events")) {
          throw new Error("Discord events are disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const name = (0, _common.readStringParam)(params, "name", { required: true });
        const startTime = (0, _common.readStringParam)(params, "startTime", {
          required: true
        });
        const endTime = (0, _common.readStringParam)(params, "endTime");
        const description = (0, _common.readStringParam)(params, "description");
        const channelId = (0, _common.readStringParam)(params, "channelId");
        const location = (0, _common.readStringParam)(params, "location");
        const entityTypeRaw = (0, _common.readStringParam)(params, "entityType");
        const entityType = entityTypeRaw === "stage" ? 1 : entityTypeRaw === "external" ? 3 : 2;
        const payload = {
          name,
          description,
          scheduled_start_time: startTime,
          scheduled_end_time: endTime,
          entity_type: entityType,
          channel_id: channelId,
          entity_metadata: entityType === 3 && location ? { location } : undefined,
          privacy_level: 2
        };
        const event = accountId ?
        await (0, _send.createScheduledEventDiscord)(guildId, payload, { accountId }) :
        await (0, _send.createScheduledEventDiscord)(guildId, payload);
        return (0, _common.jsonResult)({ ok: true, event });
      }
    case "channelCreate":{
        if (!isActionEnabled("channels")) {
          throw new Error("Discord channel management is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", { required: true });
        const name = (0, _common.readStringParam)(params, "name", { required: true });
        const type = (0, _common.readNumberParam)(params, "type", { integer: true });
        const parentId = readParentIdParam(params);
        const topic = (0, _common.readStringParam)(params, "topic");
        const position = (0, _common.readNumberParam)(params, "position", { integer: true });
        const nsfw = params.nsfw;
        const channel = accountId ?
        await (0, _send.createChannelDiscord)({
          guildId,
          name,
          type: type ?? undefined,
          parentId: parentId ?? undefined,
          topic: topic ?? undefined,
          position: position ?? undefined,
          nsfw
        }, { accountId }) :
        await (0, _send.createChannelDiscord)({
          guildId,
          name,
          type: type ?? undefined,
          parentId: parentId ?? undefined,
          topic: topic ?? undefined,
          position: position ?? undefined,
          nsfw
        });
        return (0, _common.jsonResult)({ ok: true, channel });
      }
    case "channelEdit":{
        if (!isActionEnabled("channels")) {
          throw new Error("Discord channel management is disabled.");
        }
        const channelId = (0, _common.readStringParam)(params, "channelId", {
          required: true
        });
        const name = (0, _common.readStringParam)(params, "name");
        const topic = (0, _common.readStringParam)(params, "topic");
        const position = (0, _common.readNumberParam)(params, "position", { integer: true });
        const parentId = readParentIdParam(params);
        const nsfw = params.nsfw;
        const rateLimitPerUser = (0, _common.readNumberParam)(params, "rateLimitPerUser", {
          integer: true
        });
        const channel = accountId ?
        await (0, _send.editChannelDiscord)({
          channelId,
          name: name ?? undefined,
          topic: topic ?? undefined,
          position: position ?? undefined,
          parentId,
          nsfw,
          rateLimitPerUser: rateLimitPerUser ?? undefined
        }, { accountId }) :
        await (0, _send.editChannelDiscord)({
          channelId,
          name: name ?? undefined,
          topic: topic ?? undefined,
          position: position ?? undefined,
          parentId,
          nsfw,
          rateLimitPerUser: rateLimitPerUser ?? undefined
        });
        return (0, _common.jsonResult)({ ok: true, channel });
      }
    case "channelDelete":{
        if (!isActionEnabled("channels")) {
          throw new Error("Discord channel management is disabled.");
        }
        const channelId = (0, _common.readStringParam)(params, "channelId", {
          required: true
        });
        const result = accountId ?
        await (0, _send.deleteChannelDiscord)(channelId, { accountId }) :
        await (0, _send.deleteChannelDiscord)(channelId);
        return (0, _common.jsonResult)(result);
      }
    case "channelMove":{
        if (!isActionEnabled("channels")) {
          throw new Error("Discord channel management is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", { required: true });
        const channelId = (0, _common.readStringParam)(params, "channelId", {
          required: true
        });
        const parentId = readParentIdParam(params);
        const position = (0, _common.readNumberParam)(params, "position", { integer: true });
        if (accountId) {
          await (0, _send.moveChannelDiscord)({
            guildId,
            channelId,
            parentId,
            position: position ?? undefined
          }, { accountId });
        } else
        {
          await (0, _send.moveChannelDiscord)({
            guildId,
            channelId,
            parentId,
            position: position ?? undefined
          });
        }
        return (0, _common.jsonResult)({ ok: true });
      }
    case "categoryCreate":{
        if (!isActionEnabled("channels")) {
          throw new Error("Discord channel management is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", { required: true });
        const name = (0, _common.readStringParam)(params, "name", { required: true });
        const position = (0, _common.readNumberParam)(params, "position", { integer: true });
        const channel = accountId ?
        await (0, _send.createChannelDiscord)({
          guildId,
          name,
          type: 4,
          position: position ?? undefined
        }, { accountId }) :
        await (0, _send.createChannelDiscord)({
          guildId,
          name,
          type: 4,
          position: position ?? undefined
        });
        return (0, _common.jsonResult)({ ok: true, category: channel });
      }
    case "categoryEdit":{
        if (!isActionEnabled("channels")) {
          throw new Error("Discord channel management is disabled.");
        }
        const categoryId = (0, _common.readStringParam)(params, "categoryId", {
          required: true
        });
        const name = (0, _common.readStringParam)(params, "name");
        const position = (0, _common.readNumberParam)(params, "position", { integer: true });
        const channel = accountId ?
        await (0, _send.editChannelDiscord)({
          channelId: categoryId,
          name: name ?? undefined,
          position: position ?? undefined
        }, { accountId }) :
        await (0, _send.editChannelDiscord)({
          channelId: categoryId,
          name: name ?? undefined,
          position: position ?? undefined
        });
        return (0, _common.jsonResult)({ ok: true, category: channel });
      }
    case "categoryDelete":{
        if (!isActionEnabled("channels")) {
          throw new Error("Discord channel management is disabled.");
        }
        const categoryId = (0, _common.readStringParam)(params, "categoryId", {
          required: true
        });
        const result = accountId ?
        await (0, _send.deleteChannelDiscord)(categoryId, { accountId }) :
        await (0, _send.deleteChannelDiscord)(categoryId);
        return (0, _common.jsonResult)(result);
      }
    case "channelPermissionSet":{
        if (!isActionEnabled("channels")) {
          throw new Error("Discord channel management is disabled.");
        }
        const channelId = (0, _common.readStringParam)(params, "channelId", {
          required: true
        });
        const targetId = (0, _common.readStringParam)(params, "targetId", { required: true });
        const targetTypeRaw = (0, _common.readStringParam)(params, "targetType", {
          required: true
        });
        const targetType = targetTypeRaw === "member" ? 1 : 0;
        const allow = (0, _common.readStringParam)(params, "allow");
        const deny = (0, _common.readStringParam)(params, "deny");
        if (accountId) {
          await (0, _send.setChannelPermissionDiscord)({
            channelId,
            targetId,
            targetType,
            allow: allow ?? undefined,
            deny: deny ?? undefined
          }, { accountId });
        } else
        {
          await (0, _send.setChannelPermissionDiscord)({
            channelId,
            targetId,
            targetType,
            allow: allow ?? undefined,
            deny: deny ?? undefined
          });
        }
        return (0, _common.jsonResult)({ ok: true });
      }
    case "channelPermissionRemove":{
        if (!isActionEnabled("channels")) {
          throw new Error("Discord channel management is disabled.");
        }
        const channelId = (0, _common.readStringParam)(params, "channelId", {
          required: true
        });
        const targetId = (0, _common.readStringParam)(params, "targetId", { required: true });
        if (accountId) {
          await (0, _send.removeChannelPermissionDiscord)(channelId, targetId, { accountId });
        } else
        {
          await (0, _send.removeChannelPermissionDiscord)(channelId, targetId);
        }
        return (0, _common.jsonResult)({ ok: true });
      }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
} /* v9-895ce93aaa1c6653 */
