"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createToolHtmlRenderer = createToolHtmlRenderer;





var _ansiToHtml = require("./ansi-to-html.js"); /**
 * Tool HTML renderer for custom tools in HTML export.
 *
 * Renders custom tool calls and results to HTML by invoking their TUI renderers
 * and converting the ANSI output to HTML.
 */ /**
 * Create a tool HTML renderer.
 *
 * The renderer looks up tool definitions and invokes their renderCall/renderResult
 * methods, converting the resulting TUI Component output (ANSI) to HTML.
 */function createToolHtmlRenderer(deps) {const { getToolDefinition, theme, width = 100 } = deps;return { renderCall(toolName, args) {
      try {
        const toolDef = getToolDefinition(toolName);
        if (!toolDef?.renderCall) {
          return undefined;
        }
        const component = toolDef.renderCall(args, theme);
        const lines = component.render(width);
        return (0, _ansiToHtml.ansiLinesToHtml)(lines);
      }
      catch {
        // On error, return undefined to trigger JSON fallback
        return undefined;
      }
    },
    renderResult(toolName, result, details, isError) {
      try {
        const toolDef = getToolDefinition(toolName);
        if (!toolDef?.renderResult) {
          return undefined;
        }
        // Build AgentToolResult from content array
        // Cast content since session storage uses generic object types
        const agentToolResult = {
          content: result,
          details,
          isError
        };
        // Always render expanded, client-side will apply truncation
        const component = toolDef.renderResult(agentToolResult, { expanded: true, isPartial: false }, theme);
        const lines = component.render(width);
        return (0, _ansiToHtml.ansiLinesToHtml)(lines);
      }
      catch {
        // On error, return undefined to trigger JSON fallback
        return undefined;
      }
    }
  };
} /* v9-6d2cf41ba94398e8 */
