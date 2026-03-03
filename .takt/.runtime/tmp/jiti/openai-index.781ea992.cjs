"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.openaiProvider = void 0;var _image = require("../image.js");
var _audio = require("./audio.js");
const openaiProvider = exports.openaiProvider = {
  id: "openai",
  capabilities: ["image"],
  describeImage: _image.describeImageWithModel,
  transcribeAudio: _audio.transcribeOpenAiCompatibleAudio
}; /* v9-52d64dbd85bd2d91 */
