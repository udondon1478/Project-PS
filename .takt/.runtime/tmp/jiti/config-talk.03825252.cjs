"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.readTalkApiKeyFromProfile = readTalkApiKeyFromProfile;exports.resolveTalkApiKey = resolveTalkApiKey;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function readTalkApiKeyFromProfile(deps = {}) {
  const fsImpl = deps.fs ?? _nodeFs.default;
  const osImpl = deps.os ?? _nodeOs.default;
  const pathImpl = deps.path ?? _nodePath.default;
  const home = osImpl.homedir();
  const candidates = [".profile", ".zprofile", ".zshrc", ".bashrc"].map((name) => pathImpl.join(home, name));
  for (const candidate of candidates) {
    if (!fsImpl.existsSync(candidate)) {
      continue;
    }
    try {
      const text = fsImpl.readFileSync(candidate, "utf-8");
      const match = text.match(/(?:^|\n)\s*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*["']?([^\n"']+)["']?/);
      const value = match?.[1]?.trim();
      if (value) {
        return value;
      }
    }
    catch {

      // Ignore profile read errors.
    }}
  return null;
}
function resolveTalkApiKey(env = process.env, deps = {}) {
  const envValue = (env.ELEVENLABS_API_KEY ?? "").trim();
  if (envValue) {
    return envValue;
  }
  return readTalkApiKeyFromProfile(deps);
} /* v9-14dab831dc60a777 */
