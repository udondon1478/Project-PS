"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Thumbnail = void 0;var _v = require("discord-api-types/v10");
var _BaseComponent = require("../../abstracts/BaseComponent.js");
class Thumbnail extends _BaseComponent.BaseComponent {
  type = _v.ComponentType.Thumbnail;
  isV2 = true;
  /**
   * The URL of the thumbnail. This can either be a direct online URL or an attachment://<name> reference
   */
  url;
  constructor(url) {
    super();
    if (url)
    this.url = url;
  }
  serialize = () => {
    if (!this.url)
    throw new Error("Thumbnail must have a URL");
    return {
      type: this.type,
      id: this.id,
      media: {
        url: this.url
      }
    };
  };
}exports.Thumbnail = Thumbnail; /* v9-445ffee674016cb7 */
