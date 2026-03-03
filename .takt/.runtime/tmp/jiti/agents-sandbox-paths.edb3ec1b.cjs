"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.assertSandboxPath = assertSandboxPath;exports.resolveSandboxPath = resolveSandboxPath;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
function normalizeUnicodeSpaces(str) {
  return str.replace(UNICODE_SPACES, " ");
}
function expandPath(filePath) {
  const normalized = normalizeUnicodeSpaces(filePath);
  if (normalized === "~") {
    return _nodeOs.default.homedir();
  }
  if (normalized.startsWith("~/")) {
    return _nodeOs.default.homedir() + normalized.slice(1);
  }
  return normalized;
}
function resolveToCwd(filePath, cwd) {
  const expanded = expandPath(filePath);
  if (_nodePath.default.isAbsolute(expanded)) {
    return expanded;
  }
  return _nodePath.default.resolve(cwd, expanded);
}
function resolveSandboxPath(params) {
  const resolved = resolveToCwd(params.filePath, params.cwd);
  const rootResolved = _nodePath.default.resolve(params.root);
  const relative = _nodePath.default.relative(rootResolved, resolved);
  if (!relative || relative === "") {
    return { resolved, relative: "" };
  }
  if (relative.startsWith("..") || _nodePath.default.isAbsolute(relative)) {
    throw new Error(`Path escapes sandbox root (${shortPath(rootResolved)}): ${params.filePath}`);
  }
  return { resolved, relative };
}
async function assertSandboxPath(params) {
  const resolved = resolveSandboxPath(params);
  await assertNoSymlink(resolved.relative, _nodePath.default.resolve(params.root));
  return resolved;
}
async function assertNoSymlink(relative, root) {
  if (!relative) {
    return;
  }
  const parts = relative.split(_nodePath.default.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = _nodePath.default.join(current, part);
    try {
      const stat = await _promises.default.lstat(current);
      if (stat.isSymbolicLink()) {
        throw new Error(`Symlink not allowed in sandbox path: ${current}`);
      }
    }
    catch (err) {
      const anyErr = err;
      if (anyErr.code === "ENOENT") {
        return;
      }
      throw err;
    }
  }
}
function shortPath(value) {
  if (value.startsWith(_nodeOs.default.homedir())) {
    return `~${value.slice(_nodeOs.default.homedir().length)}`;
  }
  return value;
} /* v9-342ce3cb596ef153 */
