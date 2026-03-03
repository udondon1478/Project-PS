"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DiscordError = void 0;var _errorsMapper = require("../functions/errorsMapper.js");
var _BaseError = require("./BaseError.js");
class DiscordError extends _BaseError.BaseError {
  /**
   * The HTTP status code of the response from Discord
   * @see https://discord.com/developers/docs/topics/opcodes-and-status-codes#http
   */
  status;
  /**
   * The Discord error code
   * @see https://discord.com/developers/docs/topics/opcodes-and-status-codes#json
   */
  discordCode;
  /**
   * An array of the errors that were returned by Discord
   */
  errors;
  /**
   * The raw body of the error from Discord
   * @internal
   */
  rawBody;
  constructor(response, body) {
    super(body.message);
    this.rawBody = body;
    this.status = response.status;
    this.discordCode = body.code;
    this.errors = (0, _errorsMapper.errorMapper)(body);
  }
}exports.DiscordError = DiscordError; /* v9-d33c43946ab1fdd2 */
