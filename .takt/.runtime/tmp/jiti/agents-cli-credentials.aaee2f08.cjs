"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.readClaudeCliCredentials = readClaudeCliCredentials;exports.readClaudeCliCredentialsCached = readClaudeCliCredentialsCached;exports.readCodexCliCredentials = readCodexCliCredentials;exports.readCodexCliCredentialsCached = readCodexCliCredentialsCached;exports.readMiniMaxCliCredentialsCached = readMiniMaxCliCredentialsCached;exports.readQwenCliCredentialsCached = readQwenCliCredentialsCached;exports.resetCliCredentialCachesForTest = resetCliCredentialCachesForTest;exports.writeClaudeCliCredentials = writeClaudeCliCredentials;exports.writeClaudeCliFileCredentials = writeClaudeCliFileCredentials;exports.writeClaudeCliKeychainCredentials = writeClaudeCliKeychainCredentials;var _nodeChild_process = require("node:child_process");
var _nodeCrypto = require("node:crypto");
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _jsonFile = require("../infra/json-file.js");
var _subsystem = require("../logging/subsystem.js");
var _utils = require("../utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const log = (0, _subsystem.createSubsystemLogger)("agents/auth-profiles");
const CLAUDE_CLI_CREDENTIALS_RELATIVE_PATH = ".claude/.credentials.json";
const CODEX_CLI_AUTH_FILENAME = "auth.json";
const QWEN_CLI_CREDENTIALS_RELATIVE_PATH = ".qwen/oauth_creds.json";
const MINIMAX_CLI_CREDENTIALS_RELATIVE_PATH = ".minimax/oauth_creds.json";
const CLAUDE_CLI_KEYCHAIN_SERVICE = "Claude Code-credentials";
const CLAUDE_CLI_KEYCHAIN_ACCOUNT = "Claude Code";
let claudeCliCache = null;
let codexCliCache = null;
let qwenCliCache = null;
let minimaxCliCache = null;
function resetCliCredentialCachesForTest() {
  claudeCliCache = null;
  codexCliCache = null;
  qwenCliCache = null;
  minimaxCliCache = null;
}
function resolveClaudeCliCredentialsPath(homeDir) {
  const baseDir = homeDir ?? (0, _utils.resolveUserPath)("~");
  return _nodePath.default.join(baseDir, CLAUDE_CLI_CREDENTIALS_RELATIVE_PATH);
}
function resolveCodexCliAuthPath() {
  return _nodePath.default.join(resolveCodexHomePath(), CODEX_CLI_AUTH_FILENAME);
}
function resolveCodexHomePath() {
  const configured = process.env.CODEX_HOME;
  const home = configured ? (0, _utils.resolveUserPath)(configured) : (0, _utils.resolveUserPath)("~/.codex");
  try {
    return _nodeFs.default.realpathSync.native(home);
  }
  catch {
    return home;
  }
}
function resolveQwenCliCredentialsPath(homeDir) {
  const baseDir = homeDir ?? (0, _utils.resolveUserPath)("~");
  return _nodePath.default.join(baseDir, QWEN_CLI_CREDENTIALS_RELATIVE_PATH);
}
function resolveMiniMaxCliCredentialsPath(homeDir) {
  const baseDir = homeDir ?? (0, _utils.resolveUserPath)("~");
  return _nodePath.default.join(baseDir, MINIMAX_CLI_CREDENTIALS_RELATIVE_PATH);
}
function computeCodexKeychainAccount(codexHome) {
  const hash = (0, _nodeCrypto.createHash)("sha256").update(codexHome).digest("hex");
  return `cli|${hash.slice(0, 16)}`;
}
function readCodexKeychainCredentials(options) {
  const platform = options?.platform ?? process.platform;
  if (platform !== "darwin") {
    return null;
  }
  const execSyncImpl = options?.execSync ?? _nodeChild_process.execSync;
  const codexHome = resolveCodexHomePath();
  const account = computeCodexKeychainAccount(codexHome);
  try {
    const secret = execSyncImpl(`security find-generic-password -s "Codex Auth" -a "${account}" -w`, {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const parsed = JSON.parse(secret);
    const tokens = parsed.tokens;
    const accessToken = tokens?.access_token;
    const refreshToken = tokens?.refresh_token;
    if (typeof accessToken !== "string" || !accessToken) {
      return null;
    }
    if (typeof refreshToken !== "string" || !refreshToken) {
      return null;
    }
    // No explicit expiry stored; treat as fresh for an hour from last_refresh or now.
    const lastRefreshRaw = parsed.last_refresh;
    const lastRefresh = typeof lastRefreshRaw === "string" || typeof lastRefreshRaw === "number" ?
    new Date(lastRefreshRaw).getTime() :
    Date.now();
    const expires = Number.isFinite(lastRefresh) ?
    lastRefresh + 60 * 60 * 1000 :
    Date.now() + 60 * 60 * 1000;
    const accountId = typeof tokens?.account_id === "string" ? tokens.account_id : undefined;
    log.info("read codex credentials from keychain", {
      source: "keychain",
      expires: new Date(expires).toISOString()
    });
    return {
      type: "oauth",
      provider: "openai-codex",
      access: accessToken,
      refresh: refreshToken,
      expires,
      accountId
    };
  }
  catch {
    return null;
  }
}
function readQwenCliCredentials(options) {
  const credPath = resolveQwenCliCredentialsPath(options?.homeDir);
  const raw = (0, _jsonFile.loadJsonFile)(credPath);
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw;
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const expiresAt = data.expiry_date;
  if (typeof accessToken !== "string" || !accessToken) {
    return null;
  }
  if (typeof refreshToken !== "string" || !refreshToken) {
    return null;
  }
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    return null;
  }
  return {
    type: "oauth",
    provider: "qwen-portal",
    access: accessToken,
    refresh: refreshToken,
    expires: expiresAt
  };
}
function readMiniMaxCliCredentials(options) {
  const credPath = resolveMiniMaxCliCredentialsPath(options?.homeDir);
  const raw = (0, _jsonFile.loadJsonFile)(credPath);
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw;
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const expiresAt = data.expiry_date;
  if (typeof accessToken !== "string" || !accessToken) {
    return null;
  }
  if (typeof refreshToken !== "string" || !refreshToken) {
    return null;
  }
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    return null;
  }
  return {
    type: "oauth",
    provider: "minimax-portal",
    access: accessToken,
    refresh: refreshToken,
    expires: expiresAt
  };
}
function readClaudeCliKeychainCredentials(execSyncImpl = _nodeChild_process.execSync) {
  try {
    const result = execSyncImpl(`security find-generic-password -s "${CLAUDE_CLI_KEYCHAIN_SERVICE}" -w`, { encoding: "utf8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] });
    const data = JSON.parse(result.trim());
    const claudeOauth = data?.claudeAiOauth;
    if (!claudeOauth || typeof claudeOauth !== "object") {
      return null;
    }
    const accessToken = claudeOauth.accessToken;
    const refreshToken = claudeOauth.refreshToken;
    const expiresAt = claudeOauth.expiresAt;
    if (typeof accessToken !== "string" || !accessToken) {
      return null;
    }
    if (typeof expiresAt !== "number" || expiresAt <= 0) {
      return null;
    }
    if (typeof refreshToken === "string" && refreshToken) {
      return {
        type: "oauth",
        provider: "anthropic",
        access: accessToken,
        refresh: refreshToken,
        expires: expiresAt
      };
    }
    return {
      type: "token",
      provider: "anthropic",
      token: accessToken,
      expires: expiresAt
    };
  }
  catch {
    return null;
  }
}
function readClaudeCliCredentials(options) {
  const platform = options?.platform ?? process.platform;
  if (platform === "darwin" && options?.allowKeychainPrompt !== false) {
    const keychainCreds = readClaudeCliKeychainCredentials(options?.execSync);
    if (keychainCreds) {
      log.info("read anthropic credentials from claude cli keychain", {
        type: keychainCreds.type
      });
      return keychainCreds;
    }
  }
  const credPath = resolveClaudeCliCredentialsPath(options?.homeDir);
  const raw = (0, _jsonFile.loadJsonFile)(credPath);
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw;
  const claudeOauth = data.claudeAiOauth;
  if (!claudeOauth || typeof claudeOauth !== "object") {
    return null;
  }
  const accessToken = claudeOauth.accessToken;
  const refreshToken = claudeOauth.refreshToken;
  const expiresAt = claudeOauth.expiresAt;
  if (typeof accessToken !== "string" || !accessToken) {
    return null;
  }
  if (typeof expiresAt !== "number" || expiresAt <= 0) {
    return null;
  }
  if (typeof refreshToken === "string" && refreshToken) {
    return {
      type: "oauth",
      provider: "anthropic",
      access: accessToken,
      refresh: refreshToken,
      expires: expiresAt
    };
  }
  return {
    type: "token",
    provider: "anthropic",
    token: accessToken,
    expires: expiresAt
  };
}
function readClaudeCliCredentialsCached(options) {
  const ttlMs = options?.ttlMs ?? 0;
  const now = Date.now();
  const cacheKey = resolveClaudeCliCredentialsPath(options?.homeDir);
  if (ttlMs > 0 &&
  claudeCliCache &&
  claudeCliCache.cacheKey === cacheKey &&
  now - claudeCliCache.readAt < ttlMs) {
    return claudeCliCache.value;
  }
  const value = readClaudeCliCredentials({
    allowKeychainPrompt: options?.allowKeychainPrompt,
    platform: options?.platform,
    homeDir: options?.homeDir,
    execSync: options?.execSync
  });
  if (ttlMs > 0) {
    claudeCliCache = { value, readAt: now, cacheKey };
  }
  return value;
}
function writeClaudeCliKeychainCredentials(newCredentials, options) {
  const execSyncImpl = options?.execSync ?? _nodeChild_process.execSync;
  try {
    const existingResult = execSyncImpl(`security find-generic-password -s "${CLAUDE_CLI_KEYCHAIN_SERVICE}" -w 2>/dev/null`, { encoding: "utf8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] });
    const existingData = JSON.parse(existingResult.trim());
    const existingOauth = existingData?.claudeAiOauth;
    if (!existingOauth || typeof existingOauth !== "object") {
      return false;
    }
    existingData.claudeAiOauth = {
      ...existingOauth,
      accessToken: newCredentials.access,
      refreshToken: newCredentials.refresh,
      expiresAt: newCredentials.expires
    };
    const newValue = JSON.stringify(existingData);
    execSyncImpl(`security add-generic-password -U -s "${CLAUDE_CLI_KEYCHAIN_SERVICE}" -a "${CLAUDE_CLI_KEYCHAIN_ACCOUNT}" -w '${newValue.replace(/'/g, "'\"'\"'")}'`, { encoding: "utf8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] });
    log.info("wrote refreshed credentials to claude cli keychain", {
      expires: new Date(newCredentials.expires).toISOString()
    });
    return true;
  }
  catch (error) {
    log.warn("failed to write credentials to claude cli keychain", {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}
function writeClaudeCliFileCredentials(newCredentials, options) {
  const credPath = resolveClaudeCliCredentialsPath(options?.homeDir);
  if (!_nodeFs.default.existsSync(credPath)) {
    return false;
  }
  try {
    const raw = (0, _jsonFile.loadJsonFile)(credPath);
    if (!raw || typeof raw !== "object") {
      return false;
    }
    const data = raw;
    const existingOauth = data.claudeAiOauth;
    if (!existingOauth || typeof existingOauth !== "object") {
      return false;
    }
    data.claudeAiOauth = {
      ...existingOauth,
      accessToken: newCredentials.access,
      refreshToken: newCredentials.refresh,
      expiresAt: newCredentials.expires
    };
    (0, _jsonFile.saveJsonFile)(credPath, data);
    log.info("wrote refreshed credentials to claude cli file", {
      expires: new Date(newCredentials.expires).toISOString()
    });
    return true;
  }
  catch (error) {
    log.warn("failed to write credentials to claude cli file", {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}
function writeClaudeCliCredentials(newCredentials, options) {
  const platform = options?.platform ?? process.platform;
  const writeKeychain = options?.writeKeychain ?? writeClaudeCliKeychainCredentials;
  const writeFile = options?.writeFile ?? (
  (credentials, fileOptions) => writeClaudeCliFileCredentials(credentials, fileOptions));
  if (platform === "darwin") {
    const didWriteKeychain = writeKeychain(newCredentials);
    if (didWriteKeychain) {
      return true;
    }
  }
  return writeFile(newCredentials, { homeDir: options?.homeDir });
}
function readCodexCliCredentials(options) {
  const keychain = readCodexKeychainCredentials({
    platform: options?.platform,
    execSync: options?.execSync
  });
  if (keychain) {
    return keychain;
  }
  const authPath = resolveCodexCliAuthPath();
  const raw = (0, _jsonFile.loadJsonFile)(authPath);
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw;
  const tokens = data.tokens;
  if (!tokens || typeof tokens !== "object") {
    return null;
  }
  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token;
  if (typeof accessToken !== "string" || !accessToken) {
    return null;
  }
  if (typeof refreshToken !== "string" || !refreshToken) {
    return null;
  }
  let expires;
  try {
    const stat = _nodeFs.default.statSync(authPath);
    expires = stat.mtimeMs + 60 * 60 * 1000;
  }
  catch {
    expires = Date.now() + 60 * 60 * 1000;
  }
  return {
    type: "oauth",
    provider: "openai-codex",
    access: accessToken,
    refresh: refreshToken,
    expires,
    accountId: typeof tokens.account_id === "string" ? tokens.account_id : undefined
  };
}
function readCodexCliCredentialsCached(options) {
  const ttlMs = options?.ttlMs ?? 0;
  const now = Date.now();
  const cacheKey = `${options?.platform ?? process.platform}|${resolveCodexCliAuthPath()}`;
  if (ttlMs > 0 &&
  codexCliCache &&
  codexCliCache.cacheKey === cacheKey &&
  now - codexCliCache.readAt < ttlMs) {
    return codexCliCache.value;
  }
  const value = readCodexCliCredentials({
    platform: options?.platform,
    execSync: options?.execSync
  });
  if (ttlMs > 0) {
    codexCliCache = { value, readAt: now, cacheKey };
  }
  return value;
}
function readQwenCliCredentialsCached(options) {
  const ttlMs = options?.ttlMs ?? 0;
  const now = Date.now();
  const cacheKey = resolveQwenCliCredentialsPath(options?.homeDir);
  if (ttlMs > 0 &&
  qwenCliCache &&
  qwenCliCache.cacheKey === cacheKey &&
  now - qwenCliCache.readAt < ttlMs) {
    return qwenCliCache.value;
  }
  const value = readQwenCliCredentials({ homeDir: options?.homeDir });
  if (ttlMs > 0) {
    qwenCliCache = { value, readAt: now, cacheKey };
  }
  return value;
}
function readMiniMaxCliCredentialsCached(options) {
  const ttlMs = options?.ttlMs ?? 0;
  const now = Date.now();
  const cacheKey = resolveMiniMaxCliCredentialsPath(options?.homeDir);
  if (ttlMs > 0 &&
  minimaxCliCache &&
  minimaxCliCache.cacheKey === cacheKey &&
  now - minimaxCliCache.readAt < ttlMs) {
    return minimaxCliCache.value;
  }
  const value = readMiniMaxCliCredentials({ homeDir: options?.homeDir });
  if (ttlMs > 0) {
    minimaxCliCache = { value, readAt: now, cacheKey };
  }
  return value;
} /* v9-1d7d64ac9a2ddac1 */
