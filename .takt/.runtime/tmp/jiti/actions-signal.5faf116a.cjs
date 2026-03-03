"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.signalMessageActions = void 0;var _common = require("../../../agents/tools/common.js");
var _accounts = require("../../../signal/accounts.js");
var _reactionLevel = require("../../../signal/reaction-level.js");
var _sendReactions = require("../../../signal/send-reactions.js");
const providerId = "signal";
const GROUP_PREFIX = "group:";
function normalizeSignalReactionRecipient(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  const withoutSignal = trimmed.replace(/^signal:/i, "").trim();
  if (!withoutSignal) {
    return withoutSignal;
  }
  if (withoutSignal.toLowerCase().startsWith("uuid:")) {
    return withoutSignal.slice("uuid:".length).trim();
  }
  return withoutSignal;
}
function resolveSignalReactionTarget(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }
  const withoutSignal = trimmed.replace(/^signal:/i, "").trim();
  if (!withoutSignal) {
    return {};
  }
  if (withoutSignal.toLowerCase().startsWith(GROUP_PREFIX)) {
    const groupId = withoutSignal.slice(GROUP_PREFIX.length).trim();
    return groupId ? { groupId } : {};
  }
  return { recipient: normalizeSignalReactionRecipient(withoutSignal) };
}
const signalMessageActions = exports.signalMessageActions = {
  listActions: ({ cfg }) => {
    const accounts = (0, _accounts.listEnabledSignalAccounts)(cfg);
    if (accounts.length === 0) {
      return [];
    }
    const configuredAccounts = accounts.filter((account) => account.configured);
    if (configuredAccounts.length === 0) {
      return [];
    }
    const actions = new Set(["send"]);
    const reactionsEnabled = configuredAccounts.some((account) => (0, _common.createActionGate)(account.config.actions)("reactions"));
    if (reactionsEnabled) {
      actions.add("react");
    }
    return Array.from(actions);
  },
  supportsAction: ({ action }) => action !== "send",
  handleAction: async ({ action, params, cfg, accountId }) => {
    if (action === "send") {
      throw new Error("Send should be handled by outbound, not actions handler.");
    }
    if (action === "react") {
      // Check reaction level first
      const reactionLevelInfo = (0, _reactionLevel.resolveSignalReactionLevel)({
        cfg,
        accountId: accountId ?? undefined
      });
      if (!reactionLevelInfo.agentReactionsEnabled) {
        throw new Error(`Signal agent reactions disabled (reactionLevel="${reactionLevelInfo.level}"). ` +
        `Set channels.signal.reactionLevel to "minimal" or "extensive" to enable.`);
      }
      // Also check the action gate for backward compatibility
      const actionConfig = (0, _accounts.resolveSignalAccount)({ cfg, accountId }).config.actions;
      const isActionEnabled = (0, _common.createActionGate)(actionConfig);
      if (!isActionEnabled("reactions")) {
        throw new Error("Signal reactions are disabled via actions.reactions.");
      }
      const recipientRaw = (0, _common.readStringParam)(params, "recipient") ??
      (0, _common.readStringParam)(params, "to", {
        required: true,
        label: "recipient (UUID, phone number, or group)"
      });
      const target = resolveSignalReactionTarget(recipientRaw);
      if (!target.recipient && !target.groupId) {
        throw new Error("recipient or group required");
      }
      const messageId = (0, _common.readStringParam)(params, "messageId", {
        required: true,
        label: "messageId (timestamp)"
      });
      const targetAuthor = (0, _common.readStringParam)(params, "targetAuthor");
      const targetAuthorUuid = (0, _common.readStringParam)(params, "targetAuthorUuid");
      if (target.groupId && !targetAuthor && !targetAuthorUuid) {
        throw new Error("targetAuthor or targetAuthorUuid required for group reactions.");
      }
      const emoji = (0, _common.readStringParam)(params, "emoji", { allowEmpty: true });
      const remove = typeof params.remove === "boolean" ? params.remove : undefined;
      const timestamp = parseInt(messageId, 10);
      if (!Number.isFinite(timestamp)) {
        throw new Error(`Invalid messageId: ${messageId}. Expected numeric timestamp.`);
      }
      if (remove) {
        if (!emoji) {
          throw new Error("Emoji required to remove reaction.");
        }
        await (0, _sendReactions.removeReactionSignal)(target.recipient ?? "", timestamp, emoji, {
          accountId: accountId ?? undefined,
          groupId: target.groupId,
          targetAuthor,
          targetAuthorUuid
        });
        return (0, _common.jsonResult)({ ok: true, removed: emoji });
      }
      if (!emoji) {
        throw new Error("Emoji required to add reaction.");
      }
      await (0, _sendReactions.sendReactionSignal)(target.recipient ?? "", timestamp, emoji, {
        accountId: accountId ?? undefined,
        groupId: target.groupId,
        targetAuthor,
        targetAuthorUuid
      });
      return (0, _common.jsonResult)({ ok: true, added: emoji });
    }
    throw new Error(`Action ${action} not supported for ${providerId}.`);
  }
}; /* v9-29cf8f874ed6e2aa */
