"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.whatsappOnboardingAdapter = void 0;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _channelWeb = require("../../../channel-web.js");
var _commandFormat = require("../../../cli/command-format.js");
var _mergeConfig = require("../../../config/merge-config.js");
var _sessionKey = require("../../../routing/session-key.js");
var _links = require("../../../terminal/links.js");
var _utils = require("../../../utils.js");
var _accounts = require("../../../web/accounts.js");
var _helpers = require("./helpers.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const channel = "whatsapp";
function setWhatsAppDmPolicy(cfg, dmPolicy) {
  return (0, _mergeConfig.mergeWhatsAppConfig)(cfg, { dmPolicy });
}
function setWhatsAppAllowFrom(cfg, allowFrom) {
  return (0, _mergeConfig.mergeWhatsAppConfig)(cfg, { allowFrom }, { unsetOnUndefined: ["allowFrom"] });
}
function setWhatsAppSelfChatMode(cfg, selfChatMode) {
  return (0, _mergeConfig.mergeWhatsAppConfig)(cfg, { selfChatMode });
}
async function pathExists(filePath) {
  try {
    await _promises.default.access(filePath);
    return true;
  }
  catch {
    return false;
  }
}
async function detectWhatsAppLinked(cfg, accountId) {
  const { authDir } = (0, _accounts.resolveWhatsAppAuthDir)({ cfg, accountId });
  const credsPath = _nodePath.default.join(authDir, "creds.json");
  return await pathExists(credsPath);
}
async function promptWhatsAppAllowFrom(cfg, _runtime, prompter, options) {
  const existingPolicy = cfg.channels?.whatsapp?.dmPolicy ?? "pairing";
  const existingAllowFrom = cfg.channels?.whatsapp?.allowFrom ?? [];
  const existingLabel = existingAllowFrom.length > 0 ? existingAllowFrom.join(", ") : "unset";
  if (options?.forceAllowlist) {
    await prompter.note("We need the sender/owner number so OpenClaw can allowlist you.", "WhatsApp number");
    const entry = await prompter.text({
      message: "Your personal WhatsApp number (the phone you will message from)",
      placeholder: "+15555550123",
      initialValue: existingAllowFrom[0],
      validate: (value) => {
        const raw = String(value ?? "").trim();
        if (!raw) {
          return "Required";
        }
        const normalized = (0, _utils.normalizeE164)(raw);
        if (!normalized) {
          return `Invalid number: ${raw}`;
        }
        return undefined;
      }
    });
    const normalized = (0, _utils.normalizeE164)(String(entry).trim());
    const merged = [
    ...existingAllowFrom.
    filter((item) => item !== "*").
    map((item) => (0, _utils.normalizeE164)(item)).
    filter(Boolean),
    normalized];

    const unique = [...new Set(merged.filter(Boolean))];
    let next = setWhatsAppSelfChatMode(cfg, true);
    next = setWhatsAppDmPolicy(next, "allowlist");
    next = setWhatsAppAllowFrom(next, unique);
    await prompter.note(["Allowlist mode enabled.", `- allowFrom includes ${normalized}`].join("\n"), "WhatsApp allowlist");
    return next;
  }
  await prompter.note([
  "WhatsApp direct chats are gated by `channels.whatsapp.dmPolicy` + `channels.whatsapp.allowFrom`.",
  "- pairing (default): unknown senders get a pairing code; owner approves",
  "- allowlist: unknown senders are blocked",
  '- open: public inbound DMs (requires allowFrom to include "*")',
  "- disabled: ignore WhatsApp DMs",
  "",
  `Current: dmPolicy=${existingPolicy}, allowFrom=${existingLabel}`,
  `Docs: ${(0, _links.formatDocsLink)("/whatsapp", "whatsapp")}`].
  join("\n"), "WhatsApp DM access");
  const phoneMode = await prompter.select({
    message: "WhatsApp phone setup",
    options: [
    { value: "personal", label: "This is my personal phone number" },
    { value: "separate", label: "Separate phone just for OpenClaw" }]

  });
  if (phoneMode === "personal") {
    await prompter.note("We need the sender/owner number so OpenClaw can allowlist you.", "WhatsApp number");
    const entry = await prompter.text({
      message: "Your personal WhatsApp number (the phone you will message from)",
      placeholder: "+15555550123",
      initialValue: existingAllowFrom[0],
      validate: (value) => {
        const raw = String(value ?? "").trim();
        if (!raw) {
          return "Required";
        }
        const normalized = (0, _utils.normalizeE164)(raw);
        if (!normalized) {
          return `Invalid number: ${raw}`;
        }
        return undefined;
      }
    });
    const normalized = (0, _utils.normalizeE164)(String(entry).trim());
    const merged = [
    ...existingAllowFrom.
    filter((item) => item !== "*").
    map((item) => (0, _utils.normalizeE164)(item)).
    filter(Boolean),
    normalized];

    const unique = [...new Set(merged.filter(Boolean))];
    let next = setWhatsAppSelfChatMode(cfg, true);
    next = setWhatsAppDmPolicy(next, "allowlist");
    next = setWhatsAppAllowFrom(next, unique);
    await prompter.note([
    "Personal phone mode enabled.",
    "- dmPolicy set to allowlist (pairing skipped)",
    `- allowFrom includes ${normalized}`].
    join("\n"), "WhatsApp personal phone");
    return next;
  }
  const policy = await prompter.select({
    message: "WhatsApp DM policy",
    options: [
    { value: "pairing", label: "Pairing (recommended)" },
    { value: "allowlist", label: "Allowlist only (block unknown senders)" },
    { value: "open", label: "Open (public inbound DMs)" },
    { value: "disabled", label: "Disabled (ignore WhatsApp DMs)" }]

  });
  let next = setWhatsAppSelfChatMode(cfg, false);
  next = setWhatsAppDmPolicy(next, policy);
  if (policy === "open") {
    next = setWhatsAppAllowFrom(next, ["*"]);
  }
  if (policy === "disabled") {
    return next;
  }
  const allowOptions = existingAllowFrom.length > 0 ?
  [
  { value: "keep", label: "Keep current allowFrom" },
  {
    value: "unset",
    label: "Unset allowFrom (use pairing approvals only)"
  },
  { value: "list", label: "Set allowFrom to specific numbers" }] :

  [
  { value: "unset", label: "Unset allowFrom (default)" },
  { value: "list", label: "Set allowFrom to specific numbers" }];

  const mode = await prompter.select({
    message: "WhatsApp allowFrom (optional pre-allowlist)",
    options: allowOptions.map((opt) => ({
      value: opt.value,
      label: opt.label
    }))
  });
  if (mode === "keep") {

    // Keep allowFrom as-is.
  } else if (mode === "unset") {
    next = setWhatsAppAllowFrom(next, undefined);
  } else
  {
    const allowRaw = await prompter.text({
      message: "Allowed sender numbers (comma-separated, E.164)",
      placeholder: "+15555550123, +447700900123",
      validate: (value) => {
        const raw = String(value ?? "").trim();
        if (!raw) {
          return "Required";
        }
        const parts = raw.
        split(/[\n,;]+/g).
        map((p) => p.trim()).
        filter(Boolean);
        if (parts.length === 0) {
          return "Required";
        }
        for (const part of parts) {
          if (part === "*") {
            continue;
          }
          const normalized = (0, _utils.normalizeE164)(part);
          if (!normalized) {
            return `Invalid number: ${part}`;
          }
        }
        return undefined;
      }
    });
    const parts = String(allowRaw).
    split(/[\n,;]+/g).
    map((p) => p.trim()).
    filter(Boolean);
    const normalized = parts.map((part) => part === "*" ? "*" : (0, _utils.normalizeE164)(part));
    const unique = [...new Set(normalized.filter(Boolean))];
    next = setWhatsAppAllowFrom(next, unique);
  }
  return next;
}
const whatsappOnboardingAdapter = exports.whatsappOnboardingAdapter = {
  channel,
  getStatus: async ({ cfg, accountOverrides }) => {
    const overrideId = accountOverrides.whatsapp?.trim();
    const defaultAccountId = (0, _accounts.resolveDefaultWhatsAppAccountId)(cfg);
    const accountId = overrideId ? (0, _sessionKey.normalizeAccountId)(overrideId) : defaultAccountId;
    const linked = await detectWhatsAppLinked(cfg, accountId);
    const accountLabel = accountId === _sessionKey.DEFAULT_ACCOUNT_ID ? "default" : accountId;
    return {
      channel,
      configured: linked,
      statusLines: [`WhatsApp (${accountLabel}): ${linked ? "linked" : "not linked"}`],
      selectionHint: linked ? "linked" : "not linked",
      quickstartScore: linked ? 5 : 4
    };
  },
  configure: async ({ cfg, runtime, prompter, options, accountOverrides, shouldPromptAccountIds, forceAllowFrom }) => {
    const overrideId = accountOverrides.whatsapp?.trim();
    let accountId = overrideId ?
    (0, _sessionKey.normalizeAccountId)(overrideId) :
    (0, _accounts.resolveDefaultWhatsAppAccountId)(cfg);
    if (shouldPromptAccountIds || options?.promptWhatsAppAccountId) {
      if (!overrideId) {
        accountId = await (0, _helpers.promptAccountId)({
          cfg,
          prompter,
          label: "WhatsApp",
          currentId: accountId,
          listAccountIds: _accounts.listWhatsAppAccountIds,
          defaultAccountId: (0, _accounts.resolveDefaultWhatsAppAccountId)(cfg)
        });
      }
    }
    let next = cfg;
    if (accountId !== _sessionKey.DEFAULT_ACCOUNT_ID) {
      next = {
        ...next,
        channels: {
          ...next.channels,
          whatsapp: {
            ...next.channels?.whatsapp,
            accounts: {
              ...next.channels?.whatsapp?.accounts,
              [accountId]: {
                ...next.channels?.whatsapp?.accounts?.[accountId],
                enabled: next.channels?.whatsapp?.accounts?.[accountId]?.enabled ?? true
              }
            }
          }
        }
      };
    }
    const linked = await detectWhatsAppLinked(next, accountId);
    const { authDir } = (0, _accounts.resolveWhatsAppAuthDir)({
      cfg: next,
      accountId
    });
    if (!linked) {
      await prompter.note([
      "Scan the QR with WhatsApp on your phone.",
      `Credentials are stored under ${authDir}/ for future runs.`,
      `Docs: ${(0, _links.formatDocsLink)("/whatsapp", "whatsapp")}`].
      join("\n"), "WhatsApp linking");
    }
    const wantsLink = await prompter.confirm({
      message: linked ? "WhatsApp already linked. Re-link now?" : "Link WhatsApp now (QR)?",
      initialValue: !linked
    });
    if (wantsLink) {
      try {
        await (0, _channelWeb.loginWeb)(false, undefined, runtime, accountId);
      }
      catch (err) {
        runtime.error(`WhatsApp login failed: ${String(err)}`);
        await prompter.note(`Docs: ${(0, _links.formatDocsLink)("/whatsapp", "whatsapp")}`, "WhatsApp help");
      }
    } else
    if (!linked) {
      await prompter.note(`Run \`${(0, _commandFormat.formatCliCommand)("openclaw channels login")}\` later to link WhatsApp.`, "WhatsApp");
    }
    next = await promptWhatsAppAllowFrom(next, runtime, prompter, {
      forceAllowlist: forceAllowFrom
    });
    return { cfg: next, accountId };
  },
  onAccountRecorded: (accountId, options) => {
    options?.onWhatsAppAccountId?.(accountId);
  }
}; /* v9-2027d933449bc937 */
