"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveSignalReactionLevel = resolveSignalReactionLevel;var _accounts = require("./accounts.js");
/**
 * Resolve the effective reaction level and its implications for Signal.
 *
 * Levels:
 * - "off": No reactions at all
 * - "ack": Only automatic ack reactions (👀 when processing), no agent reactions
 * - "minimal": Agent can react, but sparingly (default)
 * - "extensive": Agent can react liberally
 */
function resolveSignalReactionLevel(params) {
  const account = (0, _accounts.resolveSignalAccount)({
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
      // Fallback to minimal behavior
      return {
        level: "minimal",
        ackEnabled: false,
        agentReactionsEnabled: true,
        agentReactionGuidance: "minimal"
      };
  }
} /* v9-ea55c177af6133fe */
