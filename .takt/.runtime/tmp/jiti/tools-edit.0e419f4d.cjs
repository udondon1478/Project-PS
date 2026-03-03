"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createEditTool = createEditTool;exports.editTool = void 0;var _typebox = require("@sinclair/typebox");
var _fs = require("fs");
var _promises = require("fs/promises");
var _editDiff = require("./edit-diff.js");
var _pathUtils = require("./path-utils.js");
const editSchema = _typebox.Type.Object({
  path: _typebox.Type.String({ description: "Path to the file to edit (relative or absolute)" }),
  oldText: _typebox.Type.String({ description: "Exact text to find and replace (must match exactly)" }),
  newText: _typebox.Type.String({ description: "New text to replace the old text with" })
});
const defaultEditOperations = {
  readFile: (path) => (0, _promises.readFile)(path),
  writeFile: (path, content) => (0, _promises.writeFile)(path, content, "utf-8"),
  access: (path) => (0, _promises.access)(path, _fs.constants.R_OK | _fs.constants.W_OK)
};
function createEditTool(cwd, options) {
  const ops = options?.operations ?? defaultEditOperations;
  return {
    name: "edit",
    label: "edit",
    description: "Edit a file by replacing exact text. The oldText must match exactly (including whitespace). Use this for precise, surgical edits.",
    parameters: editSchema,
    execute: async (_toolCallId, { path, oldText, newText }, signal) => {
      const absolutePath = (0, _pathUtils.resolveToCwd)(path, cwd);
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
        // Perform the edit operation
        (async () => {
          try {
            // Check if file exists
            try {
              await ops.access(absolutePath);
            }
            catch {
              if (signal) {
                signal.removeEventListener("abort", onAbort);
              }
              reject(new Error(`File not found: ${path}`));
              return;
            }
            // Check if aborted before reading
            if (aborted) {
              return;
            }
            // Read the file
            const buffer = await ops.readFile(absolutePath);
            const rawContent = buffer.toString("utf-8");
            // Check if aborted after reading
            if (aborted) {
              return;
            }
            // Strip BOM before matching (LLM won't include invisible BOM in oldText)
            const { bom, text: content } = (0, _editDiff.stripBom)(rawContent);
            const originalEnding = (0, _editDiff.detectLineEnding)(content);
            const normalizedContent = (0, _editDiff.normalizeToLF)(content);
            const normalizedOldText = (0, _editDiff.normalizeToLF)(oldText);
            const normalizedNewText = (0, _editDiff.normalizeToLF)(newText);
            // Find the old text using fuzzy matching (tries exact match first, then fuzzy)
            const matchResult = (0, _editDiff.fuzzyFindText)(normalizedContent, normalizedOldText);
            if (!matchResult.found) {
              if (signal) {
                signal.removeEventListener("abort", onAbort);
              }
              reject(new Error(`Could not find the exact text in ${path}. The old text must match exactly including all whitespace and newlines.`));
              return;
            }
            // Count occurrences using fuzzy-normalized content for consistency
            const fuzzyContent = (0, _editDiff.normalizeForFuzzyMatch)(normalizedContent);
            const fuzzyOldText = (0, _editDiff.normalizeForFuzzyMatch)(normalizedOldText);
            const occurrences = fuzzyContent.split(fuzzyOldText).length - 1;
            if (occurrences > 1) {
              if (signal) {
                signal.removeEventListener("abort", onAbort);
              }
              reject(new Error(`Found ${occurrences} occurrences of the text in ${path}. The text must be unique. Please provide more context to make it unique.`));
              return;
            }
            // Check if aborted before writing
            if (aborted) {
              return;
            }
            // Perform replacement using the matched text position
            // When fuzzy matching was used, contentForReplacement is the normalized version
            const baseContent = matchResult.contentForReplacement;
            const newContent = baseContent.substring(0, matchResult.index) +
            normalizedNewText +
            baseContent.substring(matchResult.index + matchResult.matchLength);
            // Verify the replacement actually changed something
            if (baseContent === newContent) {
              if (signal) {
                signal.removeEventListener("abort", onAbort);
              }
              reject(new Error(`No changes made to ${path}. The replacement produced identical content. This might indicate an issue with special characters or the text not existing as expected.`));
              return;
            }
            const finalContent = bom + (0, _editDiff.restoreLineEndings)(newContent, originalEnding);
            await ops.writeFile(absolutePath, finalContent);
            // Check if aborted after writing
            if (aborted) {
              return;
            }
            // Clean up abort handler
            if (signal) {
              signal.removeEventListener("abort", onAbort);
            }
            const diffResult = (0, _editDiff.generateDiffString)(baseContent, newContent);
            resolve({
              content: [
              {
                type: "text",
                text: `Successfully replaced text in ${path}.`
              }],

              details: { diff: diffResult.diff, firstChangedLine: diffResult.firstChangedLine }
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
/** Default edit tool using process.cwd() - for backwards compatibility */
const editTool = exports.editTool = createEditTool(process.cwd()); /* v9-68bd167f33f0b10c */
