"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveTelegramAllowedUpdates = resolveTelegramAllowedUpdates;var _grammy = require("grammy");
function resolveTelegramAllowedUpdates() {
  const updates = [..._grammy.API_CONSTANTS.DEFAULT_UPDATE_TYPES];
  if (!updates.includes("message_reaction")) {
    updates.push("message_reaction");
  }
  return updates;
} /* v9-1f71f89ab026ba6d */
