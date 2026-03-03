"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeAllowList = normalizeAllowList;exports.resolveRuntime = resolveRuntime;function resolveRuntime(opts) {
  return opts.runtime ?? {
    log: console.log,
    error: console.error,
    exit: (code) => {
      throw new Error(`exit ${code}`);
    }
  };
}
function normalizeAllowList(list) {
  return (list ?? []).map((entry) => String(entry).trim()).filter(Boolean);
} /* v9-e91e887d8fba9236 */
