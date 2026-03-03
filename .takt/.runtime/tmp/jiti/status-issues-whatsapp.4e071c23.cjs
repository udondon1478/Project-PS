"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.collectWhatsAppStatusIssues = collectWhatsAppStatusIssues;var _commandFormat = require("../../../cli/command-format.js");
var _shared = require("./shared.js");
function readWhatsAppAccountStatus(value) {
  if (!(0, _shared.isRecord)(value)) {
    return null;
  }
  return {
    accountId: value.accountId,
    enabled: value.enabled,
    linked: value.linked,
    connected: value.connected,
    running: value.running,
    reconnectAttempts: value.reconnectAttempts,
    lastError: value.lastError
  };
}
function collectWhatsAppStatusIssues(accounts) {
  const issues = [];
  for (const entry of accounts) {
    const account = readWhatsAppAccountStatus(entry);
    if (!account) {
      continue;
    }
    const accountId = (0, _shared.asString)(account.accountId) ?? "default";
    const enabled = account.enabled !== false;
    if (!enabled) {
      continue;
    }
    const linked = account.linked === true;
    const running = account.running === true;
    const connected = account.connected === true;
    const reconnectAttempts = typeof account.reconnectAttempts === "number" ? account.reconnectAttempts : null;
    const lastError = (0, _shared.asString)(account.lastError);
    if (!linked) {
      issues.push({
        channel: "whatsapp",
        accountId,
        kind: "auth",
        message: "Not linked (no WhatsApp Web session).",
        fix: `Run: ${(0, _commandFormat.formatCliCommand)("openclaw channels login")} (scan QR on the gateway host).`
      });
      continue;
    }
    if (running && !connected) {
      issues.push({
        channel: "whatsapp",
        accountId,
        kind: "runtime",
        message: `Linked but disconnected${reconnectAttempts != null ? ` (reconnectAttempts=${reconnectAttempts})` : ""}${lastError ? `: ${lastError}` : "."}`,
        fix: `Run: ${(0, _commandFormat.formatCliCommand)("openclaw doctor")} (or restart the gateway). If it persists, relink via channels login and check logs.`
      });
    }
  }
  return issues;
} /* v9-5a1947cc3b25e991 */
