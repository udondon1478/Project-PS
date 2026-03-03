"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleDiscordModerationAction = handleDiscordModerationAction;var _send = require("../../discord/send.js");
var _common = require("./common.js");
async function handleDiscordModerationAction(action, params, isActionEnabled) {
  const accountId = (0, _common.readStringParam)(params, "accountId");
  switch (action) {
    case "timeout":{
        if (!isActionEnabled("moderation", false)) {
          throw new Error("Discord moderation is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const userId = (0, _common.readStringParam)(params, "userId", {
          required: true
        });
        const durationMinutes = typeof params.durationMinutes === "number" && Number.isFinite(params.durationMinutes) ?
        params.durationMinutes :
        undefined;
        const until = (0, _common.readStringParam)(params, "until");
        const reason = (0, _common.readStringParam)(params, "reason");
        const member = accountId ?
        await (0, _send.timeoutMemberDiscord)({
          guildId,
          userId,
          durationMinutes,
          until,
          reason
        }, { accountId }) :
        await (0, _send.timeoutMemberDiscord)({
          guildId,
          userId,
          durationMinutes,
          until,
          reason
        });
        return (0, _common.jsonResult)({ ok: true, member });
      }
    case "kick":{
        if (!isActionEnabled("moderation", false)) {
          throw new Error("Discord moderation is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const userId = (0, _common.readStringParam)(params, "userId", {
          required: true
        });
        const reason = (0, _common.readStringParam)(params, "reason");
        if (accountId) {
          await (0, _send.kickMemberDiscord)({ guildId, userId, reason }, { accountId });
        } else
        {
          await (0, _send.kickMemberDiscord)({ guildId, userId, reason });
        }
        return (0, _common.jsonResult)({ ok: true });
      }
    case "ban":{
        if (!isActionEnabled("moderation", false)) {
          throw new Error("Discord moderation is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const userId = (0, _common.readStringParam)(params, "userId", {
          required: true
        });
        const reason = (0, _common.readStringParam)(params, "reason");
        const deleteMessageDays = typeof params.deleteMessageDays === "number" && Number.isFinite(params.deleteMessageDays) ?
        params.deleteMessageDays :
        undefined;
        if (accountId) {
          await (0, _send.banMemberDiscord)({
            guildId,
            userId,
            reason,
            deleteMessageDays
          }, { accountId });
        } else
        {
          await (0, _send.banMemberDiscord)({
            guildId,
            userId,
            reason,
            deleteMessageDays
          });
        }
        return (0, _common.jsonResult)({ ok: true });
      }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
} /* v9-8dc033fa53dd4c4c */
