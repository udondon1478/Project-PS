"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.addRoleDiscord = addRoleDiscord;exports.banMemberDiscord = banMemberDiscord;exports.createScheduledEventDiscord = createScheduledEventDiscord;exports.fetchChannelInfoDiscord = fetchChannelInfoDiscord;exports.fetchMemberInfoDiscord = fetchMemberInfoDiscord;exports.fetchRoleInfoDiscord = fetchRoleInfoDiscord;exports.fetchVoiceStatusDiscord = fetchVoiceStatusDiscord;exports.kickMemberDiscord = kickMemberDiscord;exports.listGuildChannelsDiscord = listGuildChannelsDiscord;exports.listScheduledEventsDiscord = listScheduledEventsDiscord;exports.removeRoleDiscord = removeRoleDiscord;exports.timeoutMemberDiscord = timeoutMemberDiscord;var _v = require("discord-api-types/v10");
var _sendShared = require("./send.shared.js");
async function fetchMemberInfoDiscord(guildId, userId, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  return await rest.get(_v.Routes.guildMember(guildId, userId));
}
async function fetchRoleInfoDiscord(guildId, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  return await rest.get(_v.Routes.guildRoles(guildId));
}
async function addRoleDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  await rest.put(_v.Routes.guildMemberRole(payload.guildId, payload.userId, payload.roleId));
  return { ok: true };
}
async function removeRoleDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  await rest.delete(_v.Routes.guildMemberRole(payload.guildId, payload.userId, payload.roleId));
  return { ok: true };
}
async function fetchChannelInfoDiscord(channelId, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  return await rest.get(_v.Routes.channel(channelId));
}
async function listGuildChannelsDiscord(guildId, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  return await rest.get(_v.Routes.guildChannels(guildId));
}
async function fetchVoiceStatusDiscord(guildId, userId, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  return await rest.get(_v.Routes.guildVoiceState(guildId, userId));
}
async function listScheduledEventsDiscord(guildId, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  return await rest.get(_v.Routes.guildScheduledEvents(guildId));
}
async function createScheduledEventDiscord(guildId, payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  return await rest.post(_v.Routes.guildScheduledEvents(guildId), {
    body: payload
  });
}
async function timeoutMemberDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  let until = payload.until;
  if (!until && payload.durationMinutes) {
    const ms = payload.durationMinutes * 60 * 1000;
    until = new Date(Date.now() + ms).toISOString();
  }
  return await rest.patch(_v.Routes.guildMember(payload.guildId, payload.userId), {
    body: { communication_disabled_until: until ?? null },
    headers: payload.reason ?
    { "X-Audit-Log-Reason": encodeURIComponent(payload.reason) } :
    undefined
  });
}
async function kickMemberDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  await rest.delete(_v.Routes.guildMember(payload.guildId, payload.userId), {
    headers: payload.reason ?
    { "X-Audit-Log-Reason": encodeURIComponent(payload.reason) } :
    undefined
  });
  return { ok: true };
}
async function banMemberDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  const deleteMessageDays = typeof payload.deleteMessageDays === "number" && Number.isFinite(payload.deleteMessageDays) ?
  Math.min(Math.max(Math.floor(payload.deleteMessageDays), 0), 7) :
  undefined;
  await rest.put(_v.Routes.guildBan(payload.guildId, payload.userId), {
    body: deleteMessageDays !== undefined ? { delete_message_days: deleteMessageDays } : undefined,
    headers: payload.reason ?
    { "X-Audit-Log-Reason": encodeURIComponent(payload.reason) } :
    undefined
  });
  return { ok: true };
}
// Channel management functions /* v9-d54cb2b2aa72cbc0 */
