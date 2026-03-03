"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.imessageOnboardingAdapter = void 0;var _onboardHelpers = require("../../../commands/onboard-helpers.js");
var _accounts = require("../../../imessage/accounts.js");
var _targets = require("../../../imessage/targets.js");
var _sessionKey = require("../../../routing/session-key.js");
var _links = require("../../../terminal/links.js");
var _helpers = require("./helpers.js");
const channel = "imessage";
function setIMessageDmPolicy(cfg, dmPolicy) {
  const allowFrom = dmPolicy === "open" ? (0, _helpers.addWildcardAllowFrom)(cfg.channels?.imessage?.allowFrom) : undefined;
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      imessage: {
        ...cfg.channels?.imessage,
        dmPolicy,
        ...(allowFrom ? { allowFrom } : {})
      }
    }
  };
}
function setIMessageAllowFrom(cfg, accountId, allowFrom) {
  if (accountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        imessage: {
          ...cfg.channels?.imessage,
          allowFrom
        }
      }
    };
  }
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      imessage: {
        ...cfg.channels?.imessage,
        accounts: {
          ...cfg.channels?.imessage?.accounts,
          [accountId]: {
            ...cfg.channels?.imessage?.accounts?.[accountId],
            allowFrom
          }
        }
      }
    }
  };
}
function parseIMessageAllowFromInput(raw) {
  return raw.
  split(/[\n,;]+/g).
  map((entry) => entry.trim()).
  filter(Boolean);
}
async function promptIMessageAllowFrom(params) {
  const accountId = params.accountId && (0, _sessionKey.normalizeAccountId)(params.accountId) ?
  (0, _sessionKey.normalizeAccountId)(params.accountId) ?? _sessionKey.DEFAULT_ACCOUNT_ID :
  (0, _accounts.resolveDefaultIMessageAccountId)(params.cfg);
  const resolved = (0, _accounts.resolveIMessageAccount)({ cfg: params.cfg, accountId });
  const existing = resolved.config.allowFrom ?? [];
  await params.prompter.note([
  "Allowlist iMessage DMs by handle or chat target.",
  "Examples:",
  "- +15555550123",
  "- user@example.com",
  "- chat_id:123",
  "- chat_guid:... or chat_identifier:...",
  "Multiple entries: comma-separated.",
  `Docs: ${(0, _links.formatDocsLink)("/imessage", "imessage")}`].
  join("\n"), "iMessage allowlist");
  const entry = await params.prompter.text({
    message: "iMessage allowFrom (handle or chat_id)",
    placeholder: "+15555550123, user@example.com, chat_id:123",
    initialValue: existing[0] ? String(existing[0]) : undefined,
    validate: (value) => {
      const raw = String(value ?? "").trim();
      if (!raw) {
        return "Required";
      }
      const parts = parseIMessageAllowFromInput(raw);
      for (const part of parts) {
        if (part === "*") {
          continue;
        }
        if (part.toLowerCase().startsWith("chat_id:")) {
          const id = part.slice("chat_id:".length).trim();
          if (!/^\d+$/.test(id)) {
            return `Invalid chat_id: ${part}`;
          }
          continue;
        }
        if (part.toLowerCase().startsWith("chat_guid:")) {
          if (!part.slice("chat_guid:".length).trim()) {
            return "Invalid chat_guid entry";
          }
          continue;
        }
        if (part.toLowerCase().startsWith("chat_identifier:")) {
          if (!part.slice("chat_identifier:".length).trim()) {
            return "Invalid chat_identifier entry";
          }
          continue;
        }
        if (!(0, _targets.normalizeIMessageHandle)(part)) {
          return `Invalid handle: ${part}`;
        }
      }
      return undefined;
    }
  });
  const parts = parseIMessageAllowFromInput(String(entry));
  const unique = [...new Set(parts)];
  return setIMessageAllowFrom(params.cfg, accountId, unique);
}
const dmPolicy = {
  label: "iMessage",
  channel,
  policyKey: "channels.imessage.dmPolicy",
  allowFromKey: "channels.imessage.allowFrom",
  getCurrent: (cfg) => cfg.channels?.imessage?.dmPolicy ?? "pairing",
  setPolicy: (cfg, policy) => setIMessageDmPolicy(cfg, policy),
  promptAllowFrom: promptIMessageAllowFrom
};
const imessageOnboardingAdapter = exports.imessageOnboardingAdapter = {
  channel,
  getStatus: async ({ cfg }) => {
    const configured = (0, _accounts.listIMessageAccountIds)(cfg).some((accountId) => {
      const account = (0, _accounts.resolveIMessageAccount)({ cfg, accountId });
      return Boolean(account.config.cliPath ||
      account.config.dbPath ||
      account.config.allowFrom ||
      account.config.service ||
      account.config.region);
    });
    const imessageCliPath = cfg.channels?.imessage?.cliPath ?? "imsg";
    const imessageCliDetected = await (0, _onboardHelpers.detectBinary)(imessageCliPath);
    return {
      channel,
      configured,
      statusLines: [
      `iMessage: ${configured ? "configured" : "needs setup"}`,
      `imsg: ${imessageCliDetected ? "found" : "missing"} (${imessageCliPath})`],

      selectionHint: imessageCliDetected ? "imsg found" : "imsg missing",
      quickstartScore: imessageCliDetected ? 1 : 0
    };
  },
  configure: async ({ cfg, prompter, accountOverrides, shouldPromptAccountIds }) => {
    const imessageOverride = accountOverrides.imessage?.trim();
    const defaultIMessageAccountId = (0, _accounts.resolveDefaultIMessageAccountId)(cfg);
    let imessageAccountId = imessageOverride ?
    (0, _sessionKey.normalizeAccountId)(imessageOverride) :
    defaultIMessageAccountId;
    if (shouldPromptAccountIds && !imessageOverride) {
      imessageAccountId = await (0, _helpers.promptAccountId)({
        cfg,
        prompter,
        label: "iMessage",
        currentId: imessageAccountId,
        listAccountIds: _accounts.listIMessageAccountIds,
        defaultAccountId: defaultIMessageAccountId
      });
    }
    let next = cfg;
    const resolvedAccount = (0, _accounts.resolveIMessageAccount)({
      cfg: next,
      accountId: imessageAccountId
    });
    let resolvedCliPath = resolvedAccount.config.cliPath ?? "imsg";
    const cliDetected = await (0, _onboardHelpers.detectBinary)(resolvedCliPath);
    if (!cliDetected) {
      const entered = await prompter.text({
        message: "imsg CLI path",
        initialValue: resolvedCliPath,
        validate: (value) => value?.trim() ? undefined : "Required"
      });
      resolvedCliPath = String(entered).trim();
      if (!resolvedCliPath) {
        await prompter.note("imsg CLI path required to enable iMessage.", "iMessage");
      }
    }
    if (resolvedCliPath) {
      if (imessageAccountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
        next = {
          ...next,
          channels: {
            ...next.channels,
            imessage: {
              ...next.channels?.imessage,
              enabled: true,
              cliPath: resolvedCliPath
            }
          }
        };
      } else
      {
        next = {
          ...next,
          channels: {
            ...next.channels,
            imessage: {
              ...next.channels?.imessage,
              enabled: true,
              accounts: {
                ...next.channels?.imessage?.accounts,
                [imessageAccountId]: {
                  ...next.channels?.imessage?.accounts?.[imessageAccountId],
                  enabled: next.channels?.imessage?.accounts?.[imessageAccountId]?.enabled ?? true,
                  cliPath: resolvedCliPath
                }
              }
            }
          }
        };
      }
    }
    await prompter.note([
    "This is still a work in progress.",
    "Ensure OpenClaw has Full Disk Access to Messages DB.",
    "Grant Automation permission for Messages when prompted.",
    "List chats with: imsg chats --limit 20",
    `Docs: ${(0, _links.formatDocsLink)("/imessage", "imessage")}`].
    join("\n"), "iMessage next steps");
    return { cfg: next, accountId: imessageAccountId };
  },
  dmPolicy,
  disable: (cfg) => ({
    ...cfg,
    channels: {
      ...cfg.channels,
      imessage: { ...cfg.channels?.imessage, enabled: false }
    }
  })
}; /* v9-9294a151487b3c8e */
