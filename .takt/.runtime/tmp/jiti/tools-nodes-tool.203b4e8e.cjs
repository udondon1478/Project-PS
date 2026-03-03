"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createNodesTool = createNodesTool;var _typebox = require("@sinclair/typebox");
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _nodesCamera = require("../../cli/nodes-camera.js");
var _nodesRun = require("../../cli/nodes-run.js");
var _nodesScreen = require("../../cli/nodes-screen.js");
var _parseDuration = require("../../cli/parse-duration.js");
var _mime = require("../../media/mime.js");
var _agentScope = require("../agent-scope.js");
var _typebox2 = require("../schema/typebox.js");
var _toolImages = require("../tool-images.js");
var _common = require("./common.js");
var _gateway = require("./gateway.js");
var _nodesUtils = require("./nodes-utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const NODES_TOOL_ACTIONS = [
"status",
"describe",
"pending",
"approve",
"reject",
"notify",
"camera_snap",
"camera_list",
"camera_clip",
"screen_record",
"location_get",
"run"];

const NOTIFY_PRIORITIES = ["passive", "active", "timeSensitive"];
const NOTIFY_DELIVERIES = ["system", "overlay", "auto"];
const CAMERA_FACING = ["front", "back", "both"];
const LOCATION_ACCURACY = ["coarse", "balanced", "precise"];
// Flattened schema: runtime validates per-action requirements.
const NodesToolSchema = _typebox.Type.Object({
  action: (0, _typebox2.stringEnum)(NODES_TOOL_ACTIONS),
  gatewayUrl: _typebox.Type.Optional(_typebox.Type.String()),
  gatewayToken: _typebox.Type.Optional(_typebox.Type.String()),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Number()),
  node: _typebox.Type.Optional(_typebox.Type.String()),
  requestId: _typebox.Type.Optional(_typebox.Type.String()),
  // notify
  title: _typebox.Type.Optional(_typebox.Type.String()),
  body: _typebox.Type.Optional(_typebox.Type.String()),
  sound: _typebox.Type.Optional(_typebox.Type.String()),
  priority: (0, _typebox2.optionalStringEnum)(NOTIFY_PRIORITIES),
  delivery: (0, _typebox2.optionalStringEnum)(NOTIFY_DELIVERIES),
  // camera_snap / camera_clip
  facing: (0, _typebox2.optionalStringEnum)(CAMERA_FACING, {
    description: "camera_snap: front/back/both; camera_clip: front/back only."
  }),
  maxWidth: _typebox.Type.Optional(_typebox.Type.Number()),
  quality: _typebox.Type.Optional(_typebox.Type.Number()),
  delayMs: _typebox.Type.Optional(_typebox.Type.Number()),
  deviceId: _typebox.Type.Optional(_typebox.Type.String()),
  duration: _typebox.Type.Optional(_typebox.Type.String()),
  durationMs: _typebox.Type.Optional(_typebox.Type.Number()),
  includeAudio: _typebox.Type.Optional(_typebox.Type.Boolean()),
  // screen_record
  fps: _typebox.Type.Optional(_typebox.Type.Number()),
  screenIndex: _typebox.Type.Optional(_typebox.Type.Number()),
  outPath: _typebox.Type.Optional(_typebox.Type.String()),
  // location_get
  maxAgeMs: _typebox.Type.Optional(_typebox.Type.Number()),
  locationTimeoutMs: _typebox.Type.Optional(_typebox.Type.Number()),
  desiredAccuracy: (0, _typebox2.optionalStringEnum)(LOCATION_ACCURACY),
  // run
  command: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
  cwd: _typebox.Type.Optional(_typebox.Type.String()),
  env: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
  commandTimeoutMs: _typebox.Type.Optional(_typebox.Type.Number()),
  invokeTimeoutMs: _typebox.Type.Optional(_typebox.Type.Number()),
  needsScreenRecording: _typebox.Type.Optional(_typebox.Type.Boolean())
});
function createNodesTool(options) {
  const sessionKey = options?.agentSessionKey?.trim() || undefined;
  const agentId = (0, _agentScope.resolveSessionAgentId)({
    sessionKey: options?.agentSessionKey,
    config: options?.config
  });
  return {
    label: "Nodes",
    name: "nodes",
    description: "Discover and control paired nodes (status/describe/pairing/notify/camera/screen/location/run).",
    parameters: NodesToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const action = (0, _common.readStringParam)(params, "action", { required: true });
      const gatewayOpts = {
        gatewayUrl: (0, _common.readStringParam)(params, "gatewayUrl", { trim: false }),
        gatewayToken: (0, _common.readStringParam)(params, "gatewayToken", { trim: false }),
        timeoutMs: typeof params.timeoutMs === "number" ? params.timeoutMs : undefined
      };
      try {
        switch (action) {
          case "status":
            return (0, _common.jsonResult)(await (0, _gateway.callGatewayTool)("node.list", gatewayOpts, {}));
          case "describe":{
              const node = (0, _common.readStringParam)(params, "node", { required: true });
              const nodeId = await (0, _nodesUtils.resolveNodeId)(gatewayOpts, node);
              return (0, _common.jsonResult)(await (0, _gateway.callGatewayTool)("node.describe", gatewayOpts, { nodeId }));
            }
          case "pending":
            return (0, _common.jsonResult)(await (0, _gateway.callGatewayTool)("node.pair.list", gatewayOpts, {}));
          case "approve":{
              const requestId = (0, _common.readStringParam)(params, "requestId", {
                required: true
              });
              return (0, _common.jsonResult)(await (0, _gateway.callGatewayTool)("node.pair.approve", gatewayOpts, {
                requestId
              }));
            }
          case "reject":{
              const requestId = (0, _common.readStringParam)(params, "requestId", {
                required: true
              });
              return (0, _common.jsonResult)(await (0, _gateway.callGatewayTool)("node.pair.reject", gatewayOpts, {
                requestId
              }));
            }
          case "notify":{
              const node = (0, _common.readStringParam)(params, "node", { required: true });
              const title = typeof params.title === "string" ? params.title : "";
              const body = typeof params.body === "string" ? params.body : "";
              if (!title.trim() && !body.trim()) {
                throw new Error("title or body required");
              }
              const nodeId = await (0, _nodesUtils.resolveNodeId)(gatewayOpts, node);
              await (0, _gateway.callGatewayTool)("node.invoke", gatewayOpts, {
                nodeId,
                command: "system.notify",
                params: {
                  title: title.trim() || undefined,
                  body: body.trim() || undefined,
                  sound: typeof params.sound === "string" ? params.sound : undefined,
                  priority: typeof params.priority === "string" ? params.priority : undefined,
                  delivery: typeof params.delivery === "string" ? params.delivery : undefined
                },
                idempotencyKey: _nodeCrypto.default.randomUUID()
              });
              return (0, _common.jsonResult)({ ok: true });
            }
          case "camera_snap":{
              const node = (0, _common.readStringParam)(params, "node", { required: true });
              const nodeId = await (0, _nodesUtils.resolveNodeId)(gatewayOpts, node);
              const facingRaw = typeof params.facing === "string" ? params.facing.toLowerCase() : "both";
              const facings = facingRaw === "both" ?
              ["front", "back"] :
              facingRaw === "front" || facingRaw === "back" ?
              [facingRaw] :
              (() => {
                throw new Error("invalid facing (front|back|both)");
              })();
              const maxWidth = typeof params.maxWidth === "number" && Number.isFinite(params.maxWidth) ?
              params.maxWidth :
              undefined;
              const quality = typeof params.quality === "number" && Number.isFinite(params.quality) ?
              params.quality :
              undefined;
              const delayMs = typeof params.delayMs === "number" && Number.isFinite(params.delayMs) ?
              params.delayMs :
              undefined;
              const deviceId = typeof params.deviceId === "string" && params.deviceId.trim() ?
              params.deviceId.trim() :
              undefined;
              const content = [];
              const details = [];
              for (const facing of facings) {
                const raw = await (0, _gateway.callGatewayTool)("node.invoke", gatewayOpts, {
                  nodeId,
                  command: "camera.snap",
                  params: {
                    facing,
                    maxWidth,
                    quality,
                    format: "jpg",
                    delayMs,
                    deviceId
                  },
                  idempotencyKey: _nodeCrypto.default.randomUUID()
                });
                const payload = (0, _nodesCamera.parseCameraSnapPayload)(raw?.payload);
                const normalizedFormat = payload.format.toLowerCase();
                if (normalizedFormat !== "jpg" &&
                normalizedFormat !== "jpeg" &&
                normalizedFormat !== "png") {
                  throw new Error(`unsupported camera.snap format: ${payload.format}`);
                }
                const isJpeg = normalizedFormat === "jpg" || normalizedFormat === "jpeg";
                const filePath = (0, _nodesCamera.cameraTempPath)({
                  kind: "snap",
                  facing,
                  ext: isJpeg ? "jpg" : "png"
                });
                await (0, _nodesCamera.writeBase64ToFile)(filePath, payload.base64);
                content.push({ type: "text", text: `MEDIA:${filePath}` });
                content.push({
                  type: "image",
                  data: payload.base64,
                  mimeType: (0, _mime.imageMimeFromFormat)(payload.format) ?? (isJpeg ? "image/jpeg" : "image/png")
                });
                details.push({
                  facing,
                  path: filePath,
                  width: payload.width,
                  height: payload.height
                });
              }
              const result = { content, details };
              return await (0, _toolImages.sanitizeToolResultImages)(result, "nodes:camera_snap");
            }
          case "camera_list":{
              const node = (0, _common.readStringParam)(params, "node", { required: true });
              const nodeId = await (0, _nodesUtils.resolveNodeId)(gatewayOpts, node);
              const raw = await (0, _gateway.callGatewayTool)("node.invoke", gatewayOpts, {
                nodeId,
                command: "camera.list",
                params: {},
                idempotencyKey: _nodeCrypto.default.randomUUID()
              });
              const payload = raw && typeof raw.payload === "object" && raw.payload !== null ? raw.payload : {};
              return (0, _common.jsonResult)(payload);
            }
          case "camera_clip":{
              const node = (0, _common.readStringParam)(params, "node", { required: true });
              const nodeId = await (0, _nodesUtils.resolveNodeId)(gatewayOpts, node);
              const facing = typeof params.facing === "string" ? params.facing.toLowerCase() : "front";
              if (facing !== "front" && facing !== "back") {
                throw new Error("invalid facing (front|back)");
              }
              const durationMs = typeof params.durationMs === "number" && Number.isFinite(params.durationMs) ?
              params.durationMs :
              typeof params.duration === "string" ?
              (0, _parseDuration.parseDurationMs)(params.duration) :
              3000;
              const includeAudio = typeof params.includeAudio === "boolean" ? params.includeAudio : true;
              const deviceId = typeof params.deviceId === "string" && params.deviceId.trim() ?
              params.deviceId.trim() :
              undefined;
              const raw = await (0, _gateway.callGatewayTool)("node.invoke", gatewayOpts, {
                nodeId,
                command: "camera.clip",
                params: {
                  facing,
                  durationMs,
                  includeAudio,
                  format: "mp4",
                  deviceId
                },
                idempotencyKey: _nodeCrypto.default.randomUUID()
              });
              const payload = (0, _nodesCamera.parseCameraClipPayload)(raw?.payload);
              const filePath = (0, _nodesCamera.cameraTempPath)({
                kind: "clip",
                facing,
                ext: payload.format
              });
              await (0, _nodesCamera.writeBase64ToFile)(filePath, payload.base64);
              return {
                content: [{ type: "text", text: `FILE:${filePath}` }],
                details: {
                  facing,
                  path: filePath,
                  durationMs: payload.durationMs,
                  hasAudio: payload.hasAudio
                }
              };
            }
          case "screen_record":{
              const node = (0, _common.readStringParam)(params, "node", { required: true });
              const nodeId = await (0, _nodesUtils.resolveNodeId)(gatewayOpts, node);
              const durationMs = typeof params.durationMs === "number" && Number.isFinite(params.durationMs) ?
              params.durationMs :
              typeof params.duration === "string" ?
              (0, _parseDuration.parseDurationMs)(params.duration) :
              10_000;
              const fps = typeof params.fps === "number" && Number.isFinite(params.fps) ? params.fps : 10;
              const screenIndex = typeof params.screenIndex === "number" && Number.isFinite(params.screenIndex) ?
              params.screenIndex :
              0;
              const includeAudio = typeof params.includeAudio === "boolean" ? params.includeAudio : true;
              const raw = await (0, _gateway.callGatewayTool)("node.invoke", gatewayOpts, {
                nodeId,
                command: "screen.record",
                params: {
                  durationMs,
                  screenIndex,
                  fps,
                  format: "mp4",
                  includeAudio
                },
                idempotencyKey: _nodeCrypto.default.randomUUID()
              });
              const payload = (0, _nodesScreen.parseScreenRecordPayload)(raw?.payload);
              const filePath = typeof params.outPath === "string" && params.outPath.trim() ?
              params.outPath.trim() :
              (0, _nodesScreen.screenRecordTempPath)({ ext: payload.format || "mp4" });
              const written = await (0, _nodesScreen.writeScreenRecordToFile)(filePath, payload.base64);
              return {
                content: [{ type: "text", text: `FILE:${written.path}` }],
                details: {
                  path: written.path,
                  durationMs: payload.durationMs,
                  fps: payload.fps,
                  screenIndex: payload.screenIndex,
                  hasAudio: payload.hasAudio
                }
              };
            }
          case "location_get":{
              const node = (0, _common.readStringParam)(params, "node", { required: true });
              const nodeId = await (0, _nodesUtils.resolveNodeId)(gatewayOpts, node);
              const maxAgeMs = typeof params.maxAgeMs === "number" && Number.isFinite(params.maxAgeMs) ?
              params.maxAgeMs :
              undefined;
              const desiredAccuracy = params.desiredAccuracy === "coarse" ||
              params.desiredAccuracy === "balanced" ||
              params.desiredAccuracy === "precise" ?
              params.desiredAccuracy :
              undefined;
              const locationTimeoutMs = typeof params.locationTimeoutMs === "number" &&
              Number.isFinite(params.locationTimeoutMs) ?
              params.locationTimeoutMs :
              undefined;
              const raw = await (0, _gateway.callGatewayTool)("node.invoke", gatewayOpts, {
                nodeId,
                command: "location.get",
                params: {
                  maxAgeMs,
                  desiredAccuracy,
                  timeoutMs: locationTimeoutMs
                },
                idempotencyKey: _nodeCrypto.default.randomUUID()
              });
              return (0, _common.jsonResult)(raw?.payload ?? {});
            }
          case "run":{
              const node = (0, _common.readStringParam)(params, "node", { required: true });
              const nodes = await (0, _nodesUtils.listNodes)(gatewayOpts);
              if (nodes.length === 0) {
                throw new Error("system.run requires a paired companion app or node host (no nodes available).");
              }
              const nodeId = (0, _nodesUtils.resolveNodeIdFromList)(nodes, node);
              const nodeInfo = nodes.find((entry) => entry.nodeId === nodeId);
              const supportsSystemRun = Array.isArray(nodeInfo?.commands) ?
              nodeInfo?.commands?.includes("system.run") :
              false;
              if (!supportsSystemRun) {
                throw new Error("system.run requires a companion app or node host; the selected node does not support system.run.");
              }
              const commandRaw = params.command;
              if (!commandRaw) {
                throw new Error("command required (argv array, e.g. ['echo', 'Hello'])");
              }
              if (!Array.isArray(commandRaw)) {
                throw new Error("command must be an array of strings (argv), e.g. ['echo', 'Hello']");
              }
              const command = commandRaw.map((c) => String(c));
              if (command.length === 0) {
                throw new Error("command must not be empty");
              }
              const cwd = typeof params.cwd === "string" && params.cwd.trim() ? params.cwd.trim() : undefined;
              const env = (0, _nodesRun.parseEnvPairs)(params.env);
              const commandTimeoutMs = (0, _nodesRun.parseTimeoutMs)(params.commandTimeoutMs);
              const invokeTimeoutMs = (0, _nodesRun.parseTimeoutMs)(params.invokeTimeoutMs);
              const needsScreenRecording = typeof params.needsScreenRecording === "boolean" ?
              params.needsScreenRecording :
              undefined;
              const raw = await (0, _gateway.callGatewayTool)("node.invoke", gatewayOpts, {
                nodeId,
                command: "system.run",
                params: {
                  command,
                  cwd,
                  env,
                  timeoutMs: commandTimeoutMs,
                  needsScreenRecording,
                  agentId,
                  sessionKey
                },
                timeoutMs: invokeTimeoutMs,
                idempotencyKey: _nodeCrypto.default.randomUUID()
              });
              return (0, _common.jsonResult)(raw?.payload ?? {});
            }
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      }
      catch (err) {
        const nodeLabel = typeof params.node === "string" && params.node.trim() ? params.node.trim() : "auto";
        const gatewayLabel = gatewayOpts.gatewayUrl && gatewayOpts.gatewayUrl.trim() ?
        gatewayOpts.gatewayUrl.trim() :
        "default";
        const agentLabel = agentId ?? "unknown";
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`agent=${agentLabel} node=${nodeLabel} gateway=${gatewayLabel} action=${action}: ${message}`, { cause: err });
      }
    }
  };
} /* v9-5109fc60106aa88f */
