"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getActiveWebListener = getActiveWebListener;exports.requireActiveWebListener = requireActiveWebListener;exports.resolveWebAccountId = resolveWebAccountId;exports.setActiveWebListener = setActiveWebListener;var _commandFormat = require("../cli/command-format.js");
var _sessionKey = require("../routing/session-key.js");
let _currentListener = null;
const listeners = new Map();
function resolveWebAccountId(accountId) {
  return (accountId ?? "").trim() || _sessionKey.DEFAULT_ACCOUNT_ID;
}
function requireActiveWebListener(accountId) {
  const id = resolveWebAccountId(accountId);
  const listener = listeners.get(id) ?? null;
  if (!listener) {
    throw new Error(`No active WhatsApp Web listener (account: ${id}). Start the gateway, then link WhatsApp with: ${(0, _commandFormat.formatCliCommand)(`openclaw channels login --channel whatsapp --account ${id}`)}.`);
  }
  return { accountId: id, listener };
}
function setActiveWebListener(accountIdOrListener, maybeListener) {
  const { accountId, listener } = typeof accountIdOrListener === "string" ?
  { accountId: accountIdOrListener, listener: maybeListener ?? null } :
  {
    accountId: _sessionKey.DEFAULT_ACCOUNT_ID,
    listener: accountIdOrListener ?? null
  };
  const id = resolveWebAccountId(accountId);
  if (!listener) {
    listeners.delete(id);
  } else
  {
    listeners.set(id, listener);
  }
  if (id === _sessionKey.DEFAULT_ACCOUNT_ID) {
    _currentListener = listener;
  }
}
function getActiveWebListener(accountId) {
  const id = resolveWebAccountId(accountId);
  return listeners.get(id) ?? null;
} /* v9-8500f01ef465087f */
