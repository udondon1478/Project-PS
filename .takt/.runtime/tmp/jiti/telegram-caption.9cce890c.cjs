"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.TELEGRAM_MAX_CAPTION_LENGTH = void 0;exports.splitTelegramCaption = splitTelegramCaption;const TELEGRAM_MAX_CAPTION_LENGTH = exports.TELEGRAM_MAX_CAPTION_LENGTH = 1024;
function splitTelegramCaption(text) {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    return { caption: undefined, followUpText: undefined };
  }
  if (trimmed.length > TELEGRAM_MAX_CAPTION_LENGTH) {
    return { caption: undefined, followUpText: trimmed };
  }
  return { caption: trimmed, followUpText: undefined };
} /* v9-db7467626348f483 */
