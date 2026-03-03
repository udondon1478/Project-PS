"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveDiscordSystemEvent = resolveDiscordSystemEvent;var _carbon = require("@buape/carbon");
var _format = require("./format.js");
function resolveDiscordSystemEvent(message, location) {
  switch (message.type) {
    case _carbon.MessageType.ChannelPinnedMessage:
      return buildDiscordSystemEvent(message, location, "pinned a message");
    case _carbon.MessageType.RecipientAdd:
      return buildDiscordSystemEvent(message, location, "added a recipient");
    case _carbon.MessageType.RecipientRemove:
      return buildDiscordSystemEvent(message, location, "removed a recipient");
    case _carbon.MessageType.UserJoin:
      return buildDiscordSystemEvent(message, location, "user joined");
    case _carbon.MessageType.GuildBoost:
      return buildDiscordSystemEvent(message, location, "boosted the server");
    case _carbon.MessageType.GuildBoostTier1:
      return buildDiscordSystemEvent(message, location, "boosted the server (Tier 1 reached)");
    case _carbon.MessageType.GuildBoostTier2:
      return buildDiscordSystemEvent(message, location, "boosted the server (Tier 2 reached)");
    case _carbon.MessageType.GuildBoostTier3:
      return buildDiscordSystemEvent(message, location, "boosted the server (Tier 3 reached)");
    case _carbon.MessageType.ThreadCreated:
      return buildDiscordSystemEvent(message, location, "created a thread");
    case _carbon.MessageType.AutoModerationAction:
      return buildDiscordSystemEvent(message, location, "auto moderation action");
    case _carbon.MessageType.GuildIncidentAlertModeEnabled:
      return buildDiscordSystemEvent(message, location, "raid protection enabled");
    case _carbon.MessageType.GuildIncidentAlertModeDisabled:
      return buildDiscordSystemEvent(message, location, "raid protection disabled");
    case _carbon.MessageType.GuildIncidentReportRaid:
      return buildDiscordSystemEvent(message, location, "raid reported");
    case _carbon.MessageType.GuildIncidentReportFalseAlarm:
      return buildDiscordSystemEvent(message, location, "raid report marked false alarm");
    case _carbon.MessageType.StageStart:
      return buildDiscordSystemEvent(message, location, "stage started");
    case _carbon.MessageType.StageEnd:
      return buildDiscordSystemEvent(message, location, "stage ended");
    case _carbon.MessageType.StageSpeaker:
      return buildDiscordSystemEvent(message, location, "stage speaker updated");
    case _carbon.MessageType.StageTopic:
      return buildDiscordSystemEvent(message, location, "stage topic updated");
    case _carbon.MessageType.PollResult:
      return buildDiscordSystemEvent(message, location, "poll results posted");
    case _carbon.MessageType.PurchaseNotification:
      return buildDiscordSystemEvent(message, location, "purchase notification");
    default:
      return null;
  }
}
function buildDiscordSystemEvent(message, location, action) {
  const authorLabel = message.author ? (0, _format.formatDiscordUserTag)(message.author) : "";
  const actor = authorLabel ? `${authorLabel} ` : "";
  return `Discord system: ${actor}${action} in ${location}`;
} /* v9-abd1f8f23c5fb9ed */
