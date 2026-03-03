"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.telegramOnboardingAdapter = void 0;var _commandFormat = require("../../../cli/command-format.js");
var _sessionKey = require("../../../routing/session-key.js");
var _accounts = require("../../../telegram/accounts.js");
var _links = require("../../../terminal/links.js");
var _helpers = require("./helpers.js");
const channel = "telegram";
function setTelegramDmPolicy(cfg, dmPolicy) {
  const allowFrom = dmPolicy === "open" ? (0, _helpers.addWildcardAllowFrom)(cfg.channels?.telegram?.allowFrom) : undefined;
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      telegram: {
        ...cfg.channels?.telegram,
        dmPolicy,
        ...(allowFrom ? { allowFrom } : {})
      }
    }
  };
}
async function noteTelegramTokenHelp(prompter) {
  await prompter.note([
  "1) Open Telegram and chat with @BotFather",
  "2) Run /newbot (or /mybots)",
  "3) Copy the token (looks like 123456:ABC...)",
  "Tip: you can also set TELEGRAM_BOT_TOKEN in your env.",
  `Docs: ${(0, _links.formatDocsLink)("/telegram")}`,
  "Website: https://openclaw.ai"].
  join("\n"), "Telegram bot token");
}
async function noteTelegramUserIdHelp(prompter) {
  await prompter.note([
  `1) DM your bot, then read from.id in \`${(0, _commandFormat.formatCliCommand)("openclaw logs --follow")}\` (safest)`,
  "2) Or call https://api.telegram.org/bot<bot_token>/getUpdates and read message.from.id",
  "3) Third-party: DM @userinfobot or @getidsbot",
  `Docs: ${(0, _links.formatDocsLink)("/telegram")}`,
  "Website: https://openclaw.ai"].
  join("\n"), "Telegram user id");
}
async function promptTelegramAllowFrom(params) {
  const { cfg, prompter, accountId } = params;
  const resolved = (0, _accounts.resolveTelegramAccount)({ cfg, accountId });
  const existingAllowFrom = resolved.config.allowFrom ?? [];
  await noteTelegramUserIdHelp(prompter);
  const token = resolved.token;
  if (!token) {
    await prompter.note("Telegram token missing; username lookup is unavailable.", "Telegram");
  }
  const resolveTelegramUserId = async (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    const stripped = trimmed.replace(/^(telegram|tg):/i, "").trim();
    if (/^\d+$/.test(stripped)) {
      return stripped;
    }
    if (!token) {
      return null;
    }
    const username = stripped.startsWith("@") ? stripped : `@${stripped}`;
    const url = `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(username)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return null;
      }
      const data = await res.json().catch(() => null);
      const id = data?.ok ? data?.result?.id : undefined;
      if (typeof id === "number" || typeof id === "string") {
        return String(id);
      }
      return null;
    }
    catch {
      // Network error during username lookup - return null to prompt user for numeric ID
      return null;
    }
  };
  const parseInput = (value) => value.
  split(/[\n,;]+/g).
  map((entry) => entry.trim()).
  filter(Boolean);
  let resolvedIds = [];
  while (resolvedIds.length === 0) {
    const entry = await prompter.text({
      message: "Telegram allowFrom (username or user id)",
      placeholder: "@username",
      initialValue: existingAllowFrom[0] ? String(existingAllowFrom[0]) : undefined,
      validate: (value) => String(value ?? "").trim() ? undefined : "Required"
    });
    const parts = parseInput(String(entry));
    const results = await Promise.all(parts.map((part) => resolveTelegramUserId(part)));
    const unresolved = parts.filter((_, idx) => !results[idx]);
    if (unresolved.length > 0) {
      await prompter.note(`Could not resolve: ${unresolved.join(", ")}. Use @username or numeric id.`, "Telegram allowlist");
      continue;
    }
    resolvedIds = results.filter(Boolean);
  }
  const merged = [
  ...existingAllowFrom.map((item) => String(item).trim()).filter(Boolean),
  ...resolvedIds];

  const unique = [...new Set(merged)];
  if (accountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        telegram: {
          ...cfg.channels?.telegram,
          enabled: true,
          dmPolicy: "allowlist",
          allowFrom: unique
        }
      }
    };
  }
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      telegram: {
        ...cfg.channels?.telegram,
        enabled: true,
        accounts: {
          ...cfg.channels?.telegram?.accounts,
          [accountId]: {
            ...cfg.channels?.telegram?.accounts?.[accountId],
            enabled: cfg.channels?.telegram?.accounts?.[accountId]?.enabled ?? true,
            dmPolicy: "allowlist",
            allowFrom: unique
          }
        }
      }
    }
  };
}
async function promptTelegramAllowFromForAccount(params) {
  const accountId = params.accountId && (0, _sessionKey.normalizeAccountId)(params.accountId) ?
  (0, _sessionKey.normalizeAccountId)(params.accountId) ?? _sessionKey.DEFAULT_ACCOUNT_ID :
  (0, _accounts.resolveDefaultTelegramAccountId)(params.cfg);
  return promptTelegramAllowFrom({
    cfg: params.cfg,
    prompter: params.prompter,
    accountId
  });
}
const dmPolicy = {
  label: "Telegram",
  channel,
  policyKey: "channels.telegram.dmPolicy",
  allowFromKey: "channels.telegram.allowFrom",
  getCurrent: (cfg) => cfg.channels?.telegram?.dmPolicy ?? "pairing",
  setPolicy: (cfg, policy) => setTelegramDmPolicy(cfg, policy),
  promptAllowFrom: promptTelegramAllowFromForAccount
};
const telegramOnboardingAdapter = exports.telegramOnboardingAdapter = {
  channel,
  getStatus: async ({ cfg }) => {
    const configured = (0, _accounts.listTelegramAccountIds)(cfg).some((accountId) => Boolean((0, _accounts.resolveTelegramAccount)({ cfg, accountId }).token));
    return {
      channel,
      configured,
      statusLines: [`Telegram: ${configured ? "configured" : "needs token"}`],
      selectionHint: configured ? "recommended · configured" : "recommended · newcomer-friendly",
      quickstartScore: configured ? 1 : 10
    };
  },
  configure: async ({ cfg, prompter, accountOverrides, shouldPromptAccountIds, forceAllowFrom }) => {
    const telegramOverride = accountOverrides.telegram?.trim();
    const defaultTelegramAccountId = (0, _accounts.resolveDefaultTelegramAccountId)(cfg);
    let telegramAccountId = telegramOverride ?
    (0, _sessionKey.normalizeAccountId)(telegramOverride) :
    defaultTelegramAccountId;
    if (shouldPromptAccountIds && !telegramOverride) {
      telegramAccountId = await (0, _helpers.promptAccountId)({
        cfg,
        prompter,
        label: "Telegram",
        currentId: telegramAccountId,
        listAccountIds: _accounts.listTelegramAccountIds,
        defaultAccountId: defaultTelegramAccountId
      });
    }
    let next = cfg;
    const resolvedAccount = (0, _accounts.resolveTelegramAccount)({
      cfg: next,
      accountId: telegramAccountId
    });
    const accountConfigured = Boolean(resolvedAccount.token);
    const allowEnv = telegramAccountId === _sessionKey.DEFAULT_ACCOUNT_ID;
    const canUseEnv = allowEnv && Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
    const hasConfigToken = Boolean(resolvedAccount.config.botToken || resolvedAccount.config.tokenFile);
    let token = null;
    if (!accountConfigured) {
      await noteTelegramTokenHelp(prompter);
    }
    if (canUseEnv && !resolvedAccount.config.botToken) {
      const keepEnv = await prompter.confirm({
        message: "TELEGRAM_BOT_TOKEN detected. Use env var?",
        initialValue: true
      });
      if (keepEnv) {
        next = {
          ...next,
          channels: {
            ...next.channels,
            telegram: {
              ...next.channels?.telegram,
              enabled: true
            }
          }
        };
      } else
      {
        token = String(await prompter.text({
          message: "Enter Telegram bot token",
          validate: (value) => value?.trim() ? undefined : "Required"
        })).trim();
      }
    } else
    if (hasConfigToken) {
      const keep = await prompter.confirm({
        message: "Telegram token already configured. Keep it?",
        initialValue: true
      });
      if (!keep) {
        token = String(await prompter.text({
          message: "Enter Telegram bot token",
          validate: (value) => value?.trim() ? undefined : "Required"
        })).trim();
      }
    } else
    {
      token = String(await prompter.text({
        message: "Enter Telegram bot token",
        validate: (value) => value?.trim() ? undefined : "Required"
      })).trim();
    }
    if (token) {
      if (telegramAccountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
        next = {
          ...next,
          channels: {
            ...next.channels,
            telegram: {
              ...next.channels?.telegram,
              enabled: true,
              botToken: token
            }
          }
        };
      } else
      {
        next = {
          ...next,
          channels: {
            ...next.channels,
            telegram: {
              ...next.channels?.telegram,
              enabled: true,
              accounts: {
                ...next.channels?.telegram?.accounts,
                [telegramAccountId]: {
                  ...next.channels?.telegram?.accounts?.[telegramAccountId],
                  enabled: next.channels?.telegram?.accounts?.[telegramAccountId]?.enabled ?? true,
                  botToken: token
                }
              }
            }
          }
        };
      }
    }
    if (forceAllowFrom) {
      next = await promptTelegramAllowFrom({
        cfg: next,
        prompter,
        accountId: telegramAccountId
      });
    }
    return { cfg: next, accountId: telegramAccountId };
  },
  dmPolicy,
  disable: (cfg) => ({
    ...cfg,
    channels: {
      ...cfg.channels,
      telegram: { ...cfg.channels?.telegram, enabled: false }
    }
  })
}; /* v9-d89206219da29523 */
