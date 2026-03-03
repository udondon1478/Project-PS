"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.splitSdkTools = splitSdkTools;var _piToolDefinitionAdapter = require("../pi-tool-definition-adapter.js");
function splitSdkTools(options) {
  const { tools } = options;
  return {
    builtInTools: [],
    customTools: (0, _piToolDefinitionAdapter.toToolDefinitions)(tools)
  };
} /* v9-9a8fe048aa94185e */
