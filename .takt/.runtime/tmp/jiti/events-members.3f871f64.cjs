"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerSlackMemberEvents = registerSlackMemberEvents;var _globals = require("../../../globals.js");
var _systemEvents = require("../../../infra/system-events.js");
var _channelConfig = require("../channel-config.js");
function registerSlackMemberEvents(params) {
  const { ctx } = params;
  ctx.app.event("member_joined_channel", async ({ event, body }) => {
    try {
      if (ctx.shouldDropMismatchedSlackEvent(body)) {
        return;
      }
      const payload = event;
      const channelId = payload.channel;
      const channelInfo = channelId ? await ctx.resolveChannelName(channelId) : {};
      const channelType = payload.channel_type ?? channelInfo?.type;
      if (!ctx.isChannelAllowed({
        channelId,
        channelName: channelInfo?.name,
        channelType
      })) {
        return;
      }
      const userInfo = payload.user ? await ctx.resolveUserName(payload.user) : {};
      const userLabel = userInfo?.name ?? payload.user ?? "someone";
      const label = (0, _channelConfig.resolveSlackChannelLabel)({
        channelId,
        channelName: channelInfo?.name
      });
      const sessionKey = ctx.resolveSlackSystemEventSessionKey({
        channelId,
        channelType
      });
      (0, _systemEvents.enqueueSystemEvent)(`Slack: ${userLabel} joined ${label}.`, {
        sessionKey,
        contextKey: `slack:member:joined:${channelId ?? "unknown"}:${payload.user ?? "unknown"}`
      });
    }
    catch (err) {
      ctx.runtime.error?.((0, _globals.danger)(`slack join handler failed: ${String(err)}`));
    }
  });
  ctx.app.event("member_left_channel", async ({ event, body }) => {
    try {
      if (ctx.shouldDropMismatchedSlackEvent(body)) {
        return;
      }
      const payload = event;
      const channelId = payload.channel;
      const channelInfo = channelId ? await ctx.resolveChannelName(channelId) : {};
      const channelType = payload.channel_type ?? channelInfo?.type;
      if (!ctx.isChannelAllowed({
        channelId,
        channelName: channelInfo?.name,
        channelType
      })) {
        return;
      }
      const userInfo = payload.user ? await ctx.resolveUserName(payload.user) : {};
      const userLabel = userInfo?.name ?? payload.user ?? "someone";
      const label = (0, _channelConfig.resolveSlackChannelLabel)({
        channelId,
        channelName: channelInfo?.name
      });
      const sessionKey = ctx.resolveSlackSystemEventSessionKey({
        channelId,
        channelType
      });
      (0, _systemEvents.enqueueSystemEvent)(`Slack: ${userLabel} left ${label}.`, {
        sessionKey,
        contextKey: `slack:member:left:${channelId ?? "unknown"}:${payload.user ?? "unknown"}`
      });
    }
    catch (err) {
      ctx.runtime.error?.((0, _globals.danger)(`slack leave handler failed: ${String(err)}`));
    }
  });
} /* v9-e63eca8f18fa1f9f */
