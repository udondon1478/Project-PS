"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createFindTool = createFindTool;exports.findTool = void 0;var _typebox = require("@sinclair/typebox");
var _child_process = require("child_process");
var _fs = require("fs");
var _glob = require("glob");
var _path = _interopRequireDefault(require("path"));
var _toolsManager = require("../../utils/tools-manager.js");
var _pathUtils = require("./path-utils.js");
var _truncate = require("./truncate.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const findSchema = _typebox.Type.Object({
  pattern: _typebox.Type.String({
    description: "Glob pattern to match files, e.g. '*.ts', '**/*.json', or 'src/**/*.spec.ts'"
  }),
  path: _typebox.Type.Optional(_typebox.Type.String({ description: "Directory to search in (default: current directory)" })),
  limit: _typebox.Type.Optional(_typebox.Type.Number({ description: "Maximum number of results (default: 1000)" }))
});
const DEFAULT_LIMIT = 1000;
const defaultFindOperations = {
  exists: _fs.existsSync,
  glob: (_pattern, _searchCwd, _options) => {
    // This is a placeholder - actual fd execution happens in execute
    return [];
  }
};
function createFindTool(cwd, options) {
  const customOps = options?.operations;
  return {
    name: "find",
    label: "find",
    description: `Search for files by glob pattern. Returns matching file paths relative to the search directory. Respects .gitignore. Output is truncated to ${DEFAULT_LIMIT} results or ${_truncate.DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first).`,
    parameters: findSchema,
    execute: async (_toolCallId, { pattern, path: searchDir, limit }, signal) => {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(new Error("Operation aborted"));
          return;
        }
        const onAbort = () => reject(new Error("Operation aborted"));
        signal?.addEventListener("abort", onAbort, { once: true });
        (async () => {
          try {
            const searchPath = (0, _pathUtils.resolveToCwd)(searchDir || ".", cwd);
            const effectiveLimit = limit ?? DEFAULT_LIMIT;
            const ops = customOps ?? defaultFindOperations;
            // If custom operations provided with glob, use that
            if (customOps?.glob) {
              if (!(await ops.exists(searchPath))) {
                reject(new Error(`Path not found: ${searchPath}`));
                return;
              }
              const results = await ops.glob(pattern, searchPath, {
                ignore: ["**/node_modules/**", "**/.git/**"],
                limit: effectiveLimit
              });
              signal?.removeEventListener("abort", onAbort);
              if (results.length === 0) {
                resolve({
                  content: [{ type: "text", text: "No files found matching pattern" }],
                  details: undefined
                });
                return;
              }
              // Relativize paths
              const relativized = results.map((p) => {
                if (p.startsWith(searchPath)) {
                  return p.slice(searchPath.length + 1);
                }
                return _path.default.relative(searchPath, p);
              });
              const resultLimitReached = relativized.length >= effectiveLimit;
              const rawOutput = relativized.join("\n");
              const truncation = (0, _truncate.truncateHead)(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });
              let resultOutput = truncation.content;
              const details = {};
              const notices = [];
              if (resultLimitReached) {
                notices.push(`${effectiveLimit} results limit reached`);
                details.resultLimitReached = effectiveLimit;
              }
              if (truncation.truncated) {
                notices.push(`${(0, _truncate.formatSize)(_truncate.DEFAULT_MAX_BYTES)} limit reached`);
                details.truncation = truncation;
              }
              if (notices.length > 0) {
                resultOutput += `\n\n[${notices.join(". ")}]`;
              }
              resolve({
                content: [{ type: "text", text: resultOutput }],
                details: Object.keys(details).length > 0 ? details : undefined
              });
              return;
            }
            // Default: use fd
            const fdPath = await (0, _toolsManager.ensureTool)("fd", true);
            if (!fdPath) {
              reject(new Error("fd is not available and could not be downloaded"));
              return;
            }
            // Build fd arguments
            const args = [
            "--glob",
            "--color=never",
            "--hidden",
            "--max-results",
            String(effectiveLimit)];

            // Include .gitignore files
            const gitignoreFiles = new Set();
            const rootGitignore = _path.default.join(searchPath, ".gitignore");
            if ((0, _fs.existsSync)(rootGitignore)) {
              gitignoreFiles.add(rootGitignore);
            }
            try {
              const nestedGitignores = (0, _glob.globSync)("**/.gitignore", {
                cwd: searchPath,
                dot: true,
                absolute: true,
                ignore: ["**/node_modules/**", "**/.git/**"]
              });
              for (const file of nestedGitignores) {
                gitignoreFiles.add(file);
              }
            }
            catch {

              // Ignore glob errors
            }for (const gitignorePath of gitignoreFiles) {
              args.push("--ignore-file", gitignorePath);
            }
            args.push(pattern, searchPath);
            const result = (0, _child_process.spawnSync)(fdPath, args, {
              encoding: "utf-8",
              maxBuffer: 10 * 1024 * 1024
            });
            signal?.removeEventListener("abort", onAbort);
            if (result.error) {
              reject(new Error(`Failed to run fd: ${result.error.message}`));
              return;
            }
            const output = result.stdout?.trim() || "";
            if (result.status !== 0) {
              const errorMsg = result.stderr?.trim() || `fd exited with code ${result.status}`;
              if (!output) {
                reject(new Error(errorMsg));
                return;
              }
            }
            if (!output) {
              resolve({
                content: [{ type: "text", text: "No files found matching pattern" }],
                details: undefined
              });
              return;
            }
            const lines = output.split("\n");
            const relativized = [];
            for (const rawLine of lines) {
              const line = rawLine.replace(/\r$/, "").trim();
              if (!line)
              continue;
              const hadTrailingSlash = line.endsWith("/") || line.endsWith("\\");
              let relativePath = line;
              if (line.startsWith(searchPath)) {
                relativePath = line.slice(searchPath.length + 1);
              } else
              {
                relativePath = _path.default.relative(searchPath, line);
              }
              if (hadTrailingSlash && !relativePath.endsWith("/")) {
                relativePath += "/";
              }
              relativized.push(relativePath);
            }
            const resultLimitReached = relativized.length >= effectiveLimit;
            const rawOutput = relativized.join("\n");
            const truncation = (0, _truncate.truncateHead)(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });
            let resultOutput = truncation.content;
            const details = {};
            const notices = [];
            if (resultLimitReached) {
              notices.push(`${effectiveLimit} results limit reached. Use limit=${effectiveLimit * 2} for more, or refine pattern`);
              details.resultLimitReached = effectiveLimit;
            }
            if (truncation.truncated) {
              notices.push(`${(0, _truncate.formatSize)(_truncate.DEFAULT_MAX_BYTES)} limit reached`);
              details.truncation = truncation;
            }
            if (notices.length > 0) {
              resultOutput += `\n\n[${notices.join(". ")}]`;
            }
            resolve({
              content: [{ type: "text", text: resultOutput }],
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
/** Default find tool using process.cwd() - for backwards compatibility */
const findTool = exports.findTool = createFindTool(process.cwd()); /* v9-2885998262e5782f */
