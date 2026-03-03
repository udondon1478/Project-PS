"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createWebSendApi = createWebSendApi;var _channelActivity = require("../../infra/channel-activity.js");
var _utils = require("../../utils.js");
function createWebSendApi(params) {
  return {
    sendMessage: async (to, text, mediaBuffer, mediaType, sendOptions) => {
      const jid = (0, _utils.toWhatsappJid)(to);
      let payload;
      if (mediaBuffer && mediaType) {
        if (mediaType.startsWith("image/")) {
          payload = {
            image: mediaBuffer,
            caption: text || undefined,
            mimetype: mediaType
          };
        } else
        if (mediaType.startsWith("audio/")) {
          payload = { audio: mediaBuffer, ptt: true, mimetype: mediaType };
        } else
        if (mediaType.startsWith("video/")) {
          const gifPlayback = sendOptions?.gifPlayback;
          payload = {
            video: mediaBuffer,
            caption: text || undefined,
            mimetype: mediaType,
            ...(gifPlayback ? { gifPlayback: true } : {})
          };
        } else
        {
          payload = {
            document: mediaBuffer,
            fileName: "file",
            caption: text || undefined,
            mimetype: mediaType
          };
        }
      } else
      {
        payload = { text };
      }
      const result = await params.sock.sendMessage(jid, payload);
      const accountId = sendOptions?.accountId ?? params.defaultAccountId;
      (0, _channelActivity.recordChannelActivity)({
        channel: "whatsapp",
        accountId,
        direction: "outbound"
      });
      const messageId = typeof result === "object" && result && "key" in result ?
      String(result.key?.id ?? "unknown") :
      "unknown";
      return { messageId };
    },
    sendPoll: async (to, poll) => {
      const jid = (0, _utils.toWhatsappJid)(to);
      const result = await params.sock.sendMessage(jid, {
        poll: {
          name: poll.question,
          values: poll.options,
          selectableCount: poll.maxSelections ?? 1
        }
      });
      (0, _channelActivity.recordChannelActivity)({
        channel: "whatsapp",
        accountId: params.defaultAccountId,
        direction: "outbound"
      });
      const messageId = typeof result === "object" && result && "key" in result ?
      String(result.key?.id ?? "unknown") :
      "unknown";
      return { messageId };
    },
    sendReaction: async (chatJid, messageId, emoji, fromMe, participant) => {
      const jid = (0, _utils.toWhatsappJid)(chatJid);
      await params.sock.sendMessage(jid, {
        react: {
          text: emoji,
          key: {
            remoteJid: jid,
            id: messageId,
            fromMe,
            participant: participant ? (0, _utils.toWhatsappJid)(participant) : undefined
          }
        }
      });
    },
    sendComposingTo: async (to) => {
      const jid = (0, _utils.toWhatsappJid)(to);
      await params.sock.sendPresenceUpdate("composing", jid);
    }
  };
} /* v9-7cc6ee445809af1e */
