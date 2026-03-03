"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GatewayClient = exports.GATEWAY_CLOSE_CODE_HINTS = void 0;exports.describeGatewayCloseCode = describeGatewayCloseCode;var _nodeCrypto = require("node:crypto");
var _ws = require("ws");
var _deviceAuthStore = require("../infra/device-auth-store.js");
var _deviceIdentity = require("../infra/device-identity.js");
var _fingerprint = require("../infra/tls/fingerprint.js");
var _ws2 = require("../infra/ws.js");
var _logger = require("../logger.js");
var _messageChannel = require("../utils/message-channel.js");
var _deviceAuth = require("./device-auth.js");
var _index = require("./protocol/index.js");
const GATEWAY_CLOSE_CODE_HINTS = exports.GATEWAY_CLOSE_CODE_HINTS = {
  1000: "normal closure",
  1006: "abnormal closure (no close frame)",
  1008: "policy violation",
  1012: "service restart"
};
function describeGatewayCloseCode(code) {
  return GATEWAY_CLOSE_CODE_HINTS[code];
}
class GatewayClient {
  ws = null;
  opts;
  pending = new Map();
  backoffMs = 1000;
  closed = false;
  lastSeq = null;
  connectNonce = null;
  connectSent = false;
  connectTimer = null;
  // Track last tick to detect silent stalls.
  lastTick = null;
  tickIntervalMs = 30_000;
  tickTimer = null;
  constructor(opts) {
    this.opts = {
      ...opts,
      deviceIdentity: opts.deviceIdentity ?? (0, _deviceIdentity.loadOrCreateDeviceIdentity)()
    };
  }
  start() {
    if (this.closed) {
      return;
    }
    const url = this.opts.url ?? "ws://127.0.0.1:18789";
    if (this.opts.tlsFingerprint && !url.startsWith("wss://")) {
      this.opts.onConnectError?.(new Error("gateway tls fingerprint requires wss:// gateway url"));
      return;
    }
    // Allow node screen snapshots and other large responses.
    const wsOptions = {
      maxPayload: 25 * 1024 * 1024
    };
    if (url.startsWith("wss://") && this.opts.tlsFingerprint) {
      wsOptions.rejectUnauthorized = false;
      wsOptions.checkServerIdentity = (_host, cert) => {
        const fingerprintValue = typeof cert === "object" && cert && "fingerprint256" in cert ?
        cert.fingerprint256 ?? "" :
        "";
        const fingerprint = (0, _fingerprint.normalizeFingerprint)(typeof fingerprintValue === "string" ? fingerprintValue : "");
        const expected = (0, _fingerprint.normalizeFingerprint)(this.opts.tlsFingerprint ?? "");
        if (!expected) {
          return new Error("gateway tls fingerprint missing");
        }
        if (!fingerprint) {
          return new Error("gateway tls fingerprint unavailable");
        }
        if (fingerprint !== expected) {
          return new Error("gateway tls fingerprint mismatch");
        }
        return undefined;
        // oxlint-disable-next-line typescript/no-explicit-any
      };
    }
    this.ws = new _ws.WebSocket(url, wsOptions);
    this.ws.on("open", () => {
      if (url.startsWith("wss://") && this.opts.tlsFingerprint) {
        const tlsError = this.validateTlsFingerprint();
        if (tlsError) {
          this.opts.onConnectError?.(tlsError);
          this.ws?.close(1008, tlsError.message);
          return;
        }
      }
      this.queueConnect();
    });
    this.ws.on("message", (data) => this.handleMessage((0, _ws2.rawDataToString)(data)));
    this.ws.on("close", (code, reason) => {
      const reasonText = (0, _ws2.rawDataToString)(reason);
      this.ws = null;
      this.flushPendingErrors(new Error(`gateway closed (${code}): ${reasonText}`));
      this.scheduleReconnect();
      this.opts.onClose?.(code, reasonText);
    });
    this.ws.on("error", (err) => {
      (0, _logger.logDebug)(`gateway client error: ${String(err)}`);
      if (!this.connectSent) {
        this.opts.onConnectError?.(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
  stop() {
    this.closed = true;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.flushPendingErrors(new Error("gateway client stopped"));
  }
  sendConnect() {
    if (this.connectSent) {
      return;
    }
    this.connectSent = true;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    const role = this.opts.role ?? "operator";
    const storedToken = this.opts.deviceIdentity ?
    (0, _deviceAuthStore.loadDeviceAuthToken)({ deviceId: this.opts.deviceIdentity.deviceId, role })?.token :
    null;
    const authToken = storedToken ?? this.opts.token ?? undefined;
    const canFallbackToShared = Boolean(storedToken && this.opts.token);
    const auth = authToken || this.opts.password ?
    {
      token: authToken,
      password: this.opts.password
    } :
    undefined;
    const signedAtMs = Date.now();
    const nonce = this.connectNonce ?? undefined;
    const scopes = this.opts.scopes ?? ["operator.admin"];
    const device = (() => {
      if (!this.opts.deviceIdentity) {
        return undefined;
      }
      const payload = (0, _deviceAuth.buildDeviceAuthPayload)({
        deviceId: this.opts.deviceIdentity.deviceId,
        clientId: this.opts.clientName ?? _messageChannel.GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
        clientMode: this.opts.mode ?? _messageChannel.GATEWAY_CLIENT_MODES.BACKEND,
        role,
        scopes,
        signedAtMs,
        token: authToken ?? null,
        nonce
      });
      const signature = (0, _deviceIdentity.signDevicePayload)(this.opts.deviceIdentity.privateKeyPem, payload);
      return {
        id: this.opts.deviceIdentity.deviceId,
        publicKey: (0, _deviceIdentity.publicKeyRawBase64UrlFromPem)(this.opts.deviceIdentity.publicKeyPem),
        signature,
        signedAt: signedAtMs,
        nonce
      };
    })();
    const params = {
      minProtocol: this.opts.minProtocol ?? _index.PROTOCOL_VERSION,
      maxProtocol: this.opts.maxProtocol ?? _index.PROTOCOL_VERSION,
      client: {
        id: this.opts.clientName ?? _messageChannel.GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
        displayName: this.opts.clientDisplayName,
        version: this.opts.clientVersion ?? "dev",
        platform: this.opts.platform ?? process.platform,
        mode: this.opts.mode ?? _messageChannel.GATEWAY_CLIENT_MODES.BACKEND,
        instanceId: this.opts.instanceId
      },
      caps: Array.isArray(this.opts.caps) ? this.opts.caps : [],
      commands: Array.isArray(this.opts.commands) ? this.opts.commands : undefined,
      permissions: this.opts.permissions && typeof this.opts.permissions === "object" ?
      this.opts.permissions :
      undefined,
      pathEnv: this.opts.pathEnv,
      auth,
      role,
      scopes,
      device
    };
    void this.request("connect", params).
    then((helloOk) => {
      const authInfo = helloOk?.auth;
      if (authInfo?.deviceToken && this.opts.deviceIdentity) {
        (0, _deviceAuthStore.storeDeviceAuthToken)({
          deviceId: this.opts.deviceIdentity.deviceId,
          role: authInfo.role ?? role,
          token: authInfo.deviceToken,
          scopes: authInfo.scopes ?? []
        });
      }
      this.backoffMs = 1000;
      this.tickIntervalMs =
      typeof helloOk.policy?.tickIntervalMs === "number" ?
      helloOk.policy.tickIntervalMs :
      30_000;
      this.lastTick = Date.now();
      this.startTickWatch();
      this.opts.onHelloOk?.(helloOk);
    }).
    catch((err) => {
      if (canFallbackToShared && this.opts.deviceIdentity) {
        (0, _deviceAuthStore.clearDeviceAuthToken)({
          deviceId: this.opts.deviceIdentity.deviceId,
          role
        });
      }
      this.opts.onConnectError?.(err instanceof Error ? err : new Error(String(err)));
      const msg = `gateway connect failed: ${String(err)}`;
      if (this.opts.mode === _messageChannel.GATEWAY_CLIENT_MODES.PROBE) {
        (0, _logger.logDebug)(msg);
      } else
      {
        (0, _logger.logError)(msg);
      }
      this.ws?.close(1008, "connect failed");
    });
  }
  handleMessage(raw) {
    try {
      const parsed = JSON.parse(raw);
      if ((0, _index.validateEventFrame)(parsed)) {
        const evt = parsed;
        if (evt.event === "connect.challenge") {
          const payload = evt.payload;
          const nonce = payload && typeof payload.nonce === "string" ? payload.nonce : null;
          if (nonce) {
            this.connectNonce = nonce;
            this.sendConnect();
          }
          return;
        }
        const seq = typeof evt.seq === "number" ? evt.seq : null;
        if (seq !== null) {
          if (this.lastSeq !== null && seq > this.lastSeq + 1) {
            this.opts.onGap?.({ expected: this.lastSeq + 1, received: seq });
          }
          this.lastSeq = seq;
        }
        if (evt.event === "tick") {
          this.lastTick = Date.now();
        }
        this.opts.onEvent?.(evt);
        return;
      }
      if ((0, _index.validateResponseFrame)(parsed)) {
        const pending = this.pending.get(parsed.id);
        if (!pending) {
          return;
        }
        // If the payload is an ack with status accepted, keep waiting for final.
        const payload = parsed.payload;
        const status = payload?.status;
        if (pending.expectFinal && status === "accepted") {
          return;
        }
        this.pending.delete(parsed.id);
        if (parsed.ok) {
          pending.resolve(parsed.payload);
        } else
        {
          pending.reject(new Error(parsed.error?.message ?? "unknown error"));
        }
      }
    }
    catch (err) {
      (0, _logger.logDebug)(`gateway client parse error: ${String(err)}`);
    }
  }
  queueConnect() {
    this.connectNonce = null;
    this.connectSent = false;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
    }
    this.connectTimer = setTimeout(() => {
      this.sendConnect();
    }, 750);
  }
  scheduleReconnect() {
    if (this.closed) {
      return;
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 30_000);
    setTimeout(() => this.start(), delay).unref();
  }
  flushPendingErrors(err) {
    for (const [, p] of this.pending) {
      p.reject(err);
    }
    this.pending.clear();
  }
  startTickWatch() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
    }
    const interval = Math.max(this.tickIntervalMs, 1000);
    this.tickTimer = setInterval(() => {
      if (this.closed) {
        return;
      }
      if (!this.lastTick) {
        return;
      }
      const gap = Date.now() - this.lastTick;
      if (gap > this.tickIntervalMs * 2) {
        this.ws?.close(4000, "tick timeout");
      }
    }, interval);
  }
  validateTlsFingerprint() {
    if (!this.opts.tlsFingerprint || !this.ws) {
      return null;
    }
    const expected = (0, _fingerprint.normalizeFingerprint)(this.opts.tlsFingerprint);
    if (!expected) {
      return new Error("gateway tls fingerprint missing");
    }
    const socket = this.ws._socket;
    if (!socket || typeof socket.getPeerCertificate !== "function") {
      return new Error("gateway tls fingerprint unavailable");
    }
    const cert = socket.getPeerCertificate();
    const fingerprint = (0, _fingerprint.normalizeFingerprint)(cert?.fingerprint256 ?? "");
    if (!fingerprint) {
      return new Error("gateway tls fingerprint unavailable");
    }
    if (fingerprint !== expected) {
      return new Error("gateway tls fingerprint mismatch");
    }
    return null;
  }
  async request(method, params, opts) {
    if (!this.ws || this.ws.readyState !== _ws.WebSocket.OPEN) {
      throw new Error("gateway not connected");
    }
    const id = (0, _nodeCrypto.randomUUID)();
    const frame = { type: "req", id, method, params };
    if (!(0, _index.validateRequestFrame)(frame)) {
      throw new Error(`invalid request frame: ${JSON.stringify(_index.validateRequestFrame.errors, null, 2)}`);
    }
    const expectFinal = opts?.expectFinal === true;
    const p = new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value),
        reject,
        expectFinal
      });
    });
    this.ws.send(JSON.stringify(frame));
    return p;
  }
}exports.GatewayClient = GatewayClient; /* v9-b90aaee3fb326be8 */
