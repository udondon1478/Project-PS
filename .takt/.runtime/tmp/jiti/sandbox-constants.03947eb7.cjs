"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SANDBOX_STATE_DIR = exports.SANDBOX_REGISTRY_PATH = exports.SANDBOX_BROWSER_REGISTRY_PATH = exports.SANDBOX_AGENT_WORKSPACE_MOUNT = exports.DEFAULT_TOOL_DENY = exports.DEFAULT_TOOL_ALLOW = exports.DEFAULT_SANDBOX_WORKSPACE_ROOT = exports.DEFAULT_SANDBOX_WORKDIR = exports.DEFAULT_SANDBOX_MAX_AGE_DAYS = exports.DEFAULT_SANDBOX_IMAGE = exports.DEFAULT_SANDBOX_IDLE_HOURS = exports.DEFAULT_SANDBOX_CONTAINER_PREFIX = exports.DEFAULT_SANDBOX_COMMON_IMAGE = exports.DEFAULT_SANDBOX_BROWSER_VNC_PORT = exports.DEFAULT_SANDBOX_BROWSER_PREFIX = exports.DEFAULT_SANDBOX_BROWSER_NOVNC_PORT = exports.DEFAULT_SANDBOX_BROWSER_IMAGE = exports.DEFAULT_SANDBOX_BROWSER_CDP_PORT = exports.DEFAULT_SANDBOX_BROWSER_AUTOSTART_TIMEOUT_MS = void 0;var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _registry = require("../../channels/registry.js");
var _config = require("../../config/config.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const DEFAULT_SANDBOX_WORKSPACE_ROOT = exports.DEFAULT_SANDBOX_WORKSPACE_ROOT = _nodePath.default.join(_nodeOs.default.homedir(), ".openclaw", "sandboxes");
const DEFAULT_SANDBOX_IMAGE = exports.DEFAULT_SANDBOX_IMAGE = "openclaw-sandbox:bookworm-slim";
const DEFAULT_SANDBOX_CONTAINER_PREFIX = exports.DEFAULT_SANDBOX_CONTAINER_PREFIX = "openclaw-sbx-";
const DEFAULT_SANDBOX_WORKDIR = exports.DEFAULT_SANDBOX_WORKDIR = "/workspace";
const DEFAULT_SANDBOX_IDLE_HOURS = exports.DEFAULT_SANDBOX_IDLE_HOURS = 24;
const DEFAULT_SANDBOX_MAX_AGE_DAYS = exports.DEFAULT_SANDBOX_MAX_AGE_DAYS = 7;
const DEFAULT_TOOL_ALLOW = exports.DEFAULT_TOOL_ALLOW = [
"exec",
"process",
"read",
"write",
"edit",
"apply_patch",
"image",
"sessions_list",
"sessions_history",
"sessions_send",
"sessions_spawn",
"session_status"];

// Provider docking: keep sandbox policy aligned with provider tool names.
const DEFAULT_TOOL_DENY = exports.DEFAULT_TOOL_DENY = [
"browser",
"canvas",
"nodes",
"cron",
"gateway",
..._registry.CHANNEL_IDS];

const DEFAULT_SANDBOX_BROWSER_IMAGE = exports.DEFAULT_SANDBOX_BROWSER_IMAGE = "openclaw-sandbox-browser:bookworm-slim";
const DEFAULT_SANDBOX_COMMON_IMAGE = exports.DEFAULT_SANDBOX_COMMON_IMAGE = "openclaw-sandbox-common:bookworm-slim";
const DEFAULT_SANDBOX_BROWSER_PREFIX = exports.DEFAULT_SANDBOX_BROWSER_PREFIX = "openclaw-sbx-browser-";
const DEFAULT_SANDBOX_BROWSER_CDP_PORT = exports.DEFAULT_SANDBOX_BROWSER_CDP_PORT = 9222;
const DEFAULT_SANDBOX_BROWSER_VNC_PORT = exports.DEFAULT_SANDBOX_BROWSER_VNC_PORT = 5900;
const DEFAULT_SANDBOX_BROWSER_NOVNC_PORT = exports.DEFAULT_SANDBOX_BROWSER_NOVNC_PORT = 6080;
const DEFAULT_SANDBOX_BROWSER_AUTOSTART_TIMEOUT_MS = exports.DEFAULT_SANDBOX_BROWSER_AUTOSTART_TIMEOUT_MS = 12_000;
const SANDBOX_AGENT_WORKSPACE_MOUNT = exports.SANDBOX_AGENT_WORKSPACE_MOUNT = "/agent";
const resolvedSandboxStateDir = _config.STATE_DIR ?? _nodePath.default.join(_nodeOs.default.homedir(), ".openclaw");
const SANDBOX_STATE_DIR = exports.SANDBOX_STATE_DIR = _nodePath.default.join(resolvedSandboxStateDir, "sandbox");
const SANDBOX_REGISTRY_PATH = exports.SANDBOX_REGISTRY_PATH = _nodePath.default.join(SANDBOX_STATE_DIR, "containers.json");
const SANDBOX_BROWSER_REGISTRY_PATH = exports.SANDBOX_BROWSER_REGISTRY_PATH = _nodePath.default.join(SANDBOX_STATE_DIR, "browsers.json"); /* v9-c76fe72624d006fc */
