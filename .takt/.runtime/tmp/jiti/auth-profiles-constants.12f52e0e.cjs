"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.log = exports.QWEN_CLI_PROFILE_ID = exports.MINIMAX_CLI_PROFILE_ID = exports.LEGACY_AUTH_FILENAME = exports.EXTERNAL_CLI_SYNC_TTL_MS = exports.EXTERNAL_CLI_NEAR_EXPIRY_MS = exports.CODEX_CLI_PROFILE_ID = exports.CLAUDE_CLI_PROFILE_ID = exports.AUTH_STORE_VERSION = exports.AUTH_STORE_LOCK_OPTIONS = exports.AUTH_PROFILE_FILENAME = void 0;var _subsystem = require("../../logging/subsystem.js");
const AUTH_STORE_VERSION = exports.AUTH_STORE_VERSION = 1;
const AUTH_PROFILE_FILENAME = exports.AUTH_PROFILE_FILENAME = "auth-profiles.json";
const LEGACY_AUTH_FILENAME = exports.LEGACY_AUTH_FILENAME = "auth.json";
const CLAUDE_CLI_PROFILE_ID = exports.CLAUDE_CLI_PROFILE_ID = "anthropic:claude-cli";
const CODEX_CLI_PROFILE_ID = exports.CODEX_CLI_PROFILE_ID = "openai-codex:codex-cli";
const QWEN_CLI_PROFILE_ID = exports.QWEN_CLI_PROFILE_ID = "qwen-portal:qwen-cli";
const MINIMAX_CLI_PROFILE_ID = exports.MINIMAX_CLI_PROFILE_ID = "minimax-portal:minimax-cli";
const AUTH_STORE_LOCK_OPTIONS = exports.AUTH_STORE_LOCK_OPTIONS = {
  retries: {
    retries: 10,
    factor: 2,
    minTimeout: 100,
    maxTimeout: 10_000,
    randomize: true
  },
  stale: 30_000
};
const EXTERNAL_CLI_SYNC_TTL_MS = exports.EXTERNAL_CLI_SYNC_TTL_MS = 15 * 60 * 1000;
const EXTERNAL_CLI_NEAR_EXPIRY_MS = exports.EXTERNAL_CLI_NEAR_EXPIRY_MS = 10 * 60 * 1000;
const log = exports.log = (0, _subsystem.createSubsystemLogger)("agents/auth-profiles"); /* v9-15e5c67eea112b43 */
