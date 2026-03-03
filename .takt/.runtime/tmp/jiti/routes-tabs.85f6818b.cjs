"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerBrowserTabRoutes = registerBrowserTabRoutes;var _utils = require("./utils.js");
function registerBrowserTabRoutes(app, ctx) {
  app.get("/tabs", async (req, res) => {
    const profileCtx = (0, _utils.getProfileContext)(req, ctx);
    if ("error" in profileCtx) {
      return (0, _utils.jsonError)(res, profileCtx.status, profileCtx.error);
    }
    try {
      const reachable = await profileCtx.isReachable(300);
      if (!reachable) {
        return res.json({ running: false, tabs: [] });
      }
      const tabs = await profileCtx.listTabs();
      res.json({ running: true, tabs });
    }
    catch (err) {
      (0, _utils.jsonError)(res, 500, String(err));
    }
  });
  app.post("/tabs/open", async (req, res) => {
    const profileCtx = (0, _utils.getProfileContext)(req, ctx);
    if ("error" in profileCtx) {
      return (0, _utils.jsonError)(res, profileCtx.status, profileCtx.error);
    }
    const url = (0, _utils.toStringOrEmpty)(req.body?.url);
    if (!url) {
      return (0, _utils.jsonError)(res, 400, "url is required");
    }
    try {
      await profileCtx.ensureBrowserAvailable();
      const tab = await profileCtx.openTab(url);
      res.json(tab);
    }
    catch (err) {
      (0, _utils.jsonError)(res, 500, String(err));
    }
  });
  app.post("/tabs/focus", async (req, res) => {
    const profileCtx = (0, _utils.getProfileContext)(req, ctx);
    if ("error" in profileCtx) {
      return (0, _utils.jsonError)(res, profileCtx.status, profileCtx.error);
    }
    const targetId = (0, _utils.toStringOrEmpty)(req.body?.targetId);
    if (!targetId) {
      return (0, _utils.jsonError)(res, 400, "targetId is required");
    }
    try {
      if (!(await profileCtx.isReachable(300))) {
        return (0, _utils.jsonError)(res, 409, "browser not running");
      }
      await profileCtx.focusTab(targetId);
      res.json({ ok: true });
    }
    catch (err) {
      const mapped = ctx.mapTabError(err);
      if (mapped) {
        return (0, _utils.jsonError)(res, mapped.status, mapped.message);
      }
      (0, _utils.jsonError)(res, 500, String(err));
    }
  });
  app.delete("/tabs/:targetId", async (req, res) => {
    const profileCtx = (0, _utils.getProfileContext)(req, ctx);
    if ("error" in profileCtx) {
      return (0, _utils.jsonError)(res, profileCtx.status, profileCtx.error);
    }
    const targetId = (0, _utils.toStringOrEmpty)(req.params.targetId);
    if (!targetId) {
      return (0, _utils.jsonError)(res, 400, "targetId is required");
    }
    try {
      if (!(await profileCtx.isReachable(300))) {
        return (0, _utils.jsonError)(res, 409, "browser not running");
      }
      await profileCtx.closeTab(targetId);
      res.json({ ok: true });
    }
    catch (err) {
      const mapped = ctx.mapTabError(err);
      if (mapped) {
        return (0, _utils.jsonError)(res, mapped.status, mapped.message);
      }
      (0, _utils.jsonError)(res, 500, String(err));
    }
  });
  app.post("/tabs/action", async (req, res) => {
    const profileCtx = (0, _utils.getProfileContext)(req, ctx);
    if ("error" in profileCtx) {
      return (0, _utils.jsonError)(res, profileCtx.status, profileCtx.error);
    }
    const action = (0, _utils.toStringOrEmpty)(req.body?.action);
    const index = (0, _utils.toNumber)(req.body?.index);
    try {
      if (action === "list") {
        const reachable = await profileCtx.isReachable(300);
        if (!reachable) {
          return res.json({ ok: true, tabs: [] });
        }
        const tabs = await profileCtx.listTabs();
        return res.json({ ok: true, tabs });
      }
      if (action === "new") {
        await profileCtx.ensureBrowserAvailable();
        const tab = await profileCtx.openTab("about:blank");
        return res.json({ ok: true, tab });
      }
      if (action === "close") {
        const tabs = await profileCtx.listTabs();
        const target = typeof index === "number" ? tabs[index] : tabs.at(0);
        if (!target) {
          return (0, _utils.jsonError)(res, 404, "tab not found");
        }
        await profileCtx.closeTab(target.targetId);
        return res.json({ ok: true, targetId: target.targetId });
      }
      if (action === "select") {
        if (typeof index !== "number") {
          return (0, _utils.jsonError)(res, 400, "index is required");
        }
        const tabs = await profileCtx.listTabs();
        const target = tabs[index];
        if (!target) {
          return (0, _utils.jsonError)(res, 404, "tab not found");
        }
        await profileCtx.focusTab(target.targetId);
        return res.json({ ok: true, targetId: target.targetId });
      }
      return (0, _utils.jsonError)(res, 400, "unknown tab action");
    }
    catch (err) {
      const mapped = ctx.mapTabError(err);
      if (mapped) {
        return (0, _utils.jsonError)(res, mapped.status, mapped.message);
      }
      (0, _utils.jsonError)(res, 500, String(err));
    }
  });
} /* v9-26768f82c3f47cc2 */
