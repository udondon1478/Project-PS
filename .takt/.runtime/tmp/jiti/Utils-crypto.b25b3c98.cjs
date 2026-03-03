"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Curve = void 0;exports.aesDecrypt = aesDecrypt;exports.aesDecryptCTR = aesDecryptCTR;exports.aesDecryptGCM = aesDecryptGCM;exports.aesDecryptWithIV = aesDecryptWithIV;exports.aesEncrypWithIV = aesEncrypWithIV;exports.aesEncrypt = aesEncrypt;exports.aesEncryptCTR = aesEncryptCTR;exports.aesEncryptGCM = aesEncryptGCM;exports.derivePairingCodeKey = derivePairingCodeKey;exports.generateSignalPubKey = void 0;exports.hkdf = hkdf;exports.hmacSign = hmacSign;exports.md5 = md5;exports.sha256 = sha256;exports.signedKeyPair = void 0;var _crypto = require("crypto");
var curve = _interopRequireWildcard(require("libsignal/src/curve.js"));
var _index = require("../Defaults/index.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
// insure browser & node compatibility
const { subtle } = globalThis.crypto;
/** prefix version byte to the pub keys, required for some curve crypto functions */
const generateSignalPubKey = (pubKey) => pubKey.length === 33 ? pubKey : Buffer.concat([_index.KEY_BUNDLE_TYPE, pubKey]);exports.generateSignalPubKey = generateSignalPubKey;
const Curve = exports.Curve = {
  generateKeyPair: () => {
    const { pubKey, privKey } = curve.generateKeyPair();
    return {
      private: Buffer.from(privKey),
      // remove version byte
      public: Buffer.from(pubKey.slice(1))
    };
  },
  sharedKey: (privateKey, publicKey) => {
    const shared = curve.calculateAgreement(generateSignalPubKey(publicKey), privateKey);
    return Buffer.from(shared);
  },
  sign: (privateKey, buf) => curve.calculateSignature(privateKey, buf),
  verify: (pubKey, message, signature) => {
    try {
      curve.verifySignature(generateSignalPubKey(pubKey), message, signature);
      return true;
    }
    catch (error) {
      return false;
    }
  }
};
const signedKeyPair = (identityKeyPair, keyId) => {
  const preKey = Curve.generateKeyPair();
  const pubKey = generateSignalPubKey(preKey.public);
  const signature = Curve.sign(identityKeyPair.private, pubKey);
  return { keyPair: preKey, signature, keyId };
};exports.signedKeyPair = signedKeyPair;
const GCM_TAG_LENGTH = 128 >> 3;
/**
 * encrypt AES 256 GCM;
 * where the tag tag is suffixed to the ciphertext
 * */
function aesEncryptGCM(plaintext, key, iv, additionalData) {
  const cipher = (0, _crypto.createCipheriv)('aes-256-gcm', key, iv);
  cipher.setAAD(additionalData);
  return Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
}
/**
 * decrypt AES 256 GCM;
 * where the auth tag is suffixed to the ciphertext
 * */
function aesDecryptGCM(ciphertext, key, iv, additionalData) {
  const decipher = (0, _crypto.createDecipheriv)('aes-256-gcm', key, iv);
  // decrypt additional adata
  const enc = ciphertext.slice(0, ciphertext.length - GCM_TAG_LENGTH);
  const tag = ciphertext.slice(ciphertext.length - GCM_TAG_LENGTH);
  // set additional data
  decipher.setAAD(additionalData);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}
function aesEncryptCTR(plaintext, key, iv) {
  const cipher = (0, _crypto.createCipheriv)('aes-256-ctr', key, iv);
  return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}
function aesDecryptCTR(ciphertext, key, iv) {
  const decipher = (0, _crypto.createDecipheriv)('aes-256-ctr', key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
/** decrypt AES 256 CBC; where the IV is prefixed to the buffer */
function aesDecrypt(buffer, key) {
  return aesDecryptWithIV(buffer.slice(16, buffer.length), key, buffer.slice(0, 16));
}
/** decrypt AES 256 CBC */
function aesDecryptWithIV(buffer, key, IV) {
  const aes = (0, _crypto.createDecipheriv)('aes-256-cbc', key, IV);
  return Buffer.concat([aes.update(buffer), aes.final()]);
}
// encrypt AES 256 CBC; where a random IV is prefixed to the buffer
function aesEncrypt(buffer, key) {
  const IV = (0, _crypto.randomBytes)(16);
  const aes = (0, _crypto.createCipheriv)('aes-256-cbc', key, IV);
  return Buffer.concat([IV, aes.update(buffer), aes.final()]); // prefix IV to the buffer
}
// encrypt AES 256 CBC with a given IV
function aesEncrypWithIV(buffer, key, IV) {
  const aes = (0, _crypto.createCipheriv)('aes-256-cbc', key, IV);
  return Buffer.concat([aes.update(buffer), aes.final()]); // prefix IV to the buffer
}
// sign HMAC using SHA 256
function hmacSign(buffer, key, variant = 'sha256') {
  return (0, _crypto.createHmac)(variant, key).update(buffer).digest();
}
function sha256(buffer) {
  return (0, _crypto.createHash)('sha256').update(buffer).digest();
}
function md5(buffer) {
  return (0, _crypto.createHash)('md5').update(buffer).digest();
}
// HKDF key expansion
async function hkdf(buffer, expandedLength, info) {
  // Normalize to a Uint8Array whose underlying buffer is a regular ArrayBuffer (not ArrayBufferLike)
  // Cloning via new Uint8Array(...) guarantees the generic parameter is ArrayBuffer which satisfies WebCrypto types.
  const inputKeyMaterial = new Uint8Array(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
  // Set default values if not provided
  const salt = info.salt ? new Uint8Array(info.salt) : new Uint8Array(0);
  const infoBytes = info.info ? new TextEncoder().encode(info.info) : new Uint8Array(0);
  // Import the input key material (cast to BufferSource to appease TS DOM typings)
  const importedKey = await subtle.importKey('raw', inputKeyMaterial, { name: 'HKDF' }, false, [
  'deriveBits']
  );
  // Derive bits using HKDF
  const derivedBits = await subtle.deriveBits({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: salt,
    info: infoBytes
  }, importedKey, expandedLength * 8 // Convert bytes to bits
  );
  return Buffer.from(derivedBits);
}
async function derivePairingCodeKey(pairingCode, salt) {
  // Convert inputs to formats Web Crypto API can work with
  const encoder = new TextEncoder();
  const pairingCodeBuffer = encoder.encode(pairingCode);
  const saltBuffer = new Uint8Array(salt instanceof Uint8Array ? salt : new Uint8Array(salt));
  // Import the pairing code as key material
  const keyMaterial = await subtle.importKey('raw', pairingCodeBuffer, { name: 'PBKDF2' }, false, [
  'deriveBits']
  );
  // Derive bits using PBKDF2 with the same parameters
  // 2 << 16 = 131,072 iterations
  const derivedBits = await subtle.deriveBits({
    name: 'PBKDF2',
    salt: saltBuffer,
    iterations: 2 << 16,
    hash: 'SHA-256'
  }, keyMaterial, 32 * 8 // 32 bytes * 8 = 256 bits
  );
  return Buffer.from(derivedBits);
} /* v9-7b596998e0390795 */
