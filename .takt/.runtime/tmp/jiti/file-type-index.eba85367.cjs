"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.FileTypeParser = void 0;Object.defineProperty(exports, "fileTypeFromBlob", { enumerable: true, get: function () {return _core.fileTypeFromBlob;} });Object.defineProperty(exports, "fileTypeFromBuffer", { enumerable: true, get: function () {return _core.fileTypeFromBuffer;} });exports.fileTypeFromFile = fileTypeFromFile;exports.fileTypeFromStream = fileTypeFromStream;Object.defineProperty(exports, "fileTypeFromTokenizer", { enumerable: true, get: function () {return _core.fileTypeFromTokenizer;} });exports.fileTypeStream = fileTypeStream;Object.defineProperty(exports, "supportedExtensions", { enumerable: true, get: function () {return _core.supportedExtensions;} });Object.defineProperty(exports, "supportedMimeTypes", { enumerable: true, get: function () {return _core.supportedMimeTypes;} });



var _web = require("node:stream/web");
var _nodeStream = require("node:stream");
var strtok3 = _interopRequireWildcard(require("strtok3"));
var _core = require("./core.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);} /**
Node.js specific entry point.
*/class FileTypeParser extends _core.FileTypeParser {
  async fromStream(stream) {
    const tokenizer = await (stream instanceof _web.ReadableStream ? strtok3.fromWebStream(stream, this.tokenizerOptions) : strtok3.fromStream(stream, this.tokenizerOptions));
    try {
      return await super.fromTokenizer(tokenizer);
    } finally {
      await tokenizer.close();
    }
  }

  async fromFile(path) {
    const tokenizer = await strtok3.fromFile(path);
    try {
      return await super.fromTokenizer(tokenizer);
    } finally {
      await tokenizer.close();
    }
  }

  async toDetectionStream(readableStream, options = {}) {
    if (!(readableStream instanceof _nodeStream.Readable)) {
      return super.toDetectionStream(readableStream, options);
    }

    const { sampleSize = _core.reasonableDetectionSizeInBytes } = options;

    return new Promise((resolve, reject) => {
      readableStream.on('error', reject);

      readableStream.once('readable', () => {
        (async () => {
          try {
            // Set up output stream
            const pass = new _nodeStream.PassThrough();
            const outputStream = _nodeStream.pipeline ? (0, _nodeStream.pipeline)(readableStream, pass, () => {}) : readableStream.pipe(pass);

            // Read the input stream and detect the filetype
            const chunk = readableStream.read(sampleSize) ?? readableStream.read() ?? new Uint8Array(0);
            try {
              pass.fileType = await this.fromBuffer(chunk);
            } catch (error) {
              if (error instanceof strtok3.EndOfStreamError) {
                pass.fileType = undefined;
              } else {
                reject(error);
              }
            }

            resolve(outputStream);
          } catch (error) {
            reject(error);
          }
        })();
      });
    });
  }
}exports.FileTypeParser = FileTypeParser;

async function fileTypeFromFile(path, options) {
  return new FileTypeParser(options).fromFile(path, options);
}

async function fileTypeFromStream(stream, options) {
  return new FileTypeParser(options).fromStream(stream);
}

async function fileTypeStream(readableStream, options = {}) {
  return new FileTypeParser(options).toDetectionStream(readableStream, options);
} /* v9-27b3e88076eb2e64 */
