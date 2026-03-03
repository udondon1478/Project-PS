"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createWriteTool = createWriteTool;exports.writeTool = void 0;var _typebox = require("@sinclair/typebox");
var _promises = require("fs/promises");
var _path = require("path");
var _pathUtils = require("./path-utils.js");
const writeSchema = _typebox.Type.Object({
  path: _typebox.Type.String({ description: "Path to the file to write (relative or absolute)" }),
  content: _typebox.Type.String({ description: "Content to write to the file" })
});
const defaultWriteOperations = {
  writeFile: (path, content) => (0, _promises.writeFile)(path, content, "utf-8"),
  mkdir: (dir) => (0, _promises.mkdir)(dir, { recursive: true }).then(() => {})
};
function createWriteTool(cwd, options) {
  const ops = options?.operations ?? defaultWriteOperations;
  return {
    name: "write",
    label: "write",
    description: "Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Automatically creates parent directories.",
    parameters: writeSchema,
    execute: async (_toolCallId, { path, content }, signal) => {
      const absolutePath = (0, _pathUtils.resolveToCwd)(path, cwd);
      const dir = (0, _path.dirname)(absolutePath);
      return new Promise((resolve, reject) => {
        // Check if already aborted
        if (signal?.aborted) {
          reject(new Error("Operation aborted"));
          return;
        }
        let aborted = false;
        // Set up abort handler
        const onAbort = () => {
          aborted = true;
          reject(new Error("Operation aborted"));
        };
        if (signal) {
          signal.addEventListener("abort", onAbort, { once: true });
        }
        // Perform the write operation
        (async () => {
          try {
            // Create parent directories if needed
            await ops.mkdir(dir);
            // Check if aborted before writing
            if (aborted) {
              return;
            }
            // Write the file
            await ops.writeFile(absolutePath, content);
            // Check if aborted after writing
            if (aborted) {
              return;
            }
            // Clean up abort handler
            if (signal) {
              signal.removeEventListener("abort", onAbort);
            }
            resolve({
              content: [{ type: "text", text: `Successfully wrote ${content.length} bytes to ${path}` }],
              details: undefined
            });
          }
          catch (error) {
            // Clean up abort handler
            if (signal) {
              signal.removeEventListener("abort", onAbort);
            }
            if (!aborted) {
              reject(error);
            }
          }
        })();
      });
    }
  };
}
/** Default write tool using process.cwd() - for backwards compatibility */
const writeTool = exports.writeTool = createWriteTool(process.cwd()); /* v9-cae225e8fb3b5894 */
