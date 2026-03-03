"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.parseConfigCommand = parseConfigCommand;var _configValue = require("./config-value.js");
function parseConfigCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("/config")) {
    return null;
  }
  const rest = trimmed.slice("/config".length).trim();
  if (!rest) {
    return { action: "show" };
  }
  const match = rest.match(/^(\S+)(?:\s+([\s\S]+))?$/);
  if (!match) {
    return { action: "error", message: "Invalid /config syntax." };
  }
  const action = match[1].toLowerCase();
  const args = (match[2] ?? "").trim();
  switch (action) {
    case "show":
      return { action: "show", path: args || undefined };
    case "get":
      return { action: "show", path: args || undefined };
    case "unset":{
        if (!args) {
          return { action: "error", message: "Usage: /config unset path" };
        }
        return { action: "unset", path: args };
      }
    case "set":{
        if (!args) {
          return {
            action: "error",
            message: "Usage: /config set path=value"
          };
        }
        const eqIndex = args.indexOf("=");
        if (eqIndex <= 0) {
          return {
            action: "error",
            message: "Usage: /config set path=value"
          };
        }
        const path = args.slice(0, eqIndex).trim();
        const rawValue = args.slice(eqIndex + 1);
        if (!path) {
          return {
            action: "error",
            message: "Usage: /config set path=value"
          };
        }
        const parsed = (0, _configValue.parseConfigValue)(rawValue);
        if (parsed.error) {
          return { action: "error", message: parsed.error };
        }
        return { action: "set", path, value: parsed.value };
      }
    default:
      return {
        action: "error",
        message: "Usage: /config show|set|unset"
      };
  }
} /* v9-4fcded77ff3b1d9a */
