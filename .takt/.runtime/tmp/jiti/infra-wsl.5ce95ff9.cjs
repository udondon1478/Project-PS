"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isWSL = isWSL;exports.isWSLEnv = isWSLEnv;var _promises = _interopRequireDefault(require("node:fs/promises"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
let wslCached = null;
function isWSLEnv() {
  if (process.env.WSL_INTEROP || process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
    return true;
  }
  return false;
}
async function isWSL() {
  if (wslCached !== null) {
    return wslCached;
  }
  if (isWSLEnv()) {
    wslCached = true;
    return wslCached;
  }
  try {
    const release = await _promises.default.readFile("/proc/sys/kernel/osrelease", "utf8");
    wslCached =
    release.toLowerCase().includes("microsoft") || release.toLowerCase().includes("wsl");
  }
  catch {
    wslCached = false;
  }
  return wslCached;
} /* v9-b79f52cd5cd66abb */
