"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.readBrowserRegistry = readBrowserRegistry;exports.readRegistry = readRegistry;exports.removeBrowserRegistryEntry = removeBrowserRegistryEntry;exports.removeRegistryEntry = removeRegistryEntry;exports.updateBrowserRegistry = updateBrowserRegistry;exports.updateRegistry = updateRegistry;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _constants = require("./constants.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function readRegistry() {
  try {
    const raw = await _promises.default.readFile(_constants.SANDBOX_REGISTRY_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.entries)) {
      return parsed;
    }
  }
  catch {

    // ignore
  }return { entries: [] };
}
async function writeRegistry(registry) {
  await _promises.default.mkdir(_constants.SANDBOX_STATE_DIR, { recursive: true });
  await _promises.default.writeFile(_constants.SANDBOX_REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf-8");
}
async function updateRegistry(entry) {
  const registry = await readRegistry();
  const existing = registry.entries.find((item) => item.containerName === entry.containerName);
  const next = registry.entries.filter((item) => item.containerName !== entry.containerName);
  next.push({
    ...entry,
    createdAtMs: existing?.createdAtMs ?? entry.createdAtMs,
    image: existing?.image ?? entry.image,
    configHash: entry.configHash ?? existing?.configHash
  });
  await writeRegistry({ entries: next });
}
async function removeRegistryEntry(containerName) {
  const registry = await readRegistry();
  const next = registry.entries.filter((item) => item.containerName !== containerName);
  if (next.length === registry.entries.length) {
    return;
  }
  await writeRegistry({ entries: next });
}
async function readBrowserRegistry() {
  try {
    const raw = await _promises.default.readFile(_constants.SANDBOX_BROWSER_REGISTRY_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.entries)) {
      return parsed;
    }
  }
  catch {

    // ignore
  }return { entries: [] };
}
async function writeBrowserRegistry(registry) {
  await _promises.default.mkdir(_constants.SANDBOX_STATE_DIR, { recursive: true });
  await _promises.default.writeFile(_constants.SANDBOX_BROWSER_REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf-8");
}
async function updateBrowserRegistry(entry) {
  const registry = await readBrowserRegistry();
  const existing = registry.entries.find((item) => item.containerName === entry.containerName);
  const next = registry.entries.filter((item) => item.containerName !== entry.containerName);
  next.push({
    ...entry,
    createdAtMs: existing?.createdAtMs ?? entry.createdAtMs,
    image: existing?.image ?? entry.image
  });
  await writeBrowserRegistry({ entries: next });
}
async function removeBrowserRegistryEntry(containerName) {
  const registry = await readBrowserRegistry();
  const next = registry.entries.filter((item) => item.containerName !== containerName);
  if (next.length === registry.entries.length) {
    return;
  }
  await writeBrowserRegistry({ entries: next });
} /* v9-0fe7aeefbecaff8b */
