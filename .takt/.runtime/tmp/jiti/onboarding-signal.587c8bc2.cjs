"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.signalOnboardingAdapter = void 0;var _commandFormat = require("../../../cli/command-format.js");
var _onboardHelpers = require("../../../commands/onboard-helpers.js");
var _signalInstall = require("../../../commands/signal-install.js");
var _sessionKey = require("../../../routing/session-key.js");
var _accounts = require("../../../signal/accounts.js");
var _links = require("../../../terminal/links.js");
var _utils = require("../../../utils.js");
var _helpers = require("./helpers.js");
const channel = "signal";
function setSignalDmPolicy(cfg, dmPolicy) {
  const allowFrom = dmPolicy === "open" ? (0, _helpers.addWildcardAllowFrom)(cfg.channels?.signal?.allowFrom) : undefined;
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      signal: {
        ...cfg.channels?.signal,
        dmPolicy,
        ...(allowFrom ? { allowFrom } : {})
      }
    }
  };
}
function setSignalAllowFrom(cfg, accountId, allowFrom) {
  if (accountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        signal: {
          ...cfg.channels?.signal,
          allowFrom
        }
      }
    };
  }
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      signal: {
        ...cfg.channels?.signal,
        accounts: {
          ...cfg.channels?.signal?.accounts,
          [accountId]: {
            ...cfg.channels?.signal?.accounts?.[accountId],
            allowFrom
          }
        }
      }
    }
  };
}
function parseSignalAllowFromInput(raw) {
  return raw.
  split(/[\n,;]+/g).
  map((entry) => entry.trim()).
  filter(Boolean);
}
function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
async function promptSignalAllowFrom(params) {
  const accountId = params.accountId && (0, _sessionKey.normalizeAccountId)(params.accountId) ?
  (0, _sessionKey.normalizeAccountId)(params.accountId) ?? _sessionKey.DEFAULT_ACCOUNT_ID :
  (0, _accounts.resolveDefaultSignalAccountId)(params.cfg);
  const resolved = (0, _accounts.resolveSignalAccount)({ cfg: params.cfg, accountId });
  const existing = resolved.config.allowFrom ?? [];
  await params.prompter.note([
  "Allowlist Signal DMs by sender id.",
  "Examples:",
  "- +15555550123",
  "- uuid:123e4567-e89b-12d3-a456-426614174000",
  "Multiple entries: comma-separated.",
  `Docs: ${(0, _links.formatDocsLink)("/signal", "signal")}`].
  join("\n"), "Signal allowlist");
  const entry = await params.prompter.text({
    message: "Signal allowFrom (E.164 or uuid)",
    placeholder: "+15555550123, uuid:123e4567-e89b-12d3-a456-426614174000",
    initialValue: existing[0] ? String(existing[0]) : undefined,
    validate: (value) => {
      const raw = String(value ?? "").trim();
      if (!raw) {
        return "Required";
      }
      const parts = parseSignalAllowFromInput(raw);
      for (const part of parts) {
        if (part === "*") {
          continue;
        }
        if (part.toLowerCase().startsWith("uuid:")) {
          if (!part.slice("uuid:".length).trim()) {
            return "Invalid uuid entry";
          }
          continue;
        }
        if (isUuidLike(part)) {
          continue;
        }
        if (!(0, _utils.normalizeE164)(part)) {
          return `Invalid entry: ${part}`;
        }
      }
      return undefined;
    }
  });
  const parts = parseSignalAllowFromInput(String(entry));
  const normalized = parts.
  map((part) => {
    if (part === "*") {
      return "*";
    }
    if (part.toLowerCase().startsWith("uuid:")) {
      return `uuid:${part.slice(5).trim()}`;
    }
    if (isUuidLike(part)) {
      return `uuid:${part}`;
    }
    return (0, _utils.normalizeE164)(part);
  }).
  filter(Boolean);
  const unique = [...new Set(normalized)];
  return setSignalAllowFrom(params.cfg, accountId, unique);
}
const dmPolicy = {
  label: "Signal",
  channel,
  policyKey: "channels.signal.dmPolicy",
  allowFromKey: "channels.signal.allowFrom",
  getCurrent: (cfg) => cfg.channels?.signal?.dmPolicy ?? "pairing",
  setPolicy: (cfg, policy) => setSignalDmPolicy(cfg, policy),
  promptAllowFrom: promptSignalAllowFrom
};
const signalOnboardingAdapter = exports.signalOnboardingAdapter = {
  channel,
  getStatus: async ({ cfg }) => {
    const configured = (0, _accounts.listSignalAccountIds)(cfg).some((accountId) => (0, _accounts.resolveSignalAccount)({ cfg, accountId }).configured);
    const signalCliPath = cfg.channels?.signal?.cliPath ?? "signal-cli";
    const signalCliDetected = await (0, _onboardHelpers.detectBinary)(signalCliPath);
    return {
      channel,
      configured,
      statusLines: [
      `Signal: ${configured ? "configured" : "needs setup"}`,
      `signal-cli: ${signalCliDetected ? "found" : "missing"} (${signalCliPath})`],

      selectionHint: signalCliDetected ? "signal-cli found" : "signal-cli missing",
      quickstartScore: signalCliDetected ? 1 : 0
    };
  },
  configure: async ({ cfg, runtime, prompter, accountOverrides, shouldPromptAccountIds, options }) => {
    const signalOverride = accountOverrides.signal?.trim();
    const defaultSignalAccountId = (0, _accounts.resolveDefaultSignalAccountId)(cfg);
    let signalAccountId = signalOverride ?
    (0, _sessionKey.normalizeAccountId)(signalOverride) :
    defaultSignalAccountId;
    if (shouldPromptAccountIds && !signalOverride) {
      signalAccountId = await (0, _helpers.promptAccountId)({
        cfg,
        prompter,
        label: "Signal",
        currentId: signalAccountId,
        listAccountIds: _accounts.listSignalAccountIds,
        defaultAccountId: defaultSignalAccountId
      });
    }
    let next = cfg;
    const resolvedAccount = (0, _accounts.resolveSignalAccount)({
      cfg: next,
      accountId: signalAccountId
    });
    const accountConfig = resolvedAccount.config;
    let resolvedCliPath = accountConfig.cliPath ?? "signal-cli";
    let cliDetected = await (0, _onboardHelpers.detectBinary)(resolvedCliPath);
    if (options?.allowSignalInstall) {
      const wantsInstall = await prompter.confirm({
        message: cliDetected ?
        "signal-cli detected. Reinstall/update now?" :
        "signal-cli not found. Install now?",
        initialValue: !cliDetected
      });
      if (wantsInstall) {
        try {
          const result = await (0, _signalInstall.installSignalCli)(runtime);
          if (result.ok && result.cliPath) {
            cliDetected = true;
            resolvedCliPath = result.cliPath;
            await prompter.note(`Installed signal-cli at ${result.cliPath}`, "Signal");
          } else
          if (!result.ok) {
            await prompter.note(result.error ?? "signal-cli install failed.", "Signal");
          }
        }
        catch (err) {
          await prompter.note(`signal-cli install failed: ${String(err)}`, "Signal");
        }
      }
    }
    if (!cliDetected) {
      await prompter.note("signal-cli not found. Install it, then rerun this step or set channels.signal.cliPath.", "Signal");
    }
    let account = accountConfig.account ?? "";
    if (account) {
      const keep = await prompter.confirm({
        message: `Signal account set (${account}). Keep it?`,
        initialValue: true
      });
      if (!keep) {
        account = "";
      }
    }
    if (!account) {
      account = String(await prompter.text({
        message: "Signal bot number (E.164)",
        validate: (value) => value?.trim() ? undefined : "Required"
      })).trim();
    }
    if (account) {
      if (signalAccountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
        next = {
          ...next,
          channels: {
            ...next.channels,
            signal: {
              ...next.channels?.signal,
              enabled: true,
              account,
              cliPath: resolvedCliPath ?? "signal-cli"
            }
          }
        };
      } else
      {
        next = {
          ...next,
          channels: {
            ...next.channels,
            signal: {
              ...next.channels?.signal,
              enabled: true,
              accounts: {
                ...next.channels?.signal?.accounts,
                [signalAccountId]: {
                  ...next.channels?.signal?.accounts?.[signalAccountId],
                  enabled: next.channels?.signal?.accounts?.[signalAccountId]?.enabled ?? true,
                  account,
                  cliPath: resolvedCliPath ?? "signal-cli"
                }
              }
            }
          }
        };
      }
    }
    await prompter.note([
    'Link device with: signal-cli link -n "OpenClaw"',
    "Scan QR in Signal → Linked Devices",
    `Then run: ${(0, _commandFormat.formatCliCommand)("openclaw gateway call channels.status --params '{\"probe\":true}'")}`,
    `Docs: ${(0, _links.formatDocsLink)("/signal", "signal")}`].
    join("\n"), "Signal next steps");
    return { cfg: next, accountId: signalAccountId };
  },
  dmPolicy,
  disable: (cfg) => ({
    ...cfg,
    channels: {
      ...cfg.channels,
      signal: { ...cfg.channels?.signal, enabled: false }
    }
  })
}; /* v9-0582580c568dd595 */
