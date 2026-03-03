"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.checkInboundAccessControl = checkInboundAccessControl;var _config = require("../../config/config.js");
var _globals = require("../../globals.js");
var _pairingMessages = require("../../pairing/pairing-messages.js");
var _pairingStore = require("../../pairing/pairing-store.js");
var _utils = require("../../utils.js");
var _accounts = require("../accounts.js");
const PAIRING_REPLY_HISTORY_GRACE_MS = 30_000;
async function checkInboundAccessControl(params) {
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveWhatsAppAccount)({
    cfg,
    accountId: params.accountId
  });
  const dmPolicy = cfg.channels?.whatsapp?.dmPolicy ?? "pairing";
  const configuredAllowFrom = account.allowFrom;
  const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("whatsapp").catch(() => []);
  // Without user config, default to self-only DM access so the owner can talk to themselves.
  const combinedAllowFrom = Array.from(new Set([...(configuredAllowFrom ?? []), ...storeAllowFrom]));
  const defaultAllowFrom = combinedAllowFrom.length === 0 && params.selfE164 ? [params.selfE164] : undefined;
  const allowFrom = combinedAllowFrom.length > 0 ? combinedAllowFrom : defaultAllowFrom;
  const groupAllowFrom = account.groupAllowFrom ?? (
  configuredAllowFrom && configuredAllowFrom.length > 0 ? configuredAllowFrom : undefined);
  const isSamePhone = params.from === params.selfE164;
  const isSelfChat = (0, _utils.isSelfChatMode)(params.selfE164, configuredAllowFrom);
  const pairingGraceMs = typeof params.pairingGraceMs === "number" && params.pairingGraceMs > 0 ?
  params.pairingGraceMs :
  PAIRING_REPLY_HISTORY_GRACE_MS;
  const suppressPairingReply = typeof params.connectedAtMs === "number" &&
  typeof params.messageTimestampMs === "number" &&
  params.messageTimestampMs < params.connectedAtMs - pairingGraceMs;
  // Pre-compute normalized allowlists for filtering.
  const dmHasWildcard = allowFrom?.includes("*") ?? false;
  const normalizedAllowFrom = allowFrom && allowFrom.length > 0 ?
  allowFrom.filter((entry) => entry !== "*").map(_utils.normalizeE164) :
  [];
  const groupHasWildcard = groupAllowFrom?.includes("*") ?? false;
  const normalizedGroupAllowFrom = groupAllowFrom && groupAllowFrom.length > 0 ?
  groupAllowFrom.filter((entry) => entry !== "*").map(_utils.normalizeE164) :
  [];
  // Group policy filtering:
  // - "open": groups bypass allowFrom, only mention-gating applies
  // - "disabled": block all group messages entirely
  // - "allowlist": only allow group messages from senders in groupAllowFrom/allowFrom
  const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
  const groupPolicy = account.groupPolicy ?? defaultGroupPolicy ?? "open";
  if (params.group && groupPolicy === "disabled") {
    (0, _globals.logVerbose)("Blocked group message (groupPolicy: disabled)");
    return {
      allowed: false,
      shouldMarkRead: false,
      isSelfChat,
      resolvedAccountId: account.accountId
    };
  }
  if (params.group && groupPolicy === "allowlist") {
    if (!groupAllowFrom || groupAllowFrom.length === 0) {
      (0, _globals.logVerbose)("Blocked group message (groupPolicy: allowlist, no groupAllowFrom)");
      return {
        allowed: false,
        shouldMarkRead: false,
        isSelfChat,
        resolvedAccountId: account.accountId
      };
    }
    const senderAllowed = groupHasWildcard ||
    params.senderE164 != null && normalizedGroupAllowFrom.includes(params.senderE164);
    if (!senderAllowed) {
      (0, _globals.logVerbose)(`Blocked group message from ${params.senderE164 ?? "unknown sender"} (groupPolicy: allowlist)`);
      return {
        allowed: false,
        shouldMarkRead: false,
        isSelfChat,
        resolvedAccountId: account.accountId
      };
    }
  }
  // DM access control (secure defaults): "pairing" (default) / "allowlist" / "open" / "disabled".
  if (!params.group) {
    if (params.isFromMe && !isSamePhone) {
      (0, _globals.logVerbose)("Skipping outbound DM (fromMe); no pairing reply needed.");
      return {
        allowed: false,
        shouldMarkRead: false,
        isSelfChat,
        resolvedAccountId: account.accountId
      };
    }
    if (dmPolicy === "disabled") {
      (0, _globals.logVerbose)("Blocked dm (dmPolicy: disabled)");
      return {
        allowed: false,
        shouldMarkRead: false,
        isSelfChat,
        resolvedAccountId: account.accountId
      };
    }
    if (dmPolicy !== "open" && !isSamePhone) {
      const candidate = params.from;
      const allowed = dmHasWildcard ||
      normalizedAllowFrom.length > 0 && normalizedAllowFrom.includes(candidate);
      if (!allowed) {
        if (dmPolicy === "pairing") {
          if (suppressPairingReply) {
            (0, _globals.logVerbose)(`Skipping pairing reply for historical DM from ${candidate}.`);
          } else
          {
            const { code, created } = await (0, _pairingStore.upsertChannelPairingRequest)({
              channel: "whatsapp",
              id: candidate,
              meta: { name: (params.pushName ?? "").trim() || undefined }
            });
            if (created) {
              (0, _globals.logVerbose)(`whatsapp pairing request sender=${candidate} name=${params.pushName ?? "unknown"}`);
              try {
                await params.sock.sendMessage(params.remoteJid, {
                  text: (0, _pairingMessages.buildPairingReply)({
                    channel: "whatsapp",
                    idLine: `Your WhatsApp phone number: ${candidate}`,
                    code
                  })
                });
              }
              catch (err) {
                (0, _globals.logVerbose)(`whatsapp pairing reply failed for ${candidate}: ${String(err)}`);
              }
            }
          }
        } else
        {
          (0, _globals.logVerbose)(`Blocked unauthorized sender ${candidate} (dmPolicy=${dmPolicy})`);
        }
        return {
          allowed: false,
          shouldMarkRead: false,
          isSelfChat,
          resolvedAccountId: account.accountId
        };
      }
    }
  }
  return {
    allowed: true,
    shouldMarkRead: true,
    isSelfChat,
    resolvedAccountId: account.accountId
  };
} /* v9-2b398efc7364dbde */
