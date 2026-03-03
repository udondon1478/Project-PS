"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createLsTool = createLsTool;exports.lsTool = void 0;var _typebox = require("@sinclair/typebox");
var _fs = require("fs");
var _path = _interopRequireDefault(require("path"));
var _pathUtils = require("./path-utils.js");
var _truncate = require("./truncate.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const lsSchema = _typebox.Type.Object({
  path: _typebox.Type.Optional(_typebox.Type.String({ description: "Directory to list (default: current directory)" })),
  limit: _typebox.Type.Optional(_typebox.Type.Number({ description: "Maximum number of entries to return (default: 500)" }))
});
const DEFAULT_LIMIT = 500;
const defaultLsOperations = {
  exists: _fs.existsSync,
  stat: _fs.statSync,
  readdir: _fs.readdirSync
};
function createLsTool(cwd, options) {
  const ops = options?.operations ?? defaultLsOperations;
  return {
    name: "ls",
    label: "ls",
    description: `List directory contents. Returns entries sorted alphabetically, with '/' suffix for directories. Includes dotfiles. Output is truncated to ${DEFAULT_LIMIT} entries or ${_truncate.DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first).`,
    parameters: lsSchema,
    execute: async (_toolCallId, { path, limit }, signal) => {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(new Error("Operation aborted"));
          return;
        }
        const onAbort = () => reject(new Error("Operation aborted"));
        signal?.addEventListener("abort", onAbort, { once: true });
        (async () => {
          try {
            const dirPath = (0, _pathUtils.resolveToCwd)(path || ".", cwd);
            const effectiveLimit = limit ?? DEFAULT_LIMIT;
            // Check if path exists
            if (!(await ops.exists(dirPath))) {
              reject(new Error(`Path not found: ${dirPath}`));
              return;
            }
            // Check if path is a directory
            const stat = await ops.stat(dirPath);
            if (!stat.isDirectory()) {
              reject(new Error(`Not a directory: ${dirPath}`));
              return;
            }
            // Read directory entries
            let entries;
            try {
              entries = await ops.readdir(dirPath);
            }
            catch (e) {
              reject(new Error(`Cannot read directory: ${e.message}`));
              return;
            }
            // Sort alphabetically (case-insensitive)
            entries.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            // Format entries with directory indicators
            const results = [];
            let entryLimitReached = false;
            for (const entry of entries) {
              if (results.length >= effectiveLimit) {
                entryLimitReached = true;
                break;
              }
              const fullPath = _path.default.join(dirPath, entry);
              let suffix = "";
              try {
                const entryStat = await ops.stat(fullPath);
                if (entryStat.isDirectory()) {
                  suffix = "/";
                }
              }
              catch {
                // Skip entries we can't stat
                continue;
              }
              results.push(entry + suffix);
            }
            signal?.removeEventListener("abort", onAbort);
            if (results.length === 0) {
              resolve({ content: [{ type: "text", text: "(empty directory)" }], details: undefined });
              return;
            }
            // Apply byte truncation (no line limit since we already have entry limit)
            const rawOutput = results.join("\n");
            const truncation = (0, _truncate.truncateHead)(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });
            let output = truncation.content;
            const details = {};
            // Build notices
            const notices = [];
            if (entryLimitReached) {
              notices.push(`${effectiveLimit} entries limit reached. Use limit=${effectiveLimit * 2} for more`);
              details.entryLimitReached = effectiveLimit;
            }
            if (truncation.truncated) {
              notices.push(`${(0, _truncate.formatSize)(_truncate.DEFAULT_MAX_BYTES)} limit reached`);
              details.truncation = truncation;
            }
            if (notices.length > 0) {
              output += `\n\n[${notices.join(". ")}]`;
            }
            resolve({
              content: [{ type: "text", text: output }],
              details: Object.keys(details).length > 0 ? details : undefined
            });
          }
          catch (e) {
            signal?.removeEventListener("abort", onAbort);
            reject(e);
          }
        })();
      });
    }
  };
}
/** Default ls tool using process.cwd() - for backwards compatibility */
const lsTool = exports.lsTool = createLsTool(process.cwd()); /* v9-13561cd9c1c3963a */
