"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "DEFAULT_MAX_BYTES", { enumerable: true, get: function () {return _truncate.DEFAULT_MAX_BYTES;} });Object.defineProperty(exports, "DEFAULT_MAX_LINES", { enumerable: true, get: function () {return _truncate.DEFAULT_MAX_LINES;} });exports.allTools = void 0;Object.defineProperty(exports, "bashTool", { enumerable: true, get: function () {return _bash.bashTool;} });exports.codingTools = void 0;exports.createAllTools = createAllTools;Object.defineProperty(exports, "createBashTool", { enumerable: true, get: function () {return _bash.createBashTool;} });exports.createCodingTools = createCodingTools;Object.defineProperty(exports, "createEditTool", { enumerable: true, get: function () {return _edit.createEditTool;} });Object.defineProperty(exports, "createFindTool", { enumerable: true, get: function () {return _find.createFindTool;} });Object.defineProperty(exports, "createGrepTool", { enumerable: true, get: function () {return _grep.createGrepTool;} });Object.defineProperty(exports, "createLsTool", { enumerable: true, get: function () {return _ls.createLsTool;} });exports.createReadOnlyTools = createReadOnlyTools;Object.defineProperty(exports, "createReadTool", { enumerable: true, get: function () {return _read.createReadTool;} });Object.defineProperty(exports, "createWriteTool", { enumerable: true, get: function () {return _write.createWriteTool;} });Object.defineProperty(exports, "editTool", { enumerable: true, get: function () {return _edit.editTool;} });Object.defineProperty(exports, "findTool", { enumerable: true, get: function () {return _find.findTool;} });Object.defineProperty(exports, "formatSize", { enumerable: true, get: function () {return _truncate.formatSize;} });Object.defineProperty(exports, "grepTool", { enumerable: true, get: function () {return _grep.grepTool;} });Object.defineProperty(exports, "lsTool", { enumerable: true, get: function () {return _ls.lsTool;} });exports.readOnlyTools = void 0;Object.defineProperty(exports, "readTool", { enumerable: true, get: function () {return _read.readTool;} });Object.defineProperty(exports, "truncateHead", { enumerable: true, get: function () {return _truncate.truncateHead;} });Object.defineProperty(exports, "truncateLine", { enumerable: true, get: function () {return _truncate.truncateLine;} });Object.defineProperty(exports, "truncateTail", { enumerable: true, get: function () {return _truncate.truncateTail;} });Object.defineProperty(exports, "writeTool", { enumerable: true, get: function () {return _write.writeTool;} });var _bash = require("./bash.js");
var _edit = require("./edit.js");
var _find = require("./find.js");
var _grep = require("./grep.js");
var _ls = require("./ls.js");
var _read = require("./read.js");
var _truncate = require("./truncate.js");
var _write = require("./write.js");







// Default tools for full access mode (using process.cwd())
const codingTools = exports.codingTools = [_read.readTool, _bash.bashTool, _edit.editTool, _write.writeTool];
// Read-only tools for exploration without modification (using process.cwd())
const readOnlyTools = exports.readOnlyTools = [_read.readTool, _grep.grepTool, _find.findTool, _ls.lsTool];
// All available tools (using process.cwd())
const allTools = exports.allTools = {
  read: _read.readTool,
  bash: _bash.bashTool,
  edit: _edit.editTool,
  write: _write.writeTool,
  grep: _grep.grepTool,
  find: _find.findTool,
  ls: _ls.lsTool
};
/**
 * Create coding tools configured for a specific working directory.
 */
function createCodingTools(cwd, options) {
  return [
  (0, _read.createReadTool)(cwd, options?.read),
  (0, _bash.createBashTool)(cwd, options?.bash),
  (0, _edit.createEditTool)(cwd),
  (0, _write.createWriteTool)(cwd)];

}
/**
 * Create read-only tools configured for a specific working directory.
 */
function createReadOnlyTools(cwd, options) {
  return [(0, _read.createReadTool)(cwd, options?.read), (0, _grep.createGrepTool)(cwd), (0, _find.createFindTool)(cwd), (0, _ls.createLsTool)(cwd)];
}
/**
 * Create all tools configured for a specific working directory.
 */
function createAllTools(cwd, options) {
  return {
    read: (0, _read.createReadTool)(cwd, options?.read),
    bash: (0, _bash.createBashTool)(cwd, options?.bash),
    edit: (0, _edit.createEditTool)(cwd),
    write: (0, _write.createWriteTool)(cwd),
    grep: (0, _grep.createGrepTool)(cwd),
    find: (0, _find.createFindTool)(cwd),
    ls: (0, _ls.createLsTool)(cwd)
  };
} /* v9-4b456390a2a02210 */
