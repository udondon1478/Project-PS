"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.appendRawStream = appendRawStream;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _paths = require("../config/paths.js");
var _env = require("../infra/env.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const RAW_STREAM_ENABLED = (0, _env.isTruthyEnvValue)(process.env.OPENCLAW_RAW_STREAM);
const RAW_STREAM_PATH = process.env.OPENCLAW_RAW_STREAM_PATH?.trim() ||
_nodePath.default.join((0, _paths.resolveStateDir)(), "logs", "raw-stream.jsonl");
let rawStreamReady = false;
function appendRawStream(payload) {
  if (!RAW_STREAM_ENABLED) {
    return;
  }
  if (!rawStreamReady) {
    rawStreamReady = true;
    try {
      _nodeFs.default.mkdirSync(_nodePath.default.dirname(RAW_STREAM_PATH), { recursive: true });
    }
    catch {

      // ignore raw stream mkdir failures
    }}
  try {
    void _nodeFs.default.promises.appendFile(RAW_STREAM_PATH, `${JSON.stringify(payload)}\n`);
  }
  catch {

    // ignore raw stream write failures
  }} /* v9-b9e8ce30401dbdc8 */
