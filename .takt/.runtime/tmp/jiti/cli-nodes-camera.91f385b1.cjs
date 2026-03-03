"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.cameraTempPath = cameraTempPath;exports.parseCameraClipPayload = parseCameraClipPayload;exports.parseCameraSnapPayload = parseCameraSnapPayload;exports.writeBase64ToFile = writeBase64ToFile;var _nodeCrypto = require("node:crypto");
var fs = _interopRequireWildcard(require("node:fs/promises"));
var os = _interopRequireWildcard(require("node:os"));
var path = _interopRequireWildcard(require("node:path"));
var _cliName = require("./cli-name.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
function asRecord(value) {
  return typeof value === "object" && value !== null ? value : {};
}
function asString(value) {
  return typeof value === "string" ? value : undefined;
}
function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function asBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}
function parseCameraSnapPayload(value) {
  const obj = asRecord(value);
  const format = asString(obj.format);
  const base64 = asString(obj.base64);
  const width = asNumber(obj.width);
  const height = asNumber(obj.height);
  if (!format || !base64 || width === undefined || height === undefined) {
    throw new Error("invalid camera.snap payload");
  }
  return { format, base64, width, height };
}
function parseCameraClipPayload(value) {
  const obj = asRecord(value);
  const format = asString(obj.format);
  const base64 = asString(obj.base64);
  const durationMs = asNumber(obj.durationMs);
  const hasAudio = asBoolean(obj.hasAudio);
  if (!format || !base64 || durationMs === undefined || hasAudio === undefined) {
    throw new Error("invalid camera.clip payload");
  }
  return { format, base64, durationMs, hasAudio };
}
function cameraTempPath(opts) {
  const tmpDir = opts.tmpDir ?? os.tmpdir();
  const id = opts.id ?? (0, _nodeCrypto.randomUUID)();
  const facingPart = opts.facing ? `-${opts.facing}` : "";
  const ext = opts.ext.startsWith(".") ? opts.ext : `.${opts.ext}`;
  const cliName = (0, _cliName.resolveCliName)();
  return path.join(tmpDir, `${cliName}-camera-${opts.kind}${facingPart}-${id}${ext}`);
}
async function writeBase64ToFile(filePath, base64) {
  const buf = Buffer.from(base64, "base64");
  await fs.writeFile(filePath, buf);
  return { path: filePath, bytes: buf.length };
} /* v9-d2715c53acd46a63 */
