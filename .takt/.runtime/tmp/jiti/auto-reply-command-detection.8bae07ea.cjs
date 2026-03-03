"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.hasControlCommand = hasControlCommand;exports.hasInlineCommandTokens = hasInlineCommandTokens;exports.isControlCommandMessage = isControlCommandMessage;exports.shouldComputeCommandAuthorized = shouldComputeCommandAuthorized;var _commandsRegistry = require("./commands-registry.js");
var _abort = require("./reply/abort.js");
function hasControlCommand(text, cfg, options) {
  if (!text) {
    return false;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  const normalizedBody = (0, _commandsRegistry.normalizeCommandBody)(trimmed, options);
  if (!normalizedBody) {
    return false;
  }
  const lowered = normalizedBody.toLowerCase();
  const commands = cfg ? (0, _commandsRegistry.listChatCommandsForConfig)(cfg) : (0, _commandsRegistry.listChatCommands)();
  for (const command of commands) {
    for (const alias of command.textAliases) {
      const normalized = alias.trim().toLowerCase();
      if (!normalized) {
        continue;
      }
      if (lowered === normalized) {
        return true;
      }
      if (command.acceptsArgs && lowered.startsWith(normalized)) {
        const nextChar = normalizedBody.charAt(normalized.length);
        if (nextChar && /\s/.test(nextChar)) {
          return true;
        }
      }
    }
  }
  return false;
}
function isControlCommandMessage(text, cfg, options) {
  if (!text) {
    return false;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (hasControlCommand(trimmed, cfg, options)) {
    return true;
  }
  const normalized = (0, _commandsRegistry.normalizeCommandBody)(trimmed, options).trim().toLowerCase();
  return (0, _abort.isAbortTrigger)(normalized);
}
/**
 * Coarse detection for inline directives/shortcuts (e.g. "hey /status") so channel monitors
 * can decide whether to compute CommandAuthorized for a message.
 *
 * This intentionally errs on the side of false positives; CommandAuthorized only gates
 * command/directive execution, not normal chat replies.
 */
function hasInlineCommandTokens(text) {
  const body = text ?? "";
  if (!body.trim()) {
    return false;
  }
  return /(?:^|\s)[/!][a-z]/i.test(body);
}
function shouldComputeCommandAuthorized(text, cfg, options) {
  return isControlCommandMessage(text, cfg, options) || hasInlineCommandTokens(text);
} /* v9-7925359dff917d4a */
