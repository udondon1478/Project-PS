"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeDiscordToken = normalizeDiscordToken;exports.resolveDiscordToken = resolveDiscordToken;var _sessionKey = require("../routing/session-key.js");
function normalizeDiscordToken(raw) {
  if (!raw) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace(/^Bot\s+/i, "");
}
function resolveDiscordToken(cfg, opts = {}) {
  const accountId = (0, _sessionKey.normalizeAccountId)(opts.accountId);
  const discordCfg = cfg?.channels?.discord;
  const accountCfg = accountId !== _sessionKey.DEFAULT_ACCOUNT_ID ?
  discordCfg?.accounts?.[accountId] :
  discordCfg?.accounts?.[_sessionKey.DEFAULT_ACCOUNT_ID];
  const accountToken = normalizeDiscordToken(accountCfg?.token ?? undefined);
  if (accountToken) {
    return { token: accountToken, source: "config" };
  }
  const allowEnv = accountId === _sessionKey.DEFAULT_ACCOUNT_ID;
  const configToken = allowEnv ? normalizeDiscordToken(discordCfg?.token ?? undefined) : undefined;
  if (configToken) {
    return { token: configToken, source: "config" };
  }
  const envToken = allowEnv ?
  normalizeDiscordToken(opts.envToken ?? process.env.DISCORD_BOT_TOKEN) :
  undefined;
  if (envToken) {
    return { token: envToken, source: "env" };
  }
  return { token: "", source: "none" };
} /* v9-480b9596f96d5f27 */
