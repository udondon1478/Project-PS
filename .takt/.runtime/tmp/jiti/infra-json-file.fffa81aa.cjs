"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.loadJsonFile = loadJsonFile;exports.saveJsonFile = saveJsonFile;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function loadJsonFile(pathname) {
  try {
    if (!_nodeFs.default.existsSync(pathname)) {
      return undefined;
    }
    const raw = _nodeFs.default.readFileSync(pathname, "utf8");
    return JSON.parse(raw);
  }
  catch {
    return undefined;
  }
}
function saveJsonFile(pathname, data) {
  const dir = _nodePath.default.dirname(pathname);
  if (!_nodeFs.default.existsSync(dir)) {
    _nodeFs.default.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  _nodeFs.default.writeFileSync(pathname, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  _nodeFs.default.chmodSync(pathname, 0o600);
} /* v9-118c521726de27d0 */
