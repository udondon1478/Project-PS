"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.collectTelegramStatusIssues = collectTelegramStatusIssues;var _shared = require("./shared.js");
function readTelegramAccountStatus(value) {
  if (!(0, _shared.isRecord)(value)) {
    return null;
  }
  return {
    accountId: value.accountId,
    enabled: value.enabled,
    configured: value.configured,
    allowUnmentionedGroups: value.allowUnmentionedGroups,
    audit: value.audit
  };
}
function readTelegramGroupMembershipAuditSummary(value) {
  if (!(0, _shared.isRecord)(value)) {
    return {};
  }
  const unresolvedGroups = typeof value.unresolvedGroups === "number" && Number.isFinite(value.unresolvedGroups) ?
  value.unresolvedGroups :
  undefined;
  const hasWildcardUnmentionedGroups = typeof value.hasWildcardUnmentionedGroups === "boolean" ?
  value.hasWildcardUnmentionedGroups :
  undefined;
  const groupsRaw = value.groups;
  const groups = Array.isArray(groupsRaw) ?
  groupsRaw.
  map((entry) => {
    if (!(0, _shared.isRecord)(entry)) {
      return null;
    }
    const chatId = (0, _shared.asString)(entry.chatId);
    if (!chatId) {
      return null;
    }
    const ok = typeof entry.ok === "boolean" ? entry.ok : undefined;
    const status = (0, _shared.asString)(entry.status) ?? null;
    const error = (0, _shared.asString)(entry.error) ?? null;
    const matchKey = (0, _shared.asString)(entry.matchKey) ?? undefined;
    const matchSource = (0, _shared.asString)(entry.matchSource) ?? undefined;
    return { chatId, ok, status, error, matchKey, matchSource };
  }).
  filter(Boolean) :
  undefined;
  return { unresolvedGroups, hasWildcardUnmentionedGroups, groups };
}
function collectTelegramStatusIssues(accounts) {
  const issues = [];
  for (const entry of accounts) {
    const account = readTelegramAccountStatus(entry);
    if (!account) {
      continue;
    }
    const accountId = (0, _shared.asString)(account.accountId) ?? "default";
    const enabled = account.enabled !== false;
    const configured = account.configured === true;
    if (!enabled || !configured) {
      continue;
    }
    if (account.allowUnmentionedGroups === true) {
      issues.push({
        channel: "telegram",
        accountId,
        kind: "config",
        message: "Config allows unmentioned group messages (requireMention=false). Telegram Bot API privacy mode will block most group messages unless disabled.",
        fix: "In BotFather run /setprivacy → Disable for this bot (then restart the gateway)."
      });
    }
    const audit = readTelegramGroupMembershipAuditSummary(account.audit);
    if (audit.hasWildcardUnmentionedGroups === true) {
      issues.push({
        channel: "telegram",
        accountId,
        kind: "config",
        message: 'Telegram groups config uses "*" with requireMention=false; membership probing is not possible without explicit group IDs.',
        fix: "Add explicit numeric group ids under channels.telegram.groups (or per-account groups) to enable probing."
      });
    }
    if (audit.unresolvedGroups && audit.unresolvedGroups > 0) {
      issues.push({
        channel: "telegram",
        accountId,
        kind: "config",
        message: `Some configured Telegram groups are not numeric IDs (unresolvedGroups=${audit.unresolvedGroups}). Membership probe can only check numeric group IDs.`,
        fix: "Use numeric chat IDs (e.g. -100...) as keys in channels.telegram.groups for requireMention=false groups."
      });
    }
    for (const group of audit.groups ?? []) {
      if (group.ok === true) {
        continue;
      }
      const status = group.status ? ` status=${group.status}` : "";
      const err = group.error ? `: ${group.error}` : "";
      const baseMessage = `Group ${group.chatId} not reachable by bot.${status}${err}`;
      issues.push({
        channel: "telegram",
        accountId,
        kind: "runtime",
        message: (0, _shared.appendMatchMetadata)(baseMessage, {
          matchKey: group.matchKey,
          matchSource: group.matchSource
        }),
        fix: "Invite the bot to the group, then DM the bot once (/start) and restart the gateway."
      });
    }
  }
  return issues;
} /* v9-1c5191bc41c770a8 */
