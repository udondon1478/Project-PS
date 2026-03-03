"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.movePathToTrash = movePathToTrash;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _exec = require("../process/exec.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function movePathToTrash(targetPath) {
  try {
    await (0, _exec.runExec)("trash", [targetPath], { timeoutMs: 10_000 });
    return targetPath;
  }
  catch {
    const trashDir = _nodePath.default.join(_nodeOs.default.homedir(), ".Trash");
    _nodeFs.default.mkdirSync(trashDir, { recursive: true });
    const base = _nodePath.default.basename(targetPath);
    let dest = _nodePath.default.join(trashDir, `${base}-${Date.now()}`);
    if (_nodeFs.default.existsSync(dest)) {
      dest = _nodePath.default.join(trashDir, `${base}-${Date.now()}-${Math.random()}`);
    }
    _nodeFs.default.renameSync(targetPath, dest);
    return dest;
  }
} /* v9-2be66346f4843853 */
