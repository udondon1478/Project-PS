"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_USER_FILENAME = exports.DEFAULT_TOOLS_FILENAME = exports.DEFAULT_SOUL_FILENAME = exports.DEFAULT_MEMORY_FILENAME = exports.DEFAULT_MEMORY_ALT_FILENAME = exports.DEFAULT_IDENTITY_FILENAME = exports.DEFAULT_HEARTBEAT_FILENAME = exports.DEFAULT_BOOTSTRAP_FILENAME = exports.DEFAULT_AGENT_WORKSPACE_DIR = exports.DEFAULT_AGENTS_FILENAME = void 0;exports.ensureAgentWorkspace = ensureAgentWorkspace;exports.filterBootstrapFilesForSession = filterBootstrapFilesForSession;exports.loadWorkspaceBootstrapFiles = loadWorkspaceBootstrapFiles;exports.resolveDefaultAgentWorkspaceDir = resolveDefaultAgentWorkspaceDir;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _exec = require("../process/exec.js");
var _sessionKey = require("../routing/session-key.js");
var _utils = require("../utils.js");
var _workspaceTemplates = require("./workspace-templates.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolveDefaultAgentWorkspaceDir(env = process.env, homedir = _nodeOs.default.homedir) {
  const profile = env.OPENCLAW_PROFILE?.trim();
  if (profile && profile.toLowerCase() !== "default") {
    return _nodePath.default.join(homedir(), ".openclaw", `workspace-${profile}`);
  }
  return _nodePath.default.join(homedir(), ".openclaw", "workspace");
}
const DEFAULT_AGENT_WORKSPACE_DIR = exports.DEFAULT_AGENT_WORKSPACE_DIR = resolveDefaultAgentWorkspaceDir();
const DEFAULT_AGENTS_FILENAME = exports.DEFAULT_AGENTS_FILENAME = "AGENTS.md";
const DEFAULT_SOUL_FILENAME = exports.DEFAULT_SOUL_FILENAME = "SOUL.md";
const DEFAULT_TOOLS_FILENAME = exports.DEFAULT_TOOLS_FILENAME = "TOOLS.md";
const DEFAULT_IDENTITY_FILENAME = exports.DEFAULT_IDENTITY_FILENAME = "IDENTITY.md";
const DEFAULT_USER_FILENAME = exports.DEFAULT_USER_FILENAME = "USER.md";
const DEFAULT_HEARTBEAT_FILENAME = exports.DEFAULT_HEARTBEAT_FILENAME = "HEARTBEAT.md";
const DEFAULT_BOOTSTRAP_FILENAME = exports.DEFAULT_BOOTSTRAP_FILENAME = "BOOTSTRAP.md";
const DEFAULT_MEMORY_FILENAME = exports.DEFAULT_MEMORY_FILENAME = "MEMORY.md";
const DEFAULT_MEMORY_ALT_FILENAME = exports.DEFAULT_MEMORY_ALT_FILENAME = "memory.md";
function stripFrontMatter(content) {
  if (!content.startsWith("---")) {
    return content;
  }
  const endIndex = content.indexOf("\n---", 3);
  if (endIndex === -1) {
    return content;
  }
  const start = endIndex + "\n---".length;
  let trimmed = content.slice(start);
  trimmed = trimmed.replace(/^\s+/, "");
  return trimmed;
}
async function loadTemplate(name) {
  const templateDir = await (0, _workspaceTemplates.resolveWorkspaceTemplateDir)();
  const templatePath = _nodePath.default.join(templateDir, name);
  try {
    const content = await _promises.default.readFile(templatePath, "utf-8");
    return stripFrontMatter(content);
  }
  catch {
    throw new Error(`Missing workspace template: ${name} (${templatePath}). Ensure docs/reference/templates are packaged.`);
  }
}
async function writeFileIfMissing(filePath, content) {
  try {
    await _promises.default.writeFile(filePath, content, {
      encoding: "utf-8",
      flag: "wx"
    });
  }
  catch (err) {
    const anyErr = err;
    if (anyErr.code !== "EEXIST") {
      throw err;
    }
  }
}
async function hasGitRepo(dir) {
  try {
    await _promises.default.stat(_nodePath.default.join(dir, ".git"));
    return true;
  }
  catch {
    return false;
  }
}
async function isGitAvailable() {
  try {
    const result = await (0, _exec.runCommandWithTimeout)(["git", "--version"], { timeoutMs: 2_000 });
    return result.code === 0;
  }
  catch {
    return false;
  }
}
async function ensureGitRepo(dir, isBrandNewWorkspace) {
  if (!isBrandNewWorkspace) {
    return;
  }
  if (await hasGitRepo(dir)) {
    return;
  }
  if (!(await isGitAvailable())) {
    return;
  }
  try {
    await (0, _exec.runCommandWithTimeout)(["git", "init"], { cwd: dir, timeoutMs: 10_000 });
  }
  catch {

    // Ignore git init failures; workspace creation should still succeed.
  }}
async function ensureAgentWorkspace(params) {
  const rawDir = params?.dir?.trim() ? params.dir.trim() : DEFAULT_AGENT_WORKSPACE_DIR;
  const dir = (0, _utils.resolveUserPath)(rawDir);
  await _promises.default.mkdir(dir, { recursive: true });
  if (!params?.ensureBootstrapFiles) {
    return { dir };
  }
  const agentsPath = _nodePath.default.join(dir, DEFAULT_AGENTS_FILENAME);
  const soulPath = _nodePath.default.join(dir, DEFAULT_SOUL_FILENAME);
  const toolsPath = _nodePath.default.join(dir, DEFAULT_TOOLS_FILENAME);
  const identityPath = _nodePath.default.join(dir, DEFAULT_IDENTITY_FILENAME);
  const userPath = _nodePath.default.join(dir, DEFAULT_USER_FILENAME);
  const heartbeatPath = _nodePath.default.join(dir, DEFAULT_HEARTBEAT_FILENAME);
  const bootstrapPath = _nodePath.default.join(dir, DEFAULT_BOOTSTRAP_FILENAME);
  const isBrandNewWorkspace = await (async () => {
    const paths = [agentsPath, soulPath, toolsPath, identityPath, userPath, heartbeatPath];
    const existing = await Promise.all(paths.map(async (p) => {
      try {
        await _promises.default.access(p);
        return true;
      }
      catch {
        return false;
      }
    }));
    return existing.every((v) => !v);
  })();
  const agentsTemplate = await loadTemplate(DEFAULT_AGENTS_FILENAME);
  const soulTemplate = await loadTemplate(DEFAULT_SOUL_FILENAME);
  const toolsTemplate = await loadTemplate(DEFAULT_TOOLS_FILENAME);
  const identityTemplate = await loadTemplate(DEFAULT_IDENTITY_FILENAME);
  const userTemplate = await loadTemplate(DEFAULT_USER_FILENAME);
  const heartbeatTemplate = await loadTemplate(DEFAULT_HEARTBEAT_FILENAME);
  const bootstrapTemplate = await loadTemplate(DEFAULT_BOOTSTRAP_FILENAME);
  await writeFileIfMissing(agentsPath, agentsTemplate);
  await writeFileIfMissing(soulPath, soulTemplate);
  await writeFileIfMissing(toolsPath, toolsTemplate);
  await writeFileIfMissing(identityPath, identityTemplate);
  await writeFileIfMissing(userPath, userTemplate);
  await writeFileIfMissing(heartbeatPath, heartbeatTemplate);
  if (isBrandNewWorkspace) {
    await writeFileIfMissing(bootstrapPath, bootstrapTemplate);
  }
  await ensureGitRepo(dir, isBrandNewWorkspace);
  return {
    dir,
    agentsPath,
    soulPath,
    toolsPath,
    identityPath,
    userPath,
    heartbeatPath,
    bootstrapPath
  };
}
async function resolveMemoryBootstrapEntries(resolvedDir) {
  const candidates = [
  DEFAULT_MEMORY_FILENAME,
  DEFAULT_MEMORY_ALT_FILENAME];

  const entries = [];
  for (const name of candidates) {
    const filePath = _nodePath.default.join(resolvedDir, name);
    try {
      await _promises.default.access(filePath);
      entries.push({ name, filePath });
    }
    catch {

      // optional
    }}
  if (entries.length <= 1) {
    return entries;
  }
  const seen = new Set();
  const deduped = [];
  for (const entry of entries) {
    let key = entry.filePath;
    try {
      key = await _promises.default.realpath(entry.filePath);
    }
    catch {}
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}
async function loadWorkspaceBootstrapFiles(dir) {
  const resolvedDir = (0, _utils.resolveUserPath)(dir);
  const entries = [
  {
    name: DEFAULT_AGENTS_FILENAME,
    filePath: _nodePath.default.join(resolvedDir, DEFAULT_AGENTS_FILENAME)
  },
  {
    name: DEFAULT_SOUL_FILENAME,
    filePath: _nodePath.default.join(resolvedDir, DEFAULT_SOUL_FILENAME)
  },
  {
    name: DEFAULT_TOOLS_FILENAME,
    filePath: _nodePath.default.join(resolvedDir, DEFAULT_TOOLS_FILENAME)
  },
  {
    name: DEFAULT_IDENTITY_FILENAME,
    filePath: _nodePath.default.join(resolvedDir, DEFAULT_IDENTITY_FILENAME)
  },
  {
    name: DEFAULT_USER_FILENAME,
    filePath: _nodePath.default.join(resolvedDir, DEFAULT_USER_FILENAME)
  },
  {
    name: DEFAULT_HEARTBEAT_FILENAME,
    filePath: _nodePath.default.join(resolvedDir, DEFAULT_HEARTBEAT_FILENAME)
  },
  {
    name: DEFAULT_BOOTSTRAP_FILENAME,
    filePath: _nodePath.default.join(resolvedDir, DEFAULT_BOOTSTRAP_FILENAME)
  }];

  entries.push(...(await resolveMemoryBootstrapEntries(resolvedDir)));
  const result = [];
  for (const entry of entries) {
    try {
      const content = await _promises.default.readFile(entry.filePath, "utf-8");
      result.push({
        name: entry.name,
        path: entry.filePath,
        content,
        missing: false
      });
    }
    catch {
      result.push({ name: entry.name, path: entry.filePath, missing: true });
    }
  }
  return result;
}
const SUBAGENT_BOOTSTRAP_ALLOWLIST = new Set([DEFAULT_AGENTS_FILENAME, DEFAULT_TOOLS_FILENAME]);
function filterBootstrapFilesForSession(files, sessionKey) {
  if (!sessionKey || !(0, _sessionKey.isSubagentSessionKey)(sessionKey)) {
    return files;
  }
  return files.filter((file) => SUBAGENT_BOOTSTRAP_ALLOWLIST.has(file.name));
} /* v9-8301e49bf510f5b0 */
