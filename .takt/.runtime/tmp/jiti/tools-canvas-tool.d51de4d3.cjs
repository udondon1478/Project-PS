"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createCanvasTool = createCanvasTool;var _typebox = require("@sinclair/typebox");
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodesCamera = require("../../cli/nodes-camera.js");
var _nodesCanvas = require("../../cli/nodes-canvas.js");
var _mime = require("../../media/mime.js");
var _typebox2 = require("../schema/typebox.js");
var _common = require("./common.js");
var _gateway = require("./gateway.js");
var _nodesUtils = require("./nodes-utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const CANVAS_ACTIONS = [
"present",
"hide",
"navigate",
"eval",
"snapshot",
"a2ui_push",
"a2ui_reset"];

const CANVAS_SNAPSHOT_FORMATS = ["png", "jpg", "jpeg"];
// Flattened schema: runtime validates per-action requirements.
const CanvasToolSchema = _typebox.Type.Object({
  action: (0, _typebox2.stringEnum)(CANVAS_ACTIONS),
  gatewayUrl: _typebox.Type.Optional(_typebox.Type.String()),
  gatewayToken: _typebox.Type.Optional(_typebox.Type.String()),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Number()),
  node: _typebox.Type.Optional(_typebox.Type.String()),
  // present
  target: _typebox.Type.Optional(_typebox.Type.String()),
  x: _typebox.Type.Optional(_typebox.Type.Number()),
  y: _typebox.Type.Optional(_typebox.Type.Number()),
  width: _typebox.Type.Optional(_typebox.Type.Number()),
  height: _typebox.Type.Optional(_typebox.Type.Number()),
  // navigate
  url: _typebox.Type.Optional(_typebox.Type.String()),
  // eval
  javaScript: _typebox.Type.Optional(_typebox.Type.String()),
  // snapshot
  outputFormat: (0, _typebox2.optionalStringEnum)(CANVAS_SNAPSHOT_FORMATS),
  maxWidth: _typebox.Type.Optional(_typebox.Type.Number()),
  quality: _typebox.Type.Optional(_typebox.Type.Number()),
  delayMs: _typebox.Type.Optional(_typebox.Type.Number()),
  // a2ui_push
  jsonl: _typebox.Type.Optional(_typebox.Type.String()),
  jsonlPath: _typebox.Type.Optional(_typebox.Type.String())
});
function createCanvasTool() {
  return {
    label: "Canvas",
    name: "canvas",
    description: "Control node canvases (present/hide/navigate/eval/snapshot/A2UI). Use snapshot to capture the rendered UI.",
    parameters: CanvasToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const action = (0, _common.readStringParam)(params, "action", { required: true });
      const gatewayOpts = {
        gatewayUrl: (0, _common.readStringParam)(params, "gatewayUrl", { trim: false }),
        gatewayToken: (0, _common.readStringParam)(params, "gatewayToken", { trim: false }),
        timeoutMs: typeof params.timeoutMs === "number" ? params.timeoutMs : undefined
      };
      const nodeId = await (0, _nodesUtils.resolveNodeId)(gatewayOpts, (0, _common.readStringParam)(params, "node", { trim: true }), true);
      const invoke = async (command, invokeParams) => await (0, _gateway.callGatewayTool)("node.invoke", gatewayOpts, {
        nodeId,
        command,
        params: invokeParams,
        idempotencyKey: _nodeCrypto.default.randomUUID()
      });
      switch (action) {
        case "present":{
            const placement = {
              x: typeof params.x === "number" ? params.x : undefined,
              y: typeof params.y === "number" ? params.y : undefined,
              width: typeof params.width === "number" ? params.width : undefined,
              height: typeof params.height === "number" ? params.height : undefined
            };
            const invokeParams = {};
            if (typeof params.target === "string" && params.target.trim()) {
              invokeParams.url = params.target.trim();
            }
            if (Number.isFinite(placement.x) ||
            Number.isFinite(placement.y) ||
            Number.isFinite(placement.width) ||
            Number.isFinite(placement.height)) {
              invokeParams.placement = placement;
            }
            await invoke("canvas.present", invokeParams);
            return (0, _common.jsonResult)({ ok: true });
          }
        case "hide":
          await invoke("canvas.hide", undefined);
          return (0, _common.jsonResult)({ ok: true });
        case "navigate":{
            const url = (0, _common.readStringParam)(params, "url", { required: true });
            await invoke("canvas.navigate", { url });
            return (0, _common.jsonResult)({ ok: true });
          }
        case "eval":{
            const javaScript = (0, _common.readStringParam)(params, "javaScript", {
              required: true
            });
            const raw = await invoke("canvas.eval", { javaScript });
            const result = raw?.payload?.result;
            if (result) {
              return {
                content: [{ type: "text", text: result }],
                details: { result }
              };
            }
            return (0, _common.jsonResult)({ ok: true });
          }
        case "snapshot":{
            const formatRaw = typeof params.outputFormat === "string" ? params.outputFormat.toLowerCase() : "png";
            const format = formatRaw === "jpg" || formatRaw === "jpeg" ? "jpeg" : "png";
            const maxWidth = typeof params.maxWidth === "number" && Number.isFinite(params.maxWidth) ?
            params.maxWidth :
            undefined;
            const quality = typeof params.quality === "number" && Number.isFinite(params.quality) ?
            params.quality :
            undefined;
            const raw = await invoke("canvas.snapshot", {
              format,
              maxWidth,
              quality
            });
            const payload = (0, _nodesCanvas.parseCanvasSnapshotPayload)(raw?.payload);
            const filePath = (0, _nodesCanvas.canvasSnapshotTempPath)({
              ext: payload.format === "jpeg" ? "jpg" : payload.format
            });
            await (0, _nodesCamera.writeBase64ToFile)(filePath, payload.base64);
            const mimeType = (0, _mime.imageMimeFromFormat)(payload.format) ?? "image/png";
            return await (0, _common.imageResult)({
              label: "canvas:snapshot",
              path: filePath,
              base64: payload.base64,
              mimeType,
              details: { format: payload.format }
            });
          }
        case "a2ui_push":{
            const jsonl = typeof params.jsonl === "string" && params.jsonl.trim() ?
            params.jsonl :
            typeof params.jsonlPath === "string" && params.jsonlPath.trim() ?
            await _promises.default.readFile(params.jsonlPath.trim(), "utf8") :
            "";
            if (!jsonl.trim()) {
              throw new Error("jsonl or jsonlPath required");
            }
            await invoke("canvas.a2ui.pushJSONL", { jsonl });
            return (0, _common.jsonResult)({ ok: true });
          }
        case "a2ui_reset":
          await invoke("canvas.a2ui.reset", undefined);
          return (0, _common.jsonResult)({ ok: true });
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  };
} /* v9-1346553ecf7381f6 */
