"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeSendPolicyOverride = normalizeSendPolicyOverride;exports.parseSendPolicyCommand = parseSendPolicyCommand;var _commandsRegistry = require("./commands-registry.js");
function normalizeSendPolicyOverride(raw) {
  const value = raw?.trim().toLowerCase();
  if (!value) {
    return undefined;
  }
  if (value === "allow" || value === "on") {
    return "allow";
  }
  if (value === "deny" || value === "off") {
    return "deny";
  }
  return undefined;
}
function parseSendPolicyCommand(raw) {
  if (!raw) {
    return { hasCommand: false };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { hasCommand: false };
  }
  const normalized = (0, _commandsRegistry.normalizeCommandBody)(trimmed);
  const match = normalized.match(/^\/send(?:\s+([a-zA-Z]+))?\s*$/i);
  if (!match) {
    return { hasCommand: false };
  }
  const token = match[1]?.trim().toLowerCase();
  if (!token) {
    return { hasCommand: true };
  }
  if (token === "inherit" || token === "default" || token === "reset") {
    return { hasCommand: true, mode: "inherit" };
  }
  const mode = normalizeSendPolicyOverride(token);
  return { hasCommand: true, mode };
} /* v9-6f96bd70bf7f8187 */
