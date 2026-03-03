"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeChatType = normalizeChatType;function normalizeChatType(raw) {
  const value = raw?.trim().toLowerCase();
  if (!value) {
    return undefined;
  }
  if (value === "direct" || value === "dm") {
    return "direct";
  }
  if (value === "group") {
    return "group";
  }
  if (value === "channel") {
    return "channel";
  }
  return undefined;
} /* v9-435f91192e2b5481 */
