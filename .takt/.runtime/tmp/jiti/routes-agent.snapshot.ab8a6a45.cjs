"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerBrowserAgentSnapshotRoutes = registerBrowserAgentSnapshotRoutes;var _nodePath = _interopRequireDefault(require("node:path"));
var _store = require("../../media/store.js");
var _cdp = require("../cdp.js");
var _constants = require("../constants.js");
var _screenshot = require("../screenshot.js");
var _agentShared = require("./agent.shared.js");
var _utils = require("./utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function registerBrowserAgentSnapshotRoutes(app, ctx) {
  app.post("/navigate", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const url = (0, _utils.toStringOrEmpty)(body.url);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    if (!url) {
      return (0, _utils.jsonError)(res, 400, "url is required");
    }
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "navigate");
      if (!pw) {
        return;
      }
      const result = await pw.navigateViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        url
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/pdf", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "pdf");
      if (!pw) {
        return;
      }
      const pdf = await pw.pdfViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId
      });
      await (0, _store.ensureMediaDir)();
      const saved = await (0, _store.saveMediaBuffer)(pdf.buffer, "application/pdf", "browser", pdf.buffer.byteLength);
      res.json({
        ok: true,
        path: _nodePath.default.resolve(saved.path),
        targetId: tab.targetId,
        url: tab.url
      });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/screenshot", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const fullPage = (0, _utils.toBoolean)(body.fullPage) ?? false;
    const ref = (0, _utils.toStringOrEmpty)(body.ref) || undefined;
    const element = (0, _utils.toStringOrEmpty)(body.element) || undefined;
    const type = body.type === "jpeg" ? "jpeg" : "png";
    if (fullPage && (ref || element)) {
      return (0, _utils.jsonError)(res, 400, "fullPage is not supported for element screenshots");
    }
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      let buffer;
      const shouldUsePlaywright = profileCtx.profile.driver === "extension" || !tab.wsUrl || Boolean(ref) || Boolean(element);
      if (shouldUsePlaywright) {
        const pw = await (0, _agentShared.requirePwAi)(res, "screenshot");
        if (!pw) {
          return;
        }
        const snap = await pw.takeScreenshotViaPlaywright({
          cdpUrl: profileCtx.profile.cdpUrl,
          targetId: tab.targetId,
          ref,
          element,
          fullPage,
          type
        });
        buffer = snap.buffer;
      } else
      {
        buffer = await (0, _cdp.captureScreenshot)({
          wsUrl: tab.wsUrl ?? "",
          fullPage,
          format: type,
          quality: type === "jpeg" ? 85 : undefined
        });
      }
      const normalized = await (0, _screenshot.normalizeBrowserScreenshot)(buffer, {
        maxSide: _screenshot.DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE,
        maxBytes: _screenshot.DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES
      });
      await (0, _store.ensureMediaDir)();
      const saved = await (0, _store.saveMediaBuffer)(normalized.buffer, normalized.contentType ?? `image/${type}`, "browser", _screenshot.DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES);
      res.json({
        ok: true,
        path: _nodePath.default.resolve(saved.path),
        targetId: tab.targetId,
        url: tab.url
      });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.get("/snapshot", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const mode = req.query.mode === "efficient" ? "efficient" : undefined;
    const labels = (0, _utils.toBoolean)(req.query.labels) ?? undefined;
    const explicitFormat = req.query.format === "aria" ? "aria" : req.query.format === "ai" ? "ai" : undefined;
    const format = explicitFormat ?? (mode ? "ai" : (await (0, _agentShared.getPwAiModule)()) ? "ai" : "aria");
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const hasMaxChars = Object.hasOwn(req.query, "maxChars");
    const maxCharsRaw = typeof req.query.maxChars === "string" ? Number(req.query.maxChars) : undefined;
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
    const maxChars = typeof maxCharsRaw === "number" && Number.isFinite(maxCharsRaw) && maxCharsRaw > 0 ?
    Math.floor(maxCharsRaw) :
    undefined;
    const resolvedMaxChars = format === "ai" ?
    hasMaxChars ?
    maxChars :
    mode === "efficient" ?
    _constants.DEFAULT_AI_SNAPSHOT_EFFICIENT_MAX_CHARS :
    _constants.DEFAULT_AI_SNAPSHOT_MAX_CHARS :
    undefined;
    const interactiveRaw = (0, _utils.toBoolean)(req.query.interactive);
    const compactRaw = (0, _utils.toBoolean)(req.query.compact);
    const depthRaw = (0, _utils.toNumber)(req.query.depth);
    const refsModeRaw = (0, _utils.toStringOrEmpty)(req.query.refs).trim();
    const refsMode = refsModeRaw === "aria" ? "aria" : refsModeRaw === "role" ? "role" : undefined;
    const interactive = interactiveRaw ?? (mode === "efficient" ? true : undefined);
    const compact = compactRaw ?? (mode === "efficient" ? true : undefined);
    const depth = depthRaw ?? (mode === "efficient" ? _constants.DEFAULT_AI_SNAPSHOT_EFFICIENT_DEPTH : undefined);
    const selector = (0, _utils.toStringOrEmpty)(req.query.selector);
    const frameSelector = (0, _utils.toStringOrEmpty)(req.query.frame);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      if ((labels || mode === "efficient") && format === "aria") {
        return (0, _utils.jsonError)(res, 400, "labels/mode=efficient require format=ai");
      }
      if (format === "ai") {
        const pw = await (0, _agentShared.requirePwAi)(res, "ai snapshot");
        if (!pw) {
          return;
        }
        const wantsRoleSnapshot = labels === true ||
        mode === "efficient" ||
        interactive === true ||
        compact === true ||
        depth !== undefined ||
        Boolean(selector.trim()) ||
        Boolean(frameSelector.trim());
        const snap = wantsRoleSnapshot ?
        await pw.snapshotRoleViaPlaywright({
          cdpUrl: profileCtx.profile.cdpUrl,
          targetId: tab.targetId,
          selector: selector.trim() || undefined,
          frameSelector: frameSelector.trim() || undefined,
          refsMode,
          options: {
            interactive: interactive ?? undefined,
            compact: compact ?? undefined,
            maxDepth: depth ?? undefined
          }
        }) :
        await pw.
        snapshotAiViaPlaywright({
          cdpUrl: profileCtx.profile.cdpUrl,
          targetId: tab.targetId,
          ...(typeof resolvedMaxChars === "number" ? { maxChars: resolvedMaxChars } : {})
        }).
        catch(async (err) => {
          // Public-API fallback when Playwright's private _snapshotForAI is missing.
          if (String(err).toLowerCase().includes("_snapshotforai")) {
            return await pw.snapshotRoleViaPlaywright({
              cdpUrl: profileCtx.profile.cdpUrl,
              targetId: tab.targetId,
              selector: selector.trim() || undefined,
              frameSelector: frameSelector.trim() || undefined,
              refsMode,
              options: {
                interactive: interactive ?? undefined,
                compact: compact ?? undefined,
                maxDepth: depth ?? undefined
              }
            });
          }
          throw err;
        });
        if (labels) {
          const labeled = await pw.screenshotWithLabelsViaPlaywright({
            cdpUrl: profileCtx.profile.cdpUrl,
            targetId: tab.targetId,
            refs: "refs" in snap ? snap.refs : {},
            type: "png"
          });
          const normalized = await (0, _screenshot.normalizeBrowserScreenshot)(labeled.buffer, {
            maxSide: _screenshot.DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE,
            maxBytes: _screenshot.DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES
          });
          await (0, _store.ensureMediaDir)();
          const saved = await (0, _store.saveMediaBuffer)(normalized.buffer, normalized.contentType ?? "image/png", "browser", _screenshot.DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES);
          const imageType = normalized.contentType?.includes("jpeg") ? "jpeg" : "png";
          return res.json({
            ok: true,
            format,
            targetId: tab.targetId,
            url: tab.url,
            labels: true,
            labelsCount: labeled.labels,
            labelsSkipped: labeled.skipped,
            imagePath: _nodePath.default.resolve(saved.path),
            imageType,
            ...snap
          });
        }
        return res.json({
          ok: true,
          format,
          targetId: tab.targetId,
          url: tab.url,
          ...snap
        });
      }
      const snap = profileCtx.profile.driver === "extension" || !tab.wsUrl ?
      (() => {
        // Extension relay doesn't expose per-page WS URLs; run AX snapshot via Playwright CDP session.
        // Also covers cases where wsUrl is missing/unusable.
        return (0, _agentShared.requirePwAi)(res, "aria snapshot").then(async (pw) => {
          if (!pw) {
            return null;
          }
          return await pw.snapshotAriaViaPlaywright({
            cdpUrl: profileCtx.profile.cdpUrl,
            targetId: tab.targetId,
            limit
          });
        });
      })() :
      (0, _cdp.snapshotAria)({ wsUrl: tab.wsUrl ?? "", limit });
      const resolved = await Promise.resolve(snap);
      if (!resolved) {
        return;
      }
      return res.json({
        ok: true,
        format,
        targetId: tab.targetId,
        url: tab.url,
        ...resolved
      });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
} /* v9-d33ad272fabab196 */
