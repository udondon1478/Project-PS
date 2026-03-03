"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.startWebLoginWithQr = startWebLoginWithQr;exports.waitForWebLogin = waitForWebLogin;var _baileys = require("@whiskeysockets/baileys");
var _nodeCrypto = require("node:crypto");
var _config = require("../config/config.js");
var _globals = require("../globals.js");
var _logger = require("../logger.js");
var _runtime = require("../runtime.js");
var _accounts = require("./accounts.js");
var _qrImage = require("./qr-image.js");
var _session = require("./session.js");
const ACTIVE_LOGIN_TTL_MS = 3 * 60_000;
const activeLogins = new Map();
function closeSocket(sock) {
  try {
    sock.ws?.close();
  }
  catch {

    // ignore
  }}
async function resetActiveLogin(accountId, reason) {
  const login = activeLogins.get(accountId);
  if (login) {
    closeSocket(login.sock);
    activeLogins.delete(accountId);
  }
  if (reason) {
    (0, _logger.logInfo)(reason);
  }
}
function isLoginFresh(login) {
  return Date.now() - login.startedAt < ACTIVE_LOGIN_TTL_MS;
}
function attachLoginWaiter(accountId, login) {
  login.waitPromise = (0, _session.waitForWaConnection)(login.sock).
  then(() => {
    const current = activeLogins.get(accountId);
    if (current?.id === login.id) {
      current.connected = true;
    }
  }).
  catch((err) => {
    const current = activeLogins.get(accountId);
    if (current?.id !== login.id) {
      return;
    }
    current.error = (0, _session.formatError)(err);
    current.errorStatus = (0, _session.getStatusCode)(err);
  });
}
async function restartLoginSocket(login, runtime) {
  if (login.restartAttempted) {
    return false;
  }
  login.restartAttempted = true;
  runtime.log((0, _globals.info)("WhatsApp asked for a restart after pairing (code 515); retrying connection once…"));
  closeSocket(login.sock);
  try {
    const sock = await (0, _session.createWaSocket)(false, login.verbose, {
      authDir: login.authDir
    });
    login.sock = sock;
    login.connected = false;
    login.error = undefined;
    login.errorStatus = undefined;
    attachLoginWaiter(login.accountId, login);
    return true;
  }
  catch (err) {
    login.error = (0, _session.formatError)(err);
    login.errorStatus = (0, _session.getStatusCode)(err);
    return false;
  }
}
async function startWebLoginWithQr(opts = {}) {
  const runtime = opts.runtime ?? _runtime.defaultRuntime;
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveWhatsAppAccount)({ cfg, accountId: opts.accountId });
  const hasWeb = await (0, _session.webAuthExists)(account.authDir);
  const selfId = (0, _session.readWebSelfId)(account.authDir);
  if (hasWeb && !opts.force) {
    const who = selfId.e164 ?? selfId.jid ?? "unknown";
    return {
      message: `WhatsApp is already linked (${who}). Say “relink” if you want a fresh QR.`
    };
  }
  const existing = activeLogins.get(account.accountId);
  if (existing && isLoginFresh(existing) && existing.qrDataUrl) {
    return {
      qrDataUrl: existing.qrDataUrl,
      message: "QR already active. Scan it in WhatsApp → Linked Devices."
    };
  }
  await resetActiveLogin(account.accountId);
  let resolveQr = null;
  let rejectQr = null;
  const qrPromise = new Promise((resolve, reject) => {
    resolveQr = resolve;
    rejectQr = reject;
  });
  const qrTimer = setTimeout(() => {
    rejectQr?.(new Error("Timed out waiting for WhatsApp QR"));
  }, Math.max(opts.timeoutMs ?? 30_000, 5000));
  let sock;
  let pendingQr = null;
  try {
    sock = await (0, _session.createWaSocket)(false, Boolean(opts.verbose), {
      authDir: account.authDir,
      onQr: (qr) => {
        if (pendingQr) {
          return;
        }
        pendingQr = qr;
        const current = activeLogins.get(account.accountId);
        if (current && !current.qr) {
          current.qr = qr;
        }
        clearTimeout(qrTimer);
        runtime.log((0, _globals.info)("WhatsApp QR received."));
        resolveQr?.(qr);
      }
    });
  }
  catch (err) {
    clearTimeout(qrTimer);
    await resetActiveLogin(account.accountId);
    return {
      message: `Failed to start WhatsApp login: ${String(err)}`
    };
  }
  const login = {
    accountId: account.accountId,
    authDir: account.authDir,
    isLegacyAuthDir: account.isLegacyAuthDir,
    id: (0, _nodeCrypto.randomUUID)(),
    sock,
    startedAt: Date.now(),
    connected: false,
    waitPromise: Promise.resolve(),
    restartAttempted: false,
    verbose: Boolean(opts.verbose)
  };
  activeLogins.set(account.accountId, login);
  if (pendingQr && !login.qr) {
    login.qr = pendingQr;
  }
  attachLoginWaiter(account.accountId, login);
  let qr;
  try {
    qr = await qrPromise;
  }
  catch (err) {
    clearTimeout(qrTimer);
    await resetActiveLogin(account.accountId);
    return {
      message: `Failed to get QR: ${String(err)}`
    };
  }
  const base64 = await (0, _qrImage.renderQrPngBase64)(qr);
  login.qrDataUrl = `data:image/png;base64,${base64}`;
  return {
    qrDataUrl: login.qrDataUrl,
    message: "Scan this QR in WhatsApp → Linked Devices."
  };
}
async function waitForWebLogin(opts = {}) {
  const runtime = opts.runtime ?? _runtime.defaultRuntime;
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveWhatsAppAccount)({ cfg, accountId: opts.accountId });
  const activeLogin = activeLogins.get(account.accountId);
  if (!activeLogin) {
    return {
      connected: false,
      message: "No active WhatsApp login in progress."
    };
  }
  const login = activeLogin;
  if (!isLoginFresh(login)) {
    await resetActiveLogin(account.accountId);
    return {
      connected: false,
      message: "The login QR expired. Ask me to generate a new one."
    };
  }
  const timeoutMs = Math.max(opts.timeoutMs ?? 120_000, 1000);
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return {
        connected: false,
        message: "Still waiting for the QR scan. Let me know when you’ve scanned it."
      };
    }
    const timeout = new Promise((resolve) => setTimeout(() => resolve("timeout"), remaining));
    const result = await Promise.race([login.waitPromise.then(() => "done"), timeout]);
    if (result === "timeout") {
      return {
        connected: false,
        message: "Still waiting for the QR scan. Let me know when you’ve scanned it."
      };
    }
    if (login.error) {
      if (login.errorStatus === _baileys.DisconnectReason.loggedOut) {
        await (0, _session.logoutWeb)({
          authDir: login.authDir,
          isLegacyAuthDir: login.isLegacyAuthDir,
          runtime
        });
        const message = "WhatsApp reported the session is logged out. Cleared cached web session; please scan a new QR.";
        await resetActiveLogin(account.accountId, message);
        runtime.log((0, _globals.danger)(message));
        return { connected: false, message };
      }
      if (login.errorStatus === 515) {
        const restarted = await restartLoginSocket(login, runtime);
        if (restarted && isLoginFresh(login)) {
          continue;
        }
      }
      const message = `WhatsApp login failed: ${login.error}`;
      await resetActiveLogin(account.accountId, message);
      runtime.log((0, _globals.danger)(message));
      return { connected: false, message };
    }
    if (login.connected) {
      const message = "✅ Linked! WhatsApp is ready.";
      runtime.log((0, _globals.success)(message));
      await resetActiveLogin(account.accountId);
      return { connected: true, message };
    }
    return { connected: false, message: "Login ended without a connection." };
  }
} /* v9-a3c66c24410731a7 */
