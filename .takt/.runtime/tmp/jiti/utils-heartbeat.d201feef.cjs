"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.startHeartbeat = startHeartbeat;exports.stopHeartbeat = stopHeartbeat;var _types = require("../types.js");
function startHeartbeat(manager, options) {
  stopHeartbeat(manager);
  const jitter = Math.random();
  const initialDelay = Math.floor(options.interval * jitter);
  const interval = options.interval;
  const sendHeartbeat = () => {
    if (!manager.lastHeartbeatAck) {
      options.reconnectCallback();
      return;
    }
    manager.lastHeartbeatAck = false;
    manager.send({
      op: _types.GatewayOpcodes.Heartbeat,
      d: manager.sequence
    });
  };
  manager.firstHeartbeatTimeout = setTimeout(() => {
    sendHeartbeat();
    manager.heartbeatInterval = setInterval(sendHeartbeat, interval);
  }, initialDelay);
}
function stopHeartbeat(manager) {
  if (manager.firstHeartbeatTimeout) {
    clearTimeout(manager.firstHeartbeatTimeout);
    manager.firstHeartbeatTimeout = undefined;
  }
  if (manager.heartbeatInterval) {
    clearInterval(manager.heartbeatInterval);
    manager.heartbeatInterval = undefined;
  }
} /* v9-608988d6821ad04c */
