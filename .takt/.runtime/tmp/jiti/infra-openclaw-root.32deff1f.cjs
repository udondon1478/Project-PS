"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveOpenClawPackageRoot = resolveOpenClawPackageRoot;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUrl = require("node:url");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const CORE_PACKAGE_NAMES = new Set(["openclaw"]);
async function readPackageName(dir) {
  try {
    const raw = await _promises.default.readFile(_nodePath.default.join(dir, "package.json"), "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed.name === "string" ? parsed.name : null;
  }
  catch {
    return null;
  }
}
async function findPackageRoot(startDir, maxDepth = 12) {
  let current = _nodePath.default.resolve(startDir);
  for (let i = 0; i < maxDepth; i += 1) {
    const name = await readPackageName(current);
    if (name && CORE_PACKAGE_NAMES.has(name)) {
      return current;
    }
    const parent = _nodePath.default.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}
function candidateDirsFromArgv1(argv1) {
  const normalized = _nodePath.default.resolve(argv1);
  const candidates = [_nodePath.default.dirname(normalized)];
  const parts = normalized.split(_nodePath.default.sep);
  const binIndex = parts.lastIndexOf(".bin");
  if (binIndex > 0 && parts[binIndex - 1] === "node_modules") {
    const binName = _nodePath.default.basename(normalized);
    const nodeModulesDir = parts.slice(0, binIndex).join(_nodePath.default.sep);
    candidates.push(_nodePath.default.join(nodeModulesDir, binName));
  }
  return candidates;
}
async function resolveOpenClawPackageRoot(opts) {
  const candidates = [];
  if (opts.moduleUrl) {
    candidates.push(_nodePath.default.dirname((0, _nodeUrl.fileURLToPath)(opts.moduleUrl)));
  }
  if (opts.argv1) {
    candidates.push(...candidateDirsFromArgv1(opts.argv1));
  }
  if (opts.cwd) {
    candidates.push(opts.cwd);
  }
  for (const candidate of candidates) {
    const found = await findPackageRoot(candidate);
    if (found) {
      return found;
    }
  }
  return null;
} /* v9-78fd9d9b9507a5e5 */
