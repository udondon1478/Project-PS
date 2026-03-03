"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.AbstractSocketClient = void 0;var _events = require("events");
var _url = require("url");
class AbstractSocketClient extends _events.EventEmitter {
  constructor(url, config) {
    super();
    this.url = url;
    this.config = config;
    this.setMaxListeners(0);
  }
}exports.AbstractSocketClient = AbstractSocketClient; /* v9-f7dd947048f36e54 */
