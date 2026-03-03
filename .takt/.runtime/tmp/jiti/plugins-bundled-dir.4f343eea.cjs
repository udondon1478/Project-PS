"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveBundledPluginsDir = resolveBundledPluginsDir;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUrl = require("node:url");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolveBundledPluginsDir() {
  const override = process.env.OPENCLAW_BUNDLED_PLUGINS_DIR?.trim();
  if (override) {
    return override;
  }
  // bun --compile: ship a sibling `extensions/` next to the executable.
  try {
    const execDir = _nodePath.default.dirname(process.execPath);
    const sibling = _nodePath.default.join(execDir, "extensions");
    if (_nodeFs.default.existsSync(sibling)) {
      return sibling;
    }
  }
  catch {

    // ignore
  } // npm/dev: walk up from this module to find `extensions/` at the package root.
  try {
    let cursor = _nodePath.default.dirname((0, _nodeUrl.fileURLToPath)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/plugins/bundled-dir.js"));
    for (let i = 0; i < 6; i += 1) {
      const candidate = _nodePath.default.join(cursor, "extensions");
      if (_nodeFs.default.existsSync(candidate)) {
        return candidate;
      }
      const parent = _nodePath.default.dirname(cursor);
      if (parent === cursor) {
        break;
      }
      cursor = parent;
    }
  }
  catch {

    // ignore
  }return undefined;
} /* v9-ddccd36a9325abe6 */
