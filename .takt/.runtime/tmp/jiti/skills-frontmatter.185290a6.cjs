"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.parseFrontmatter = parseFrontmatter;exports.resolveOpenClawMetadata = resolveOpenClawMetadata;exports.resolveSkillInvocationPolicy = resolveSkillInvocationPolicy;exports.resolveSkillKey = resolveSkillKey;var _json = _interopRequireDefault(require("json5"));
var _legacyNames = require("../../compat/legacy-names.js");
var _frontmatter = require("../../markdown/frontmatter.js");
var _boolean = require("../../utils/boolean.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function parseFrontmatter(content) {
  return (0, _frontmatter.parseFrontmatterBlock)(content);
}
function normalizeStringList(input) {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.map((value) => String(value).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input.
    split(",").
    map((value) => value.trim()).
    filter(Boolean);
  }
  return [];
}
function parseInstallSpec(input) {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const raw = input;
  const kindRaw = typeof raw.kind === "string" ? raw.kind : typeof raw.type === "string" ? raw.type : "";
  const kind = kindRaw.trim().toLowerCase();
  if (kind !== "brew" && kind !== "node" && kind !== "go" && kind !== "uv" && kind !== "download") {
    return undefined;
  }
  const spec = {
    kind: kind
  };
  if (typeof raw.id === "string") {
    spec.id = raw.id;
  }
  if (typeof raw.label === "string") {
    spec.label = raw.label;
  }
  const bins = normalizeStringList(raw.bins);
  if (bins.length > 0) {
    spec.bins = bins;
  }
  const osList = normalizeStringList(raw.os);
  if (osList.length > 0) {
    spec.os = osList;
  }
  if (typeof raw.formula === "string") {
    spec.formula = raw.formula;
  }
  if (typeof raw.package === "string") {
    spec.package = raw.package;
  }
  if (typeof raw.module === "string") {
    spec.module = raw.module;
  }
  if (typeof raw.url === "string") {
    spec.url = raw.url;
  }
  if (typeof raw.archive === "string") {
    spec.archive = raw.archive;
  }
  if (typeof raw.extract === "boolean") {
    spec.extract = raw.extract;
  }
  if (typeof raw.stripComponents === "number") {
    spec.stripComponents = raw.stripComponents;
  }
  if (typeof raw.targetDir === "string") {
    spec.targetDir = raw.targetDir;
  }
  return spec;
}
function getFrontmatterValue(frontmatter, key) {
  const raw = frontmatter[key];
  return typeof raw === "string" ? raw : undefined;
}
function parseFrontmatterBool(value, fallback) {
  const parsed = (0, _boolean.parseBooleanValue)(value);
  return parsed === undefined ? fallback : parsed;
}
function resolveOpenClawMetadata(frontmatter) {
  const raw = getFrontmatterValue(frontmatter, "metadata");
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = _json.default.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    const metadataRawCandidates = [_legacyNames.MANIFEST_KEY, ..._legacyNames.LEGACY_MANIFEST_KEYS];
    let metadataRaw;
    for (const key of metadataRawCandidates) {
      const candidate = parsed[key];
      if (candidate && typeof candidate === "object") {
        metadataRaw = candidate;
        break;
      }
    }
    if (!metadataRaw || typeof metadataRaw !== "object") {
      return undefined;
    }
    const metadataObj = metadataRaw;
    const requiresRaw = typeof metadataObj.requires === "object" && metadataObj.requires !== null ?
    metadataObj.requires :
    undefined;
    const installRaw = Array.isArray(metadataObj.install) ? metadataObj.install : [];
    const install = installRaw.
    map((entry) => parseInstallSpec(entry)).
    filter((entry) => Boolean(entry));
    const osRaw = normalizeStringList(metadataObj.os);
    return {
      always: typeof metadataObj.always === "boolean" ? metadataObj.always : undefined,
      emoji: typeof metadataObj.emoji === "string" ? metadataObj.emoji : undefined,
      homepage: typeof metadataObj.homepage === "string" ? metadataObj.homepage : undefined,
      skillKey: typeof metadataObj.skillKey === "string" ? metadataObj.skillKey : undefined,
      primaryEnv: typeof metadataObj.primaryEnv === "string" ? metadataObj.primaryEnv : undefined,
      os: osRaw.length > 0 ? osRaw : undefined,
      requires: requiresRaw ?
      {
        bins: normalizeStringList(requiresRaw.bins),
        anyBins: normalizeStringList(requiresRaw.anyBins),
        env: normalizeStringList(requiresRaw.env),
        config: normalizeStringList(requiresRaw.config)
      } :
      undefined,
      install: install.length > 0 ? install : undefined
    };
  }
  catch {
    return undefined;
  }
}
function resolveSkillInvocationPolicy(frontmatter) {
  return {
    userInvocable: parseFrontmatterBool(getFrontmatterValue(frontmatter, "user-invocable"), true),
    disableModelInvocation: parseFrontmatterBool(getFrontmatterValue(frontmatter, "disable-model-invocation"), false)
  };
}
function resolveSkillKey(skill, entry) {
  return entry?.metadata?.skillKey ?? skill.name;
} /* v9-6e4839091e30e2ca */
