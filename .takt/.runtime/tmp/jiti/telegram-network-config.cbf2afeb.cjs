"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.TELEGRAM_ENABLE_AUTO_SELECT_FAMILY_ENV = exports.TELEGRAM_DISABLE_AUTO_SELECT_FAMILY_ENV = void 0;exports.resolveTelegramAutoSelectFamilyDecision = resolveTelegramAutoSelectFamilyDecision;var _nodeProcess = _interopRequireDefault(require("node:process"));
var _env = require("../infra/env.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const TELEGRAM_DISABLE_AUTO_SELECT_FAMILY_ENV = exports.TELEGRAM_DISABLE_AUTO_SELECT_FAMILY_ENV = "OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY";
const TELEGRAM_ENABLE_AUTO_SELECT_FAMILY_ENV = exports.TELEGRAM_ENABLE_AUTO_SELECT_FAMILY_ENV = "OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY";
function resolveTelegramAutoSelectFamilyDecision(params) {
  const env = params?.env ?? _nodeProcess.default.env;
  const nodeMajor = typeof params?.nodeMajor === "number" ?
  params.nodeMajor :
  Number(_nodeProcess.default.versions.node.split(".")[0]);
  if ((0, _env.isTruthyEnvValue)(env[TELEGRAM_ENABLE_AUTO_SELECT_FAMILY_ENV])) {
    return { value: true, source: `env:${TELEGRAM_ENABLE_AUTO_SELECT_FAMILY_ENV}` };
  }
  if ((0, _env.isTruthyEnvValue)(env[TELEGRAM_DISABLE_AUTO_SELECT_FAMILY_ENV])) {
    return { value: false, source: `env:${TELEGRAM_DISABLE_AUTO_SELECT_FAMILY_ENV}` };
  }
  if (typeof params?.network?.autoSelectFamily === "boolean") {
    return { value: params.network.autoSelectFamily, source: "config" };
  }
  if (Number.isFinite(nodeMajor) && nodeMajor >= 22) {
    return { value: false, source: "default-node22" };
  }
  return { value: null };
} /* v9-cc47e56436ff08f8 */
