"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.anthropicProvider = void 0;var _image = require("../image.js");
const anthropicProvider = exports.anthropicProvider = {
  id: "anthropic",
  capabilities: ["image"],
  describeImage: _image.describeImageWithModel
}; /* v9-a74d9daf12e87a5b */
