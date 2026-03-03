"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerPluginHttpRoute = registerPluginHttpRoute;var _httpPath = require("./http-path.js");
var _runtime = require("./runtime.js");
function registerPluginHttpRoute(params) {
  const registry = params.registry ?? (0, _runtime.requireActivePluginRegistry)();
  const routes = registry.httpRoutes ?? [];
  registry.httpRoutes = routes;
  const normalizedPath = (0, _httpPath.normalizePluginHttpPath)(params.path, params.fallbackPath);
  const suffix = params.accountId ? ` for account "${params.accountId}"` : "";
  if (!normalizedPath) {
    params.log?.(`plugin: webhook path missing${suffix}`);
    return () => {};
  }
  if (routes.some((entry) => entry.path === normalizedPath)) {
    const pluginHint = params.pluginId ? ` (${params.pluginId})` : "";
    params.log?.(`plugin: webhook path ${normalizedPath} already registered${suffix}${pluginHint}`);
    return () => {};
  }
  const entry = {
    path: normalizedPath,
    handler: params.handler,
    pluginId: params.pluginId,
    source: params.source
  };
  routes.push(entry);
  return () => {
    const index = routes.indexOf(entry);
    if (index >= 0) {
      routes.splice(index, 1);
    }
  };
} /* v9-78f1b6e174978ee0 */
