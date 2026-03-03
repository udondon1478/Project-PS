"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ErrorCodes = void 0;exports.errorShape = errorShape;const ErrorCodes = exports.ErrorCodes = {
  NOT_LINKED: "NOT_LINKED",
  NOT_PAIRED: "NOT_PAIRED",
  AGENT_TIMEOUT: "AGENT_TIMEOUT",
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAVAILABLE: "UNAVAILABLE"
};
function errorShape(code, message, opts) {
  return {
    code,
    message,
    ...opts
  };
} /* v9-c4bc79c6322358a2 */
