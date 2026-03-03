"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getMachineDisplayName = getMachineDisplayName;var _nodeChild_process = require("node:child_process");
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodeUtil = require("node:util");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const execFileAsync = (0, _nodeUtil.promisify)(_nodeChild_process.execFile);
let cachedPromise = null;
async function tryScutil(key) {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/scutil", ["--get", key], {
      timeout: 1000,
      windowsHide: true
    });
    const value = String(stdout ?? "").trim();
    return value.length > 0 ? value : null;
  }
  catch {
    return null;
  }
}
function fallbackHostName() {
  return _nodeOs.default.
  hostname().
  replace(/\.local$/i, "").
  trim() || "openclaw";
}
async function getMachineDisplayName() {
  if (cachedPromise) {
    return cachedPromise;
  }
  cachedPromise = (async () => {
    if (process.env.VITEST || process.env.NODE_ENV === "test") {
      return fallbackHostName();
    }
    if (process.platform === "darwin") {
      const computerName = await tryScutil("ComputerName");
      if (computerName) {
        return computerName;
      }
      const localHostName = await tryScutil("LocalHostName");
      if (localHostName) {
        return localHostName;
      }
    }
    return fallbackHostName();
  })();
  return cachedPromise;
} /* v9-c076f0f79c6719c2 */
