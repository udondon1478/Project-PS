"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.EventHandler = void 0;var _Base = require("../abstracts/Base.js");
var _EventQueue = require("./EventQueue.js");
/**
 * Handles Discord gateway events and dispatches them to registered listeners.
 * @internal
 */
class EventHandler extends _Base.Base {
  eventQueue;
  constructor(client) {
    super(client);
    this.eventQueue = new _EventQueue.EventQueue(client, client.options.eventQueue);
  }
  handleEvent(payload, type) {
    return this.eventQueue.enqueue(payload, type);
  }
  getMetrics() {
    return this.eventQueue.getMetrics();
  }
  hasCapacity() {
    return this.eventQueue.hasCapacity();
  }
}exports.EventHandler = EventHandler; /* v9-eda2ec8bbbd94bc7 */
