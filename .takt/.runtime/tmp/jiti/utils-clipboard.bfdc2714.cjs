"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.copyToClipboard = copyToClipboard;var _child_process = require("child_process");
var _os = require("os");
var _clipboardImage = require("./clipboard-image.js");
function copyToClipboard(text) {
  // Always emit OSC 52 - works over SSH/mosh, harmless locally
  const encoded = Buffer.from(text).toString("base64");
  process.stdout.write(`\x1b]52;c;${encoded}\x07`);
  // Also try native tools (best effort for local sessions)
  const p = (0, _os.platform)();
  const options = { input: text, timeout: 5000 };
  try {
    if (p === "darwin") {
      (0, _child_process.execSync)("pbcopy", options);
    } else
    if (p === "win32") {
      (0, _child_process.execSync)("clip", options);
    } else
    {
      // Linux. Try Termux, Wayland, or X11 clipboard tools.
      if (process.env.TERMUX_VERSION) {
        try {
          (0, _child_process.execSync)("termux-clipboard-set", options);
          return;
        }
        catch {

          // Fall back to Wayland or X11 tools.
        }}
      const isWayland = (0, _clipboardImage.isWaylandSession)();
      if (isWayland) {
        try {
          // Verify wl-copy exists (spawn errors are async and won't be caught)
          (0, _child_process.execSync)("which wl-copy", { stdio: "ignore" });
          // wl-copy with execSync hangs due to fork behavior; use spawn instead
          const proc = (0, _child_process.spawn)("wl-copy", [], { stdio: ["pipe", "ignore", "ignore"] });
          proc.stdin.on("error", () => {

            // Ignore EPIPE errors if wl-copy exits early
          });proc.stdin.write(text);
          proc.stdin.end();
          proc.unref();
        }
        catch {
          // Fall back to xclip/xsel (works on XWayland)
          try {
            (0, _child_process.execSync)("xclip -selection clipboard", options);
          }
          catch {
            (0, _child_process.execSync)("xsel --clipboard --input", options);
          }
        }
      } else
      {
        try {
          (0, _child_process.execSync)("xclip -selection clipboard", options);
        }
        catch {
          (0, _child_process.execSync)("xsel --clipboard --input", options);
        }
      }
    }
  }
  catch {

    // Ignore - OSC 52 already emitted as fallback
  }} /* v9-0b42a94eb0d63b6f */
