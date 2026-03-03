"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerBrowserAgentStorageRoutes = registerBrowserAgentStorageRoutes;var _agentShared = require("./agent.shared.js");
var _utils = require("./utils.js");
function registerBrowserAgentStorageRoutes(app, ctx) {
  app.get("/cookies", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pw = await (0, _agentShared.requirePwAi)(res, "cookies");
      if (!pw) {
        return;
      }
      const result = await pw.cookiesGetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/cookies/set", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const cookie = body.cookie && typeof body.cookie === "object" && !Array.isArray(body.cookie) ?
    body.cookie :
    null;
    if (!cookie) {
      return (0, _utils.jsonError)(res, 400, "cookie is required");
    }
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "cookies set");
      if (!pw) {
        return;
      }
      await pw.cookiesSetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        cookie: {
          name: (0, _utils.toStringOrEmpty)(cookie.name),
          value: (0, _utils.toStringOrEmpty)(cookie.value),
          url: (0, _utils.toStringOrEmpty)(cookie.url) || undefined,
          domain: (0, _utils.toStringOrEmpty)(cookie.domain) || undefined,
          path: (0, _utils.toStringOrEmpty)(cookie.path) || undefined,
          expires: (0, _utils.toNumber)(cookie.expires) ?? undefined,
          httpOnly: (0, _utils.toBoolean)(cookie.httpOnly) ?? undefined,
          secure: (0, _utils.toBoolean)(cookie.secure) ?? undefined,
          sameSite: cookie.sameSite === "Lax" || cookie.sameSite === "None" || cookie.sameSite === "Strict" ?
          cookie.sameSite :
          undefined
        }
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/cookies/clear", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "cookies clear");
      if (!pw) {
        return;
      }
      await pw.cookiesClearViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.get("/storage/:kind", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const kind = (0, _utils.toStringOrEmpty)(req.params.kind);
    if (kind !== "local" && kind !== "session") {
      return (0, _utils.jsonError)(res, 400, "kind must be local|session");
    }
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const key = typeof req.query.key === "string" ? req.query.key : "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pw = await (0, _agentShared.requirePwAi)(res, "storage get");
      if (!pw) {
        return;
      }
      const result = await pw.storageGetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        kind,
        key: key.trim() || undefined
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/storage/:kind/set", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const kind = (0, _utils.toStringOrEmpty)(req.params.kind);
    if (kind !== "local" && kind !== "session") {
      return (0, _utils.jsonError)(res, 400, "kind must be local|session");
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const key = (0, _utils.toStringOrEmpty)(body.key);
    if (!key) {
      return (0, _utils.jsonError)(res, 400, "key is required");
    }
    const value = typeof body.value === "string" ? body.value : "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "storage set");
      if (!pw) {
        return;
      }
      await pw.storageSetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        kind,
        key,
        value
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/storage/:kind/clear", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const kind = (0, _utils.toStringOrEmpty)(req.params.kind);
    if (kind !== "local" && kind !== "session") {
      return (0, _utils.jsonError)(res, 400, "kind must be local|session");
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "storage clear");
      if (!pw) {
        return;
      }
      await pw.storageClearViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        kind
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/set/offline", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const offline = (0, _utils.toBoolean)(body.offline);
    if (offline === undefined) {
      return (0, _utils.jsonError)(res, 400, "offline is required");
    }
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "offline");
      if (!pw) {
        return;
      }
      await pw.setOfflineViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        offline
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/set/headers", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const headers = body.headers && typeof body.headers === "object" && !Array.isArray(body.headers) ?
    body.headers :
    null;
    if (!headers) {
      return (0, _utils.jsonError)(res, 400, "headers is required");
    }
    const parsed = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") {
        parsed[k] = v;
      }
    }
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "headers");
      if (!pw) {
        return;
      }
      await pw.setExtraHTTPHeadersViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        headers: parsed
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/set/credentials", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const clear = (0, _utils.toBoolean)(body.clear) ?? false;
    const username = (0, _utils.toStringOrEmpty)(body.username) || undefined;
    const password = typeof body.password === "string" ? body.password : undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "http credentials");
      if (!pw) {
        return;
      }
      await pw.setHttpCredentialsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        username,
        password,
        clear
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/set/geolocation", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const clear = (0, _utils.toBoolean)(body.clear) ?? false;
    const latitude = (0, _utils.toNumber)(body.latitude);
    const longitude = (0, _utils.toNumber)(body.longitude);
    const accuracy = (0, _utils.toNumber)(body.accuracy) ?? undefined;
    const origin = (0, _utils.toStringOrEmpty)(body.origin) || undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "geolocation");
      if (!pw) {
        return;
      }
      await pw.setGeolocationViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        latitude,
        longitude,
        accuracy,
        origin,
        clear
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/set/media", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const schemeRaw = (0, _utils.toStringOrEmpty)(body.colorScheme);
    const colorScheme = schemeRaw === "dark" || schemeRaw === "light" || schemeRaw === "no-preference" ?
    schemeRaw :
    schemeRaw === "none" ?
    null :
    undefined;
    if (colorScheme === undefined) {
      return (0, _utils.jsonError)(res, 400, "colorScheme must be dark|light|no-preference|none");
    }
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "media emulation");
      if (!pw) {
        return;
      }
      await pw.emulateMediaViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        colorScheme
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/set/timezone", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const timezoneId = (0, _utils.toStringOrEmpty)(body.timezoneId);
    if (!timezoneId) {
      return (0, _utils.jsonError)(res, 400, "timezoneId is required");
    }
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "timezone");
      if (!pw) {
        return;
      }
      await pw.setTimezoneViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        timezoneId
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/set/locale", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const locale = (0, _utils.toStringOrEmpty)(body.locale);
    if (!locale) {
      return (0, _utils.jsonError)(res, 400, "locale is required");
    }
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "locale");
      if (!pw) {
        return;
      }
      await pw.setLocaleViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        locale
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
  app.post("/set/device", async (req, res) => {
    const profileCtx = (0, _agentShared.resolveProfileContext)(req, res, ctx);
    if (!profileCtx) {
      return;
    }
    const body = (0, _agentShared.readBody)(req);
    const targetId = (0, _utils.toStringOrEmpty)(body.targetId) || undefined;
    const name = (0, _utils.toStringOrEmpty)(body.name);
    if (!name) {
      return (0, _utils.jsonError)(res, 400, "name is required");
    }
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await (0, _agentShared.requirePwAi)(res, "device emulation");
      if (!pw) {
        return;
      }
      await pw.setDeviceViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        name
      });
      res.json({ ok: true, targetId: tab.targetId });
    }
    catch (err) {
      (0, _agentShared.handleRouteError)(ctx, res, err);
    }
  });
} /* v9-63c683d04853aa1f */
