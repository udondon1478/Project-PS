"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ensureAuthStoreFile = ensureAuthStoreFile;exports.resolveAuthStorePath = resolveAuthStorePath;exports.resolveAuthStorePathForDisplay = resolveAuthStorePathForDisplay;exports.resolveLegacyAuthStorePath = resolveLegacyAuthStorePath;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _jsonFile = require("../../infra/json-file.js");
var _utils = require("../../utils.js");
var _agentPaths = require("../agent-paths.js");
var _constants = require("./constants.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolveAuthStorePath(agentDir) {
  const resolved = (0, _utils.resolveUserPath)(agentDir ?? (0, _agentPaths.resolveOpenClawAgentDir)());
  return _nodePath.default.join(resolved, _constants.AUTH_PROFILE_FILENAME);
}
function resolveLegacyAuthStorePath(agentDir) {
  const resolved = (0, _utils.resolveUserPath)(agentDir ?? (0, _agentPaths.resolveOpenClawAgentDir)());
  return _nodePath.default.join(resolved, _constants.LEGACY_AUTH_FILENAME);
}
function resolveAuthStorePathForDisplay(agentDir) {
  const pathname = resolveAuthStorePath(agentDir);
  return pathname.startsWith("~") ? pathname : (0, _utils.resolveUserPath)(pathname);
}
function ensureAuthStoreFile(pathname) {
  if (_nodeFs.default.existsSync(pathname)) {
    return;
  }
  const payload = {
    version: _constants.AUTH_STORE_VERSION,
    profiles: {}
  };
  (0, _jsonFile.saveJsonFile)(pathname, payload);
} /* v9-3aafb7aab3bf3f48 */
