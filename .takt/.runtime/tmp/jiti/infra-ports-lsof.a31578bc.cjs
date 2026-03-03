"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveLsofCommand = resolveLsofCommand;exports.resolveLsofCommandSync = resolveLsofCommandSync;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _promises = _interopRequireDefault(require("node:fs/promises"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const LSOF_CANDIDATES = process.platform === "darwin" ?
["/usr/sbin/lsof", "/usr/bin/lsof"] :
["/usr/bin/lsof", "/usr/sbin/lsof"];
async function canExecute(path) {
  try {
    await _promises.default.access(path, _nodeFs.default.constants.X_OK);
    return true;
  }
  catch {
    return false;
  }
}
async function resolveLsofCommand() {
  for (const candidate of LSOF_CANDIDATES) {
    if (await canExecute(candidate)) {
      return candidate;
    }
  }
  return "lsof";
}
function resolveLsofCommandSync() {
  for (const candidate of LSOF_CANDIDATES) {
    try {
      _nodeFs.default.accessSync(candidate, _nodeFs.default.constants.X_OK);
      return candidate;
    }
    catch {

      // keep trying
    }}
  return "lsof";
} /* v9-6df191fdc33c6857 */
