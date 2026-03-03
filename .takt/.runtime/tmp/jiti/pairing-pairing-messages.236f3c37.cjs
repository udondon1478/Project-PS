"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildPairingReply = buildPairingReply;var _commandFormat = require("../cli/command-format.js");
function buildPairingReply(params) {
  const { channel, idLine, code } = params;
  return [
  "OpenClaw: access not configured.",
  "",
  idLine,
  "",
  `Pairing code: ${code}`,
  "",
  "Ask the bot owner to approve with:",
  (0, _commandFormat.formatCliCommand)(`openclaw pairing approve ${channel} <code>`)].
  join("\n");
} /* v9-8d24623ccbf78dd1 */
