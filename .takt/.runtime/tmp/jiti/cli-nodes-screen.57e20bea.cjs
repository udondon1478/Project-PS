"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.parseScreenRecordPayload = parseScreenRecordPayload;exports.screenRecordTempPath = screenRecordTempPath;exports.writeScreenRecordToFile = writeScreenRecordToFile;var _nodeCrypto = require("node:crypto");
var os = _interopRequireWildcard(require("node:os"));
var path = _interopRequireWildcard(require("node:path"));
var _nodesCamera = require("./nodes-camera.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
function asRecord(value) {
  return typeof value === "object" && value !== null ? value : {};
}
function asString(value) {
  return typeof value === "string" ? value : undefined;
}
function parseScreenRecordPayload(value) {
  const obj = asRecord(value);
  const format = asString(obj.format);
  const base64 = asString(obj.base64);
  if (!format || !base64) {
    throw new Error("invalid screen.record payload");
  }
  return {
    format,
    base64,
    durationMs: typeof obj.durationMs === "number" ? obj.durationMs : undefined,
    fps: typeof obj.fps === "number" ? obj.fps : undefined,
    screenIndex: typeof obj.screenIndex === "number" ? obj.screenIndex : undefined,
    hasAudio: typeof obj.hasAudio === "boolean" ? obj.hasAudio : undefined
  };
}
function screenRecordTempPath(opts) {
  const tmpDir = opts.tmpDir ?? os.tmpdir();
  const id = opts.id ?? (0, _nodeCrypto.randomUUID)();
  const ext = opts.ext.startsWith(".") ? opts.ext : `.${opts.ext}`;
  return path.join(tmpDir, `openclaw-screen-record-${id}${ext}`);
}
async function writeScreenRecordToFile(filePath, base64) {
  return (0, _nodesCamera.writeBase64ToFile)(filePath, base64);
} /* v9-6aebb7900dac896b */
