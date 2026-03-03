"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.validateLineSignature = validateLineSignature;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function validateLineSignature(body, signature, channelSecret) {
  const hash = _nodeCrypto.default.createHmac("SHA256", channelSecret).update(body).digest("base64");
  const hashBuffer = Buffer.from(hash);
  const signatureBuffer = Buffer.from(signature);
  // Use constant-time comparison to prevent timing attacks.
  if (hashBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return _nodeCrypto.default.timingSafeEqual(hashBuffer, signatureBuffer);
} /* v9-a6acb542df85a639 */
