"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.withTelegramApiErrorLogging = withTelegramApiErrorLogging;var _globals = require("../globals.js");
var _errors = require("../infra/errors.js");
var _subsystem = require("../logging/subsystem.js");
const fallbackLogger = (0, _subsystem.createSubsystemLogger)("telegram/api");
function resolveTelegramApiLogger(runtime, logger) {
  if (logger) {
    return logger;
  }
  if (runtime?.error) {
    return runtime.error;
  }
  return (message) => fallbackLogger.error(message);
}
async function withTelegramApiErrorLogging({ operation, fn, runtime, logger, shouldLog }) {
  try {
    return await fn();
  }
  catch (err) {
    if (!shouldLog || shouldLog(err)) {
      const errText = (0, _errors.formatErrorMessage)(err);
      const log = resolveTelegramApiLogger(runtime, logger);
      log((0, _globals.danger)(`telegram ${operation} failed: ${errText}`));
    }
    throw err;
  }
} /* v9-05a33264eaec8627 */
