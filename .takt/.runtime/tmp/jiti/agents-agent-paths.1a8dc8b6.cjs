"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ensureOpenClawAgentEnv = ensureOpenClawAgentEnv;exports.resolveOpenClawAgentDir = resolveOpenClawAgentDir;var _nodePath = _interopRequireDefault(require("node:path"));
var _paths = require("../config/paths.js");
var _sessionKey = require("../routing/session-key.js");
var _utils = require("../utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolveOpenClawAgentDir() {
  const override = process.env.OPENCLAW_AGENT_DIR?.trim() || process.env.PI_CODING_AGENT_DIR?.trim();
  if (override) {
    return (0, _utils.resolveUserPath)(override);
  }
  const defaultAgentDir = _nodePath.default.join((0, _paths.resolveStateDir)(), "agents", _sessionKey.DEFAULT_AGENT_ID, "agent");
  return (0, _utils.resolveUserPath)(defaultAgentDir);
}
function ensureOpenClawAgentEnv() {
  const dir = resolveOpenClawAgentDir();
  if (!process.env.OPENCLAW_AGENT_DIR) {
    process.env.OPENCLAW_AGENT_DIR = dir;
  }
  if (!process.env.PI_CODING_AGENT_DIR) {
    process.env.PI_CODING_AGENT_DIR = dir;
  }
  return dir;
} /* v9-2d59f2b0509b5fd3 */
