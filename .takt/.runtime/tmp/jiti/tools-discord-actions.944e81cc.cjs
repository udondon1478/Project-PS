"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleDiscordAction = handleDiscordAction;var _common = require("./common.js");
var _discordActionsGuild = require("./discord-actions-guild.js");
var _discordActionsMessaging = require("./discord-actions-messaging.js");
var _discordActionsModeration = require("./discord-actions-moderation.js");
const messagingActions = new Set([
"react",
"reactions",
"sticker",
"poll",
"permissions",
"fetchMessage",
"readMessages",
"sendMessage",
"editMessage",
"deleteMessage",
"threadCreate",
"threadList",
"threadReply",
"pinMessage",
"unpinMessage",
"listPins",
"searchMessages"]
);
const guildActions = new Set([
"memberInfo",
"roleInfo",
"emojiList",
"emojiUpload",
"stickerUpload",
"roleAdd",
"roleRemove",
"channelInfo",
"channelList",
"voiceStatus",
"eventList",
"eventCreate",
"channelCreate",
"channelEdit",
"channelDelete",
"channelMove",
"categoryCreate",
"categoryEdit",
"categoryDelete",
"channelPermissionSet",
"channelPermissionRemove"]
);
const moderationActions = new Set(["timeout", "kick", "ban"]);
async function handleDiscordAction(params, cfg) {
  const action = (0, _common.readStringParam)(params, "action", { required: true });
  const isActionEnabled = (0, _common.createActionGate)(cfg.channels?.discord?.actions);
  if (messagingActions.has(action)) {
    return await (0, _discordActionsMessaging.handleDiscordMessagingAction)(action, params, isActionEnabled);
  }
  if (guildActions.has(action)) {
    return await (0, _discordActionsGuild.handleDiscordGuildAction)(action, params, isActionEnabled);
  }
  if (moderationActions.has(action)) {
    return await (0, _discordActionsModeration.handleDiscordModerationAction)(action, params, isActionEnabled);
  }
  throw new Error(`Unknown action: ${action}`);
} /* v9-78b64f6c9d6c63f9 */
