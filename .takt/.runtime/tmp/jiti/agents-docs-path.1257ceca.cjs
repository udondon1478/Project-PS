"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveOpenClawDocsPath = resolveOpenClawDocsPath;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _openclawRoot = require("../infra/openclaw-root.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function resolveOpenClawDocsPath(params) {
  const workspaceDir = params.workspaceDir?.trim();
  if (workspaceDir) {
    const workspaceDocs = _nodePath.default.join(workspaceDir, "docs");
    if (_nodeFs.default.existsSync(workspaceDocs)) {
      return workspaceDocs;
    }
  }
  const packageRoot = await (0, _openclawRoot.resolveOpenClawPackageRoot)({
    cwd: params.cwd,
    argv1: params.argv1,
    moduleUrl: params.moduleUrl
  });
  if (!packageRoot) {
    return null;
  }
  const packageDocs = _nodePath.default.join(packageRoot, "docs");
  return _nodeFs.default.existsSync(packageDocs) ? packageDocs : null;
} /* v9-a6e9a26367229f82 */
