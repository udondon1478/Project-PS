"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeGroupActivation = normalizeGroupActivation;exports.parseActivationCommand = parseActivationCommand;var _commandsRegistry = require("./commands-registry.js");
function normalizeGroupActivation(raw) {
  const value = raw?.trim().toLowerCase();
  if (value === "mention") {
    return "mention";
  }
  if (value === "always") {
    return "always";
  }
  return undefined;
}
function parseActivationCommand(raw) {
  if (!raw) {
    return { hasCommand: false };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { hasCommand: false };
  }
  const normalized = (0, _commandsRegistry.normalizeCommandBody)(trimmed);
  const match = normalized.match(/^\/activation(?:\s+([a-zA-Z]+))?\s*$/i);
  if (!match) {
    return { hasCommand: false };
  }
  const mode = normalizeGroupActivation(match[1]);
  return { hasCommand: true, mode };
} /* v9-a149d3791a571954 */
