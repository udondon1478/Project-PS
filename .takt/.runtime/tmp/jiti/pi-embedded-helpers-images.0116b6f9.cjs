"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isEmptyAssistantMessageContent = isEmptyAssistantMessageContent;exports.sanitizeSessionMessagesImages = sanitizeSessionMessagesImages;var _toolCallId = require("../tool-call-id.js");
var _toolImages = require("../tool-images.js");
var _bootstrap = require("./bootstrap.js");
function isEmptyAssistantMessageContent(message) {
  const content = message.content;
  if (content == null) {
    return true;
  }
  if (!Array.isArray(content)) {
    return false;
  }
  return content.every((block) => {
    if (!block || typeof block !== "object") {
      return true;
    }
    const rec = block;
    if (rec.type !== "text") {
      return false;
    }
    return typeof rec.text !== "string" || rec.text.trim().length === 0;
  });
}
async function sanitizeSessionMessagesImages(messages, label, options) {
  const sanitizeMode = options?.sanitizeMode ?? "full";
  const allowNonImageSanitization = sanitizeMode === "full";
  // We sanitize historical session messages because Anthropic can reject a request
  // if the transcript contains oversized base64 images (see MAX_IMAGE_DIMENSION_PX).
  const sanitizedIds = allowNonImageSanitization && options?.sanitizeToolCallIds ?
  (0, _toolCallId.sanitizeToolCallIdsForCloudCodeAssist)(messages, options.toolCallIdMode) :
  messages;
  const out = [];
  for (const msg of sanitizedIds) {
    if (!msg || typeof msg !== "object") {
      out.push(msg);
      continue;
    }
    const role = msg.role;
    if (role === "toolResult") {
      const toolMsg = msg;
      const content = Array.isArray(toolMsg.content) ? toolMsg.content : [];
      const nextContent = await (0, _toolImages.sanitizeContentBlocksImages)(content, label);
      out.push({ ...toolMsg, content: nextContent });
      continue;
    }
    if (role === "user") {
      const userMsg = msg;
      const content = userMsg.content;
      if (Array.isArray(content)) {
        const nextContent = await (0, _toolImages.sanitizeContentBlocksImages)(content, label);
        out.push({ ...userMsg, content: nextContent });
        continue;
      }
    }
    if (role === "assistant") {
      const assistantMsg = msg;
      if (assistantMsg.stopReason === "error") {
        const content = assistantMsg.content;
        if (Array.isArray(content)) {
          const nextContent = await (0, _toolImages.sanitizeContentBlocksImages)(content, label);
          out.push({ ...assistantMsg, content: nextContent });
        } else
        {
          out.push(assistantMsg);
        }
        continue;
      }
      const content = assistantMsg.content;
      if (Array.isArray(content)) {
        if (!allowNonImageSanitization) {
          const nextContent = await (0, _toolImages.sanitizeContentBlocksImages)(content, label);
          out.push({ ...assistantMsg, content: nextContent });
          continue;
        }
        const strippedContent = options?.preserveSignatures ?
        content // Keep signatures for Antigravity Claude
        : (0, _bootstrap.stripThoughtSignatures)(content, options?.sanitizeThoughtSignatures); // Strip for Gemini
        const filteredContent = strippedContent.filter((block) => {
          if (!block || typeof block !== "object") {
            return true;
          }
          const rec = block;
          if (rec.type !== "text" || typeof rec.text !== "string") {
            return true;
          }
          return rec.text.trim().length > 0;
        });
        const finalContent = await (0, _toolImages.sanitizeContentBlocksImages)(filteredContent, label);
        if (finalContent.length === 0) {
          continue;
        }
        out.push({ ...assistantMsg, content: finalContent });
        continue;
      }
    }
    out.push(msg);
  }
  return out;
} /* v9-12a1923b6105ef4c */
