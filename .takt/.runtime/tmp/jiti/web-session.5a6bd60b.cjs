"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "WA_WEB_AUTH_DIR", { enumerable: true, get: function () {return _authStore.WA_WEB_AUTH_DIR;} });exports.createWaSocket = createWaSocket;exports.formatError = formatError;exports.getStatusCode = getStatusCode;Object.defineProperty(exports, "getWebAuthAgeMs", { enumerable: true, get: function () {return _authStore.getWebAuthAgeMs;} });Object.defineProperty(exports, "logWebSelfId", { enumerable: true, get: function () {return _authStore.logWebSelfId;} });Object.defineProperty(exports, "logoutWeb", { enumerable: true, get: function () {return _authStore.logoutWeb;} });exports.newConnectionId = newConnectionId;Object.defineProperty(exports, "pickWebChannel", { enumerable: true, get: function () {return _authStore.pickWebChannel;} });Object.defineProperty(exports, "readWebSelfId", { enumerable: true, get: function () {return _authStore.readWebSelfId;} });exports.waitForWaConnection = waitForWaConnection;Object.defineProperty(exports, "webAuthExists", { enumerable: true, get: function () {return _authStore.webAuthExists;} });var _baileys = require("@whiskeysockets/baileys");
var _nodeCrypto = require("node:crypto");
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _qrcodeTerminal = _interopRequireDefault(require("qrcode-terminal"));
var _commandFormat = require("../cli/command-format.js");
var _globals = require("../globals.js");
var _logging = require("../logging.js");
var _utils = require("../utils.js");
var _version = require("../version.js");
var _authStore = require("./auth-store.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}

let credsSaveQueue = Promise.resolve();
function enqueueSaveCreds(authDir, saveCreds, logger) {
  credsSaveQueue = credsSaveQueue.
  then(() => safeSaveCreds(authDir, saveCreds, logger)).
  catch((err) => {
    logger.warn({ error: String(err) }, "WhatsApp creds save queue error");
  });
}
function readCredsJsonRaw(filePath) {
  try {
    if (!_nodeFs.default.existsSync(filePath)) {
      return null;
    }
    const stats = _nodeFs.default.statSync(filePath);
    if (!stats.isFile() || stats.size <= 1) {
      return null;
    }
    return _nodeFs.default.readFileSync(filePath, "utf-8");
  }
  catch {
    return null;
  }
}
async function safeSaveCreds(authDir, saveCreds, logger) {
  try {
    // Best-effort backup so we can recover after abrupt restarts.
    // Important: don't clobber a good backup with a corrupted/truncated creds.json.
    const credsPath = (0, _authStore.resolveWebCredsPath)(authDir);
    const backupPath = (0, _authStore.resolveWebCredsBackupPath)(authDir);
    const raw = readCredsJsonRaw(credsPath);
    if (raw) {
      try {
        JSON.parse(raw);
        _nodeFs.default.copyFileSync(credsPath, backupPath);
      }
      catch {

        // keep existing backup
      }}
  }
  catch {

    // ignore backup failures
  }try {
    await Promise.resolve(saveCreds());
  }
  catch (err) {
    logger.warn({ error: String(err) }, "failed saving WhatsApp creds");
  }
}
/**
 * Create a Baileys socket backed by the multi-file auth store we keep on disk.
 * Consumers can opt into QR printing for interactive login flows.
 */
async function createWaSocket(printQr, verbose, opts = {}) {
  const baseLogger = (0, _logging.getChildLogger)({ module: "baileys" }, {
    level: verbose ? "info" : "silent"
  });
  const logger = (0, _logging.toPinoLikeLogger)(baseLogger, verbose ? "info" : "silent");
  const authDir = (0, _utils.resolveUserPath)(opts.authDir ?? (0, _authStore.resolveDefaultWebAuthDir)());
  await (0, _utils.ensureDir)(authDir);
  const sessionLogger = (0, _logging.getChildLogger)({ module: "web-session" });
  (0, _authStore.maybeRestoreCredsFromBackup)(authDir);
  const { state, saveCreds } = await (0, _baileys.useMultiFileAuthState)(authDir);
  const { version } = await (0, _baileys.fetchLatestBaileysVersion)();
  const sock = (0, _baileys.makeWASocket)({
    auth: {
      creds: state.creds,
      keys: (0, _baileys.makeCacheableSignalKeyStore)(state.keys, logger)
    },
    version,
    logger,
    printQRInTerminal: false,
    browser: ["openclaw", "cli", _version.VERSION],
    syncFullHistory: false,
    markOnlineOnConnect: false
  });
  sock.ev.on("creds.update", () => enqueueSaveCreds(authDir, saveCreds, sessionLogger));
  sock.ev.on("connection.update", (update) => {
    try {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        opts.onQr?.(qr);
        if (printQr) {
          console.log("Scan this QR in WhatsApp (Linked Devices):");
          _qrcodeTerminal.default.generate(qr, { small: true });
        }
      }
      if (connection === "close") {
        const status = getStatusCode(lastDisconnect?.error);
        if (status === _baileys.DisconnectReason.loggedOut) {
          console.error((0, _globals.danger)(`WhatsApp session logged out. Run: ${(0, _commandFormat.formatCliCommand)("openclaw channels login")}`));
        }
      }
      if (connection === "open" && verbose) {
        console.log((0, _globals.success)("WhatsApp Web connected."));
      }
    }
    catch (err) {
      sessionLogger.error({ error: String(err) }, "connection.update handler error");
    }
  });
  // Handle WebSocket-level errors to prevent unhandled exceptions from crashing the process
  if (sock.ws && typeof sock.ws.on === "function") {
    sock.ws.on("error", (err) => {
      sessionLogger.error({ error: String(err) }, "WebSocket error");
    });
  }
  return sock;
}
async function waitForWaConnection(sock) {
  return new Promise((resolve, reject) => {
    const evWithOff = sock.ev;
    const handler = (...args) => {
      const update = args[0] ?? {};
      if (update.connection === "open") {
        evWithOff.off?.("connection.update", handler);
        resolve();
      }
      if (update.connection === "close") {
        evWithOff.off?.("connection.update", handler);
        reject(update.lastDisconnect ?? new Error("Connection closed"));
      }
    };
    sock.ev.on("connection.update", handler);
  });
}
function getStatusCode(err) {
  return err?.output?.statusCode ??
  err?.status;
}
function safeStringify(value, limit = 800) {
  try {
    const seen = new WeakSet();
    const raw = JSON.stringify(value, (_key, v) => {
      if (typeof v === "bigint") {
        return v.toString();
      }
      if (typeof v === "function") {
        const maybeName = v.name;
        const name = typeof maybeName === "string" && maybeName.length > 0 ? maybeName : "anonymous";
        return `[Function ${name}]`;
      }
      if (typeof v === "object" && v) {
        if (seen.has(v)) {
          return "[Circular]";
        }
        seen.add(v);
      }
      return v;
    }, 2);
    if (!raw) {
      return String(value);
    }
    return raw.length > limit ? `${raw.slice(0, limit)}…` : raw;
  }
  catch {
    return String(value);
  }
}
function extractBoomDetails(err) {
  if (!err || typeof err !== "object") {
    return null;
  }
  const output = err?.output;
  if (!output || typeof output !== "object") {
    return null;
  }
  const payload = output.payload;
  const statusCode = typeof output.statusCode === "number" ?
  output.statusCode :
  typeof payload?.statusCode === "number" ?
  payload.statusCode :
  undefined;
  const error = typeof payload?.error === "string" ? payload.error : undefined;
  const message = typeof payload?.message === "string" ? payload.message : undefined;
  if (!statusCode && !error && !message) {
    return null;
  }
  return { statusCode, error, message };
}
function formatError(err) {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  if (!err || typeof err !== "object") {
    return String(err);
  }
  // Baileys frequently wraps errors under `error` with a Boom-like shape.
  const boom = extractBoomDetails(err) ??
  extractBoomDetails(err?.error) ??
  extractBoomDetails(err?.lastDisconnect?.error);
  const status = boom?.statusCode ?? getStatusCode(err);
  const code = err?.code;
  const codeText = typeof code === "string" || typeof code === "number" ? String(code) : undefined;
  const messageCandidates = [
  boom?.message,
  typeof err?.message === "string" ?
  err.message :
  undefined,
  typeof err?.error?.message === "string" ?
  err.error?.message :
  undefined].
  filter((v) => Boolean(v && v.trim().length > 0));
  const message = messageCandidates[0];
  const pieces = [];
  if (typeof status === "number") {
    pieces.push(`status=${status}`);
  }
  if (boom?.error) {
    pieces.push(boom.error);
  }
  if (message) {
    pieces.push(message);
  }
  if (codeText) {
    pieces.push(`code=${codeText}`);
  }
  if (pieces.length > 0) {
    return pieces.join(" ");
  }
  return safeStringify(err);
}
function newConnectionId() {
  return (0, _nodeCrypto.randomUUID)();
} /* v9-92c2cc452dc9bd41 */
