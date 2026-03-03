"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isNixMode = exports.STATE_DIR = exports.DEFAULT_GATEWAY_PORT = exports.CONFIG_PATH = void 0;exports.resolveCanonicalConfigPath = resolveCanonicalConfigPath;exports.resolveConfigPath = resolveConfigPath;exports.resolveConfigPathCandidate = resolveConfigPathCandidate;exports.resolveDefaultConfigCandidates = resolveDefaultConfigCandidates;exports.resolveGatewayLockDir = resolveGatewayLockDir;exports.resolveGatewayPort = resolveGatewayPort;exports.resolveIsNixMode = resolveIsNixMode;exports.resolveLegacyStateDir = resolveLegacyStateDir;exports.resolveLegacyStateDirs = resolveLegacyStateDirs;exports.resolveNewStateDir = resolveNewStateDir;exports.resolveOAuthDir = resolveOAuthDir;exports.resolveOAuthPath = resolveOAuthPath;exports.resolveStateDir = resolveStateDir;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
/**
 * Nix mode detection: When OPENCLAW_NIX_MODE=1, the gateway is running under Nix.
 * In this mode:
 * - No auto-install flows should be attempted
 * - Missing dependencies should produce actionable Nix-specific error messages
 * - Config is managed externally (read-only from Nix perspective)
 */
function resolveIsNixMode(env = process.env) {
  return env.OPENCLAW_NIX_MODE === "1";
}
const isNixMode = exports.isNixMode = resolveIsNixMode();
const LEGACY_STATE_DIRNAMES = [".clawdbot", ".moltbot", ".moldbot"];
const NEW_STATE_DIRNAME = ".openclaw";
const CONFIG_FILENAME = "openclaw.json";
const LEGACY_CONFIG_FILENAMES = ["clawdbot.json", "moltbot.json", "moldbot.json"];
function legacyStateDirs(homedir = _nodeOs.default.homedir) {
  return LEGACY_STATE_DIRNAMES.map((dir) => _nodePath.default.join(homedir(), dir));
}
function newStateDir(homedir = _nodeOs.default.homedir) {
  return _nodePath.default.join(homedir(), NEW_STATE_DIRNAME);
}
function resolveLegacyStateDir(homedir = _nodeOs.default.homedir) {
  return legacyStateDirs(homedir)[0] ?? newStateDir(homedir);
}
function resolveLegacyStateDirs(homedir = _nodeOs.default.homedir) {
  return legacyStateDirs(homedir);
}
function resolveNewStateDir(homedir = _nodeOs.default.homedir) {
  return newStateDir(homedir);
}
/**
 * State directory for mutable data (sessions, logs, caches).
 * Can be overridden via OPENCLAW_STATE_DIR.
 * Default: ~/.openclaw
 */
function resolveStateDir(env = process.env, homedir = _nodeOs.default.homedir) {
  const override = env.OPENCLAW_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
  if (override) {
    return resolveUserPath(override);
  }
  const newDir = newStateDir(homedir);
  const legacyDirs = legacyStateDirs(homedir);
  const hasNew = _nodeFs.default.existsSync(newDir);
  if (hasNew) {
    return newDir;
  }
  const existingLegacy = legacyDirs.find((dir) => {
    try {
      return _nodeFs.default.existsSync(dir);
    }
    catch {
      return false;
    }
  });
  if (existingLegacy) {
    return existingLegacy;
  }
  return newDir;
}
function resolveUserPath(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("~")) {
    const expanded = trimmed.replace(/^~(?=$|[\\/])/, _nodeOs.default.homedir());
    return _nodePath.default.resolve(expanded);
  }
  return _nodePath.default.resolve(trimmed);
}
const STATE_DIR = exports.STATE_DIR = resolveStateDir();
/**
 * Config file path (JSON5).
 * Can be overridden via OPENCLAW_CONFIG_PATH.
 * Default: ~/.openclaw/openclaw.json (or $OPENCLAW_STATE_DIR/openclaw.json)
 */
function resolveCanonicalConfigPath(env = process.env, stateDir = resolveStateDir(env, _nodeOs.default.homedir)) {
  const override = env.OPENCLAW_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim();
  if (override) {
    return resolveUserPath(override);
  }
  return _nodePath.default.join(stateDir, CONFIG_FILENAME);
}
/**
 * Resolve the active config path by preferring existing config candidates
 * before falling back to the canonical path.
 */
function resolveConfigPathCandidate(env = process.env, homedir = _nodeOs.default.homedir) {
  const candidates = resolveDefaultConfigCandidates(env, homedir);
  const existing = candidates.find((candidate) => {
    try {
      return _nodeFs.default.existsSync(candidate);
    }
    catch {
      return false;
    }
  });
  if (existing) {
    return existing;
  }
  return resolveCanonicalConfigPath(env, resolveStateDir(env, homedir));
}
/**
 * Active config path (prefers existing config files).
 */
function resolveConfigPath(env = process.env, stateDir = resolveStateDir(env, _nodeOs.default.homedir), homedir = _nodeOs.default.homedir) {
  const override = env.OPENCLAW_CONFIG_PATH?.trim();
  if (override) {
    return resolveUserPath(override);
  }
  const stateOverride = env.OPENCLAW_STATE_DIR?.trim();
  const candidates = [
  _nodePath.default.join(stateDir, CONFIG_FILENAME),
  ...LEGACY_CONFIG_FILENAMES.map((name) => _nodePath.default.join(stateDir, name))];

  const existing = candidates.find((candidate) => {
    try {
      return _nodeFs.default.existsSync(candidate);
    }
    catch {
      return false;
    }
  });
  if (existing) {
    return existing;
  }
  if (stateOverride) {
    return _nodePath.default.join(stateDir, CONFIG_FILENAME);
  }
  const defaultStateDir = resolveStateDir(env, homedir);
  if (_nodePath.default.resolve(stateDir) === _nodePath.default.resolve(defaultStateDir)) {
    return resolveConfigPathCandidate(env, homedir);
  }
  return _nodePath.default.join(stateDir, CONFIG_FILENAME);
}
const CONFIG_PATH = exports.CONFIG_PATH = resolveConfigPathCandidate();
/**
 * Resolve default config path candidates across default locations.
 * Order: explicit config path → state-dir-derived paths → new default.
 */
function resolveDefaultConfigCandidates(env = process.env, homedir = _nodeOs.default.homedir) {
  const explicit = env.OPENCLAW_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim();
  if (explicit) {
    return [resolveUserPath(explicit)];
  }
  const candidates = [];
  const openclawStateDir = env.OPENCLAW_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
  if (openclawStateDir) {
    const resolved = resolveUserPath(openclawStateDir);
    candidates.push(_nodePath.default.join(resolved, CONFIG_FILENAME));
    candidates.push(...LEGACY_CONFIG_FILENAMES.map((name) => _nodePath.default.join(resolved, name)));
  }
  const defaultDirs = [newStateDir(homedir), ...legacyStateDirs(homedir)];
  for (const dir of defaultDirs) {
    candidates.push(_nodePath.default.join(dir, CONFIG_FILENAME));
    candidates.push(...LEGACY_CONFIG_FILENAMES.map((name) => _nodePath.default.join(dir, name)));
  }
  return candidates;
}
const DEFAULT_GATEWAY_PORT = exports.DEFAULT_GATEWAY_PORT = 18789;
/**
 * Gateway lock directory (ephemeral).
 * Default: os.tmpdir()/openclaw-<uid> (uid suffix when available).
 */
function resolveGatewayLockDir(tmpdir = _nodeOs.default.tmpdir) {
  const base = tmpdir();
  const uid = typeof process.getuid === "function" ? process.getuid() : undefined;
  const suffix = uid != null ? `openclaw-${uid}` : "openclaw";
  return _nodePath.default.join(base, suffix);
}
const OAUTH_FILENAME = "oauth.json";
/**
 * OAuth credentials storage directory.
 *
 * Precedence:
 * - `OPENCLAW_OAUTH_DIR` (explicit override)
 * - `$*_STATE_DIR/credentials` (canonical server/default)
 */
function resolveOAuthDir(env = process.env, stateDir = resolveStateDir(env, _nodeOs.default.homedir)) {
  const override = env.OPENCLAW_OAUTH_DIR?.trim();
  if (override) {
    return resolveUserPath(override);
  }
  return _nodePath.default.join(stateDir, "credentials");
}
function resolveOAuthPath(env = process.env, stateDir = resolveStateDir(env, _nodeOs.default.homedir)) {
  return _nodePath.default.join(resolveOAuthDir(env, stateDir), OAUTH_FILENAME);
}
function resolveGatewayPort(cfg, env = process.env) {
  const envRaw = env.OPENCLAW_GATEWAY_PORT?.trim() || env.CLAWDBOT_GATEWAY_PORT?.trim();
  if (envRaw) {
    const parsed = Number.parseInt(envRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const configPort = cfg?.gateway?.port;
  if (typeof configPort === "number" && Number.isFinite(configPort)) {
    if (configPort > 0) {
      return configPort;
    }
  }
  return DEFAULT_GATEWAY_PORT;
} /* v9-ffecdc130695a26d */
