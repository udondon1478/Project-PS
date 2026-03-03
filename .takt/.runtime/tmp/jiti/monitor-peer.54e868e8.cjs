"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolvePeerId = resolvePeerId;var _utils = require("../../../utils.js");
function resolvePeerId(msg) {
  if (msg.chatType === "group") {
    return msg.conversationId ?? msg.from;
  }
  if (msg.senderE164) {
    return (0, _utils.normalizeE164)(msg.senderE164) ?? msg.senderE164;
  }
  if (msg.from.includes("@")) {
    return (0, _utils.jidToE164)(msg.from) ?? msg.from;
  }
  return (0, _utils.normalizeE164)(msg.from) ?? msg.from;
} /* v9-deafb3dacffdf0ac */
