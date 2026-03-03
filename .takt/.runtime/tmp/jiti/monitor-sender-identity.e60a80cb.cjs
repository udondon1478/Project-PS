"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveDiscordSenderIdentity = resolveDiscordSenderIdentity;exports.resolveDiscordSenderLabel = resolveDiscordSenderLabel;exports.resolveDiscordWebhookId = resolveDiscordWebhookId;var _format = require("./format.js");
function resolveDiscordWebhookId(message) {
  const candidate = message.webhookId ?? message.webhook_id;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}
function resolveDiscordSenderIdentity(params) {
  const pkInfo = params.pluralkitInfo ?? null;
  const pkMember = pkInfo?.member ?? undefined;
  const pkSystem = pkInfo?.system ?? undefined;
  const memberId = pkMember?.id?.trim();
  const memberNameRaw = pkMember?.display_name ?? pkMember?.name ?? "";
  const memberName = memberNameRaw?.trim();
  if (memberId && memberName) {
    const systemName = pkSystem?.name?.trim();
    const label = systemName ? `${memberName} (PK:${systemName})` : `${memberName} (PK)`;
    return {
      id: memberId,
      name: memberName,
      tag: pkMember?.name?.trim() || undefined,
      label,
      isPluralKit: true,
      pluralkit: {
        memberId,
        memberName,
        systemId: pkSystem?.id?.trim() || undefined,
        systemName
      }
    };
  }
  const senderTag = (0, _format.formatDiscordUserTag)(params.author);
  const senderDisplay = params.member?.nickname ?? params.author.globalName ?? params.author.username;
  const senderLabel = senderDisplay && senderTag && senderDisplay !== senderTag ?
  `${senderDisplay} (${senderTag})` :
  senderDisplay ?? senderTag ?? params.author.id;
  return {
    id: params.author.id,
    name: params.author.username ?? undefined,
    tag: senderTag,
    label: senderLabel,
    isPluralKit: false
  };
}
function resolveDiscordSenderLabel(params) {
  return resolveDiscordSenderIdentity(params).label;
} /* v9-7b76f9d699c654c7 */
