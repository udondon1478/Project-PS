"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ToolExecutionComponent = void 0;var os = _interopRequireWildcard(require("node:os"));
var _piTui = require("@mariozechner/pi-tui");
var _stripAnsi = _interopRequireDefault(require("strip-ansi"));
var _editDiff = require("../../../core/tools/edit-diff.js");
var _index = require("../../../core/tools/index.js");
var _truncate = require("../../../core/tools/truncate.js");
var _imageConvert = require("../../../utils/image-convert.js");
var _shell = require("../../../utils/shell.js");
var _theme = require("../theme/theme.js");
var _diff = require("./diff.js");
var _keybindingHints = require("./keybinding-hints.js");
var _visualTruncate = require("./visual-truncate.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
// Preview line limit for bash when not expanded
const BASH_PREVIEW_LINES = 5;
/**
 * Convert absolute path to tilde notation if it's in home directory
 */
function shortenPath(path) {
  const home = os.homedir();
  if (path.startsWith(home)) {
    return `~${path.slice(home.length)}`;
  }
  return path;
}
/**
 * Replace tabs with spaces for consistent rendering
 */
function replaceTabs(text) {
  return text.replace(/\t/g, "   ");
}
/**
 * Component that renders a tool call with its result (updateable)
 */
class ToolExecutionComponent extends _piTui.Container {
  contentBox; // Used for custom tools and bash visual truncation
  contentText; // For built-in tools (with its own padding/bg)
  imageComponents = [];
  imageSpacers = [];
  toolName;
  args;
  expanded = false;
  showImages;
  isPartial = true;
  toolDefinition;
  ui;
  cwd;
  result;
  // Cached edit diff preview (computed when args arrive, before tool executes)
  editDiffPreview;
  editDiffArgsKey; // Track which args the preview is for
  // Cached converted images for Kitty protocol (which requires PNG), keyed by index
  convertedImages = new Map();
  constructor(toolName, args, options = {}, toolDefinition, ui, cwd = process.cwd()) {
    super();
    this.toolName = toolName;
    this.args = args;
    this.showImages = options.showImages ?? true;
    this.toolDefinition = toolDefinition;
    this.ui = ui;
    this.cwd = cwd;
    this.addChild(new _piTui.Spacer(1));
    // Always create both - contentBox for custom tools/bash, contentText for other built-ins
    this.contentBox = new _piTui.Box(1, 1, (text) => _theme.theme.bg("toolPendingBg", text));
    this.contentText = new _piTui.Text("", 1, 1, (text) => _theme.theme.bg("toolPendingBg", text));
    // Use contentBox for bash (visual truncation) or custom tools with custom renderers
    // Use contentText for built-in tools (including overrides without custom renderers)
    if (toolName === "bash" || toolDefinition && !this.shouldUseBuiltInRenderer()) {
      this.addChild(this.contentBox);
    } else
    {
      this.addChild(this.contentText);
    }
    this.updateDisplay();
  }
  /**
   * Check if we should use built-in rendering for this tool.
   * Returns true if the tool name is a built-in AND either there's no toolDefinition
   * or the toolDefinition doesn't provide custom renderers.
   */
  shouldUseBuiltInRenderer() {
    const isBuiltInName = this.toolName in _index.allTools;
    const hasCustomRenderers = this.toolDefinition?.renderCall || this.toolDefinition?.renderResult;
    return isBuiltInName && !hasCustomRenderers;
  }
  updateArgs(args) {
    this.args = args;
    this.updateDisplay();
  }
  /**
   * Signal that args are complete (tool is about to execute).
   * This triggers diff computation for edit tool.
   */
  setArgsComplete() {
    this.maybeComputeEditDiff();
  }
  /**
   * Compute edit diff preview when we have complete args.
   * This runs async and updates display when done.
   */
  maybeComputeEditDiff() {
    if (this.toolName !== "edit")
    return;
    const path = this.args?.path;
    const oldText = this.args?.oldText;
    const newText = this.args?.newText;
    // Need all three params to compute diff
    if (!path || oldText === undefined || newText === undefined)
    return;
    // Create a key to track which args this computation is for
    const argsKey = JSON.stringify({ path, oldText, newText });
    // Skip if we already computed for these exact args
    if (this.editDiffArgsKey === argsKey)
    return;
    this.editDiffArgsKey = argsKey;
    // Compute diff async
    (0, _editDiff.computeEditDiff)(path, oldText, newText, this.cwd).then((result) => {
      // Only update if args haven't changed since we started
      if (this.editDiffArgsKey === argsKey) {
        this.editDiffPreview = result;
        this.updateDisplay();
        this.ui.requestRender();
      }
    });
  }
  updateResult(result, isPartial = false) {
    this.result = result;
    this.isPartial = isPartial;
    this.updateDisplay();
    // Convert non-PNG images to PNG for Kitty protocol (async)
    this.maybeConvertImagesForKitty();
  }
  /**
   * Convert non-PNG images to PNG for Kitty graphics protocol.
   * Kitty requires PNG format (f=100), so JPEG/GIF/WebP won't display.
   */
  maybeConvertImagesForKitty() {
    const caps = (0, _piTui.getCapabilities)();
    // Only needed for Kitty protocol
    if (caps.images !== "kitty")
    return;
    if (!this.result)
    return;
    const imageBlocks = this.result.content?.filter((c) => c.type === "image") || [];
    for (let i = 0; i < imageBlocks.length; i++) {
      const img = imageBlocks[i];
      if (!img.data || !img.mimeType)
      continue;
      // Skip if already PNG or already converted
      if (img.mimeType === "image/png")
      continue;
      if (this.convertedImages.has(i))
      continue;
      // Convert async
      const index = i;
      (0, _imageConvert.convertToPng)(img.data, img.mimeType).then((converted) => {
        if (converted) {
          this.convertedImages.set(index, converted);
          this.updateDisplay();
          this.ui.requestRender();
        }
      });
    }
  }
  setExpanded(expanded) {
    this.expanded = expanded;
    this.updateDisplay();
  }
  setShowImages(show) {
    this.showImages = show;
    this.updateDisplay();
  }
  invalidate() {
    super.invalidate();
    this.updateDisplay();
  }
  updateDisplay() {
    // Set background based on state
    const bgFn = this.isPartial ?
    (text) => _theme.theme.bg("toolPendingBg", text) :
    this.result?.isError ?
    (text) => _theme.theme.bg("toolErrorBg", text) :
    (text) => _theme.theme.bg("toolSuccessBg", text);
    // Use built-in rendering for built-in tools (or overrides without custom renderers)
    if (this.shouldUseBuiltInRenderer()) {
      if (this.toolName === "bash") {
        // Bash uses Box with visual line truncation
        this.contentBox.setBgFn(bgFn);
        this.contentBox.clear();
        this.renderBashContent();
      } else
      {
        // Other built-in tools: use Text directly with caching
        this.contentText.setCustomBgFn(bgFn);
        this.contentText.setText(this.formatToolExecution());
      }
    } else
    if (this.toolDefinition) {
      // Custom tools use Box for flexible component rendering
      this.contentBox.setBgFn(bgFn);
      this.contentBox.clear();
      // Render call component
      if (this.toolDefinition.renderCall) {
        try {
          const callComponent = this.toolDefinition.renderCall(this.args, _theme.theme);
          if (callComponent) {
            this.contentBox.addChild(callComponent);
          }
        }
        catch {
          // Fall back to default on error
          this.contentBox.addChild(new _piTui.Text(_theme.theme.fg("toolTitle", _theme.theme.bold(this.toolName)), 0, 0));
        }
      } else
      {
        // No custom renderCall, show tool name
        this.contentBox.addChild(new _piTui.Text(_theme.theme.fg("toolTitle", _theme.theme.bold(this.toolName)), 0, 0));
      }
      // Render result component if we have a result
      if (this.result && this.toolDefinition.renderResult) {
        try {
          const resultComponent = this.toolDefinition.renderResult({ content: this.result.content, details: this.result.details }, { expanded: this.expanded, isPartial: this.isPartial }, _theme.theme);
          if (resultComponent) {
            this.contentBox.addChild(resultComponent);
          }
        }
        catch {
          // Fall back to showing raw output on error
          const output = this.getTextOutput();
          if (output) {
            this.contentBox.addChild(new _piTui.Text(_theme.theme.fg("toolOutput", output), 0, 0));
          }
        }
      } else
      if (this.result) {
        // Has result but no custom renderResult
        const output = this.getTextOutput();
        if (output) {
          this.contentBox.addChild(new _piTui.Text(_theme.theme.fg("toolOutput", output), 0, 0));
        }
      }
    }
    // Handle images (same for both custom and built-in)
    for (const img of this.imageComponents) {
      this.removeChild(img);
    }
    this.imageComponents = [];
    for (const spacer of this.imageSpacers) {
      this.removeChild(spacer);
    }
    this.imageSpacers = [];
    if (this.result) {
      const imageBlocks = this.result.content?.filter((c) => c.type === "image") || [];
      const caps = (0, _piTui.getCapabilities)();
      for (let i = 0; i < imageBlocks.length; i++) {
        const img = imageBlocks[i];
        if (caps.images && this.showImages && img.data && img.mimeType) {
          // Use converted PNG for Kitty protocol if available
          const converted = this.convertedImages.get(i);
          const imageData = converted?.data ?? img.data;
          const imageMimeType = converted?.mimeType ?? img.mimeType;
          // For Kitty, skip non-PNG images that haven't been converted yet
          if (caps.images === "kitty" && imageMimeType !== "image/png") {
            continue;
          }
          const spacer = new _piTui.Spacer(1);
          this.addChild(spacer);
          this.imageSpacers.push(spacer);
          const imageComponent = new _piTui.Image(imageData, imageMimeType, { fallbackColor: (s) => _theme.theme.fg("toolOutput", s) }, { maxWidthCells: 60 });
          this.imageComponents.push(imageComponent);
          this.addChild(imageComponent);
        }
      }
    }
  }
  /**
   * Render bash content using visual line truncation (like bash-execution.ts)
   */
  renderBashContent() {
    const command = this.args?.command || "";
    const timeout = this.args?.timeout;
    // Header
    const timeoutSuffix = timeout ? _theme.theme.fg("muted", ` (timeout ${timeout}s)`) : "";
    this.contentBox.addChild(new _piTui.Text(_theme.theme.fg("toolTitle", _theme.theme.bold(`$ ${command || _theme.theme.fg("toolOutput", "...")}`)) + timeoutSuffix, 0, 0));
    if (this.result) {
      const output = this.getTextOutput().trim();
      if (output) {
        // Style each line for the output
        const styledOutput = output.
        split("\n").
        map((line) => _theme.theme.fg("toolOutput", line)).
        join("\n");
        if (this.expanded) {
          // Show all lines when expanded
          this.contentBox.addChild(new _piTui.Text(`\n${styledOutput}`, 0, 0));
        } else
        {
          // Use visual line truncation when collapsed with width-aware caching
          let cachedWidth;
          let cachedLines;
          let cachedSkipped;
          this.contentBox.addChild({
            render: (width) => {
              if (cachedLines === undefined || cachedWidth !== width) {
                const result = (0, _visualTruncate.truncateToVisualLines)(styledOutput, BASH_PREVIEW_LINES, width);
                cachedLines = result.visualLines;
                cachedSkipped = result.skippedCount;
                cachedWidth = width;
              }
              if (cachedSkipped && cachedSkipped > 0) {
                const hint = _theme.theme.fg("muted", `... (${cachedSkipped} earlier lines,`) +
                ` ${(0, _keybindingHints.keyHint)("expandTools", "to expand")})`;
                return ["", (0, _piTui.truncateToWidth)(hint, width, "..."), ...cachedLines];
              }
              // Add blank line for spacing (matches expanded case)
              return ["", ...cachedLines];
            },
            invalidate: () => {
              cachedWidth = undefined;
              cachedLines = undefined;
              cachedSkipped = undefined;
            }
          });
        }
      }
      // Truncation warnings
      const truncation = this.result.details?.truncation;
      const fullOutputPath = this.result.details?.fullOutputPath;
      if (truncation?.truncated || fullOutputPath) {
        const warnings = [];
        if (fullOutputPath) {
          warnings.push(`Full output: ${fullOutputPath}`);
        }
        if (truncation?.truncated) {
          if (truncation.truncatedBy === "lines") {
            warnings.push(`Truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines`);
          } else
          {
            warnings.push(`Truncated: ${truncation.outputLines} lines shown (${(0, _truncate.formatSize)(truncation.maxBytes ?? _truncate.DEFAULT_MAX_BYTES)} limit)`);
          }
        }
        this.contentBox.addChild(new _piTui.Text(`\n${_theme.theme.fg("warning", `[${warnings.join(". ")}]`)}`, 0, 0));
      }
    }
  }
  getTextOutput() {
    if (!this.result)
    return "";
    const textBlocks = this.result.content?.filter((c) => c.type === "text") || [];
    const imageBlocks = this.result.content?.filter((c) => c.type === "image") || [];
    let output = textBlocks.
    map((c) => {
      // Use sanitizeBinaryOutput to handle binary data that crashes string-width
      return (0, _shell.sanitizeBinaryOutput)((0, _stripAnsi.default)(c.text || "")).replace(/\r/g, "");
    }).
    join("\n");
    const caps = (0, _piTui.getCapabilities)();
    if (imageBlocks.length > 0 && (!caps.images || !this.showImages)) {
      const imageIndicators = imageBlocks.
      map((img) => {
        const dims = img.data ? (0, _piTui.getImageDimensions)(img.data, img.mimeType) ?? undefined : undefined;
        return (0, _piTui.imageFallback)(img.mimeType, dims);
      }).
      join("\n");
      output = output ? `${output}\n${imageIndicators}` : imageIndicators;
    }
    return output;
  }
  formatToolExecution() {
    let text = "";
    if (this.toolName === "read") {
      const path = shortenPath(this.args?.file_path || this.args?.path || "");
      const offset = this.args?.offset;
      const limit = this.args?.limit;
      let pathDisplay = path ? _theme.theme.fg("accent", path) : _theme.theme.fg("toolOutput", "...");
      if (offset !== undefined || limit !== undefined) {
        const startLine = offset ?? 1;
        const endLine = limit !== undefined ? startLine + limit - 1 : "";
        pathDisplay += _theme.theme.fg("warning", `:${startLine}${endLine ? `-${endLine}` : ""}`);
      }
      text = `${_theme.theme.fg("toolTitle", _theme.theme.bold("read"))} ${pathDisplay}`;
      if (this.result) {
        const output = this.getTextOutput();
        const rawPath = this.args?.file_path || this.args?.path || "";
        const lang = (0, _theme.getLanguageFromPath)(rawPath);
        const lines = lang ? (0, _theme.highlightCode)(replaceTabs(output), lang) : output.split("\n");
        const maxLines = this.expanded ? lines.length : 10;
        const displayLines = lines.slice(0, maxLines);
        const remaining = lines.length - maxLines;
        text +=
        "\n\n" +
        displayLines.
        map((line) => lang ? replaceTabs(line) : _theme.theme.fg("toolOutput", replaceTabs(line))).
        join("\n");
        if (remaining > 0) {
          text += `${_theme.theme.fg("muted", `\n... (${remaining} more lines,`)} ${(0, _keybindingHints.keyHint)("expandTools", "to expand")})`;
        }
        const truncation = this.result.details?.truncation;
        if (truncation?.truncated) {
          if (truncation.firstLineExceedsLimit) {
            text +=
            "\n" +
            _theme.theme.fg("warning", `[First line exceeds ${(0, _truncate.formatSize)(truncation.maxBytes ?? _truncate.DEFAULT_MAX_BYTES)} limit]`);
          } else
          if (truncation.truncatedBy === "lines") {
            text +=
            "\n" +
            _theme.theme.fg("warning", `[Truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines (${truncation.maxLines ?? _truncate.DEFAULT_MAX_LINES} line limit)]`);
          } else
          {
            text +=
            "\n" +
            _theme.theme.fg("warning", `[Truncated: ${truncation.outputLines} lines shown (${(0, _truncate.formatSize)(truncation.maxBytes ?? _truncate.DEFAULT_MAX_BYTES)} limit)]`);
          }
        }
      }
    } else
    if (this.toolName === "write") {
      const rawPath = this.args?.file_path || this.args?.path || "";
      const path = shortenPath(rawPath);
      const fileContent = this.args?.content || "";
      const lang = (0, _theme.getLanguageFromPath)(rawPath);
      const lines = fileContent ?
      lang ?
      (0, _theme.highlightCode)(replaceTabs(fileContent), lang) :
      fileContent.split("\n") :
      [];
      const totalLines = lines.length;
      text =
      _theme.theme.fg("toolTitle", _theme.theme.bold("write")) +
      " " + (
      path ? _theme.theme.fg("accent", path) : _theme.theme.fg("toolOutput", "..."));
      if (fileContent) {
        const maxLines = this.expanded ? lines.length : 10;
        const displayLines = lines.slice(0, maxLines);
        const remaining = lines.length - maxLines;
        text +=
        "\n\n" +
        displayLines.
        map((line) => lang ? replaceTabs(line) : _theme.theme.fg("toolOutput", replaceTabs(line))).
        join("\n");
        if (remaining > 0) {
          text +=
          _theme.theme.fg("muted", `\n... (${remaining} more lines, ${totalLines} total,`) +
          ` ${(0, _keybindingHints.keyHint)("expandTools", "to expand")})`;
        }
      }
      // Show error if tool execution failed
      if (this.result?.isError) {
        const errorText = this.getTextOutput();
        if (errorText) {
          text += `\n\n${_theme.theme.fg("error", errorText)}`;
        }
      }
    } else
    if (this.toolName === "edit") {
      const rawPath = this.args?.file_path || this.args?.path || "";
      const path = shortenPath(rawPath);
      // Build path display, appending :line if we have diff info
      let pathDisplay = path ? _theme.theme.fg("accent", path) : _theme.theme.fg("toolOutput", "...");
      const firstChangedLine = (this.editDiffPreview && "firstChangedLine" in this.editDiffPreview ?
      this.editDiffPreview.firstChangedLine :
      undefined) || (
      this.result && !this.result.isError ? this.result.details?.firstChangedLine : undefined);
      if (firstChangedLine) {
        pathDisplay += _theme.theme.fg("warning", `:${firstChangedLine}`);
      }
      text = `${_theme.theme.fg("toolTitle", _theme.theme.bold("edit"))} ${pathDisplay}`;
      if (this.result?.isError) {
        // Show error from result
        const errorText = this.getTextOutput();
        if (errorText) {
          text += `\n\n${_theme.theme.fg("error", errorText)}`;
        }
      } else
      if (this.result?.details?.diff) {
        // Tool executed successfully - use the diff from result
        // This takes priority over editDiffPreview which may have a stale error
        // due to race condition (async preview computed after file was modified)
        text += `\n\n${(0, _diff.renderDiff)(this.result.details.diff, { filePath: rawPath })}`;
      } else
      if (this.editDiffPreview) {
        // Use cached diff preview (before tool executes)
        if ("error" in this.editDiffPreview) {
          text += `\n\n${_theme.theme.fg("error", this.editDiffPreview.error)}`;
        } else
        if (this.editDiffPreview.diff) {
          text += `\n\n${(0, _diff.renderDiff)(this.editDiffPreview.diff, { filePath: rawPath })}`;
        }
      }
    } else
    if (this.toolName === "ls") {
      const path = shortenPath(this.args?.path || ".");
      const limit = this.args?.limit;
      text = `${_theme.theme.fg("toolTitle", _theme.theme.bold("ls"))} ${_theme.theme.fg("accent", path)}`;
      if (limit !== undefined) {
        text += _theme.theme.fg("toolOutput", ` (limit ${limit})`);
      }
      if (this.result) {
        const output = this.getTextOutput().trim();
        if (output) {
          const lines = output.split("\n");
          const maxLines = this.expanded ? lines.length : 20;
          const displayLines = lines.slice(0, maxLines);
          const remaining = lines.length - maxLines;
          text += `\n\n${displayLines.map((line) => _theme.theme.fg("toolOutput", line)).join("\n")}`;
          if (remaining > 0) {
            text += `${_theme.theme.fg("muted", `\n... (${remaining} more lines,`)} ${(0, _keybindingHints.keyHint)("expandTools", "to expand")})`;
          }
        }
        const entryLimit = this.result.details?.entryLimitReached;
        const truncation = this.result.details?.truncation;
        if (entryLimit || truncation?.truncated) {
          const warnings = [];
          if (entryLimit) {
            warnings.push(`${entryLimit} entries limit`);
          }
          if (truncation?.truncated) {
            warnings.push(`${(0, _truncate.formatSize)(truncation.maxBytes ?? _truncate.DEFAULT_MAX_BYTES)} limit`);
          }
          text += `\n${_theme.theme.fg("warning", `[Truncated: ${warnings.join(", ")}]`)}`;
        }
      }
    } else
    if (this.toolName === "find") {
      const pattern = this.args?.pattern || "";
      const path = shortenPath(this.args?.path || ".");
      const limit = this.args?.limit;
      text =
      _theme.theme.fg("toolTitle", _theme.theme.bold("find")) +
      " " +
      _theme.theme.fg("accent", pattern) +
      _theme.theme.fg("toolOutput", ` in ${path}`);
      if (limit !== undefined) {
        text += _theme.theme.fg("toolOutput", ` (limit ${limit})`);
      }
      if (this.result) {
        const output = this.getTextOutput().trim();
        if (output) {
          const lines = output.split("\n");
          const maxLines = this.expanded ? lines.length : 20;
          const displayLines = lines.slice(0, maxLines);
          const remaining = lines.length - maxLines;
          text += `\n\n${displayLines.map((line) => _theme.theme.fg("toolOutput", line)).join("\n")}`;
          if (remaining > 0) {
            text += `${_theme.theme.fg("muted", `\n... (${remaining} more lines,`)} ${(0, _keybindingHints.keyHint)("expandTools", "to expand")})`;
          }
        }
        const resultLimit = this.result.details?.resultLimitReached;
        const truncation = this.result.details?.truncation;
        if (resultLimit || truncation?.truncated) {
          const warnings = [];
          if (resultLimit) {
            warnings.push(`${resultLimit} results limit`);
          }
          if (truncation?.truncated) {
            warnings.push(`${(0, _truncate.formatSize)(truncation.maxBytes ?? _truncate.DEFAULT_MAX_BYTES)} limit`);
          }
          text += `\n${_theme.theme.fg("warning", `[Truncated: ${warnings.join(", ")}]`)}`;
        }
      }
    } else
    if (this.toolName === "grep") {
      const pattern = this.args?.pattern || "";
      const path = shortenPath(this.args?.path || ".");
      const glob = this.args?.glob;
      const limit = this.args?.limit;
      text =
      _theme.theme.fg("toolTitle", _theme.theme.bold("grep")) +
      " " +
      _theme.theme.fg("accent", `/${pattern}/`) +
      _theme.theme.fg("toolOutput", ` in ${path}`);
      if (glob) {
        text += _theme.theme.fg("toolOutput", ` (${glob})`);
      }
      if (limit !== undefined) {
        text += _theme.theme.fg("toolOutput", ` limit ${limit}`);
      }
      if (this.result) {
        const output = this.getTextOutput().trim();
        if (output) {
          const lines = output.split("\n");
          const maxLines = this.expanded ? lines.length : 15;
          const displayLines = lines.slice(0, maxLines);
          const remaining = lines.length - maxLines;
          text += `\n\n${displayLines.map((line) => _theme.theme.fg("toolOutput", line)).join("\n")}`;
          if (remaining > 0) {
            text += `${_theme.theme.fg("muted", `\n... (${remaining} more lines,`)} ${(0, _keybindingHints.keyHint)("expandTools", "to expand")})`;
          }
        }
        const matchLimit = this.result.details?.matchLimitReached;
        const truncation = this.result.details?.truncation;
        const linesTruncated = this.result.details?.linesTruncated;
        if (matchLimit || truncation?.truncated || linesTruncated) {
          const warnings = [];
          if (matchLimit) {
            warnings.push(`${matchLimit} matches limit`);
          }
          if (truncation?.truncated) {
            warnings.push(`${(0, _truncate.formatSize)(truncation.maxBytes ?? _truncate.DEFAULT_MAX_BYTES)} limit`);
          }
          if (linesTruncated) {
            warnings.push("some lines truncated");
          }
          text += `\n${_theme.theme.fg("warning", `[Truncated: ${warnings.join(", ")}]`)}`;
        }
      }
    } else
    {
      // Generic tool (shouldn't reach here for custom tools)
      text = _theme.theme.fg("toolTitle", _theme.theme.bold(this.toolName));
      const content = JSON.stringify(this.args, null, 2);
      text += `\n\n${content}`;
      const output = this.getTextOutput();
      if (output) {
        text += `\n${output}`;
      }
    }
    return text;
  }
}exports.ToolExecutionComponent = ToolExecutionComponent; /* v9-836fd9c2aad5f265 */
