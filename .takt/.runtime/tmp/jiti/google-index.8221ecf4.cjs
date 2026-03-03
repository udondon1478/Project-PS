"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.googleProvider = void 0;var _image = require("../image.js");
var _audio = require("./audio.js");
var _video = require("./video.js");
const googleProvider = exports.googleProvider = {
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: _image.describeImageWithModel,
  transcribeAudio: _audio.transcribeGeminiAudio,
  describeVideo: _video.describeGeminiVideo
}; /* v9-5340c8bb5fb69aa7 */
