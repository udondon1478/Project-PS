"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveMentionGating = resolveMentionGating;exports.resolveMentionGatingWithBypass = resolveMentionGatingWithBypass;function resolveMentionGating(params) {
  const implicit = params.implicitMention === true;
  const bypass = params.shouldBypassMention === true;
  const effectiveWasMentioned = params.wasMentioned || implicit || bypass;
  const shouldSkip = params.requireMention && params.canDetectMention && !effectiveWasMentioned;
  return { effectiveWasMentioned, shouldSkip };
}
function resolveMentionGatingWithBypass(params) {
  const shouldBypassMention = params.isGroup &&
  params.requireMention &&
  !params.wasMentioned &&
  !(params.hasAnyMention ?? false) &&
  params.allowTextCommands &&
  params.commandAuthorized &&
  params.hasControlCommand;
  return {
    ...resolveMentionGating({
      requireMention: params.requireMention,
      canDetectMention: params.canDetectMention,
      wasMentioned: params.wasMentioned,
      implicitMention: params.implicitMention,
      shouldBypassMention
    }),
    shouldBypassMention
  };
} /* v9-0c833956b459ef4c */
