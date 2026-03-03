"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.VERSION = exports.ENV_AGENT_DIR = exports.CONFIG_DIR_NAME = exports.APP_NAME = void 0;exports.getAgentDir = getAgentDir;exports.getAuthPath = getAuthPath;exports.getBinDir = getBinDir;exports.getChangelogPath = getChangelogPath;exports.getCustomThemesDir = getCustomThemesDir;exports.getDebugLogPath = getDebugLogPath;exports.getDocsPath = getDocsPath;exports.getExamplesPath = getExamplesPath;exports.getExportTemplateDir = getExportTemplateDir;exports.getModelsPath = getModelsPath;exports.getPackageDir = getPackageDir;exports.getPackageJsonPath = getPackageJsonPath;exports.getPromptsDir = getPromptsDir;exports.getReadmePath = getReadmePath;exports.getSessionsDir = getSessionsDir;exports.getSettingsPath = getSettingsPath;exports.getShareViewerUrl = getShareViewerUrl;exports.getThemesDir = getThemesDir;exports.getToolsDir = getToolsDir;exports.isBunRuntime = exports.isBunBinary = void 0;var _fs = require("fs");
var _os = require("os");
var _path = require("path");
var _url = require("url");
// =============================================================================
// Package Detection
// =============================================================================
const _filename = (0, _url.fileURLToPath)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/node_modules/@mariozechner/pi-coding-agent/dist/config.js");
const _dirname = (0, _path.dirname)(_filename);
/**
 * Detect if we're running as a Bun compiled binary.
 * Bun binaries have import.meta.url containing "$bunfs", "~BUN", or "%7EBUN" (Bun's virtual filesystem path)
 */
const isBunBinary = exports.isBunBinary = "file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/node_modules/@mariozechner/pi-coding-agent/dist/config.js".includes("$bunfs") || "file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/node_modules/@mariozechner/pi-coding-agent/dist/config.js".includes("~BUN") || "file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/node_modules/@mariozechner/pi-coding-agent/dist/config.js".includes("%7EBUN");
/** Detect if Bun is the runtime (compiled binary or bun run) */
const isBunRuntime = exports.isBunRuntime = !!process.versions.bun;
// =============================================================================
// Package Asset Paths (shipped with executable)
// =============================================================================
/**
 * Get the base directory for resolving package assets (themes, package.json, README.md, CHANGELOG.md).
 * - For Bun binary: returns the directory containing the executable
 * - For Node.js (dist/): returns __dirname (the dist/ directory)
 * - For tsx (src/): returns parent directory (the package root)
 */
function getPackageDir() {
  // Allow override via environment variable (useful for Nix/Guix where store paths tokenize poorly)
  const envDir = process.env.PI_PACKAGE_DIR;
  if (envDir) {
    if (envDir === "~")
    return (0, _os.homedir)();
    if (envDir.startsWith("~/"))
    return (0, _os.homedir)() + envDir.slice(1);
    return envDir;
  }
  if (isBunBinary) {
    // Bun binary: process.execPath points to the compiled executable
    return (0, _path.dirname)(process.execPath);
  }
  // Node.js: walk up from __dirname until we find package.json
  let dir = _dirname;
  while (dir !== (0, _path.dirname)(dir)) {
    if ((0, _fs.existsSync)((0, _path.join)(dir, "package.json"))) {
      return dir;
    }
    dir = (0, _path.dirname)(dir);
  }
  // Fallback (shouldn't happen)
  return _dirname;
}
/**
 * Get path to built-in themes directory (shipped with package)
 * - For Bun binary: theme/ next to executable
 * - For Node.js (dist/): dist/modes/interactive/theme/
 * - For tsx (src/): src/modes/interactive/theme/
 */
function getThemesDir() {
  if (isBunBinary) {
    return (0, _path.join)((0, _path.dirname)(process.execPath), "theme");
  }
  // Theme is in modes/interactive/theme/ relative to src/ or dist/
  const packageDir = getPackageDir();
  const srcOrDist = (0, _fs.existsSync)((0, _path.join)(packageDir, "src")) ? "src" : "dist";
  return (0, _path.join)(packageDir, srcOrDist, "modes", "interactive", "theme");
}
/**
 * Get path to HTML export template directory (shipped with package)
 * - For Bun binary: export-html/ next to executable
 * - For Node.js (dist/): dist/core/export-html/
 * - For tsx (src/): src/core/export-html/
 */
function getExportTemplateDir() {
  if (isBunBinary) {
    return (0, _path.join)((0, _path.dirname)(process.execPath), "export-html");
  }
  const packageDir = getPackageDir();
  const srcOrDist = (0, _fs.existsSync)((0, _path.join)(packageDir, "src")) ? "src" : "dist";
  return (0, _path.join)(packageDir, srcOrDist, "core", "export-html");
}
/** Get path to package.json */
function getPackageJsonPath() {
  return (0, _path.join)(getPackageDir(), "package.json");
}
/** Get path to README.md */
function getReadmePath() {
  return (0, _path.resolve)((0, _path.join)(getPackageDir(), "README.md"));
}
/** Get path to docs directory */
function getDocsPath() {
  return (0, _path.resolve)((0, _path.join)(getPackageDir(), "docs"));
}
/** Get path to examples directory */
function getExamplesPath() {
  return (0, _path.resolve)((0, _path.join)(getPackageDir(), "examples"));
}
/** Get path to CHANGELOG.md */
function getChangelogPath() {
  return (0, _path.resolve)((0, _path.join)(getPackageDir(), "CHANGELOG.md"));
}
// =============================================================================
// App Config (from package.json piConfig)
// =============================================================================
const pkg = JSON.parse((0, _fs.readFileSync)(getPackageJsonPath(), "utf-8"));
const APP_NAME = exports.APP_NAME = pkg.piConfig?.name || "pi";
const CONFIG_DIR_NAME = exports.CONFIG_DIR_NAME = pkg.piConfig?.configDir || ".pi";
const VERSION = exports.VERSION = pkg.version;
// e.g., PI_CODING_AGENT_DIR or TAU_CODING_AGENT_DIR
const ENV_AGENT_DIR = exports.ENV_AGENT_DIR = `${APP_NAME.toUpperCase()}_CODING_AGENT_DIR`;
const DEFAULT_SHARE_VIEWER_URL = "https://buildwithpi.ai/session/";
/** Get the share viewer URL for a gist ID */
function getShareViewerUrl(gistId) {
  const baseUrl = process.env.PI_SHARE_VIEWER_URL || DEFAULT_SHARE_VIEWER_URL;
  return `${baseUrl}#${gistId}`;
}
// =============================================================================
// User Config Paths (~/.pi/agent/*)
// =============================================================================
/** Get the agent config directory (e.g., ~/.pi/agent/) */
function getAgentDir() {
  const envDir = process.env[ENV_AGENT_DIR];
  if (envDir) {
    // Expand tilde to home directory
    if (envDir === "~")
    return (0, _os.homedir)();
    if (envDir.startsWith("~/"))
    return (0, _os.homedir)() + envDir.slice(1);
    return envDir;
  }
  return (0, _path.join)((0, _os.homedir)(), CONFIG_DIR_NAME, "agent");
}
/** Get path to user's custom themes directory */
function getCustomThemesDir() {
  return (0, _path.join)(getAgentDir(), "themes");
}
/** Get path to models.json */
function getModelsPath() {
  return (0, _path.join)(getAgentDir(), "models.json");
}
/** Get path to auth.json */
function getAuthPath() {
  return (0, _path.join)(getAgentDir(), "auth.json");
}
/** Get path to settings.json */
function getSettingsPath() {
  return (0, _path.join)(getAgentDir(), "settings.json");
}
/** Get path to tools directory */
function getToolsDir() {
  return (0, _path.join)(getAgentDir(), "tools");
}
/** Get path to managed binaries directory (fd, rg) */
function getBinDir() {
  return (0, _path.join)(getAgentDir(), "bin");
}
/** Get path to prompt templates directory */
function getPromptsDir() {
  return (0, _path.join)(getAgentDir(), "prompts");
}
/** Get path to sessions directory */
function getSessionsDir() {
  return (0, _path.join)(getAgentDir(), "sessions");
}
/** Get path to debug log file */
function getDebugLogPath() {
  return (0, _path.join)(getAgentDir(), `${APP_NAME}-debug.log`);
} /* v9-5800163caaed2ec0 */
