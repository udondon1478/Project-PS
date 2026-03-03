"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getMemorySearchManager = getMemorySearchManager;function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}async function getMemorySearchManager(params) {
  try {
    const { MemoryIndexManager } = await Promise.resolve().then(() => jitiImport("./manager.js").then((m) => _interopRequireWildcard(m)));
    const manager = await MemoryIndexManager.get(params);
    return { manager };
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { manager: null, error: message };
  }
} /* v9-5000a87b8b28c00c */
