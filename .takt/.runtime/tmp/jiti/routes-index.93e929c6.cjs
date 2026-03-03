"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerBrowserRoutes = registerBrowserRoutes;var _agent = require("./agent.js");
var _basic = require("./basic.js");
var _tabs = require("./tabs.js");
function registerBrowserRoutes(app, ctx) {
  (0, _basic.registerBrowserBasicRoutes)(app, ctx);
  (0, _tabs.registerBrowserTabRoutes)(app, ctx);
  (0, _agent.registerBrowserAgentRoutes)(app, ctx);
} /* v9-65a3aeedfafe750e */
