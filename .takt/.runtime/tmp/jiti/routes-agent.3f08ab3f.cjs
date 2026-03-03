"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerBrowserAgentRoutes = registerBrowserAgentRoutes;var _agentAct = require("./agent.act.js");
var _agentDebug = require("./agent.debug.js");
var _agentSnapshot = require("./agent.snapshot.js");
var _agentStorage = require("./agent.storage.js");
function registerBrowserAgentRoutes(app, ctx) {
  (0, _agentSnapshot.registerBrowserAgentSnapshotRoutes)(app, ctx);
  (0, _agentAct.registerBrowserAgentActRoutes)(app, ctx);
  (0, _agentDebug.registerBrowserAgentDebugRoutes)(app, ctx);
  (0, _agentStorage.registerBrowserAgentStorageRoutes)(app, ctx);
} /* v9-02926f5210f0f62f */
