"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createChannelDiscord = createChannelDiscord;exports.deleteChannelDiscord = deleteChannelDiscord;exports.editChannelDiscord = editChannelDiscord;exports.moveChannelDiscord = moveChannelDiscord;exports.removeChannelPermissionDiscord = removeChannelPermissionDiscord;exports.setChannelPermissionDiscord = setChannelPermissionDiscord;var _v = require("discord-api-types/v10");
var _sendShared = require("./send.shared.js");
async function createChannelDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  const body = {
    name: payload.name
  };
  if (payload.type !== undefined) {
    body.type = payload.type;
  }
  if (payload.parentId) {
    body.parent_id = payload.parentId;
  }
  if (payload.topic) {
    body.topic = payload.topic;
  }
  if (payload.position !== undefined) {
    body.position = payload.position;
  }
  if (payload.nsfw !== undefined) {
    body.nsfw = payload.nsfw;
  }
  return await rest.post(_v.Routes.guildChannels(payload.guildId), {
    body
  });
}
async function editChannelDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  const body = {};
  if (payload.name !== undefined) {
    body.name = payload.name;
  }
  if (payload.topic !== undefined) {
    body.topic = payload.topic;
  }
  if (payload.position !== undefined) {
    body.position = payload.position;
  }
  if (payload.parentId !== undefined) {
    body.parent_id = payload.parentId;
  }
  if (payload.nsfw !== undefined) {
    body.nsfw = payload.nsfw;
  }
  if (payload.rateLimitPerUser !== undefined) {
    body.rate_limit_per_user = payload.rateLimitPerUser;
  }
  return await rest.patch(_v.Routes.channel(payload.channelId), {
    body
  });
}
async function deleteChannelDiscord(channelId, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  await rest.delete(_v.Routes.channel(channelId));
  return { ok: true, channelId };
}
async function moveChannelDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  const body = [
  {
    id: payload.channelId,
    ...(payload.parentId !== undefined && { parent_id: payload.parentId }),
    ...(payload.position !== undefined && { position: payload.position })
  }];

  await rest.patch(_v.Routes.guildChannels(payload.guildId), { body });
  return { ok: true };
}
async function setChannelPermissionDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  const body = {
    type: payload.targetType
  };
  if (payload.allow !== undefined) {
    body.allow = payload.allow;
  }
  if (payload.deny !== undefined) {
    body.deny = payload.deny;
  }
  await rest.put(`/channels/${payload.channelId}/permissions/${payload.targetId}`, { body });
  return { ok: true };
}
async function removeChannelPermissionDiscord(channelId, targetId, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  await rest.delete(`/channels/${channelId}/permissions/${targetId}`);
  return { ok: true };
} /* v9-ea797b7edba51924 */
