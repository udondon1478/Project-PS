"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createReplyPrefixContext = createReplyPrefixContext;var _identity = require("../agents/identity.js");
var _responsePrefixTemplate = require("../auto-reply/reply/response-prefix-template.js");
function createReplyPrefixContext(params) {
  const { cfg, agentId } = params;
  const prefixContext = {
    identityName: (0, _identity.resolveIdentityName)(cfg, agentId)
  };
  const onModelSelected = (ctx) => {
    // Mutate the object directly instead of reassigning to ensure closures see updates.
    prefixContext.provider = ctx.provider;
    prefixContext.model = (0, _responsePrefixTemplate.extractShortModelName)(ctx.model);
    prefixContext.modelFull = `${ctx.provider}/${ctx.model}`;
    prefixContext.thinkingLevel = ctx.thinkLevel ?? "off";
  };
  return {
    prefixContext,
    responsePrefix: (0, _identity.resolveEffectiveMessagesConfig)(cfg, agentId).responsePrefix,
    responsePrefixContextProvider: () => prefixContext,
    onModelSelected
  };
} /* v9-10d536efea097f29 */
