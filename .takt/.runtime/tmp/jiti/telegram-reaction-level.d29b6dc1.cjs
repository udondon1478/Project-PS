"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveTelegramReactionLevel = resolveTelegramReactionLevel;var _accounts = require("./accounts.js");
/**
 * Resolve the effective reaction level and its implications.
 */
function resolveTelegramReactionLevel(params) {
  const account = (0, _accounts.resolveTelegramAccount)({
    cfg: params.cfg,
    accountId: params.accountId
  });
  const level = account.config.reactionLevel ?? "minimal";
  switch (level) {
    case "off":
      return {
        level,
        ackEnabled: false,
        agentReactionsEnabled: false
      };
    case "ack":
      return {
        level,
        ackEnabled: true,
        agentReactionsEnabled: false
      };
    case "minimal":
      return {
        level,
        ackEnabled: false,
        agentReactionsEnabled: true,
        agentReactionGuidance: "minimal"
      };
    case "extensive":
      return {
        level,
        ackEnabled: false,
        agentReactionsEnabled: true,
        agentReactionGuidance: "extensive"
      };
    default:
      // Fallback to ack behavior
      return {
        level: "ack",
        ackEnabled: true,
        agentReactionsEnabled: false
      };
  }
} /* v9-202a17844fd804ca */
