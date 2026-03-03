"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.WA_DEFAULT_EPHEMERAL = exports.WA_CERT_DETAILS = exports.WA_ADV_HOSTED_DEVICE_SIG_PREFIX = exports.WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX = exports.WA_ADV_DEVICE_SIG_PREFIX = exports.WA_ADV_ACCOUNT_SIG_PREFIX = exports.URL_REGEX = exports.UPLOAD_TIMEOUT = exports.UNAUTHORIZED_CODES = exports.PROCESSABLE_HISTORY_TYPES = exports.PHONE_CONNECTION_CB = exports.NOISE_WA_HEADER = exports.NOISE_MODE = exports.MIN_UPLOAD_INTERVAL = exports.MIN_PREKEY_COUNT = exports.MEDIA_PATH_MAP = exports.MEDIA_KEYS = exports.MEDIA_HKDF_KEY_MAPPING = exports.KEY_BUNDLE_TYPE = exports.INITIAL_PREKEY_COUNT = exports.DICT_VERSION = exports.DEF_TAG_PREFIX = exports.DEF_CALLBACK_PREFIX = exports.DEFAULT_ORIGIN = exports.DEFAULT_CONNECTION_CONFIG = exports.DEFAULT_CACHE_TTLS = exports.CALL_VIDEO_PREFIX = exports.CALL_AUDIO_PREFIX = void 0;var _index = require("../../WAProto/index.js");
var _libsignal = require("../Signal/libsignal.js");
var _browserUtils = require("../Utils/browser-utils.js");
var _logger = _interopRequireDefault(require("../Utils/logger.js"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const version = [2, 3000, 1027934701];
const UNAUTHORIZED_CODES = exports.UNAUTHORIZED_CODES = [401, 403, 419];
const DEFAULT_ORIGIN = exports.DEFAULT_ORIGIN = 'https://web.whatsapp.com';
const CALL_VIDEO_PREFIX = exports.CALL_VIDEO_PREFIX = 'https://call.whatsapp.com/video/';
const CALL_AUDIO_PREFIX = exports.CALL_AUDIO_PREFIX = 'https://call.whatsapp.com/voice/';
const DEF_CALLBACK_PREFIX = exports.DEF_CALLBACK_PREFIX = 'CB:';
const DEF_TAG_PREFIX = exports.DEF_TAG_PREFIX = 'TAG:';
const PHONE_CONNECTION_CB = exports.PHONE_CONNECTION_CB = 'CB:Pong';
const WA_ADV_ACCOUNT_SIG_PREFIX = exports.WA_ADV_ACCOUNT_SIG_PREFIX = Buffer.from([6, 0]);
const WA_ADV_DEVICE_SIG_PREFIX = exports.WA_ADV_DEVICE_SIG_PREFIX = Buffer.from([6, 1]);
const WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX = exports.WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX = Buffer.from([6, 5]);
const WA_ADV_HOSTED_DEVICE_SIG_PREFIX = exports.WA_ADV_HOSTED_DEVICE_SIG_PREFIX = Buffer.from([6, 6]);
const WA_DEFAULT_EPHEMERAL = exports.WA_DEFAULT_EPHEMERAL = 7 * 24 * 60 * 60;
const NOISE_MODE = exports.NOISE_MODE = 'Noise_XX_25519_AESGCM_SHA256\0\0\0\0';
const DICT_VERSION = exports.DICT_VERSION = 3;
const KEY_BUNDLE_TYPE = exports.KEY_BUNDLE_TYPE = Buffer.from([5]);
const NOISE_WA_HEADER = exports.NOISE_WA_HEADER = Buffer.from([87, 65, 6, DICT_VERSION]); // last is "DICT_VERSION"
/** from: https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url */
const URL_REGEX = exports.URL_REGEX = /https:\/\/(?![^:@\/\s]+:[^:@\/\s]+@)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?/g;
// TODO: Add WA root CA
const WA_CERT_DETAILS = exports.WA_CERT_DETAILS = {
  SERIAL: 0
};
const PROCESSABLE_HISTORY_TYPES = exports.PROCESSABLE_HISTORY_TYPES = [
_index.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP,
_index.proto.HistorySync.HistorySyncType.PUSH_NAME,
_index.proto.HistorySync.HistorySyncType.RECENT,
_index.proto.HistorySync.HistorySyncType.FULL,
_index.proto.HistorySync.HistorySyncType.ON_DEMAND,
_index.proto.HistorySync.HistorySyncType.NON_BLOCKING_DATA,
_index.proto.HistorySync.HistorySyncType.INITIAL_STATUS_V3];

const DEFAULT_CONNECTION_CONFIG = exports.DEFAULT_CONNECTION_CONFIG = {
  version: version,
  browser: _browserUtils.Browsers.macOS('Chrome'),
  waWebSocketUrl: 'wss://web.whatsapp.com/ws/chat',
  connectTimeoutMs: 20000,
  keepAliveIntervalMs: 30000,
  logger: _logger.default.child({ class: 'baileys' }),
  emitOwnEvents: true,
  defaultQueryTimeoutMs: 60000,
  customUploadHosts: [],
  retryRequestDelayMs: 250,
  maxMsgRetryCount: 5,
  fireInitQueries: true,
  auth: undefined,
  markOnlineOnConnect: true,
  syncFullHistory: true,
  patchMessageBeforeSending: (msg) => msg,
  shouldSyncHistoryMessage: () => true,
  shouldIgnoreJid: () => false,
  linkPreviewImageThumbnailWidth: 192,
  transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
  generateHighQualityLinkPreview: false,
  enableAutoSessionRecreation: true,
  enableRecentMessageCache: true,
  options: {},
  appStateMacVerification: {
    patch: false,
    snapshot: false
  },
  countryCode: 'US',
  getMessage: async () => undefined,
  cachedGroupMetadata: async () => undefined,
  makeSignalRepository: _libsignal.makeLibSignalRepository
};
const MEDIA_PATH_MAP = exports.MEDIA_PATH_MAP = {
  image: '/mms/image',
  video: '/mms/video',
  document: '/mms/document',
  audio: '/mms/audio',
  sticker: '/mms/image',
  'thumbnail-link': '/mms/image',
  'product-catalog-image': '/product/image',
  'md-app-state': '',
  'md-msg-hist': '/mms/md-app-state',
  'biz-cover-photo': '/pps/biz-cover-photo'
};
const MEDIA_HKDF_KEY_MAPPING = exports.MEDIA_HKDF_KEY_MAPPING = {
  audio: 'Audio',
  document: 'Document',
  gif: 'Video',
  image: 'Image',
  ppic: '',
  product: 'Image',
  ptt: 'Audio',
  sticker: 'Image',
  video: 'Video',
  'thumbnail-document': 'Document Thumbnail',
  'thumbnail-image': 'Image Thumbnail',
  'thumbnail-video': 'Video Thumbnail',
  'thumbnail-link': 'Link Thumbnail',
  'md-msg-hist': 'History',
  'md-app-state': 'App State',
  'product-catalog-image': '',
  'payment-bg-image': 'Payment Background',
  ptv: 'Video',
  'biz-cover-photo': 'Image'
};
const MEDIA_KEYS = exports.MEDIA_KEYS = Object.keys(MEDIA_PATH_MAP);
const MIN_PREKEY_COUNT = exports.MIN_PREKEY_COUNT = 5;
const INITIAL_PREKEY_COUNT = exports.INITIAL_PREKEY_COUNT = 812;
const UPLOAD_TIMEOUT = exports.UPLOAD_TIMEOUT = 30000; // 30 seconds
const MIN_UPLOAD_INTERVAL = exports.MIN_UPLOAD_INTERVAL = 5000; // 5 seconds minimum between uploads
const DEFAULT_CACHE_TTLS = exports.DEFAULT_CACHE_TTLS = {
  SIGNAL_STORE: 5 * 60, // 5 minutes
  MSG_RETRY: 60 * 60, // 1 hour
  CALL_OFFER: 5 * 60, // 5 minutes
  USER_DEVICES: 5 * 60 // 5 minutes
}; /* v9-9d32bc28d3f50ccc */
