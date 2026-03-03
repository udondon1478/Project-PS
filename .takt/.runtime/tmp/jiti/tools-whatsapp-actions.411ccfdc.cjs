"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleWhatsAppAction = handleWhatsAppAction;var _outbound = require("../../web/outbound.js");
var _common = require("./common.js");
async function handleWhatsAppAction(params, cfg) {
  const action = (0, _common.readStringParam)(params, "action", { required: true });
  const isActionEnabled = (0, _common.createActionGate)(cfg.channels?.whatsapp?.actions);
  if (action === "react") {
    if (!isActionEnabled("reactions")) {
      throw new Error("WhatsApp reactions are disabled.");
    }
    const chatJid = (0, _common.readStringParam)(params, "chatJid", { required: true });
    const messageId = (0, _common.readStringParam)(params, "messageId", { required: true });
    const { emoji, remove, isEmpty } = (0, _common.readReactionParams)(params, {
      removeErrorMessage: "Emoji is required to remove a WhatsApp reaction."
    });
    const participant = (0, _common.readStringParam)(params, "participant");
    const accountId = (0, _common.readStringParam)(params, "accountId");
    const fromMeRaw = params.fromMe;
    const fromMe = typeof fromMeRaw === "boolean" ? fromMeRaw : undefined;
    const resolvedEmoji = remove ? "" : emoji;
    await (0, _outbound.sendReactionWhatsApp)(chatJid, messageId, resolvedEmoji, {
      verbose: false,
      fromMe,
      participant: participant ?? undefined,
      accountId: accountId ?? undefined
    });
    if (!remove && !isEmpty) {
      return (0, _common.jsonResult)({ ok: true, added: emoji });
    }
    return (0, _common.jsonResult)({ ok: true, removed: true });
  }
  throw new Error(`Unsupported WhatsApp action: ${action}`);
} /* v9-e35def4c54360c25 */
