"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerSlackReactionEvents = registerSlackReactionEvents;var _globals = require("../../../globals.js");
var _systemEvents = require("../../../infra/system-events.js");
var _channelConfig = require("../channel-config.js");
function registerSlackReactionEvents(params) {
  const { ctx } = params;
  const handleReactionEvent = async (event, action) => {
    try {
      const item = event.item;
      if (!item || item.type !== "message") {
        return;
      }
      const channelInfo = item.channel ? await ctx.resolveChannelName(item.channel) : {};
      const channelType = channelInfo?.type;
      if (!ctx.isChannelAllowed({
        channelId: item.channel,
        channelName: channelInfo?.name,
        channelType
      })) {
        return;
      }
      const channelLabel = (0, _channelConfig.resolveSlackChannelLabel)({
        channelId: item.channel,
        channelName: channelInfo?.name
      });
      const actorInfo = event.user ? await ctx.resolveUserName(event.user) : undefined;
      const actorLabel = actorInfo?.name ?? event.user;
      const emojiLabel = event.reaction ?? "emoji";
      const authorInfo = event.item_user ? await ctx.resolveUserName(event.item_user) : undefined;
      const authorLabel = authorInfo?.name ?? event.item_user;
      const baseText = `Slack reaction ${action}: :${emojiLabel}: by ${actorLabel} in ${channelLabel} msg ${item.ts}`;
      const text = authorLabel ? `${baseText} from ${authorLabel}` : baseText;
      const sessionKey = ctx.resolveSlackSystemEventSessionKey({
        channelId: item.channel,
        channelType
      });
      (0, _systemEvents.enqueueSystemEvent)(text, {
        sessionKey,
        contextKey: `slack:reaction:${action}:${item.channel}:${item.ts}:${event.user}:${emojiLabel}`
      });
    }
    catch (err) {
      ctx.runtime.error?.((0, _globals.danger)(`slack reaction handler failed: ${String(err)}`));
    }
  };
  ctx.app.event("reaction_added", async ({ event, body }) => {
    if (ctx.shouldDropMismatchedSlackEvent(body)) {
      return;
    }
    await handleReactionEvent(event, "added");
  });
  ctx.app.event("reaction_removed", async ({ event, body }) => {
    if (ctx.shouldDropMismatchedSlackEvent(body)) {
      return;
    }
    await handleReactionEvent(event, "removed");
  });
} /* v9-5735c7488cc68d28 */
