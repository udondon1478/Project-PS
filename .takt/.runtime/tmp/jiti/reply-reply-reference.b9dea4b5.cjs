"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createReplyReferencePlanner = createReplyReferencePlanner;function createReplyReferencePlanner(options) {
  let hasReplied = options.hasReplied ?? false;
  const allowReference = options.allowReference !== false;
  const existingId = options.existingId?.trim();
  const startId = options.startId?.trim();
  const use = () => {
    if (!allowReference) {
      return undefined;
    }
    if (existingId) {
      hasReplied = true;
      return existingId;
    }
    if (!startId) {
      return undefined;
    }
    if (options.replyToMode === "off") {
      return undefined;
    }
    if (options.replyToMode === "all") {
      hasReplied = true;
      return startId;
    }
    if (!hasReplied) {
      hasReplied = true;
      return startId;
    }
    return undefined;
  };
  const markSent = () => {
    hasReplied = true;
  };
  return {
    use,
    markSent,
    hasReplied: () => hasReplied
  };
} /* v9-d8afc9364505640f */
