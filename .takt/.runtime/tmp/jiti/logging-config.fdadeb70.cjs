"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.readLoggingConfig = readLoggingConfig;var _json = _interopRequireDefault(require("json5"));
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _paths = require("../config/paths.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function readLoggingConfig() {
  const configPath = (0, _paths.resolveConfigPath)();
  try {
    if (!_nodeFs.default.existsSync(configPath)) {
      return undefined;
    }
    const raw = _nodeFs.default.readFileSync(configPath, "utf-8");
    const parsed = _json.default.parse(raw);
    const logging = parsed?.logging;
    if (!logging || typeof logging !== "object" || Array.isArray(logging)) {
      return undefined;
    }
    return logging;
  }
  catch {
    return undefined;
  }
} /* v9-86a2e7a3797bbc37 */
