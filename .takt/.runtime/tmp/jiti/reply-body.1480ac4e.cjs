"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applySessionHints = applySessionHints;var _sessions = require("../../config/sessions.js");
var _abort = require("./abort.js");
async function applySessionHints(params) {
  let prefixedBodyBase = params.baseBody;
  const abortedHint = params.abortedLastRun ?
  "Note: The previous agent run was aborted by the user. Resume carefully or ask for clarification." :
  "";
  if (abortedHint) {
    prefixedBodyBase = `${abortedHint}\n\n${prefixedBodyBase}`;
    if (params.sessionEntry && params.sessionStore && params.sessionKey) {
      params.sessionEntry.abortedLastRun = false;
      params.sessionEntry.updatedAt = Date.now();
      params.sessionStore[params.sessionKey] = params.sessionEntry;
      if (params.storePath) {
        const sessionKey = params.sessionKey;
        await (0, _sessions.updateSessionStore)(params.storePath, (store) => {
          const entry = store[sessionKey] ?? params.sessionEntry;
          if (!entry) {
            return;
          }
          store[sessionKey] = {
            ...entry,
            abortedLastRun: false,
            updatedAt: Date.now()
          };
        });
      }
    } else
    if (params.abortKey) {
      (0, _abort.setAbortMemory)(params.abortKey, false);
    }
  }
  const messageIdHint = params.messageId?.trim() ? `[message_id: ${params.messageId.trim()}]` : "";
  if (messageIdHint) {
    prefixedBodyBase = `${prefixedBodyBase}\n${messageIdHint}`;
  }
  return prefixedBodyBase;
} /* v9-0b89155fb4f63a7a */
