"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.syncExternalCliCredentials = syncExternalCliCredentials;var _cliCredentials = require("../cli-credentials.js");
var _constants = require("./constants.js");
function shallowEqualOAuthCredentials(a, b) {
  if (!a) {
    return false;
  }
  if (a.type !== "oauth") {
    return false;
  }
  return a.provider === b.provider &&
  a.access === b.access &&
  a.refresh === b.refresh &&
  a.expires === b.expires &&
  a.email === b.email &&
  a.enterpriseUrl === b.enterpriseUrl &&
  a.projectId === b.projectId &&
  a.accountId === b.accountId;
}
function isExternalProfileFresh(cred, now) {
  if (!cred) {
    return false;
  }
  if (cred.type !== "oauth" && cred.type !== "token") {
    return false;
  }
  if (cred.provider !== "qwen-portal" && cred.provider !== "minimax-portal") {
    return false;
  }
  if (typeof cred.expires !== "number") {
    return true;
  }
  return cred.expires > now + _constants.EXTERNAL_CLI_NEAR_EXPIRY_MS;
}
/** Sync external CLI credentials into the store for a given provider. */
function syncExternalCliCredentialsForProvider(store, profileId, provider, readCredentials, now) {
  const existing = store.profiles[profileId];
  const shouldSync = !existing || existing.provider !== provider || !isExternalProfileFresh(existing, now);
  const creds = shouldSync ? readCredentials() : null;
  if (!creds) {
    return false;
  }
  const existingOAuth = existing?.type === "oauth" ? existing : undefined;
  const shouldUpdate = !existingOAuth ||
  existingOAuth.provider !== provider ||
  existingOAuth.expires <= now ||
  creds.expires > existingOAuth.expires;
  if (shouldUpdate && !shallowEqualOAuthCredentials(existingOAuth, creds)) {
    store.profiles[profileId] = creds;
    _constants.log.info(`synced ${provider} credentials from external cli`, {
      profileId,
      expires: new Date(creds.expires).toISOString()
    });
    return true;
  }
  return false;
}
/**
 * Sync OAuth credentials from external CLI tools (Qwen Code CLI, MiniMax CLI) into the store.
 *
 * Returns true if any credentials were updated.
 */
function syncExternalCliCredentials(store) {
  let mutated = false;
  const now = Date.now();
  // Sync from Qwen Code CLI
  const existingQwen = store.profiles[_constants.QWEN_CLI_PROFILE_ID];
  const shouldSyncQwen = !existingQwen ||
  existingQwen.provider !== "qwen-portal" ||
  !isExternalProfileFresh(existingQwen, now);
  const qwenCreds = shouldSyncQwen ?
  (0, _cliCredentials.readQwenCliCredentialsCached)({ ttlMs: _constants.EXTERNAL_CLI_SYNC_TTL_MS }) :
  null;
  if (qwenCreds) {
    const existing = store.profiles[_constants.QWEN_CLI_PROFILE_ID];
    const existingOAuth = existing?.type === "oauth" ? existing : undefined;
    const shouldUpdate = !existingOAuth ||
    existingOAuth.provider !== "qwen-portal" ||
    existingOAuth.expires <= now ||
    qwenCreds.expires > existingOAuth.expires;
    if (shouldUpdate && !shallowEqualOAuthCredentials(existingOAuth, qwenCreds)) {
      store.profiles[_constants.QWEN_CLI_PROFILE_ID] = qwenCreds;
      mutated = true;
      _constants.log.info("synced qwen credentials from qwen cli", {
        profileId: _constants.QWEN_CLI_PROFILE_ID,
        expires: new Date(qwenCreds.expires).toISOString()
      });
    }
  }
  // Sync from MiniMax Portal CLI
  if (syncExternalCliCredentialsForProvider(store, _constants.MINIMAX_CLI_PROFILE_ID, "minimax-portal", () => (0, _cliCredentials.readMiniMaxCliCredentialsCached)({ ttlMs: _constants.EXTERNAL_CLI_SYNC_TTL_MS }), now)) {
    mutated = true;
  }
  return mutated;
} /* v9-115fa9a1aa1fc1af */
