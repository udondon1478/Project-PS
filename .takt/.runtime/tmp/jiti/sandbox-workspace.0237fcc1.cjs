"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ensureSandboxWorkspace = ensureSandboxWorkspace;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _utils = require("../../utils.js");
var _workspace = require("../workspace.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function ensureSandboxWorkspace(workspaceDir, seedFrom, skipBootstrap) {
  await _promises.default.mkdir(workspaceDir, { recursive: true });
  if (seedFrom) {
    const seed = (0, _utils.resolveUserPath)(seedFrom);
    const files = [
    _workspace.DEFAULT_AGENTS_FILENAME,
    _workspace.DEFAULT_SOUL_FILENAME,
    _workspace.DEFAULT_TOOLS_FILENAME,
    _workspace.DEFAULT_IDENTITY_FILENAME,
    _workspace.DEFAULT_USER_FILENAME,
    _workspace.DEFAULT_BOOTSTRAP_FILENAME,
    _workspace.DEFAULT_HEARTBEAT_FILENAME];

    for (const name of files) {
      const src = _nodePath.default.join(seed, name);
      const dest = _nodePath.default.join(workspaceDir, name);
      try {
        await _promises.default.access(dest);
      }
      catch {
        try {
          const content = await _promises.default.readFile(src, "utf-8");
          await _promises.default.writeFile(dest, content, { encoding: "utf-8", flag: "wx" });
        }
        catch {

          // ignore missing seed file
        }}
    }
  }
  await (0, _workspace.ensureAgentWorkspace)({
    dir: workspaceDir,
    ensureBootstrapFiles: !skipBootstrap
  });
} /* v9-63bc3179d97aebbc */
