"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.loadGatewayTlsRuntime = loadGatewayTlsRuntime;var _nodeChild_process = require("node:child_process");
var _nodeCrypto = require("node:crypto");
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUtil = require("node:util");
var _utils = require("../../utils.js");
var _fingerprint = require("./fingerprint.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const execFileAsync = (0, _nodeUtil.promisify)(_nodeChild_process.execFile);
async function fileExists(filePath) {
  try {
    await _promises.default.access(filePath);
    return true;
  }
  catch {
    return false;
  }
}
async function generateSelfSignedCert(params) {
  const certDir = _nodePath.default.dirname(params.certPath);
  const keyDir = _nodePath.default.dirname(params.keyPath);
  await (0, _utils.ensureDir)(certDir);
  if (keyDir !== certDir) {
    await (0, _utils.ensureDir)(keyDir);
  }
  await execFileAsync("openssl", [
  "req",
  "-x509",
  "-newkey",
  "rsa:2048",
  "-sha256",
  "-days",
  "3650",
  "-nodes",
  "-keyout",
  params.keyPath,
  "-out",
  params.certPath,
  "-subj",
  "/CN=openclaw-gateway"]
  );
  await _promises.default.chmod(params.keyPath, 0o600).catch(() => {});
  await _promises.default.chmod(params.certPath, 0o600).catch(() => {});
  params.log?.info?.(`gateway tls: generated self-signed cert at ${(0, _utils.shortenHomeInString)(params.certPath)}`);
}
async function loadGatewayTlsRuntime(cfg, log) {
  if (!cfg || cfg.enabled !== true) {
    return { enabled: false, required: false };
  }
  const autoGenerate = cfg.autoGenerate !== false;
  const baseDir = _nodePath.default.join(_utils.CONFIG_DIR, "gateway", "tls");
  const certPath = (0, _utils.resolveUserPath)(cfg.certPath ?? _nodePath.default.join(baseDir, "gateway-cert.pem"));
  const keyPath = (0, _utils.resolveUserPath)(cfg.keyPath ?? _nodePath.default.join(baseDir, "gateway-key.pem"));
  const caPath = cfg.caPath ? (0, _utils.resolveUserPath)(cfg.caPath) : undefined;
  const hasCert = await fileExists(certPath);
  const hasKey = await fileExists(keyPath);
  if (!hasCert && !hasKey && autoGenerate) {
    try {
      await generateSelfSignedCert({ certPath, keyPath, log });
    }
    catch (err) {
      return {
        enabled: false,
        required: true,
        certPath,
        keyPath,
        error: `gateway tls: failed to generate cert (${String(err)})`
      };
    }
  }
  if (!(await fileExists(certPath)) || !(await fileExists(keyPath))) {
    return {
      enabled: false,
      required: true,
      certPath,
      keyPath,
      error: "gateway tls: cert/key missing"
    };
  }
  try {
    const cert = await _promises.default.readFile(certPath, "utf8");
    const key = await _promises.default.readFile(keyPath, "utf8");
    const ca = caPath ? await _promises.default.readFile(caPath, "utf8") : undefined;
    const x509 = new _nodeCrypto.X509Certificate(cert);
    const fingerprintSha256 = (0, _fingerprint.normalizeFingerprint)(x509.fingerprint256 ?? "");
    if (!fingerprintSha256) {
      return {
        enabled: false,
        required: true,
        certPath,
        keyPath,
        caPath,
        error: "gateway tls: unable to compute certificate fingerprint"
      };
    }
    return {
      enabled: true,
      required: true,
      certPath,
      keyPath,
      caPath,
      fingerprintSha256,
      tlsOptions: {
        cert,
        key,
        ca,
        minVersion: "TLSv1.3"
      }
    };
  }
  catch (err) {
    return {
      enabled: false,
      required: true,
      certPath,
      keyPath,
      caPath,
      error: `gateway tls: failed to load cert (${String(err)})`
    };
  }
} /* v9-4c6d788459f5a031 */
