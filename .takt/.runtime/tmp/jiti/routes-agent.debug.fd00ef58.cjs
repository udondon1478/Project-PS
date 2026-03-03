"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerBrowserAgentDebugRoutes = registerBrowserAgentDebugRoutes;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _agentShared = require("./agent.shared.js");
var _utils = require("./utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function registerBrowserAgentDebugRoutes(app, ctx) {
  app.get("/console", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const level = typeof req.query.level === "string" ? req.query.level : "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pw = await (0, _agentShared.requirePwAi)(res, "console messages");
      if (!pw) {
        return;
      }
      const messages = await pw.getConsoleMessagesViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        level: level.trim() || undefined
      });
      res.json({ ok: true, messages, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.get("/errors", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const clear = (0, _utils.toBoolean)(req.query.clear) ?? false;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pw = await (0, _agentShared.requirePwAi)(res, "page errors");
      if (!pw) {
        return;
      }
      const result = await pw.getPageErrorsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        clear
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.get("/requests", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const filter = typeof req.query.filter === "string" ? req.query.filter : "";
    const clear = (0, _utils.toBoolean)(req.query.clear) ?? false;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pw = await (0, _agentShared.requirePwAi)(res, "network requests");
      if (!pw) {
        return;
      }
      const result = await pw.getNetworkRequestsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        filter: filter.trim() || undefined,
        clear
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/trace/start", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const screenshots = (0, _utils.toBoolean)(body.screenshots) ?? undefined;
    const snapshots = (0, _utils.toBoolean)(body.snapshots) ?? undefined;
    const sources = (0, _utils.toBoolean)(body.sources) ?? undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "trace start");
      if (!pw) {
        return;
      }
      await pw.traceStartViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        screenshots,
        snapshots,
        sources
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/trace/stop", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const out = (0, _utils.toStringOrEmpty)(body.path) || "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "trace stop");
      if (!pw) {
        return;
      }
      const id = _nodeCrypto.default.randomUUID();
      const dir = "/tmp/openclaw";
      await _promises.default.mkdir(dir, { recursive: true });
      const tracePath = out.trim() || _nodePath.default.join(dir, `browser-trace-${id}.zip`);
      await pw.traceStopViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        path: tracePath
      });
      res.json({
        ok: true,
        targetId: tab.targetId,
        path: _nodePath.default.resolve(tracePath)
      });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
} /* v9-ecc2f37038ef2f0f */
