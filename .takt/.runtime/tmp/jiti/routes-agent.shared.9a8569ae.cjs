"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SELECTOR_UNSUPPORTED_MESSAGE = void 0;exports.getPwAiModule = getPwAiModule;exports.handleRouteError = handleRouteError;exports.readBody = readBody;exports.requirePwAi = requirePwAi;exports.resolveProfileContext = resolveProfileContext;var _pwAiModule = require("../pw-ai-module.js");
var _utils = require("./utils.js");
const SELECTOR_UNSUPPORTED_MESSAGE = exports.SELECTOR_UNSUPPORTED_MESSAGE = [
"Error: 'selector' is not supported. Use 'ref' from snapshot instead.",
"",
"Example workflow:",
"1. snapshot action to get page state with refs",
'2. act with ref: "e123" to interact with element',
"",
"This is more reliable for modern SPAs."].
join("\n");
function readBody(req) {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }
  return body;
}
function handleRouteError(ctx, res, err) {
  const mapped = ctx.mapTabError(err);
  if (mapped) {
    return (0, _utils.jsonError)(res, mapped.status, mapped.message);
  }
  (0, _utils.jsonError)(res, 500, String(err));
}
function resolveProfileContext(req, res, ctx) {
  const profileCtx = (0, _utils.getProfileContext)(req, ctx);
  if ("error" in profileCtx) {
    (0, _utils.jsonError)(res, profileCtx.status, profileCtx.error);
    return null;
  }
  return profileCtx;
}
async function getPwAiModule() {
  return await (0, _pwAiModule.getPwAiModule)({ mode: "soft" });
}
async function requirePwAi(res, feature) {
  const mod = await getPwAiModule();
  if (mod) {
    return mod;
  }
  (0, _utils.jsonError)(res, 501, [
  `Playwright is not available in this gateway build; '${feature}' is unsupported.`,
  "Install the full Playwright package (not playwright-core) and restart the gateway, or reinstall with browser support.",
  "Docs: /tools/browser#playwright-requirement"].
  join("\n"));
  return null;
} /* v9-a36be999eaf2c4c8 */
