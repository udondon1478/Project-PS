"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isDirectiveOnly = isDirectiveOnly;exports.parseInlineDirectives = parseInlineDirectives;var _model = require("../model.js");
var _directives = require("./directives.js");
var _mentions = require("./mentions.js");
var _queue = require("./queue.js");
function parseInlineDirectives(body, options) {
  const { cleaned: thinkCleaned, thinkLevel, rawLevel: rawThinkLevel, hasDirective: hasThinkDirective } = (0, _directives.extractThinkDirective)(body);
  const { cleaned: verboseCleaned, verboseLevel, rawLevel: rawVerboseLevel, hasDirective: hasVerboseDirective } = (0, _directives.extractVerboseDirective)(thinkCleaned);
  const { cleaned: reasoningCleaned, reasoningLevel, rawLevel: rawReasoningLevel, hasDirective: hasReasoningDirective } = (0, _directives.extractReasoningDirective)(verboseCleaned);
  const { cleaned: elevatedCleaned, elevatedLevel, rawLevel: rawElevatedLevel, hasDirective: hasElevatedDirective } = options?.disableElevated ?
  {
    cleaned: reasoningCleaned,
    elevatedLevel: undefined,
    rawLevel: undefined,
    hasDirective: false
  } :
  (0, _directives.extractElevatedDirective)(reasoningCleaned);
  const { cleaned: execCleaned, execHost, execSecurity, execAsk, execNode, rawExecHost, rawExecSecurity, rawExecAsk, rawExecNode, hasExecOptions, invalidHost: invalidExecHost, invalidSecurity: invalidExecSecurity, invalidAsk: invalidExecAsk, invalidNode: invalidExecNode, hasDirective: hasExecDirective } = (0, _directives.extractExecDirective)(elevatedCleaned);
  const allowStatusDirective = options?.allowStatusDirective !== false;
  const { cleaned: statusCleaned, hasDirective: hasStatusDirective } = allowStatusDirective ?
  (0, _directives.extractStatusDirective)(execCleaned) :
  { cleaned: execCleaned, hasDirective: false };
  const { cleaned: modelCleaned, rawModel, rawProfile, hasDirective: hasModelDirective } = (0, _model.extractModelDirective)(statusCleaned, {
    aliases: options?.modelAliases
  });
  const { cleaned: queueCleaned, queueMode, queueReset, rawMode, debounceMs, cap, dropPolicy, rawDebounce, rawCap, rawDrop, hasDirective: hasQueueDirective, hasOptions: hasQueueOptions } = (0, _queue.extractQueueDirective)(modelCleaned);
  return {
    cleaned: queueCleaned,
    hasThinkDirective,
    thinkLevel,
    rawThinkLevel,
    hasVerboseDirective,
    verboseLevel,
    rawVerboseLevel,
    hasReasoningDirective,
    reasoningLevel,
    rawReasoningLevel,
    hasElevatedDirective,
    elevatedLevel,
    rawElevatedLevel,
    hasExecDirective,
    execHost,
    execSecurity,
    execAsk,
    execNode,
    rawExecHost,
    rawExecSecurity,
    rawExecAsk,
    rawExecNode,
    hasExecOptions,
    invalidExecHost,
    invalidExecSecurity,
    invalidExecAsk,
    invalidExecNode,
    hasStatusDirective,
    hasModelDirective,
    rawModelDirective: rawModel,
    rawModelProfile: rawProfile,
    hasQueueDirective,
    queueMode,
    queueReset,
    rawQueueMode: rawMode,
    debounceMs,
    cap,
    dropPolicy,
    rawDebounce,
    rawCap,
    rawDrop,
    hasQueueOptions
  };
}
function isDirectiveOnly(params) {
  const { directives, cleanedBody, ctx, cfg, agentId, isGroup } = params;
  if (!directives.hasThinkDirective &&
  !directives.hasVerboseDirective &&
  !directives.hasReasoningDirective &&
  !directives.hasElevatedDirective &&
  !directives.hasExecDirective &&
  !directives.hasModelDirective &&
  !directives.hasQueueDirective) {
    return false;
  }
  const stripped = (0, _mentions.stripStructuralPrefixes)(cleanedBody ?? "");
  const noMentions = isGroup ? (0, _mentions.stripMentions)(stripped, ctx, cfg, agentId) : stripped;
  return noMentions.length === 0;
} /* v9-dc365ee8bb5fd76f */
