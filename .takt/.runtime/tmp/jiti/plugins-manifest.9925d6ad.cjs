"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.PLUGIN_MANIFEST_FILENAMES = exports.PLUGIN_MANIFEST_FILENAME = void 0;exports.getPackageManifestMetadata = getPackageManifestMetadata;exports.loadPluginManifest = loadPluginManifest;exports.resolvePluginManifestPath = resolvePluginManifestPath;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _legacyNames = require("../compat/legacy-names.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const PLUGIN_MANIFEST_FILENAME = exports.PLUGIN_MANIFEST_FILENAME = "openclaw.plugin.json";
const PLUGIN_MANIFEST_FILENAMES = exports.PLUGIN_MANIFEST_FILENAMES = [PLUGIN_MANIFEST_FILENAME];
function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => typeof entry === "string" ? entry.trim() : "").filter(Boolean);
}
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function resolvePluginManifestPath(rootDir) {
  for (const filename of PLUGIN_MANIFEST_FILENAMES) {
    const candidate = _nodePath.default.join(rootDir, filename);
    if (_nodeFs.default.existsSync(candidate)) {
      return candidate;
    }
  }
  return _nodePath.default.join(rootDir, PLUGIN_MANIFEST_FILENAME);
}
function loadPluginManifest(rootDir) {
  const manifestPath = resolvePluginManifestPath(rootDir);
  if (!_nodeFs.default.existsSync(manifestPath)) {
    return { ok: false, error: `plugin manifest not found: ${manifestPath}`, manifestPath };
  }
  let raw;
  try {
    raw = JSON.parse(_nodeFs.default.readFileSync(manifestPath, "utf-8"));
  }
  catch (err) {
    return {
      ok: false,
      error: `failed to parse plugin manifest: ${String(err)}`,
      manifestPath
    };
  }
  if (!isRecord(raw)) {
    return { ok: false, error: "plugin manifest must be an object", manifestPath };
  }
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  if (!id) {
    return { ok: false, error: "plugin manifest requires id", manifestPath };
  }
  const configSchema = isRecord(raw.configSchema) ? raw.configSchema : null;
  if (!configSchema) {
    return { ok: false, error: "plugin manifest requires configSchema", manifestPath };
  }
  const kind = typeof raw.kind === "string" ? raw.kind : undefined;
  const name = typeof raw.name === "string" ? raw.name.trim() : undefined;
  const description = typeof raw.description === "string" ? raw.description.trim() : undefined;
  const version = typeof raw.version === "string" ? raw.version.trim() : undefined;
  const channels = normalizeStringList(raw.channels);
  const providers = normalizeStringList(raw.providers);
  const skills = normalizeStringList(raw.skills);
  let uiHints;
  if (isRecord(raw.uiHints)) {
    uiHints = raw.uiHints;
  }
  return {
    ok: true,
    manifest: {
      id,
      configSchema,
      kind,
      channels,
      providers,
      skills,
      name,
      description,
      version,
      uiHints
    },
    manifestPath
  };
}
function getPackageManifestMetadata(manifest) {
  if (!manifest) {
    return undefined;
  }
  return manifest[_legacyNames.MANIFEST_KEY];
} /* v9-d3a3ceb0174da1a2 */
