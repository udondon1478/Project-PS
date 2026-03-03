"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveCommitHash = void 0;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodeModule = require("node:module");
var _nodePath = _interopRequireDefault(require("node:path"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const formatCommit = (value) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > 7 ? trimmed.slice(0, 7) : trimmed;
};
const resolveGitHead = (startDir) => {
  let current = startDir;
  for (let i = 0; i < 12; i += 1) {
    const gitPath = _nodePath.default.join(current, ".git");
    try {
      const stat = _nodeFs.default.statSync(gitPath);
      if (stat.isDirectory()) {
        return _nodePath.default.join(gitPath, "HEAD");
      }
      if (stat.isFile()) {
        const raw = _nodeFs.default.readFileSync(gitPath, "utf-8");
        const match = raw.match(/gitdir:\s*(.+)/i);
        if (match?.[1]) {
          const resolved = _nodePath.default.resolve(current, match[1].trim());
          return _nodePath.default.join(resolved, "HEAD");
        }
      }
    }
    catch {

      // ignore missing .git at this level
    }const parent = _nodePath.default.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
};
let cachedCommit;
const readCommitFromPackageJson = () => {
  try {
    const require = (0, _nodeModule.createRequire)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/infra/git-commit.js");
    const pkg = require("../../package.json");
    return formatCommit(pkg.gitHead ?? pkg.githead ?? null);
  }
  catch {
    return null;
  }
};
const readCommitFromBuildInfo = () => {
  try {
    const require = (0, _nodeModule.createRequire)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/infra/git-commit.js");
    const info = require("../build-info.json");
    return formatCommit(info.commit ?? null);
  }
  catch {
    return null;
  }
};
const resolveCommitHash = (options = {}) => {
  if (cachedCommit !== undefined) {
    return cachedCommit;
  }
  const env = options.env ?? process.env;
  const envCommit = env.GIT_COMMIT?.trim() || env.GIT_SHA?.trim();
  const normalized = formatCommit(envCommit);
  if (normalized) {
    cachedCommit = normalized;
    return cachedCommit;
  }
  const buildInfoCommit = readCommitFromBuildInfo();
  if (buildInfoCommit) {
    cachedCommit = buildInfoCommit;
    return cachedCommit;
  }
  const pkgCommit = readCommitFromPackageJson();
  if (pkgCommit) {
    cachedCommit = pkgCommit;
    return cachedCommit;
  }
  try {
    const headPath = resolveGitHead(options.cwd ?? process.cwd());
    if (!headPath) {
      cachedCommit = null;
      return cachedCommit;
    }
    const head = _nodeFs.default.readFileSync(headPath, "utf-8").trim();
    if (!head) {
      cachedCommit = null;
      return cachedCommit;
    }
    if (head.startsWith("ref:")) {
      const ref = head.replace(/^ref:\s*/i, "").trim();
      const refPath = _nodePath.default.resolve(_nodePath.default.dirname(headPath), ref);
      const refHash = _nodeFs.default.readFileSync(refPath, "utf-8").trim();
      cachedCommit = formatCommit(refHash);
      return cachedCommit;
    }
    cachedCommit = formatCommit(head);
    return cachedCommit;
  }
  catch {
    cachedCommit = null;
    return cachedCommit;
  }
};exports.resolveCommitHash = resolveCommitHash; /* v9-60c3dd8d0d82a142 */
