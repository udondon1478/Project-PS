"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.MediaUnderstandingSkipError = void 0;exports.isMediaUnderstandingSkipError = isMediaUnderstandingSkipError;class MediaUnderstandingSkipError extends Error {
  reason;
  constructor(reason, message) {
    super(message);
    this.reason = reason;
    this.name = "MediaUnderstandingSkipError";
  }
}exports.MediaUnderstandingSkipError = MediaUnderstandingSkipError;
function isMediaUnderstandingSkipError(err) {
  return err instanceof MediaUnderstandingSkipError;
} /* v9-65094a169096cc05 */
