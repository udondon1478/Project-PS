"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.loginWeb = loginWeb;var _baileys = require("@whiskeysockets/baileys");
var _commandFormat = require("../cli/command-format.js");
var _config = require("../config/config.js");
var _globals = require("../globals.js");
var _logger = require("../logger.js");
var _runtime = require("../runtime.js");
var _accounts = require("./accounts.js");
var _session = require("./session.js");
async function loginWeb(verbose, waitForConnection, runtime = _runtime.defaultRuntime, accountId) {
  const wait = waitForConnection ?? _session.waitForWaConnection;
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveWhatsAppAccount)({ cfg, accountId });
  const sock = await (0, _session.createWaSocket)(true, verbose, {
    authDir: account.authDir
  });
  (0, _logger.logInfo)("Waiting for WhatsApp connection...", runtime);
  try {
    await wait(sock);
    console.log((0, _globals.success)("✅ Linked! Credentials saved for future sends."));
  }
  catch (err) {
    const code = err?.error?.output?.statusCode ??
    err?.output?.statusCode;
    if (code === 515) {
      console.log((0, _globals.info)("WhatsApp asked for a restart after pairing (code 515); creds are saved. Restarting connection once…"));
      try {
        sock.ws?.close();
      }
      catch {

        // ignore
      }const retry = await (0, _session.createWaSocket)(false, verbose, {
        authDir: account.authDir
      });
      try {
        await wait(retry);
        console.log((0, _globals.success)("✅ Linked after restart; web session ready."));
        return;
      } finally
      {
        setTimeout(() => retry.ws?.close(), 500);
      }
    }
    if (code === _baileys.DisconnectReason.loggedOut) {
      await (0, _session.logoutWeb)({
        authDir: account.authDir,
        isLegacyAuthDir: account.isLegacyAuthDir,
        runtime
      });
      console.error((0, _globals.danger)(`WhatsApp reported the session is logged out. Cleared cached web session; please rerun ${(0, _commandFormat.formatCliCommand)("openclaw channels login")} and scan the QR again.`));
      throw new Error("Session logged out; cache cleared. Re-run login.", { cause: err });
    }
    const formatted = (0, _session.formatError)(err);
    console.error((0, _globals.danger)(`WhatsApp Web connection ended before fully opening. ${formatted}`));
    throw new Error(formatted, { cause: err });
  } finally
  {
    // Let Baileys flush any final events before closing the socket.
    setTimeout(() => {
      try {
        sock.ws?.close();
      }
      catch {

        // ignore
      }}, 500);
  }
} /* v9-8f898333baffab03 */
