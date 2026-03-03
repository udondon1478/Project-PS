"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.stageSandboxMedia = stageSandboxMedia;var _nodeChild_process = require("node:child_process");
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUrl = require("node:url");
var _sandboxPaths = require("../../agents/sandbox-paths.js");
var _sandbox = require("../../agents/sandbox.js");
var _globals = require("../../globals.js");
var _store = require("../../media/store.js");
var _utils = require("../../utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function stageSandboxMedia(params) {
  const { ctx, sessionCtx, cfg, sessionKey, workspaceDir } = params;
  const hasPathsArray = Array.isArray(ctx.MediaPaths) && ctx.MediaPaths.length > 0;
  const pathsFromArray = Array.isArray(ctx.MediaPaths) ? ctx.MediaPaths : undefined;
  const rawPaths = pathsFromArray && pathsFromArray.length > 0 ?
  pathsFromArray :
  ctx.MediaPath?.trim() ?
  [ctx.MediaPath.trim()] :
  [];
  if (rawPaths.length === 0 || !sessionKey) {
    return;
  }
  const sandbox = await (0, _sandbox.ensureSandboxWorkspaceForSession)({
    config: cfg,
    sessionKey,
    workspaceDir
  });
  // For remote attachments without sandbox, use ~/.openclaw/media (not agent workspace for privacy)
  const remoteMediaCacheDir = ctx.MediaRemoteHost ?
  _nodePath.default.join(_utils.CONFIG_DIR, "media", "remote-cache", sessionKey) :
  null;
  const effectiveWorkspaceDir = sandbox?.workspaceDir ?? remoteMediaCacheDir;
  if (!effectiveWorkspaceDir) {
    return;
  }
  const resolveAbsolutePath = (value) => {
    let resolved = value.trim();
    if (!resolved) {
      return null;
    }
    if (resolved.startsWith("file://")) {
      try {
        resolved = (0, _nodeUrl.fileURLToPath)(resolved);
      }
      catch {
        return null;
      }
    }
    if (!_nodePath.default.isAbsolute(resolved)) {
      return null;
    }
    return resolved;
  };
  try {
    // For sandbox: <workspace>/media/inbound, for remote cache: use dir directly
    const destDir = sandbox ?
    _nodePath.default.join(effectiveWorkspaceDir, "media", "inbound") :
    effectiveWorkspaceDir;
    await _promises.default.mkdir(destDir, { recursive: true });
    const usedNames = new Set();
    const staged = new Map(); // absolute source -> relative sandbox path
    for (const raw of rawPaths) {
      const source = resolveAbsolutePath(raw);
      if (!source) {
        continue;
      }
      if (staged.has(source)) {
        continue;
      }
      // Local paths must be restricted to the media directory.
      if (!ctx.MediaRemoteHost) {
        const mediaDir = (0, _store.getMediaDir)();
        try {
          await (0, _sandboxPaths.assertSandboxPath)({
            filePath: source,
            cwd: mediaDir,
            root: mediaDir
          });
        }
        catch {
          (0, _globals.logVerbose)(`Blocking attempt to stage media from outside media directory: ${source}`);
          continue;
        }
      }
      const baseName = _nodePath.default.basename(source);
      if (!baseName) {
        continue;
      }
      const parsed = _nodePath.default.parse(baseName);
      let fileName = baseName;
      let suffix = 1;
      while (usedNames.has(fileName)) {
        fileName = `${parsed.name}-${suffix}${parsed.ext}`;
        suffix += 1;
      }
      usedNames.add(fileName);
      const dest = _nodePath.default.join(destDir, fileName);
      if (ctx.MediaRemoteHost) {
        // Always use SCP when remote host is configured - local paths refer to remote machine
        await scpFile(ctx.MediaRemoteHost, source, dest);
      } else
      {
        await _promises.default.copyFile(source, dest);
      }
      // For sandbox use relative path, for remote cache use absolute path
      const stagedPath = sandbox ? _nodePath.default.posix.join("media", "inbound", fileName) : dest;
      staged.set(source, stagedPath);
    }
    const rewriteIfStaged = (value) => {
      const raw = value?.trim();
      if (!raw) {
        return value;
      }
      const abs = resolveAbsolutePath(raw);
      if (!abs) {
        return value;
      }
      const mapped = staged.get(abs);
      return mapped ?? value;
    };
    const nextMediaPaths = hasPathsArray ? rawPaths.map((p) => rewriteIfStaged(p) ?? p) : undefined;
    if (nextMediaPaths) {
      ctx.MediaPaths = nextMediaPaths;
      sessionCtx.MediaPaths = nextMediaPaths;
      ctx.MediaPath = nextMediaPaths[0];
      sessionCtx.MediaPath = nextMediaPaths[0];
    } else
    {
      const rewritten = rewriteIfStaged(ctx.MediaPath);
      if (rewritten && rewritten !== ctx.MediaPath) {
        ctx.MediaPath = rewritten;
        sessionCtx.MediaPath = rewritten;
      }
    }
    if (Array.isArray(ctx.MediaUrls) && ctx.MediaUrls.length > 0) {
      const nextUrls = ctx.MediaUrls.map((u) => rewriteIfStaged(u) ?? u);
      ctx.MediaUrls = nextUrls;
      sessionCtx.MediaUrls = nextUrls;
    }
    const rewrittenUrl = rewriteIfStaged(ctx.MediaUrl);
    if (rewrittenUrl && rewrittenUrl !== ctx.MediaUrl) {
      ctx.MediaUrl = rewrittenUrl;
      sessionCtx.MediaUrl = rewrittenUrl;
    }
  }
  catch (err) {
    (0, _globals.logVerbose)(`Failed to stage inbound media for sandbox: ${String(err)}`);
  }
}
async function scpFile(remoteHost, remotePath, localPath) {
  return new Promise((resolve, reject) => {
    const child = (0, _nodeChild_process.spawn)("/usr/bin/scp", [
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    `${remoteHost}:${remotePath}`,
    localPath],
    { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else
      {
        reject(new Error(`scp failed (${code}): ${stderr.trim()}`));
      }
    });
  });
} /* v9-305a656fd36a0377 */
