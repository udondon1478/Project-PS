"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Poll = void 0;var _v = require("discord-api-types/v10");
var _Base = require("../abstracts/Base.js");
var _index = require("../index.js");
var _User = require("./User.js");
class Poll extends _Base.Base {
  channelId;
  messageId;
  _rawData;
  constructor(client, { channelId, messageId, data }) {
    super(client);
    this.channelId = channelId;
    this.messageId = messageId;
    this._rawData = data;
  }
  /**
   * The raw Discord API data for this poll
   */
  get rawData() {
    return this._rawData;
  }
  get question() {
    return this._rawData.question;
  }
  get answers() {
    return this._rawData.answers;
  }
  get allowMultiselect() {
    return this._rawData.allow_multiselect;
  }
  get layoutType() {
    return this._rawData.layout_type;
  }
  get results() {
    return this._rawData.results;
  }
  get expiry() {
    return this._rawData.expiry;
  }
  get isFinalized() {
    return this._rawData.results !== undefined;
  }
  async getAnswerVoters(answerId) {
    const usersData = await this.client.rest.get(_v.Routes.pollAnswerVoters(this.channelId, this.messageId, answerId));
    return usersData.users.map((userData) => new _User.User(this.client, userData));
  }
  async end() {
    const updatedMessage = await this.client.rest.post(_v.Routes.expirePoll(this.channelId, this.messageId), {});
    return new _index.Message(this.client, updatedMessage);
  }
}exports.Poll = Poll; /* v9-5e30d7fdcb427d17 */
