"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatPairingApproveHint = formatPairingApproveHint;exports.resolveChannelDefaultAccountId = resolveChannelDefaultAccountId;var _commandFormat = require("../../cli/command-format.js");
var _sessionKey = require("../../routing/session-key.js");
// Channel docking helper: use this when selecting the default account for a plugin.
function resolveChannelDefaultAccountId(params) {
  const accountIds = params.accountIds ?? params.plugin.config.listAccountIds(params.cfg);
  return params.plugin.config.defaultAccountId?.(params.cfg) ?? accountIds[0] ?? _sessionKey.DEFAULT_ACCOUNT_ID;
}
function formatPairingApproveHint(channelId) {
  const listCmd = (0, _commandFormat.formatCliCommand)(`openclaw pairing list ${channelId}`);
  const approveCmd = (0, _commandFormat.formatCliCommand)(`openclaw pairing approve ${channelId} <code>`);
  return `Approve via: ${listCmd} / ${approveCmd}`;
} /* v9-bc5a36a1f36fd24e */
