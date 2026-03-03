"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listDiscordDirectoryGroupsFromConfig = listDiscordDirectoryGroupsFromConfig;exports.listDiscordDirectoryPeersFromConfig = listDiscordDirectoryPeersFromConfig;exports.listSlackDirectoryGroupsFromConfig = listSlackDirectoryGroupsFromConfig;exports.listSlackDirectoryPeersFromConfig = listSlackDirectoryPeersFromConfig;exports.listTelegramDirectoryGroupsFromConfig = listTelegramDirectoryGroupsFromConfig;exports.listTelegramDirectoryPeersFromConfig = listTelegramDirectoryPeersFromConfig;exports.listWhatsAppDirectoryGroupsFromConfig = listWhatsAppDirectoryGroupsFromConfig;exports.listWhatsAppDirectoryPeersFromConfig = listWhatsAppDirectoryPeersFromConfig;var _accounts = require("../../discord/accounts.js");
var _accounts2 = require("../../slack/accounts.js");
var _accounts3 = require("../../telegram/accounts.js");
var _accounts4 = require("../../web/accounts.js");
var _normalize = require("../../whatsapp/normalize.js");
var _slack = require("./normalize/slack.js");
async function listSlackDirectoryPeersFromConfig(params) {
  const account = (0, _accounts2.resolveSlackAccount)({ cfg: params.cfg, accountId: params.accountId });
  const q = params.query?.trim().toLowerCase() || "";
  const ids = new Set();
  for (const entry of account.dm?.allowFrom ?? []) {
    const raw = String(entry).trim();
    if (!raw || raw === "*") {
      continue;
    }
    ids.add(raw);
  }
  for (const id of Object.keys(account.config.dms ?? {})) {
    const trimmed = id.trim();
    if (trimmed) {
      ids.add(trimmed);
    }
  }
  for (const channel of Object.values(account.config.channels ?? {})) {
    for (const user of channel.users ?? []) {
      const raw = String(user).trim();
      if (raw) {
        ids.add(raw);
      }
    }
  }
  return Array.from(ids).
  map((raw) => raw.trim()).
  filter(Boolean).
  map((raw) => {
    const mention = raw.match(/^<@([A-Z0-9]+)>$/i);
    const normalizedUserId = (mention?.[1] ?? raw).replace(/^(slack|user):/i, "").trim();
    if (!normalizedUserId) {
      return null;
    }
    const target = `user:${normalizedUserId}`;
    return (0, _slack.normalizeSlackMessagingTarget)(target) ?? target.toLowerCase();
  }).
  filter((id) => Boolean(id)).
  filter((id) => id.startsWith("user:")).
  filter((id) => q ? id.toLowerCase().includes(q) : true).
  slice(0, params.limit && params.limit > 0 ? params.limit : undefined).
  map((id) => ({ kind: "user", id }));
}
async function listSlackDirectoryGroupsFromConfig(params) {
  const account = (0, _accounts2.resolveSlackAccount)({ cfg: params.cfg, accountId: params.accountId });
  const q = params.query?.trim().toLowerCase() || "";
  return Object.keys(account.config.channels ?? {}).
  map((raw) => raw.trim()).
  filter(Boolean).
  map((raw) => (0, _slack.normalizeSlackMessagingTarget)(raw) ?? raw.toLowerCase()).
  filter((id) => id.startsWith("channel:")).
  filter((id) => q ? id.toLowerCase().includes(q) : true).
  slice(0, params.limit && params.limit > 0 ? params.limit : undefined).
  map((id) => ({ kind: "group", id }));
}
async function listDiscordDirectoryPeersFromConfig(params) {
  const account = (0, _accounts.resolveDiscordAccount)({ cfg: params.cfg, accountId: params.accountId });
  const q = params.query?.trim().toLowerCase() || "";
  const ids = new Set();
  for (const entry of account.config.dm?.allowFrom ?? []) {
    const raw = String(entry).trim();
    if (!raw || raw === "*") {
      continue;
    }
    ids.add(raw);
  }
  for (const id of Object.keys(account.config.dms ?? {})) {
    const trimmed = id.trim();
    if (trimmed) {
      ids.add(trimmed);
    }
  }
  for (const guild of Object.values(account.config.guilds ?? {})) {
    for (const entry of guild.users ?? []) {
      const raw = String(entry).trim();
      if (raw) {
        ids.add(raw);
      }
    }
    for (const channel of Object.values(guild.channels ?? {})) {
      for (const user of channel.users ?? []) {
        const raw = String(user).trim();
        if (raw) {
          ids.add(raw);
        }
      }
    }
  }
  return Array.from(ids).
  map((raw) => raw.trim()).
  filter(Boolean).
  map((raw) => {
    const mention = raw.match(/^<@!?(\d+)>$/);
    const cleaned = (mention?.[1] ?? raw).replace(/^(discord|user):/i, "").trim();
    if (!/^\d+$/.test(cleaned)) {
      return null;
    }
    return `user:${cleaned}`;
  }).
  filter((id) => Boolean(id)).
  filter((id) => q ? id.toLowerCase().includes(q) : true).
  slice(0, params.limit && params.limit > 0 ? params.limit : undefined).
  map((id) => ({ kind: "user", id }));
}
async function listDiscordDirectoryGroupsFromConfig(params) {
  const account = (0, _accounts.resolveDiscordAccount)({ cfg: params.cfg, accountId: params.accountId });
  const q = params.query?.trim().toLowerCase() || "";
  const ids = new Set();
  for (const guild of Object.values(account.config.guilds ?? {})) {
    for (const channelId of Object.keys(guild.channels ?? {})) {
      const trimmed = channelId.trim();
      if (trimmed) {
        ids.add(trimmed);
      }
    }
  }
  return Array.from(ids).
  map((raw) => raw.trim()).
  filter(Boolean).
  map((raw) => {
    const mention = raw.match(/^<#(\d+)>$/);
    const cleaned = (mention?.[1] ?? raw).replace(/^(discord|channel|group):/i, "").trim();
    if (!/^\d+$/.test(cleaned)) {
      return null;
    }
    return `channel:${cleaned}`;
  }).
  filter((id) => Boolean(id)).
  filter((id) => q ? id.toLowerCase().includes(q) : true).
  slice(0, params.limit && params.limit > 0 ? params.limit : undefined).
  map((id) => ({ kind: "group", id }));
}
async function listTelegramDirectoryPeersFromConfig(params) {
  const account = (0, _accounts3.resolveTelegramAccount)({ cfg: params.cfg, accountId: params.accountId });
  const q = params.query?.trim().toLowerCase() || "";
  const raw = [
  ...(account.config.allowFrom ?? []).map((entry) => String(entry)),
  ...Object.keys(account.config.dms ?? {})];

  return Array.from(new Set(raw.
  map((entry) => entry.trim()).
  filter(Boolean).
  map((entry) => entry.replace(/^(telegram|tg):/i, "")))).
  map((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return null;
    }
    if (/^-?\d+$/.test(trimmed)) {
      return trimmed;
    }
    const withAt = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
    return withAt;
  }).
  filter((id) => Boolean(id)).
  filter((id) => q ? id.toLowerCase().includes(q) : true).
  slice(0, params.limit && params.limit > 0 ? params.limit : undefined).
  map((id) => ({ kind: "user", id }));
}
async function listTelegramDirectoryGroupsFromConfig(params) {
  const account = (0, _accounts3.resolveTelegramAccount)({ cfg: params.cfg, accountId: params.accountId });
  const q = params.query?.trim().toLowerCase() || "";
  return Object.keys(account.config.groups ?? {}).
  map((id) => id.trim()).
  filter((id) => Boolean(id) && id !== "*").
  filter((id) => q ? id.toLowerCase().includes(q) : true).
  slice(0, params.limit && params.limit > 0 ? params.limit : undefined).
  map((id) => ({ kind: "group", id }));
}
async function listWhatsAppDirectoryPeersFromConfig(params) {
  const account = (0, _accounts4.resolveWhatsAppAccount)({ cfg: params.cfg, accountId: params.accountId });
  const q = params.query?.trim().toLowerCase() || "";
  return (account.allowFrom ?? []).
  map((entry) => String(entry).trim()).
  filter((entry) => Boolean(entry) && entry !== "*").
  map((entry) => (0, _normalize.normalizeWhatsAppTarget)(entry) ?? "").
  filter(Boolean).
  filter((id) => !(0, _normalize.isWhatsAppGroupJid)(id)).
  filter((id) => q ? id.toLowerCase().includes(q) : true).
  slice(0, params.limit && params.limit > 0 ? params.limit : undefined).
  map((id) => ({ kind: "user", id }));
}
async function listWhatsAppDirectoryGroupsFromConfig(params) {
  const account = (0, _accounts4.resolveWhatsAppAccount)({ cfg: params.cfg, accountId: params.accountId });
  const q = params.query?.trim().toLowerCase() || "";
  return Object.keys(account.groups ?? {}).
  map((id) => id.trim()).
  filter((id) => Boolean(id) && id !== "*").
  filter((id) => q ? id.toLowerCase().includes(q) : true).
  slice(0, params.limit && params.limit > 0 ? params.limit : undefined).
  map((id) => ({ kind: "group", id }));
} /* v9-2dafd2d909d55b3b */
