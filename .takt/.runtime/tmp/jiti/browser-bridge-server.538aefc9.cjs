"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.startBrowserBridgeServer = startBrowserBridgeServer;exports.stopBrowserBridgeServer = stopBrowserBridgeServer;var _express = _interopRequireDefault(require("express"));
var _index = require("./routes/index.js");
var _serverContext = require("./server-context.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function startBrowserBridgeServer(params) {
  const host = params.host ?? "127.0.0.1";
  const port = params.port ?? 0;
  const app = (0, _express.default)();
  app.use(_express.default.json({ limit: "1mb" }));
  const authToken = params.authToken?.trim();
  if (authToken) {
    app.use((req, res, next) => {
      const auth = String(req.headers.authorization ?? "").trim();
      if (auth === `Bearer ${authToken}`) {
        return next();
      }
      res.status(401).send("Unauthorized");
    });
  }
  const state = {
    server: null,
    port,
    resolved: params.resolved,
    profiles: new Map()
  };
  const ctx = (0, _serverContext.createBrowserRouteContext)({
    getState: () => state,
    onEnsureAttachTarget: params.onEnsureAttachTarget
  });
  (0, _index.registerBrowserRoutes)(app, ctx);
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(port, host, () => resolve(s));
    s.once("error", reject);
  });
  const address = server.address();
  const resolvedPort = address?.port ?? port;
  state.server = server;
  state.port = resolvedPort;
  state.resolved.controlPort = resolvedPort;
  const baseUrl = `http://${host}:${resolvedPort}`;
  return { server, port: resolvedPort, baseUrl, state };
}
async function stopBrowserBridgeServer(server) {
  await new Promise((resolve) => {
    server.close(() => resolve());
  });
} /* v9-2a69904789046b5b */
