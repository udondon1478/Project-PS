"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.clearActiveProgressLine = clearActiveProgressLine;exports.registerActiveProgressLine = registerActiveProgressLine;exports.unregisterActiveProgressLine = unregisterActiveProgressLine;let activeStream = null;
function registerActiveProgressLine(stream) {
  if (!stream.isTTY) {
    return;
  }
  activeStream = stream;
}
function clearActiveProgressLine() {
  if (!activeStream?.isTTY) {
    return;
  }
  activeStream.write("\r\x1b[2K");
}
function unregisterActiveProgressLine(stream) {
  if (!activeStream) {
    return;
  }
  if (stream && activeStream !== stream) {
    return;
  }
  activeStream = null;
} /* v9-60deba7d93a849ce */
