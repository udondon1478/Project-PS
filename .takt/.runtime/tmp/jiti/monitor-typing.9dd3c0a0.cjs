"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.sendTyping = sendTyping;async function sendTyping(params) {
  const channel = await params.client.fetchChannel(params.channelId);
  if (!channel) {
    return;
  }
  if ("triggerTyping" in channel && typeof channel.triggerTyping === "function") {
    await channel.triggerTyping();
  }
} /* v9-2020b0baaf950e8b */
