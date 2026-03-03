"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.MediaGallery = void 0;var _v = require("discord-api-types/v10");
var _BaseComponent = require("../../abstracts/BaseComponent.js");
/**
 * A media gallery component can display between 1 and 10 images.
 * Each image can be a direct online URL or an attachment://<name> reference.
 */
class MediaGallery extends _BaseComponent.BaseComponent {
  type = _v.ComponentType.MediaGallery;
  isV2 = true;
  items = [];
  constructor(items = []) {
    super();
    this.items = items;
  }
  serialize = () => {
    if (this.items.length < 1 || this.items.length > 10) {
      throw new Error("MediaGallery must have between 1 and 10 items");
    }
    return {
      type: _v.ComponentType.MediaGallery,
      id: this.id,
      items: this.items.map((item) => ({
        media: {
          url: item.url
        },
        description: item.description,
        spoiler: item.spoiler
      }))
    };
  };
}exports.MediaGallery = MediaGallery; /* v9-7878e217090ac77c */
