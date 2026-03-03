"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleDiscordMessageAction = handleDiscordMessageAction;var _common = require("../../../../agents/tools/common.js");
var _discordActions = require("../../../../agents/tools/discord-actions.js");
var _targets = require("../../../../discord/targets.js");
var _handleActionGuildAdmin = require("./handle-action.guild-admin.js");
const providerId = "discord";
function readParentIdParam(params) {
  if (params.clearParent === true) {
    return null;
  }
  if (params.parentId === null) {
    return null;
  }
  return (0, _common.readStringParam)(params, "parentId");
}
async function handleDiscordMessageAction(ctx) {
  const { action, params, cfg } = ctx;
  const accountId = ctx.accountId ?? (0, _common.readStringParam)(params, "accountId");
  const resolveChannelId = () => (0, _targets.resolveDiscordChannelId)((0, _common.readStringParam)(params, "channelId") ?? (0, _common.readStringParam)(params, "to", { required: true }));
  if (action === "send") {
    const to = (0, _common.readStringParam)(params, "to", { required: true });
    const content = (0, _common.readStringParam)(params, "message", {
      required: true,
      allowEmpty: true
    });
    const mediaUrl = (0, _common.readStringParam)(params, "media", { trim: false });
    const replyTo = (0, _common.readStringParam)(params, "replyTo");
    const embeds = Array.isArray(params.embeds) ? params.embeds : undefined;
    return await (0, _discordActions.handleDiscordAction)({
      action: "sendMessage",
      accountId: accountId ?? undefined,
      to,
      content,
      mediaUrl: mediaUrl ?? undefined,
      replyTo: replyTo ?? undefined,
      embeds
    }, cfg);
  }
  if (action === "poll") {
    const to = (0, _common.readStringParam)(params, "to", { required: true });
    const question = (0, _common.readStringParam)(params, "pollQuestion", {
      required: true
    });
    const answers = (0, _common.readStringArrayParam)(params, "pollOption", { required: true }) ?? [];
    const allowMultiselect = typeof params.pollMulti === "boolean" ? params.pollMulti : undefined;
    const durationHours = (0, _common.readNumberParam)(params, "pollDurationHours", {
      integer: true
    });
    return await (0, _discordActions.handleDiscordAction)({
      action: "poll",
      accountId: accountId ?? undefined,
      to,
      question,
      answers,
      allowMultiselect,
      durationHours: durationHours ?? undefined,
      content: (0, _common.readStringParam)(params, "message")
    }, cfg);
  }
  if (action === "react") {
    const messageId = (0, _common.readStringParam)(params, "messageId", { required: true });
    const emoji = (0, _common.readStringParam)(params, "emoji", { allowEmpty: true });
    const remove = typeof params.remove === "boolean" ? params.remove : undefined;
    return await (0, _discordActions.handleDiscordAction)({
      action: "react",
      accountId: accountId ?? undefined,
      channelId: resolveChannelId(),
      messageId,
      emoji,
      remove
    }, cfg);
  }
  if (action === "reactions") {
    const messageId = (0, _common.readStringParam)(params, "messageId", { required: true });
    const limit = (0, _common.readNumberParam)(params, "limit", { integer: true });
    return await (0, _discordActions.handleDiscordAction)({
      action: "reactions",
      accountId: accountId ?? undefined,
      channelId: resolveChannelId(),
      messageId,
      limit
    }, cfg);
  }
  if (action === "read") {
    const limit = (0, _common.readNumberParam)(params, "limit", { integer: true });
    return await (0, _discordActions.handleDiscordAction)({
      action: "readMessages",
      accountId: accountId ?? undefined,
      channelId: resolveChannelId(),
      limit,
      before: (0, _common.readStringParam)(params, "before"),
      after: (0, _common.readStringParam)(params, "after"),
      around: (0, _common.readStringParam)(params, "around")
    }, cfg);
  }
  if (action === "edit") {
    const messageId = (0, _common.readStringParam)(params, "messageId", { required: true });
    const content = (0, _common.readStringParam)(params, "message", { required: true });
    return await (0, _discordActions.handleDiscordAction)({
      action: "editMessage",
      accountId: accountId ?? undefined,
      channelId: resolveChannelId(),
      messageId,
      content
    }, cfg);
  }
  if (action === "delete") {
    const messageId = (0, _common.readStringParam)(params, "messageId", { required: true });
    return await (0, _discordActions.handleDiscordAction)({
      action: "deleteMessage",
      accountId: accountId ?? undefined,
      channelId: resolveChannelId(),
      messageId
    }, cfg);
  }
  if (action === "pin" || action === "unpin" || action === "list-pins") {
    const messageId = action === "list-pins" ? undefined : (0, _common.readStringParam)(params, "messageId", { required: true });
    return await (0, _discordActions.handleDiscordAction)({
      action: action === "pin" ? "pinMessage" : action === "unpin" ? "unpinMessage" : "listPins",
      accountId: accountId ?? undefined,
      channelId: resolveChannelId(),
      messageId
    }, cfg);
  }
  if (action === "permissions") {
    return await (0, _discordActions.handleDiscordAction)({
      action: "permissions",
      accountId: accountId ?? undefined,
      channelId: resolveChannelId()
    }, cfg);
  }
  if (action === "thread-create") {
    const name = (0, _common.readStringParam)(params, "threadName", { required: true });
    const messageId = (0, _common.readStringParam)(params, "messageId");
    const autoArchiveMinutes = (0, _common.readNumberParam)(params, "autoArchiveMin", {
      integer: true
    });
    return await (0, _discordActions.handleDiscordAction)({
      action: "threadCreate",
      accountId: accountId ?? undefined,
      channelId: resolveChannelId(),
      name,
      messageId,
      autoArchiveMinutes
    }, cfg);
  }
  if (action === "sticker") {
    const stickerIds = (0, _common.readStringArrayParam)(params, "stickerId", {
      required: true,
      label: "sticker-id"
    }) ?? [];
    return await (0, _discordActions.handleDiscordAction)({
      action: "sticker",
      accountId: accountId ?? undefined,
      to: (0, _common.readStringParam)(params, "to", { required: true }),
      stickerIds,
      content: (0, _common.readStringParam)(params, "message")
    }, cfg);
  }
  const adminResult = await (0, _handleActionGuildAdmin.tryHandleDiscordMessageActionGuildAdmin)({
    ctx,
    resolveChannelId,
    readParentIdParam
  });
  if (adminResult !== undefined) {
    return adminResult;
  }
  throw new Error(`Action ${String(action)} is not supported for provider ${providerId}.`);
} /* v9-43b40e03f510acbd */
