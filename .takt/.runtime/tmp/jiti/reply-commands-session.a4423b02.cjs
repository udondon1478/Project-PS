"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleUsageCommand = exports.handleStopCommand = exports.handleSendPolicyCommand = exports.handleRestartCommand = exports.handleActivationCommand = exports.handleAbortTrigger = void 0;var _piEmbedded = require("../../agents/pi-embedded.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
var _internalHooks = require("../../hooks/internal-hooks.js");
var _restart = require("../../infra/restart.js");
var _sessionCostUsage = require("../../infra/session-cost-usage.js");
var _usageFormat = require("../../utils/usage-format.js");
var _groupActivation = require("../group-activation.js");
var _sendPolicy = require("../send-policy.js");
var _thinking = require("../thinking.js");
var _abort = require("./abort.js");
var _queue = require("./queue.js");
function resolveSessionEntryForKey(store, sessionKey) {
  if (!store || !sessionKey) {
    return {};
  }
  const direct = store[sessionKey];
  if (direct) {
    return { entry: direct, key: sessionKey };
  }
  return {};
}
function resolveAbortTarget(params) {
  const targetSessionKey = params.ctx.CommandTargetSessionKey?.trim() || params.sessionKey;
  const { entry, key } = resolveSessionEntryForKey(params.sessionStore, targetSessionKey);
  if (entry && key) {
    return { entry, key, sessionId: entry.sessionId };
  }
  if (params.sessionEntry && params.sessionKey) {
    return {
      entry: params.sessionEntry,
      key: params.sessionKey,
      sessionId: params.sessionEntry.sessionId
    };
  }
  return { entry: undefined, key: targetSessionKey, sessionId: undefined };
}
const handleActivationCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const activationCommand = (0, _groupActivation.parseActivationCommand)(params.command.commandBodyNormalized);
  if (!activationCommand.hasCommand) {
    return null;
  }
  if (!params.isGroup) {
    return {
      shouldContinue: false,
      reply: { text: "⚙️ Group activation only applies to group chats." }
    };
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /activation from unauthorized sender in group: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  if (!activationCommand.mode) {
    return {
      shouldContinue: false,
      reply: { text: "⚙️ Usage: /activation mention|always" }
    };
  }
  if (params.sessionEntry && params.sessionStore && params.sessionKey) {
    params.sessionEntry.groupActivation = activationCommand.mode;
    params.sessionEntry.groupActivationNeedsSystemIntro = true;
    params.sessionEntry.updatedAt = Date.now();
    params.sessionStore[params.sessionKey] = params.sessionEntry;
    if (params.storePath) {
      await (0, _sessions.updateSessionStore)(params.storePath, (store) => {
        store[params.sessionKey] = params.sessionEntry;
      });
    }
  }
  return {
    shouldContinue: false,
    reply: {
      text: `⚙️ Group activation set to ${activationCommand.mode}.`
    }
  };
};exports.handleActivationCommand = handleActivationCommand;
const handleSendPolicyCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const sendPolicyCommand = (0, _sendPolicy.parseSendPolicyCommand)(params.command.commandBodyNormalized);
  if (!sendPolicyCommand.hasCommand) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /send from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  if (!sendPolicyCommand.mode) {
    return {
      shouldContinue: false,
      reply: { text: "⚙️ Usage: /send on|off|inherit" }
    };
  }
  if (params.sessionEntry && params.sessionStore && params.sessionKey) {
    if (sendPolicyCommand.mode === "inherit") {
      delete params.sessionEntry.sendPolicy;
    } else
    {
      params.sessionEntry.sendPolicy = sendPolicyCommand.mode;
    }
    params.sessionEntry.updatedAt = Date.now();
    params.sessionStore[params.sessionKey] = params.sessionEntry;
    if (params.storePath) {
      await (0, _sessions.updateSessionStore)(params.storePath, (store) => {
        store[params.sessionKey] = params.sessionEntry;
      });
    }
  }
  const label = sendPolicyCommand.mode === "inherit" ?
  "inherit" :
  sendPolicyCommand.mode === "allow" ?
  "on" :
  "off";
  return {
    shouldContinue: false,
    reply: { text: `⚙️ Send policy set to ${label}.` }
  };
};exports.handleSendPolicyCommand = handleSendPolicyCommand;
const handleUsageCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const normalized = params.command.commandBodyNormalized;
  if (normalized !== "/usage" && !normalized.startsWith("/usage ")) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /usage from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  const rawArgs = normalized === "/usage" ? "" : normalized.slice("/usage".length).trim();
  const requested = rawArgs ? (0, _thinking.normalizeUsageDisplay)(rawArgs) : undefined;
  if (rawArgs.toLowerCase().startsWith("cost")) {
    const sessionSummary = await (0, _sessionCostUsage.loadSessionCostSummary)({
      sessionId: params.sessionEntry?.sessionId,
      sessionEntry: params.sessionEntry,
      sessionFile: params.sessionEntry?.sessionFile,
      config: params.cfg
    });
    const summary = await (0, _sessionCostUsage.loadCostUsageSummary)({ days: 30, config: params.cfg });
    const sessionCost = (0, _usageFormat.formatUsd)(sessionSummary?.totalCost);
    const sessionTokens = sessionSummary?.totalTokens ?
    (0, _usageFormat.formatTokenCount)(sessionSummary.totalTokens) :
    undefined;
    const sessionMissing = sessionSummary?.missingCostEntries ?? 0;
    const sessionSuffix = sessionMissing > 0 ? " (partial)" : "";
    const sessionLine = sessionCost || sessionTokens ?
    `Session ${sessionCost ?? "n/a"}${sessionSuffix}${sessionTokens ? ` · ${sessionTokens} tokens` : ""}` :
    "Session n/a";
    const todayKey = new Date().toLocaleDateString("en-CA");
    const todayEntry = summary.daily.find((entry) => entry.date === todayKey);
    const todayCost = (0, _usageFormat.formatUsd)(todayEntry?.totalCost);
    const todayMissing = todayEntry?.missingCostEntries ?? 0;
    const todaySuffix = todayMissing > 0 ? " (partial)" : "";
    const todayLine = `Today ${todayCost ?? "n/a"}${todaySuffix}`;
    const last30Cost = (0, _usageFormat.formatUsd)(summary.totals.totalCost);
    const last30Missing = summary.totals.missingCostEntries;
    const last30Suffix = last30Missing > 0 ? " (partial)" : "";
    const last30Line = `Last 30d ${last30Cost ?? "n/a"}${last30Suffix}`;
    return {
      shouldContinue: false,
      reply: { text: `💸 Usage cost\n${sessionLine}\n${todayLine}\n${last30Line}` }
    };
  }
  if (rawArgs && !requested) {
    return {
      shouldContinue: false,
      reply: { text: "⚙️ Usage: /usage off|tokens|full|cost" }
    };
  }
  const currentRaw = params.sessionEntry?.responseUsage ?? (
  params.sessionKey ? params.sessionStore?.[params.sessionKey]?.responseUsage : undefined);
  const current = (0, _thinking.resolveResponseUsageMode)(currentRaw);
  const next = requested ?? (current === "off" ? "tokens" : current === "tokens" ? "full" : "off");
  if (params.sessionEntry && params.sessionStore && params.sessionKey) {
    if (next === "off") {
      delete params.sessionEntry.responseUsage;
    } else
    {
      params.sessionEntry.responseUsage = next;
    }
    params.sessionEntry.updatedAt = Date.now();
    params.sessionStore[params.sessionKey] = params.sessionEntry;
    if (params.storePath) {
      await (0, _sessions.updateSessionStore)(params.storePath, (store) => {
        store[params.sessionKey] = params.sessionEntry;
      });
    }
  }
  return {
    shouldContinue: false,
    reply: {
      text: `⚙️ Usage footer: ${next}.`
    }
  };
};exports.handleUsageCommand = handleUsageCommand;
const handleRestartCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  if (params.command.commandBodyNormalized !== "/restart") {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /restart from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  if (params.cfg.commands?.restart !== true) {
    return {
      shouldContinue: false,
      reply: {
        text: "⚠️ /restart is disabled. Set commands.restart=true to enable."
      }
    };
  }
  const hasSigusr1Listener = process.listenerCount("SIGUSR1") > 0;
  if (hasSigusr1Listener) {
    (0, _restart.scheduleGatewaySigusr1Restart)({ reason: "/restart" });
    return {
      shouldContinue: false,
      reply: {
        text: "⚙️ Restarting OpenClaw in-process (SIGUSR1); back in a few seconds."
      }
    };
  }
  const restartMethod = (0, _restart.triggerOpenClawRestart)();
  if (!restartMethod.ok) {
    const detail = restartMethod.detail ? ` Details: ${restartMethod.detail}` : "";
    return {
      shouldContinue: false,
      reply: {
        text: `⚠️ Restart failed (${restartMethod.method}).${detail}`
      }
    };
  }
  return {
    shouldContinue: false,
    reply: {
      text: `⚙️ Restarting OpenClaw via ${restartMethod.method}; give me a few seconds to come back online.`
    }
  };
};exports.handleRestartCommand = handleRestartCommand;
const handleStopCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  if (params.command.commandBodyNormalized !== "/stop") {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /stop from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  const abortTarget = resolveAbortTarget({
    ctx: params.ctx,
    sessionKey: params.sessionKey,
    sessionEntry: params.sessionEntry,
    sessionStore: params.sessionStore
  });
  if (abortTarget.sessionId) {
    (0, _piEmbedded.abortEmbeddedPiRun)(abortTarget.sessionId);
  }
  const cleared = (0, _queue.clearSessionQueues)([abortTarget.key, abortTarget.sessionId]);
  if (cleared.followupCleared > 0 || cleared.laneCleared > 0) {
    (0, _globals.logVerbose)(`stop: cleared followups=${cleared.followupCleared} lane=${cleared.laneCleared} keys=${cleared.keys.join(",")}`);
  }
  if (abortTarget.entry && params.sessionStore && abortTarget.key) {
    abortTarget.entry.abortedLastRun = true;
    abortTarget.entry.updatedAt = Date.now();
    params.sessionStore[abortTarget.key] = abortTarget.entry;
    if (params.storePath) {
      await (0, _sessions.updateSessionStore)(params.storePath, (store) => {
        store[abortTarget.key] = abortTarget.entry;
      });
    }
  } else
  if (params.command.abortKey) {
    (0, _abort.setAbortMemory)(params.command.abortKey, true);
  }
  // Trigger internal hook for stop command
  const hookEvent = (0, _internalHooks.createInternalHookEvent)("command", "stop", abortTarget.key ?? params.sessionKey ?? "", {
    sessionEntry: abortTarget.entry ?? params.sessionEntry,
    sessionId: abortTarget.sessionId,
    commandSource: params.command.surface,
    senderId: params.command.senderId
  });
  await (0, _internalHooks.triggerInternalHook)(hookEvent);
  const { stopped } = (0, _abort.stopSubagentsForRequester)({
    cfg: params.cfg,
    requesterSessionKey: abortTarget.key ?? params.sessionKey
  });
  return { shouldContinue: false, reply: { text: (0, _abort.formatAbortReplyText)(stopped) } };
};exports.handleStopCommand = handleStopCommand;
const handleAbortTrigger = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  if (!(0, _abort.isAbortTrigger)(params.command.rawBodyNormalized)) {
    return null;
  }
  const abortTarget = resolveAbortTarget({
    ctx: params.ctx,
    sessionKey: params.sessionKey,
    sessionEntry: params.sessionEntry,
    sessionStore: params.sessionStore
  });
  if (abortTarget.sessionId) {
    (0, _piEmbedded.abortEmbeddedPiRun)(abortTarget.sessionId);
  }
  if (abortTarget.entry && params.sessionStore && abortTarget.key) {
    abortTarget.entry.abortedLastRun = true;
    abortTarget.entry.updatedAt = Date.now();
    params.sessionStore[abortTarget.key] = abortTarget.entry;
    if (params.storePath) {
      await (0, _sessions.updateSessionStore)(params.storePath, (store) => {
        store[abortTarget.key] = abortTarget.entry;
      });
    }
  } else
  if (params.command.abortKey) {
    (0, _abort.setAbortMemory)(params.command.abortKey, true);
  }
  return { shouldContinue: false, reply: { text: "⚙️ Agent was aborted." } };
};exports.handleAbortTrigger = handleAbortTrigger; /* v9-933681b5157983e6 */
