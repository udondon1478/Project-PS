"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolvePairingIdLabel = resolvePairingIdLabel;var _pairing = require("../channels/plugins/pairing.js");
function resolvePairingIdLabel(channel) {
  return (0, _pairing.getPairingAdapter)(channel)?.idLabel ?? "userId";
} /* v9-0d06c39738534f66 */
