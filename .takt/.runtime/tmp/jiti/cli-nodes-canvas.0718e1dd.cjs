"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.canvasSnapshotTempPath = canvasSnapshotTempPath;exports.parseCanvasSnapshotPayload = parseCanvasSnapshotPayload;var _nodeCrypto = require("node:crypto");
var os = _interopRequireWildcard(require("node:os"));
var path = _interopRequireWildcard(require("node:path"));
var _cliName = require("./cli-name.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
function asRecord(value) {
  return typeof value === "object" && value !== null ? value : {};
}
function asString(value) {
  return typeof value === "string" ? value : undefined;
}
function parseCanvasSnapshotPayload(value) {
  const obj = asRecord(value);
  const format = asString(obj.format);
  const base64 = asString(obj.base64);
  if (!format || !base64) {
    throw new Error("invalid canvas.snapshot payload");
  }
  return { format, base64 };
}
function canvasSnapshotTempPath(opts) {
  const tmpDir = opts.tmpDir ?? os.tmpdir();
  const id = opts.id ?? (0, _nodeCrypto.randomUUID)();
  const ext = opts.ext.startsWith(".") ? opts.ext : `.${opts.ext}`;
  const cliName = (0, _cliName.resolveCliName)();
  return path.join(tmpDir, `${cliName}-canvas-snapshot-${id}${ext}`);
} /* v9-deab32d7f2dc7ea3 */
