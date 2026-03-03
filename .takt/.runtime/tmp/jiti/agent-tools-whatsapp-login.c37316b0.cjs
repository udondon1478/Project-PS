"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createWhatsAppLoginTool = createWhatsAppLoginTool;var _typebox = require("@sinclair/typebox");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
function createWhatsAppLoginTool() {
  return {
    label: "WhatsApp Login",
    name: "whatsapp_login",
    description: "Generate a WhatsApp QR code for linking, or wait for the scan to complete.",
    // NOTE: Using Type.Unsafe for action enum instead of Type.Union([Type.Literal(...)]
    // because Claude API on Vertex AI rejects nested anyOf schemas as invalid JSON Schema.
    parameters: _typebox.Type.Object({
      action: _typebox.Type.Unsafe({
        type: "string",
        enum: ["start", "wait"]
      }),
      timeoutMs: _typebox.Type.Optional(_typebox.Type.Number()),
      force: _typebox.Type.Optional(_typebox.Type.Boolean())
    }),
    execute: async (_toolCallId, args) => {
      const { startWebLoginWithQr, waitForWebLogin } = await Promise.resolve().then(() => jitiImport("../../../web/login-qr.js").then((m) => _interopRequireWildcard(m)));
      const action = args?.action ?? "start";
      if (action === "wait") {
        const result = await waitForWebLogin({
          timeoutMs: typeof args.timeoutMs === "number" ?
          args.timeoutMs :
          undefined
        });
        return {
          content: [{ type: "text", text: result.message }],
          details: { connected: result.connected }
        };
      }
      const result = await startWebLoginWithQr({
        timeoutMs: typeof args.timeoutMs === "number" ?
        args.timeoutMs :
        undefined,
        force: typeof args.force === "boolean" ?
        args.force :
        false
      });
      if (!result.qrDataUrl) {
        return {
          content: [
          {
            type: "text",
            text: result.message
          }],

          details: { qr: false }
        };
      }
      const text = [
      result.message,
      "",
      "Open WhatsApp → Linked Devices and scan:",
      "",
      `![whatsapp-qr](${result.qrDataUrl})`].
      join("\n");
      return {
        content: [{ type: "text", text }],
        details: { qr: true }
      };
    }
  };
} /* v9-b8e96405acebbf53 */
