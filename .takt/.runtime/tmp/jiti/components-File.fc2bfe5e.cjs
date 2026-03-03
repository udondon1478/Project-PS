"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.File = void 0;var _v = require("discord-api-types/v10");
var _BaseComponent = require("../../abstracts/BaseComponent.js");
/**
 * Each file component can only display 1 attached file, but you can upload multiple files and add them to different file components within your payload.
 */
class File extends _BaseComponent.BaseComponent {
  type = _v.ComponentType.File;
  isV2 = true;
  /**
   * The attachment to display in the file component.
   */
  file;
  /**
   * Whether the file should be displayed as a spoiler.
   */
  spoiler = false;
  constructor(file, spoiler) {
    super();
    this.file = file || undefined;
    this.spoiler = spoiler ?? false;
  }
  serialize = () => {
    if (!this.file) {
      throw new Error("File component must have a file attached");
    }
    return {
      type: _v.ComponentType.File,
      id: this.id,
      file: {
        url: this.file
      },
      spoiler: this.spoiler
    };
  };
}exports.File = File; /* v9-2370e8e1e7518dab */
