"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getToolResult = getToolResult;exports.runMessageAction = runMessageAction;var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUrl = require("node:url");
var _agentScope = require("../../agents/agent-scope.js");
var _common = require("../../agents/tools/common.js");
var _replyDirectives = require("../../auto-reply/reply/reply-directives.js");
var _messageActions = require("../../channels/plugins/message-actions.js");
var _mime = require("../../media/mime.js");
var _targets = require("../../slack/targets.js");
var _messageChannel = require("../../utils/message-channel.js");
var _media = require("../../web/media.js");
var _channelSelection = require("./channel-selection.js");
var _channelTarget = require("./channel-target.js");
var _messageActionSpec = require("./message-action-spec.js");
var _outboundPolicy = require("./outbound-policy.js");
var _outboundSendService = require("./outbound-send-service.js");
var _outboundSession = require("./outbound-session.js");
var _targetResolver = require("./target-resolver.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function getToolResult(result) {
  return "toolResult" in result ? result.toolResult : undefined;
}
function extractToolPayload(result) {
  if (result.details !== undefined) {
    return result.details;
  }
  const textBlock = Array.isArray(result.content) ?
  result.content.find((block) => block &&
  typeof block === "object" &&
  block.type === "text" &&
  typeof block.text === "string") :
  undefined;
  const text = textBlock?.text;
  if (text) {
    try {
      return JSON.parse(text);
    }
    catch {
      return text;
    }
  }
  return result.content ?? result;
}
function applyCrossContextMessageDecoration({ params, message, decoration, preferEmbeds }) {
  const applied = (0, _outboundPolicy.applyCrossContextDecoration)({
    message,
    decoration,
    preferEmbeds
  });
  params.message = applied.message;
  if (applied.embeds?.length) {
    params.embeds = applied.embeds;
  }
  return applied.message;
}
async function maybeApplyCrossContextMarker(params) {
  if (!(0, _outboundPolicy.shouldApplyCrossContextMarker)(params.action) || !params.toolContext) {
    return params.message;
  }
  const decoration = await (0, _outboundPolicy.buildCrossContextDecoration)({
    cfg: params.cfg,
    channel: params.channel,
    target: params.target,
    toolContext: params.toolContext,
    accountId: params.accountId ?? undefined
  });
  if (!decoration) {
    return params.message;
  }
  return applyCrossContextMessageDecoration({
    params: params.args,
    message: params.message,
    decoration,
    preferEmbeds: params.preferEmbeds
  });
}
function readBooleanParam(params, key) {
  const raw = params[key];
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === "true") {
      return true;
    }
    if (trimmed === "false") {
      return false;
    }
  }
  return undefined;
}
function resolveSlackAutoThreadId(params) {
  const context = params.toolContext;
  if (!context?.currentThreadTs || !context.currentChannelId) {
    return undefined;
  }
  // Only mirror auto-threading when Slack would reply in the active thread for this channel.
  if (context.replyToMode !== "all" && context.replyToMode !== "first") {
    return undefined;
  }
  const parsedTarget = (0, _targets.parseSlackTarget)(params.to, { defaultKind: "channel" });
  if (!parsedTarget || parsedTarget.kind !== "channel") {
    return undefined;
  }
  if (parsedTarget.id.toLowerCase() !== context.currentChannelId.toLowerCase()) {
    return undefined;
  }
  if (context.replyToMode === "first" && context.hasRepliedRef?.value) {
    return undefined;
  }
  return context.currentThreadTs;
}
function resolveAttachmentMaxBytes(params) {
  const fallback = params.cfg.agents?.defaults?.mediaMaxMb;
  if (params.channel !== "bluebubbles") {
    return typeof fallback === "number" ? fallback * 1024 * 1024 : undefined;
  }
  const accountId = typeof params.accountId === "string" ? params.accountId.trim() : "";
  const channelCfg = params.cfg.channels?.bluebubbles;
  const channelObj = channelCfg && typeof channelCfg === "object" ?
  channelCfg :
  undefined;
  const channelMediaMax = typeof channelObj?.mediaMaxMb === "number" ? channelObj.mediaMaxMb : undefined;
  const accountsObj = channelObj?.accounts && typeof channelObj.accounts === "object" ?
  channelObj.accounts :
  undefined;
  const accountCfg = accountId && accountsObj ? accountsObj[accountId] : undefined;
  const accountMediaMax = accountCfg && typeof accountCfg === "object" ?
  accountCfg.mediaMaxMb :
  undefined;
  const limitMb = (typeof accountMediaMax === "number" ? accountMediaMax : undefined) ??
  channelMediaMax ??
  params.cfg.agents?.defaults?.mediaMaxMb;
  return typeof limitMb === "number" ? limitMb * 1024 * 1024 : undefined;
}
function inferAttachmentFilename(params) {
  const mediaHint = params.mediaHint?.trim();
  if (mediaHint) {
    try {
      if (mediaHint.startsWith("file://")) {
        const filePath = (0, _nodeUrl.fileURLToPath)(mediaHint);
        const base = _nodePath.default.basename(filePath);
        if (base) {
          return base;
        }
      } else
      if (/^https?:\/\//i.test(mediaHint)) {
        const url = new URL(mediaHint);
        const base = _nodePath.default.basename(url.pathname);
        if (base) {
          return base;
        }
      } else
      {
        const base = _nodePath.default.basename(mediaHint);
        if (base) {
          return base;
        }
      }
    }
    catch {

      // fall through to content-type based default
    }}
  const ext = params.contentType ? (0, _mime.extensionForMime)(params.contentType) : undefined;
  return ext ? `attachment${ext}` : "attachment";
}
function normalizeBase64Payload(params) {
  if (!params.base64) {
    return { base64: params.base64, contentType: params.contentType };
  }
  const match = /^data:([^;]+);base64,(.*)$/i.exec(params.base64.trim());
  if (!match) {
    return { base64: params.base64, contentType: params.contentType };
  }
  const [, mime, payload] = match;
  return {
    base64: payload,
    contentType: params.contentType ?? mime
  };
}
async function hydrateSetGroupIconParams(params) {
  if (params.action !== "setGroupIcon") {
    return;
  }
  const mediaHint = (0, _common.readStringParam)(params.args, "media", { trim: false });
  const fileHint = (0, _common.readStringParam)(params.args, "path", { trim: false }) ??
  (0, _common.readStringParam)(params.args, "filePath", { trim: false });
  const contentTypeParam = (0, _common.readStringParam)(params.args, "contentType") ?? (0, _common.readStringParam)(params.args, "mimeType");
  const rawBuffer = (0, _common.readStringParam)(params.args, "buffer", { trim: false });
  const normalized = normalizeBase64Payload({
    base64: rawBuffer,
    contentType: contentTypeParam ?? undefined
  });
  if (normalized.base64 !== rawBuffer && normalized.base64) {
    params.args.buffer = normalized.base64;
    if (normalized.contentType && !contentTypeParam) {
      params.args.contentType = normalized.contentType;
    }
  }
  const filename = (0, _common.readStringParam)(params.args, "filename");
  const mediaSource = mediaHint ?? fileHint;
  if (!params.dryRun && !(0, _common.readStringParam)(params.args, "buffer", { trim: false }) && mediaSource) {
    const maxBytes = resolveAttachmentMaxBytes({
      cfg: params.cfg,
      channel: params.channel,
      accountId: params.accountId
    });
    const media = await (0, _media.loadWebMedia)(mediaSource, maxBytes);
    params.args.buffer = media.buffer.toString("base64");
    if (!contentTypeParam && media.contentType) {
      params.args.contentType = media.contentType;
    }
    if (!filename) {
      params.args.filename = inferAttachmentFilename({
        mediaHint: media.fileName ?? mediaSource,
        contentType: media.contentType ?? contentTypeParam ?? undefined
      });
    }
  } else
  if (!filename) {
    params.args.filename = inferAttachmentFilename({
      mediaHint: mediaSource,
      contentType: contentTypeParam ?? undefined
    });
  }
}
async function hydrateSendAttachmentParams(params) {
  if (params.action !== "sendAttachment") {
    return;
  }
  const mediaHint = (0, _common.readStringParam)(params.args, "media", { trim: false });
  const fileHint = (0, _common.readStringParam)(params.args, "path", { trim: false }) ??
  (0, _common.readStringParam)(params.args, "filePath", { trim: false });
  const contentTypeParam = (0, _common.readStringParam)(params.args, "contentType") ?? (0, _common.readStringParam)(params.args, "mimeType");
  const caption = (0, _common.readStringParam)(params.args, "caption", { allowEmpty: true })?.trim();
  const message = (0, _common.readStringParam)(params.args, "message", { allowEmpty: true })?.trim();
  if (!caption && message) {
    params.args.caption = message;
  }
  const rawBuffer = (0, _common.readStringParam)(params.args, "buffer", { trim: false });
  const normalized = normalizeBase64Payload({
    base64: rawBuffer,
    contentType: contentTypeParam ?? undefined
  });
  if (normalized.base64 !== rawBuffer && normalized.base64) {
    params.args.buffer = normalized.base64;
    if (normalized.contentType && !contentTypeParam) {
      params.args.contentType = normalized.contentType;
    }
  }
  const filename = (0, _common.readStringParam)(params.args, "filename");
  const mediaSource = mediaHint ?? fileHint;
  if (!params.dryRun && !(0, _common.readStringParam)(params.args, "buffer", { trim: false }) && mediaSource) {
    const maxBytes = resolveAttachmentMaxBytes({
      cfg: params.cfg,
      channel: params.channel,
      accountId: params.accountId
    });
    const media = await (0, _media.loadWebMedia)(mediaSource, maxBytes);
    params.args.buffer = media.buffer.toString("base64");
    if (!contentTypeParam && media.contentType) {
      params.args.contentType = media.contentType;
    }
    if (!filename) {
      params.args.filename = inferAttachmentFilename({
        mediaHint: media.fileName ?? mediaSource,
        contentType: media.contentType ?? contentTypeParam ?? undefined
      });
    }
  } else
  if (!filename) {
    params.args.filename = inferAttachmentFilename({
      mediaHint: mediaSource,
      contentType: contentTypeParam ?? undefined
    });
  }
}
function parseButtonsParam(params) {
  const raw = params.buttons;
  if (typeof raw !== "string") {
    return;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    delete params.buttons;
    return;
  }
  try {
    params.buttons = JSON.parse(trimmed);
  }
  catch {
    throw new Error("--buttons must be valid JSON");
  }
}
function parseCardParam(params) {
  const raw = params.card;
  if (typeof raw !== "string") {
    return;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    delete params.card;
    return;
  }
  try {
    params.card = JSON.parse(trimmed);
  }
  catch {
    throw new Error("--card must be valid JSON");
  }
}
async function resolveChannel(cfg, params) {
  const channelHint = (0, _common.readStringParam)(params, "channel");
  const selection = await (0, _channelSelection.resolveMessageChannelSelection)({
    cfg,
    channel: channelHint
  });
  return selection.channel;
}
async function resolveActionTarget(params) {
  let resolvedTarget;
  const toRaw = typeof params.args.to === "string" ? params.args.to.trim() : "";
  if (toRaw) {
    const resolved = await (0, _targetResolver.resolveChannelTarget)({
      cfg: params.cfg,
      channel: params.channel,
      input: toRaw,
      accountId: params.accountId ?? undefined
    });
    if (resolved.ok) {
      params.args.to = resolved.target.to;
      resolvedTarget = resolved.target;
    } else
    {
      throw resolved.error;
    }
  }
  const channelIdRaw = typeof params.args.channelId === "string" ? params.args.channelId.trim() : "";
  if (channelIdRaw) {
    const resolved = await (0, _targetResolver.resolveChannelTarget)({
      cfg: params.cfg,
      channel: params.channel,
      input: channelIdRaw,
      accountId: params.accountId ?? undefined,
      preferredKind: "group"
    });
    if (resolved.ok) {
      if (resolved.target.kind === "user") {
        throw new Error(`Channel id "${channelIdRaw}" resolved to a user target.`);
      }
      params.args.channelId = resolved.target.to.replace(/^(channel|group):/i, "");
    } else
    {
      throw resolved.error;
    }
  }
  return resolvedTarget;
}
function resolveGateway(input) {
  if (!input.gateway) {
    return undefined;
  }
  return {
    url: input.gateway.url,
    token: input.gateway.token,
    timeoutMs: input.gateway.timeoutMs,
    clientName: input.gateway.clientName,
    clientDisplayName: input.gateway.clientDisplayName,
    mode: input.gateway.mode
  };
}
async function handleBroadcastAction(input, params) {
  throwIfAborted(input.abortSignal);
  const broadcastEnabled = input.cfg.tools?.message?.broadcast?.enabled !== false;
  if (!broadcastEnabled) {
    throw new Error("Broadcast is disabled. Set tools.message.broadcast.enabled to true.");
  }
  const rawTargets = (0, _common.readStringArrayParam)(params, "targets", { required: true }) ?? [];
  if (rawTargets.length === 0) {
    throw new Error("Broadcast requires at least one target in --targets.");
  }
  const channelHint = (0, _common.readStringParam)(params, "channel");
  const configured = await (0, _channelSelection.listConfiguredMessageChannels)(input.cfg);
  if (configured.length === 0) {
    throw new Error("Broadcast requires at least one configured channel.");
  }
  const targetChannels = channelHint && channelHint.trim().toLowerCase() !== "all" ?
  [await resolveChannel(input.cfg, { channel: channelHint })] :
  configured;
  const results = [];
  const isAbortError = (err) => err instanceof Error && err.name === "AbortError";
  for (const targetChannel of targetChannels) {
    throwIfAborted(input.abortSignal);
    for (const target of rawTargets) {
      throwIfAborted(input.abortSignal);
      try {
        const resolved = await (0, _targetResolver.resolveChannelTarget)({
          cfg: input.cfg,
          channel: targetChannel,
          input: target
        });
        if (!resolved.ok) {
          throw resolved.error;
        }
        const sendResult = await runMessageAction({
          ...input,
          action: "send",
          params: {
            ...params,
            channel: targetChannel,
            target: resolved.target.to
          }
        });
        results.push({
          channel: targetChannel,
          to: resolved.target.to,
          ok: true,
          result: sendResult.kind === "send" ? sendResult.sendResult : undefined
        });
      }
      catch (err) {
        if (isAbortError(err)) {
          throw err;
        }
        results.push({
          channel: targetChannel,
          to: target,
          ok: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  }
  return {
    kind: "broadcast",
    channel: targetChannels[0] ?? "discord",
    action: "broadcast",
    handledBy: input.dryRun ? "dry-run" : "core",
    payload: { results },
    dryRun: Boolean(input.dryRun)
  };
}
function throwIfAborted(abortSignal) {
  if (abortSignal?.aborted) {
    const err = new Error("Message send aborted");
    err.name = "AbortError";
    throw err;
  }
}
async function handleSendAction(ctx) {
  const { cfg, params, channel, accountId, dryRun, gateway, input, agentId, resolvedTarget, abortSignal } = ctx;
  throwIfAborted(abortSignal);
  const action = "send";
  const to = (0, _common.readStringParam)(params, "to", { required: true });
  // Support media, path, and filePath parameters for attachments
  const mediaHint = (0, _common.readStringParam)(params, "media", { trim: false }) ??
  (0, _common.readStringParam)(params, "path", { trim: false }) ??
  (0, _common.readStringParam)(params, "filePath", { trim: false });
  const hasCard = params.card != null && typeof params.card === "object";
  let message = (0, _common.readStringParam)(params, "message", {
    required: !mediaHint && !hasCard,
    allowEmpty: true
  }) ?? "";
  const parsed = (0, _replyDirectives.parseReplyDirectives)(message);
  const mergedMediaUrls = [];
  const seenMedia = new Set();
  const pushMedia = (value) => {
    const trimmed = value?.trim();
    if (!trimmed) {
      return;
    }
    if (seenMedia.has(trimmed)) {
      return;
    }
    seenMedia.add(trimmed);
    mergedMediaUrls.push(trimmed);
  };
  pushMedia(mediaHint);
  for (const url of parsed.mediaUrls ?? []) {
    pushMedia(url);
  }
  pushMedia(parsed.mediaUrl);
  message = parsed.text;
  params.message = message;
  if (!params.replyTo && parsed.replyToId) {
    params.replyTo = parsed.replyToId;
  }
  if (!params.media) {
    // Use path/filePath if media not set, then fall back to parsed directives
    params.media = mergedMediaUrls[0] || undefined;
  }
  message = await maybeApplyCrossContextMarker({
    cfg,
    channel,
    action,
    target: to,
    toolContext: input.toolContext,
    accountId,
    args: params,
    message,
    preferEmbeds: true
  });
  const mediaUrl = (0, _common.readStringParam)(params, "media", { trim: false });
  const gifPlayback = readBooleanParam(params, "gifPlayback") ?? false;
  const bestEffort = readBooleanParam(params, "bestEffort");
  const replyToId = (0, _common.readStringParam)(params, "replyTo");
  const threadId = (0, _common.readStringParam)(params, "threadId");
  // Slack auto-threading can inject threadTs without explicit params; mirror to that session key.
  const slackAutoThreadId = channel === "slack" && !replyToId && !threadId ?
  resolveSlackAutoThreadId({ to, toolContext: input.toolContext }) :
  undefined;
  const outboundRoute = agentId && !dryRun ?
  await (0, _outboundSession.resolveOutboundSessionRoute)({
    cfg,
    channel,
    agentId,
    accountId,
    target: to,
    resolvedTarget,
    replyToId,
    threadId: threadId ?? slackAutoThreadId
  }) :
  null;
  if (outboundRoute && agentId && !dryRun) {
    await (0, _outboundSession.ensureOutboundSessionEntry)({
      cfg,
      agentId,
      channel,
      accountId,
      route: outboundRoute
    });
  }
  const mirrorMediaUrls = mergedMediaUrls.length > 0 ? mergedMediaUrls : mediaUrl ? [mediaUrl] : undefined;
  throwIfAborted(abortSignal);
  const send = await (0, _outboundSendService.executeSendAction)({
    ctx: {
      cfg,
      channel,
      params,
      accountId: accountId ?? undefined,
      gateway,
      toolContext: input.toolContext,
      deps: input.deps,
      dryRun,
      mirror: outboundRoute && !dryRun ?
      {
        sessionKey: outboundRoute.sessionKey,
        agentId,
        text: message,
        mediaUrls: mirrorMediaUrls
      } :
      undefined,
      abortSignal
    },
    to,
    message,
    mediaUrl: mediaUrl || undefined,
    mediaUrls: mergedMediaUrls.length ? mergedMediaUrls : undefined,
    gifPlayback,
    bestEffort: bestEffort ?? undefined
  });
  return {
    kind: "send",
    channel,
    action,
    to,
    handledBy: send.handledBy,
    payload: send.payload,
    toolResult: send.toolResult,
    sendResult: send.sendResult,
    dryRun
  };
}
async function handlePollAction(ctx) {
  const { cfg, params, channel, accountId, dryRun, gateway, input, abortSignal } = ctx;
  throwIfAborted(abortSignal);
  const action = "poll";
  const to = (0, _common.readStringParam)(params, "to", { required: true });
  const question = (0, _common.readStringParam)(params, "pollQuestion", {
    required: true
  });
  const options = (0, _common.readStringArrayParam)(params, "pollOption", { required: true }) ?? [];
  if (options.length < 2) {
    throw new Error("pollOption requires at least two values");
  }
  const allowMultiselect = readBooleanParam(params, "pollMulti") ?? false;
  const durationHours = (0, _common.readNumberParam)(params, "pollDurationHours", {
    integer: true
  });
  const maxSelections = allowMultiselect ? Math.max(2, options.length) : 1;
  const base = typeof params.message === "string" ? params.message : "";
  await maybeApplyCrossContextMarker({
    cfg,
    channel,
    action,
    target: to,
    toolContext: input.toolContext,
    accountId,
    args: params,
    message: base,
    preferEmbeds: true
  });
  const poll = await (0, _outboundSendService.executePollAction)({
    ctx: {
      cfg,
      channel,
      params,
      accountId: accountId ?? undefined,
      gateway,
      toolContext: input.toolContext,
      dryRun
    },
    to,
    question,
    options,
    maxSelections,
    durationHours: durationHours ?? undefined
  });
  return {
    kind: "poll",
    channel,
    action,
    to,
    handledBy: poll.handledBy,
    payload: poll.payload,
    toolResult: poll.toolResult,
    pollResult: poll.pollResult,
    dryRun
  };
}
async function handlePluginAction(ctx) {
  const { cfg, params, channel, accountId, dryRun, gateway, input, abortSignal } = ctx;
  throwIfAborted(abortSignal);
  const action = input.action;
  if (dryRun) {
    return {
      kind: "action",
      channel,
      action,
      handledBy: "dry-run",
      payload: { ok: true, dryRun: true, channel, action },
      dryRun: true
    };
  }
  const handled = await (0, _messageActions.dispatchChannelMessageAction)({
    channel,
    action,
    cfg,
    params,
    accountId: accountId ?? undefined,
    gateway,
    toolContext: input.toolContext,
    dryRun
  });
  if (!handled) {
    throw new Error(`Message action ${action} not supported for channel ${channel}.`);
  }
  return {
    kind: "action",
    channel,
    action,
    handledBy: "plugin",
    payload: extractToolPayload(handled),
    toolResult: handled,
    dryRun
  };
}
async function runMessageAction(input) {
  const cfg = input.cfg;
  const params = { ...input.params };
  const resolvedAgentId = input.agentId ?? (
  input.sessionKey ?
  (0, _agentScope.resolveSessionAgentId)({ sessionKey: input.sessionKey, config: cfg }) :
  undefined);
  parseButtonsParam(params);
  parseCardParam(params);
  const action = input.action;
  if (action === "broadcast") {
    return handleBroadcastAction(input, params);
  }
  const explicitTarget = typeof params.target === "string" ? params.target.trim() : "";
  const hasLegacyTarget = typeof params.to === "string" && params.to.trim().length > 0 ||
  typeof params.channelId === "string" && params.channelId.trim().length > 0;
  if (explicitTarget && hasLegacyTarget) {
    delete params.to;
    delete params.channelId;
  }
  if (!explicitTarget &&
  !hasLegacyTarget &&
  (0, _messageActionSpec.actionRequiresTarget)(action) &&
  !(0, _messageActionSpec.actionHasTarget)(action, params)) {
    const inferredTarget = input.toolContext?.currentChannelId?.trim();
    if (inferredTarget) {
      params.target = inferredTarget;
    }
  }
  if (!explicitTarget && (0, _messageActionSpec.actionRequiresTarget)(action) && hasLegacyTarget) {
    const legacyTo = typeof params.to === "string" ? params.to.trim() : "";
    const legacyChannelId = typeof params.channelId === "string" ? params.channelId.trim() : "";
    const legacyTarget = legacyTo || legacyChannelId;
    if (legacyTarget) {
      params.target = legacyTarget;
      delete params.to;
      delete params.channelId;
    }
  }
  const explicitChannel = typeof params.channel === "string" ? params.channel.trim() : "";
  if (!explicitChannel) {
    const inferredChannel = (0, _messageChannel.normalizeMessageChannel)(input.toolContext?.currentChannelProvider);
    if (inferredChannel && (0, _messageChannel.isDeliverableMessageChannel)(inferredChannel)) {
      params.channel = inferredChannel;
    }
  }
  (0, _channelTarget.applyTargetToParams)({ action, args: params });
  if ((0, _messageActionSpec.actionRequiresTarget)(action)) {
    if (!(0, _messageActionSpec.actionHasTarget)(action, params)) {
      throw new Error(`Action ${action} requires a target.`);
    }
  }
  const channel = await resolveChannel(cfg, params);
  const accountId = (0, _common.readStringParam)(params, "accountId") ?? input.defaultAccountId;
  if (accountId) {
    params.accountId = accountId;
  }
  const dryRun = Boolean(input.dryRun ?? readBooleanParam(params, "dryRun"));
  await hydrateSendAttachmentParams({
    cfg,
    channel,
    accountId,
    args: params,
    action,
    dryRun
  });
  await hydrateSetGroupIconParams({
    cfg,
    channel,
    accountId,
    args: params,
    action,
    dryRun
  });
  const resolvedTarget = await resolveActionTarget({
    cfg,
    channel,
    action,
    args: params,
    accountId
  });
  (0, _outboundPolicy.enforceCrossContextPolicy)({
    channel,
    action,
    args: params,
    toolContext: input.toolContext,
    cfg
  });
  const gateway = resolveGateway(input);
  if (action === "send") {
    return handleSendAction({
      cfg,
      params,
      channel,
      accountId,
      dryRun,
      gateway,
      input,
      agentId: resolvedAgentId,
      resolvedTarget,
      abortSignal: input.abortSignal
    });
  }
  if (action === "poll") {
    return handlePollAction({
      cfg,
      params,
      channel,
      accountId,
      dryRun,
      gateway,
      input,
      abortSignal: input.abortSignal
    });
  }
  return handlePluginAction({
    cfg,
    params,
    channel,
    accountId,
    dryRun,
    gateway,
    input,
    abortSignal: input.abortSignal
  });
} /* v9-6bc141e8d500fb69 */
