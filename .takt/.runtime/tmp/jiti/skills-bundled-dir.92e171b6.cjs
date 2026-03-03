"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveBundledSkillsDir = resolveBundledSkillsDir;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUrl = require("node:url");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolveBundledSkillsDir() {
  const override = process.env.OPENCLAW_BUNDLED_SKILLS_DIR?.trim();
  if (override) {
    return override;
  }
  // bun --compile: ship a sibling `skills/` next to the executable.
  try {
    const execDir = _nodePath.default.dirname(process.execPath);
    const sibling = _nodePath.default.join(execDir, "skills");
    if (_nodeFs.default.existsSync(sibling)) {
      return sibling;
    }
  }
  catch {

    // ignore
  } // npm/dev: resolve `<packageRoot>/skills` relative to this module.
  try {
    const moduleDir = _nodePath.default.dirname((0, _nodeUrl.fileURLToPath)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/agents/skills/bundled-dir.js"));
    const root = _nodePath.default.resolve(moduleDir, "..", "..", "..");
    const candidate = _nodePath.default.join(root, "skills");
    if (_nodeFs.default.existsSync(candidate)) {
      return candidate;
    }
  }
  catch {

    // ignore
  }return undefined;
} /* v9-d625093fc24c2687 */
