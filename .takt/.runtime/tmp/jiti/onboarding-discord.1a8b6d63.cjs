"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.discordOnboardingAdapter = void 0;var _accounts = require("../../../discord/accounts.js");
var _allowList = require("../../../discord/monitor/allow-list.js");
var _resolveChannels = require("../../../discord/resolve-channels.js");
var _resolveUsers = require("../../../discord/resolve-users.js");
var _sessionKey = require("../../../routing/session-key.js");
var _links = require("../../../terminal/links.js");
var _channelAccess = require("./channel-access.js");
var _helpers = require("./helpers.js");
const channel = "discord";
function setDiscordDmPolicy(cfg, dmPolicy) {
  const allowFrom = dmPolicy === "open" ? (0, _helpers.addWildcardAllowFrom)(cfg.channels?.discord?.dm?.allowFrom) : undefined;
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      discord: {
        ...cfg.channels?.discord,
        dm: {
          ...cfg.channels?.discord?.dm,
          enabled: cfg.channels?.discord?.dm?.enabled ?? true,
          policy: dmPolicy,
          ...(allowFrom ? { allowFrom } : {})
        }
      }
    }
  };
}
async function noteDiscordTokenHelp(prompter) {
  await prompter.note([
  "1) Discord Developer Portal → Applications → New Application",
  "2) Bot → Add Bot → Reset Token → copy token",
  "3) OAuth2 → URL Generator → scope 'bot' → invite to your server",
  "Tip: enable Message Content Intent if you need message text. (Bot → Privileged Gateway Intents → Message Content Intent)",
  `Docs: ${(0, _links.formatDocsLink)("/discord", "discord")}`].
  join("\n"), "Discord bot token");
}
function setDiscordGroupPolicy(cfg, accountId, groupPolicy) {
  if (accountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        discord: {
          ...cfg.channels?.discord,
          enabled: true,
          groupPolicy
        }
      }
    };
  }
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      discord: {
        ...cfg.channels?.discord,
        enabled: true,
        accounts: {
          ...cfg.channels?.discord?.accounts,
          [accountId]: {
            ...cfg.channels?.discord?.accounts?.[accountId],
            enabled: cfg.channels?.discord?.accounts?.[accountId]?.enabled ?? true,
            groupPolicy
          }
        }
      }
    }
  };
}
function setDiscordGuildChannelAllowlist(cfg, accountId, entries) {
  const baseGuilds = accountId === _sessionKey.DEFAULT_ACCOUNT_ID ?
  cfg.channels?.discord?.guilds ?? {} :
  cfg.channels?.discord?.accounts?.[accountId]?.guilds ?? {};
  const guilds = { ...baseGuilds };
  for (const entry of entries) {
    const guildKey = entry.guildKey || "*";
    const existing = guilds[guildKey] ?? {};
    if (entry.channelKey) {
      const channels = { ...existing.channels };
      channels[entry.channelKey] = { allow: true };
      guilds[guildKey] = { ...existing, channels };
    } else
    {
      guilds[guildKey] = existing;
    }
  }
  if (accountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        discord: {
          ...cfg.channels?.discord,
          enabled: true,
          guilds
        }
      }
    };
  }
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      discord: {
        ...cfg.channels?.discord,
        enabled: true,
        accounts: {
          ...cfg.channels?.discord?.accounts,
          [accountId]: {
            ...cfg.channels?.discord?.accounts?.[accountId],
            enabled: cfg.channels?.discord?.accounts?.[accountId]?.enabled ?? true,
            guilds
          }
        }
      }
    }
  };
}
function setDiscordAllowFrom(cfg, allowFrom) {
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      discord: {
        ...cfg.channels?.discord,
        dm: {
          ...cfg.channels?.discord?.dm,
          enabled: cfg.channels?.discord?.dm?.enabled ?? true,
          allowFrom
        }
      }
    }
  };
}
function parseDiscordAllowFromInput(raw) {
  return raw.
  split(/[\n,;]+/g).
  map((entry) => entry.trim()).
  filter(Boolean);
}
async function promptDiscordAllowFrom(params) {
  const accountId = params.accountId && (0, _sessionKey.normalizeAccountId)(params.accountId) ?
  (0, _sessionKey.normalizeAccountId)(params.accountId) ?? _sessionKey.DEFAULT_ACCOUNT_ID :
  (0, _accounts.resolveDefaultDiscordAccountId)(params.cfg);
  const resolved = (0, _accounts.resolveDiscordAccount)({ cfg: params.cfg, accountId });
  const token = resolved.token;
  const existing = params.cfg.channels?.discord?.dm?.allowFrom ?? [];
  await params.prompter.note([
  "Allowlist Discord DMs by username (we resolve to user ids).",
  "Examples:",
  "- 123456789012345678",
  "- @alice",
  "- alice#1234",
  "Multiple entries: comma-separated.",
  `Docs: ${(0, _links.formatDocsLink)("/discord", "discord")}`].
  join("\n"), "Discord allowlist");
  const parseInputs = (value) => parseDiscordAllowFromInput(value);
  const parseId = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const mention = trimmed.match(/^<@!?(\d+)>$/);
    if (mention) {
      return mention[1];
    }
    const prefixed = trimmed.replace(/^(user:|discord:)/i, "");
    if (/^\d+$/.test(prefixed)) {
      return prefixed;
    }
    return null;
  };
  while (true) {
    const entry = await params.prompter.text({
      message: "Discord allowFrom (usernames or ids)",
      placeholder: "@alice, 123456789012345678",
      initialValue: existing[0] ? String(existing[0]) : undefined,
      validate: (value) => String(value ?? "").trim() ? undefined : "Required"
    });
    const parts = parseInputs(String(entry));
    if (!token) {
      const ids = parts.map(parseId).filter(Boolean);
      if (ids.length !== parts.length) {
        await params.prompter.note("Bot token missing; use numeric user ids (or mention form) only.", "Discord allowlist");
        continue;
      }
      const unique = [...new Set([...existing.map((v) => String(v).trim()), ...ids])].filter(Boolean);
      return setDiscordAllowFrom(params.cfg, unique);
    }
    const results = await (0, _resolveUsers.resolveDiscordUserAllowlist)({
      token,
      entries: parts
    }).catch(() => null);
    if (!results) {
      await params.prompter.note("Failed to resolve usernames. Try again.", "Discord allowlist");
      continue;
    }
    const unresolved = results.filter((res) => !res.resolved || !res.id);
    if (unresolved.length > 0) {
      await params.prompter.note(`Could not resolve: ${unresolved.map((res) => res.input).join(", ")}`, "Discord allowlist");
      continue;
    }
    const ids = results.map((res) => res.id);
    const unique = [...new Set([...existing.map((v) => String(v).trim()).filter(Boolean), ...ids])];
    return setDiscordAllowFrom(params.cfg, unique);
  }
}
const dmPolicy = {
  label: "Discord",
  channel,
  policyKey: "channels.discord.dm.policy",
  allowFromKey: "channels.discord.dm.allowFrom",
  getCurrent: (cfg) => cfg.channels?.discord?.dm?.policy ?? "pairing",
  setPolicy: (cfg, policy) => setDiscordDmPolicy(cfg, policy),
  promptAllowFrom: promptDiscordAllowFrom
};
const discordOnboardingAdapter = exports.discordOnboardingAdapter = {
  channel,
  getStatus: async ({ cfg }) => {
    const configured = (0, _accounts.listDiscordAccountIds)(cfg).some((accountId) => Boolean((0, _accounts.resolveDiscordAccount)({ cfg, accountId }).token));
    return {
      channel,
      configured,
      statusLines: [`Discord: ${configured ? "configured" : "needs token"}`],
      selectionHint: configured ? "configured" : "needs token",
      quickstartScore: configured ? 2 : 1
    };
  },
  configure: async ({ cfg, prompter, accountOverrides, shouldPromptAccountIds }) => {
    const discordOverride = accountOverrides.discord?.trim();
    const defaultDiscordAccountId = (0, _accounts.resolveDefaultDiscordAccountId)(cfg);
    let discordAccountId = discordOverride ?
    (0, _sessionKey.normalizeAccountId)(discordOverride) :
    defaultDiscordAccountId;
    if (shouldPromptAccountIds && !discordOverride) {
      discordAccountId = await (0, _helpers.promptAccountId)({
        cfg,
        prompter,
        label: "Discord",
        currentId: discordAccountId,
        listAccountIds: _accounts.listDiscordAccountIds,
        defaultAccountId: defaultDiscordAccountId
      });
    }
    let next = cfg;
    const resolvedAccount = (0, _accounts.resolveDiscordAccount)({
      cfg: next,
      accountId: discordAccountId
    });
    const accountConfigured = Boolean(resolvedAccount.token);
    const allowEnv = discordAccountId === _sessionKey.DEFAULT_ACCOUNT_ID;
    const canUseEnv = allowEnv && Boolean(process.env.DISCORD_BOT_TOKEN?.trim());
    const hasConfigToken = Boolean(resolvedAccount.config.token);
    let token = null;
    if (!accountConfigured) {
      await noteDiscordTokenHelp(prompter);
    }
    if (canUseEnv && !resolvedAccount.config.token) {
      const keepEnv = await prompter.confirm({
        message: "DISCORD_BOT_TOKEN detected. Use env var?",
        initialValue: true
      });
      if (keepEnv) {
        next = {
          ...next,
          channels: {
            ...next.channels,
            discord: { ...next.channels?.discord, enabled: true }
          }
        };
      } else
      {
        token = String(await prompter.text({
          message: "Enter Discord bot token",
          validate: (value) => value?.trim() ? undefined : "Required"
        })).trim();
      }
    } else
    if (hasConfigToken) {
      const keep = await prompter.confirm({
        message: "Discord token already configured. Keep it?",
        initialValue: true
      });
      if (!keep) {
        token = String(await prompter.text({
          message: "Enter Discord bot token",
          validate: (value) => value?.trim() ? undefined : "Required"
        })).trim();
      }
    } else
    {
      token = String(await prompter.text({
        message: "Enter Discord bot token",
        validate: (value) => value?.trim() ? undefined : "Required"
      })).trim();
    }
    if (token) {
      if (discordAccountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
        next = {
          ...next,
          channels: {
            ...next.channels,
            discord: { ...next.channels?.discord, enabled: true, token }
          }
        };
      } else
      {
        next = {
          ...next,
          channels: {
            ...next.channels,
            discord: {
              ...next.channels?.discord,
              enabled: true,
              accounts: {
                ...next.channels?.discord?.accounts,
                [discordAccountId]: {
                  ...next.channels?.discord?.accounts?.[discordAccountId],
                  enabled: next.channels?.discord?.accounts?.[discordAccountId]?.enabled ?? true,
                  token
                }
              }
            }
          }
        };
      }
    }
    const currentEntries = Object.entries(resolvedAccount.config.guilds ?? {}).flatMap(([guildKey, value]) => {
      const channels = value?.channels ?? {};
      const channelKeys = Object.keys(channels);
      if (channelKeys.length === 0) {
        return [guildKey];
      }
      return channelKeys.map((channelKey) => `${guildKey}/${channelKey}`);
    });
    const accessConfig = await (0, _channelAccess.promptChannelAccessConfig)({
      prompter,
      label: "Discord channels",
      currentPolicy: resolvedAccount.config.groupPolicy ?? "allowlist",
      currentEntries,
      placeholder: "My Server/#general, guildId/channelId, #support",
      updatePrompt: Boolean(resolvedAccount.config.guilds)
    });
    if (accessConfig) {
      if (accessConfig.policy !== "allowlist") {
        next = setDiscordGroupPolicy(next, discordAccountId, accessConfig.policy);
      } else
      {
        const accountWithTokens = (0, _accounts.resolveDiscordAccount)({
          cfg: next,
          accountId: discordAccountId
        });
        let resolved = accessConfig.entries.map((input) => ({
          input,
          resolved: false
        }));
        if (accountWithTokens.token && accessConfig.entries.length > 0) {
          try {
            resolved = await (0, _resolveChannels.resolveDiscordChannelAllowlist)({
              token: accountWithTokens.token,
              entries: accessConfig.entries
            });
            const resolvedChannels = resolved.filter((entry) => entry.resolved && entry.channelId);
            const resolvedGuilds = resolved.filter((entry) => entry.resolved && entry.guildId && !entry.channelId);
            const unresolved = resolved.
            filter((entry) => !entry.resolved).
            map((entry) => entry.input);
            if (resolvedChannels.length > 0 || resolvedGuilds.length > 0 || unresolved.length > 0) {
              const summary = [];
              if (resolvedChannels.length > 0) {
                summary.push(`Resolved channels: ${resolvedChannels.
                map((entry) => entry.channelId).
                filter(Boolean).
                join(", ")}`);
              }
              if (resolvedGuilds.length > 0) {
                summary.push(`Resolved guilds: ${resolvedGuilds.
                map((entry) => entry.guildId).
                filter(Boolean).
                join(", ")}`);
              }
              if (unresolved.length > 0) {
                summary.push(`Unresolved (kept as typed): ${unresolved.join(", ")}`);
              }
              await prompter.note(summary.join("\n"), "Discord channels");
            }
          }
          catch (err) {
            await prompter.note(`Channel lookup failed; keeping entries as typed. ${String(err)}`, "Discord channels");
          }
        }
        const allowlistEntries = [];
        for (const entry of resolved) {
          const guildKey = entry.guildId ?? (
          entry.guildName ? (0, _allowList.normalizeDiscordSlug)(entry.guildName) : undefined) ??
          "*";
          const channelKey = entry.channelId ?? (
          entry.channelName ? (0, _allowList.normalizeDiscordSlug)(entry.channelName) : undefined);
          if (!channelKey && guildKey === "*") {
            continue;
          }
          allowlistEntries.push({ guildKey, ...(channelKey ? { channelKey } : {}) });
        }
        next = setDiscordGroupPolicy(next, discordAccountId, "allowlist");
        next = setDiscordGuildChannelAllowlist(next, discordAccountId, allowlistEntries);
      }
    }
    return { cfg: next, accountId: discordAccountId };
  },
  dmPolicy,
  disable: (cfg) => ({
    ...cfg,
    channels: {
      ...cfg.channels,
      discord: { ...cfg.channels?.discord, enabled: false }
    }
  })
}; /* v9-017f471b3b4aae3f */
