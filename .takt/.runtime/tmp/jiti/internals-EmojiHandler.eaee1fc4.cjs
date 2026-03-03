"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.EmojiHandler = void 0;var _v = require("discord-api-types/v10");
var _Base = require("../abstracts/Base.js");
var _Emoji = require("../structures/Emoji.js");
/**
 * This class is specifically used for application emojis that you manage from the Discord Developer Portal
 */
class EmojiHandler extends _Base.Base {
  async list() {
    const emojis = await this.client.rest.get(_v.Routes.applicationEmojis(this.client.options.clientId));
    return emojis.items.map((emoji) => new _Emoji.ApplicationEmoji(this.client, emoji, this.client.options.clientId));
  }
  async get(id) {
    const emoji = await this.client.rest.get(_v.Routes.applicationEmoji(this.client.options.clientId, id));
    return new _Emoji.ApplicationEmoji(this.client, emoji, this.client.options.clientId);
  }
  async getByName(name) {
    const emojis = await this.list();
    return emojis.find((emoji) => emoji.name === name);
  }
  /**
   * Upload a new emoji to the application
   * @param name The name of the emoji
   * @param image The image of the emoji in base64 format
   * @returns The created ApplicationEmoji
   */
  async create(name, image) {
    const emoji = await this.client.rest.post(_v.Routes.applicationEmojis(this.client.options.clientId), { body: { name, image } });
    return new _Emoji.ApplicationEmoji(this.client, emoji, this.client.options.clientId);
  }
  async delete(id) {
    await this.client.rest.delete(_v.Routes.applicationEmoji(this.client.options.clientId, id));
  }
}exports.EmojiHandler = EmojiHandler; /* v9-6cda45952e2a653f */
