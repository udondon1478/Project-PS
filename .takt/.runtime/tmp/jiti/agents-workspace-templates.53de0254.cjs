"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resetWorkspaceTemplateDirCache = resetWorkspaceTemplateDirCache;exports.resolveWorkspaceTemplateDir = resolveWorkspaceTemplateDir;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUrl = require("node:url");
var _openclawRoot = require("../infra/openclaw-root.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const FALLBACK_TEMPLATE_DIR = _nodePath.default.resolve(_nodePath.default.dirname((0, _nodeUrl.fileURLToPath)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/agents/workspace-templates.js")), "../../docs/reference/templates");
let cachedTemplateDir;
let resolvingTemplateDir;
async function pathExists(candidate) {
  try {
    await _promises.default.access(candidate);
    return true;
  }
  catch {
    return false;
  }
}
async function resolveWorkspaceTemplateDir(opts) {
  if (cachedTemplateDir) {
    return cachedTemplateDir;
  }
  if (resolvingTemplateDir) {
    return resolvingTemplateDir;
  }
  resolvingTemplateDir = (async () => {
    const moduleUrl = opts?.moduleUrl ?? "file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/agents/workspace-templates.js";
    const argv1 = opts?.argv1 ?? process.argv[1];
    const cwd = opts?.cwd ?? process.cwd();
    const packageRoot = await (0, _openclawRoot.resolveOpenClawPackageRoot)({ moduleUrl, argv1, cwd });
    const candidates = [
    packageRoot ? _nodePath.default.join(packageRoot, "docs", "reference", "templates") : null,
    cwd ? _nodePath.default.resolve(cwd, "docs", "reference", "templates") : null,
    FALLBACK_TEMPLATE_DIR].
    filter(Boolean);
    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        cachedTemplateDir = candidate;
        return candidate;
      }
    }
    cachedTemplateDir = candidates[0] ?? FALLBACK_TEMPLATE_DIR;
    return cachedTemplateDir;
  })();
  try {
    return await resolvingTemplateDir;
  } finally
  {
    resolvingTemplateDir = undefined;
  }
}
function resetWorkspaceTemplateDirCache() {
  cachedTemplateDir = undefined;
  resolvingTemplateDir = undefined;
} /* v9-0466566ce33dfb7d */
