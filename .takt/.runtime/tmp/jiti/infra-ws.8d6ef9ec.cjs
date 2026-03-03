"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.rawDataToString = rawDataToString;var _nodeBuffer = require("node:buffer");
function rawDataToString(data, encoding = "utf8") {
  if (typeof data === "string") {
    return data;
  }
  if (_nodeBuffer.Buffer.isBuffer(data)) {
    return data.toString(encoding);
  }
  if (Array.isArray(data)) {
    return _nodeBuffer.Buffer.concat(data).toString(encoding);
  }
  if (data instanceof ArrayBuffer) {
    return _nodeBuffer.Buffer.from(data).toString(encoding);
  }
  return _nodeBuffer.Buffer.from(String(data)).toString(encoding);
} /* v9-34cf7201b86eaf44 */
