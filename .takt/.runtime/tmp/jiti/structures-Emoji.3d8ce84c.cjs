"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GuildEmoji = exports.BaseEmoji = exports.ApplicationEmoji = void 0;var _v = require("discord-api-types/v10");
var _Base = require("../abstracts/Base.js");
var _index = require("../utils/index.js");
var _User = require("./User.js");
class BaseEmoji extends _Base.Base {
  _rawData;
  constructor(client, rawData) {
    super(client);
    this._rawData = rawData;
  }
  /**
   * The ID of the emoji
   */
  get id() {
    return this._rawData.id;
  }
  /**
   * The name of the emoji
   */
  get name() {
    return this._rawData.name;
  }
  /**
   * The roles that can use the emoji
   */
  get roles() {
    return this._rawData.roles;
  }
  /**
   * The user that created the emoji
   */
  get user() {
    if (!this._rawData.user)
    return undefined;
    return new _User.User(this.client, this._rawData.user);
  }
  /**
   * Whether the emoji requires colons
   */
  get requireColons() {
    return this._rawData.require_colons;
  }
  /**
   * Whether the emoji is managed
   */
  get managed() {
    return this._rawData.managed;
  }
  /**
   * Whether the emoji is animated
   */
  get animated() {
    return this._rawData.animated;
  }
  /**
   * Whether the emoji is available (may be false due to loss of Server Boosts)
   */
  get available() {
    return this._rawData.available;
  }
  /**
   * Get the URL of the emoji with default settings (uses gif for animated, png otherwise)
   */
  get url() {
    if (!this.id)
    return null;
    const format = this.animated ? "gif" : "png";
    return (0, _index.buildCDNUrl)(`https://cdn.discordapp.com/emojis`, this.id, { format });
  }
  /**
   * Get the URL of the emoji with custom format and size options
   * @param options Optional format and size parameters
   * @returns The emoji URL or null if no ID is set
   */
  getUrl(options) {
    if (!this.id)
    return null;
    return (0, _index.buildCDNUrl)(`https://cdn.discordapp.com/emojis`, this.id, options);
  }
  toString() {
    return `<${this.animated ? "a" : ""}:${this.name}:${this.id}>`;
  }
}exports.BaseEmoji = BaseEmoji;
class ApplicationEmoji extends BaseEmoji {
  applicationId;
  constructor(client, rawData, applicationId) {
    super(client, rawData);
    this.applicationId = applicationId;
  }
  get rawData() {
    return this._rawData;
  }
  setData(data) {
    if (!data)
    throw new Error("Cannot set data without having data... smh");
    this._rawData = data;
  }
  async setName(name) {
    if (!this.id)
    throw new Error("Emoji ID is required");
    const updatedEmoji = await this.client.rest.patch(_v.Routes.applicationEmoji(this.applicationId, this.id), { body: { name } });
    this.setData(updatedEmoji);
  }
  async delete() {
    if (!this.id)
    throw new Error("Emoji ID is required");
    await this.client.rest.delete(_v.Routes.applicationEmoji(this.applicationId, this.id));
  }
}exports.ApplicationEmoji = ApplicationEmoji;
class GuildEmoji extends BaseEmoji {
  guildId;
  constructor(client, rawData, guildId) {
    super(client, rawData);
    this.guildId = guildId;
  }
  get rawData() {
    return this._rawData;
  }
  setData(data) {
    if (!data)
    throw new Error("Cannot set data without having data... smh");
    this._rawData = data;
  }
  async setName(name) {
    if (!this.id)
    throw new Error("Emoji ID is required");
    if (!this.guildId)
    throw new Error("Guild ID is required");
    const updatedEmoji = await this.client.rest.patch(_v.Routes.guildEmoji(this.guildId, this.id), { body: { name } });
    this.setData(updatedEmoji);
  }
  /**
   * Set the roles that can use the emoji
   * @param roles The roles to set
   */
  async setRoles(roles) {
    if (!this.id)
    throw new Error("Emoji ID is required");
    if (!this.guildId)
    throw new Error("Guild ID is required");
    const updatedEmoji = await this.client.rest.patch(_v.Routes.guildEmoji(this.guildId, this.id), {
      body: {
        roles: roles.map((role) => typeof role === "string" ? role : role.id)
      }
    });
    this.setData(updatedEmoji);
  }
  async delete() {
    if (!this.id)
    throw new Error("Emoji ID is required");
    if (!this.guildId)
    throw new Error("Guild ID is required");
    await this.client.rest.delete(_v.Routes.guildEmoji(this.guildId, this.id));
  }
}exports.GuildEmoji = GuildEmoji; /* v9-f235676d76c93313 */
