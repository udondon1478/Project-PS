"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_CANVAS_HOST_PORT = exports.DEFAULT_BROWSER_CONTROL_PORT = exports.DEFAULT_BROWSER_CDP_PORT_RANGE_START = exports.DEFAULT_BROWSER_CDP_PORT_RANGE_END = exports.DEFAULT_BRIDGE_PORT = void 0;exports.deriveDefaultBridgePort = deriveDefaultBridgePort;exports.deriveDefaultBrowserCdpPortRange = deriveDefaultBrowserCdpPortRange;exports.deriveDefaultBrowserControlPort = deriveDefaultBrowserControlPort;exports.deriveDefaultCanvasHostPort = deriveDefaultCanvasHostPort;function isValidPort(port) {
  return Number.isFinite(port) && port > 0 && port <= 65535;
}
function clampPort(port, fallback) {
  return isValidPort(port) ? port : fallback;
}
function derivePort(base, offset, fallback) {
  return clampPort(base + offset, fallback);
}
const DEFAULT_BRIDGE_PORT = exports.DEFAULT_BRIDGE_PORT = 18790;
const DEFAULT_BROWSER_CONTROL_PORT = exports.DEFAULT_BROWSER_CONTROL_PORT = 18791;
const DEFAULT_CANVAS_HOST_PORT = exports.DEFAULT_CANVAS_HOST_PORT = 18793;
const DEFAULT_BROWSER_CDP_PORT_RANGE_START = exports.DEFAULT_BROWSER_CDP_PORT_RANGE_START = 18800;
const DEFAULT_BROWSER_CDP_PORT_RANGE_END = exports.DEFAULT_BROWSER_CDP_PORT_RANGE_END = 18899;
function deriveDefaultBridgePort(gatewayPort) {
  return derivePort(gatewayPort, 1, DEFAULT_BRIDGE_PORT);
}
function deriveDefaultBrowserControlPort(gatewayPort) {
  return derivePort(gatewayPort, 2, DEFAULT_BROWSER_CONTROL_PORT);
}
function deriveDefaultCanvasHostPort(gatewayPort) {
  return derivePort(gatewayPort, 4, DEFAULT_CANVAS_HOST_PORT);
}
function deriveDefaultBrowserCdpPortRange(browserControlPort) {
  const start = derivePort(browserControlPort, 9, DEFAULT_BROWSER_CDP_PORT_RANGE_START);
  const end = clampPort(start + (DEFAULT_BROWSER_CDP_PORT_RANGE_END - DEFAULT_BROWSER_CDP_PORT_RANGE_START), DEFAULT_BROWSER_CDP_PORT_RANGE_END);
  if (end < start) {
    return { start, end: start };
  }
  return { start, end };
} /* v9-8189ae3982a7859f */
