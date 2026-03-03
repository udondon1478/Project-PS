"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.VERSION = void 0;var _nodeModule = require("node:module");
function readVersionFromPackageJson() {
  try {
    const require = (0, _nodeModule.createRequire)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/version.js");
    const pkg = require("../package.json");
    return pkg.version ?? null;
  }
  catch {
    return null;
  }
}
// Single source of truth for the current OpenClaw version.
// - Embedded/bundled builds: injected define or env var.
// - Dev/npm builds: package.json.
const VERSION = exports.VERSION = typeof __OPENCLAW_VERSION__ === "string" && __OPENCLAW_VERSION__ ||
process.env.OPENCLAW_BUNDLED_VERSION ||
readVersionFromPackageJson() ||
"0.0.0"; /* v9-536b54d782f58a1f */
