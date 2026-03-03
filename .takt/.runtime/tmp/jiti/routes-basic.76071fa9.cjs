"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerBrowserBasicRoutes = registerBrowserBasicRoutes;var _chromeExecutables = require("../chrome.executables.js");
var _profilesService = require("../profiles-service.js");
var _utils = require("./utils.js");
function registerBrowserBasicRoutes(app, ctx) {
  // List all profiles with their status
  app.get("/profiles", async (_req, res) => {
    try {
      const service = (0, _profilesService.createBrowserProfilesService)(ctx);
      const profiles = await service.listProfiles();
      res.json({ profiles });
    }
    catch (err) {
      (0, _utils.jsonError)(res, 500, String(err));
    }
  });
  // Get status (profile-aware)
  app.get("/", async (req, res) => {
    let current;
    try {
      current = ctx.state();
    }
    catch {
      return (0, _utils.jsonError)(res, 503, "browser server not started");
    }
    const profileCtx = (0, _utils.getProfileContext)(req, ctx);
    if ("error" in profileCtx) {
      return (0, _utils.jsonError)(res, profileCtx.status, profileCtx.error);
    }
    const [cdpHttp, cdpReady] = await Promise.all([
    profileCtx.isHttpReachable(300),
    profileCtx.isReachable(600)]
    );
    const profileState = current.profiles.get(profileCtx.profile.name);
    let detectedBrowser = null;
    let detectedExecutablePath = null;
    let detectError = null;
    try {
      const detected = (0, _chromeExecutables.resolveBrowserExecutableForPlatform)(current.resolved, process.platform);
      if (detected) {
        detectedBrowser = detected.kind;
        detectedExecutablePath = detected.path;
      }
    }
    catch (err) {
      detectError = String(err);
    }
    res.json({
      enabled: current.resolved.enabled,
      profile: profileCtx.profile.name,
      running: cdpReady,
      cdpReady,
      cdpHttp,
      pid: profileState?.running?.pid ?? null,
      cdpPort: profileCtx.profile.cdpPort,
      cdpUrl: profileCtx.profile.cdpUrl,
      chosenBrowser: profileState?.running?.exe.kind ?? null,
      detectedBrowser,
      detectedExecutablePath,
      detectError,
      userDataDir: profileState?.running?.userDataDir ?? null,
      color: profileCtx.profile.color,
      headless: current.resolved.headless,
      noSandbox: current.resolved.noSandbox,
      executablePath: current.resolved.executablePath ?? null,
      attachOnly: current.resolved.attachOnly
    });
  });
  // Start browser (profile-aware)
  app.post("/start", async (req, res) => {
    const profileCtx = (0, _utils.getProfileContext)(req, ctx);
    if ("error" in profileCtx) {
      return (0, _utils.jsonError)(res, profileCtx.status, profileCtx.error);
    }
    try {
      await profileCtx.ensureBrowserAvailable();
      res.json({ ok: true, profile: profileCtx.profile.name });
    }
    catch (err) {
      (0, _utils.jsonError)(res, 500, String(err));
    }
  });
  // Stop browser (profile-aware)
  app.post("/stop", async (req, res) => {
    const profileCtx = (0, _utils.getProfileContext)(req, ctx);
    if ("error" in profileCtx) {
      return (0, _utils.jsonError)(res, profileCtx.status, profileCtx.error);
    }
    try {
      const result = await profileCtx.stopRunningBrowser();
      res.json({
        ok: true,
        stopped: result.stopped,
        profile: profileCtx.profile.name
      });
    }
    catch (err) {
      (0, _utils.jsonError)(res, 500, String(err));
    }
  });
  // Reset profile (profile-aware)
  app.post("/reset-profile", async (req, res) => {
    const profileCtx = (0, _utils.getProfileContext)(req, ctx);
    if ("error" in profileCtx) {
      return (0, _utils.jsonError)(res, profileCtx.status, profileCtx.error);
    }
    try {
      const result = await profileCtx.resetProfile();
      res.json({ ok: true, profile: profileCtx.profile.name, ...result });
    }
    catch (err) {
      (0, _utils.jsonError)(res, 500, String(err));
    }
  });
  // Create a new profile
  app.post("/profiles/create", async (req, res) => {
    const name = (0, _utils.toStringOrEmpty)(req.body?.name);
    const color = (0, _utils.toStringOrEmpty)(req.body?.color);
    const cdpUrl = (0, _utils.toStringOrEmpty)(req.body?.cdpUrl);
    const driver = (0, _utils.toStringOrEmpty)(req.body?.driver);
    if (!name) {
      return (0, _utils.jsonError)(res, 400, "name is required");
    }
    try {
      const service = (0, _profilesService.createBrowserProfilesService)(ctx);
      const result = await service.createProfile({
        name,
        color: color || undefined,
        cdpUrl: cdpUrl || undefined,
        driver: driver === "extension" ? "extension" : undefined
      });
      res.json(result);
    }
    catch (err) {
      const msg = String(err);
      if (msg.includes("already exists")) {
        return (0, _utils.jsonError)(res, 409, msg);
      }
      if (msg.includes("invalid profile name")) {
        return (0, _utils.jsonError)(res, 400, msg);
      }
      if (msg.includes("no available CDP ports")) {
        return (0, _utils.jsonError)(res, 507, msg);
      }
      if (msg.includes("cdpUrl")) {
        return (0, _utils.jsonError)(res, 400, msg);
      }
      (0, _utils.jsonError)(res, 500, msg);
    }
  });
  // Delete a profile
  app.delete("/profiles/:name", async (req, res) => {
    const name = (0, _utils.toStringOrEmpty)(req.params.name);
    if (!name) {
      return (0, _utils.jsonError)(res, 400, "profile name is required");
    }
    try {
      const service = (0, _profilesService.createBrowserProfilesService)(ctx);
      const result = await service.deleteProfile(name);
      res.json(result);
    }
    catch (err) {
      const msg = String(err);
      if (msg.includes("invalid profile name")) {
        return (0, _utils.jsonError)(res, 400, msg);
      }
      if (msg.includes("default profile")) {
        return (0, _utils.jsonError)(res, 400, msg);
      }
      if (msg.includes("not found")) {
        return (0, _utils.jsonError)(res, 404, msg);
      }
      (0, _utils.jsonError)(res, 500, msg);
    }
  });
} /* v9-a537816b5a8e5618 */
