"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.installSignalCli = installSignalCli;var _nodeFs = require("node:fs");
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodeHttps = require("node:https");
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _promises2 = require("node:stream/promises");
var _exec = require("../process/exec.js");
var _utils = require("../utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function looksLikeArchive(name) {
  return name.endsWith(".tar.gz") || name.endsWith(".tgz") || name.endsWith(".zip");
}
function pickAsset(assets, platform) {
  const withName = assets.filter((asset) => Boolean(asset.name && asset.browser_download_url));
  const byName = (pattern) => withName.find((asset) => pattern.test(asset.name.toLowerCase()));
  if (platform === "linux") {
    return byName(/linux-native/) ||
    byName(/linux/) ||
    withName.find((asset) => looksLikeArchive(asset.name.toLowerCase()));
  }
  if (platform === "darwin") {
    return byName(/macos|osx|darwin/) ||
    withName.find((asset) => looksLikeArchive(asset.name.toLowerCase()));
  }
  if (platform === "win32") {
    return byName(/windows|win/) || withName.find((asset) => looksLikeArchive(asset.name.toLowerCase()));
  }
  return withName.find((asset) => looksLikeArchive(asset.name.toLowerCase()));
}
async function downloadToFile(url, dest, maxRedirects = 5) {
  await new Promise((resolve, reject) => {
    const req = (0, _nodeHttps.request)(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
        const location = res.headers.location;
        if (!location || maxRedirects <= 0) {
          reject(new Error("Redirect loop or missing Location header"));
          return;
        }
        const redirectUrl = new URL(location, url).href;
        resolve(downloadToFile(redirectUrl, dest, maxRedirects - 1));
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode ?? "?"} downloading file`));
        return;
      }
      const out = (0, _nodeFs.createWriteStream)(dest);
      (0, _promises2.pipeline)(res, out).then(resolve).catch(reject);
    });
    req.on("error", reject);
    req.end();
  });
}
async function findSignalCliBinary(root) {
  const candidates = [];
  const enqueue = async (dir, depth) => {
    if (depth > 3) {
      return;
    }
    const entries = await _promises.default.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const full = _nodePath.default.join(dir, entry.name);
      if (entry.isDirectory()) {
        await enqueue(full, depth + 1);
      } else
      if (entry.isFile() && entry.name === "signal-cli") {
        candidates.push(full);
      }
    }
  };
  await enqueue(root, 0);
  return candidates[0] ?? null;
}
async function installSignalCli(runtime) {
  if (process.platform === "win32") {
    return {
      ok: false,
      error: "Signal CLI auto-install is not supported on Windows yet."
    };
  }
  const apiUrl = "https://api.github.com/repos/AsamK/signal-cli/releases/latest";
  const response = await fetch(apiUrl, {
    headers: {
      "User-Agent": "openclaw",
      Accept: "application/vnd.github+json"
    }
  });
  if (!response.ok) {
    return {
      ok: false,
      error: `Failed to fetch release info (${response.status})`
    };
  }
  const payload = await response.json();
  const version = payload.tag_name?.replace(/^v/, "") ?? "unknown";
  const assets = payload.assets ?? [];
  const asset = pickAsset(assets, process.platform);
  const assetName = asset?.name ?? "";
  const assetUrl = asset?.browser_download_url ?? "";
  if (!assetName || !assetUrl) {
    return {
      ok: false,
      error: "No compatible release asset found for this platform."
    };
  }
  const tmpDir = await _promises.default.mkdtemp(_nodePath.default.join(_nodeOs.default.tmpdir(), "openclaw-signal-"));
  const archivePath = _nodePath.default.join(tmpDir, assetName);
  runtime.log(`Downloading signal-cli ${version} (${assetName})…`);
  await downloadToFile(assetUrl, archivePath);
  const installRoot = _nodePath.default.join(_utils.CONFIG_DIR, "tools", "signal-cli", version);
  await _promises.default.mkdir(installRoot, { recursive: true });
  if (assetName.endsWith(".zip")) {
    await (0, _exec.runCommandWithTimeout)(["unzip", "-q", archivePath, "-d", installRoot], {
      timeoutMs: 60_000
    });
  } else
  if (assetName.endsWith(".tar.gz") || assetName.endsWith(".tgz")) {
    await (0, _exec.runCommandWithTimeout)(["tar", "-xzf", archivePath, "-C", installRoot], {
      timeoutMs: 60_000
    });
  } else
  {
    return { ok: false, error: `Unsupported archive type: ${assetName}` };
  }
  const cliPath = await findSignalCliBinary(installRoot);
  if (!cliPath) {
    return {
      ok: false,
      error: `signal-cli binary not found after extracting ${assetName}`
    };
  }
  await _promises.default.chmod(cliPath, 0o755).catch(() => {});
  return { ok: true, cliPath, version };
} /* v9-6f83bad527de633a */
