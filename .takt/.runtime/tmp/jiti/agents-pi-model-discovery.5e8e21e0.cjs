"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "AuthStorage", { enumerable: true, get: function () {return _piCodingAgent.AuthStorage;} });Object.defineProperty(exports, "ModelRegistry", { enumerable: true, get: function () {return _piCodingAgent.ModelRegistry;} });exports.discoverAuthStorage = discoverAuthStorage;exports.discoverModels = discoverModels;var _piCodingAgent = require("@mariozechner/pi-coding-agent");
var _nodePath = _interopRequireDefault(require("node:path"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}

// Compatibility helpers for pi-coding-agent 0.50+ (discover* helpers removed).
function discoverAuthStorage(agentDir) {
  return new _piCodingAgent.AuthStorage(_nodePath.default.join(agentDir, "auth.json"));
}
function discoverModels(authStorage, agentDir) {
  return new _piCodingAgent.ModelRegistry(authStorage, _nodePath.default.join(agentDir, "models.json"));
} /* v9-cfe2f444972647ce */
