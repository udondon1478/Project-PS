"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.USyncContactProtocol = void 0;var _index = require("../../WABinary/index.js");
var _USyncUser = require("../USyncUser.js");
class USyncContactProtocol {
  constructor() {
    this.name = 'contact';
  }
  getQueryElement() {
    return {
      tag: 'contact',
      attrs: {}
    };
  }
  getUserElement(user) {
    //TODO: Implement type / username fields (not yet supported)
    return {
      tag: 'contact',
      attrs: {},
      content: user.phone
    };
  }
  parser(node) {
    if (node.tag === 'contact') {
      (0, _index.assertNodeErrorFree)(node);
      return node?.attrs?.type === 'in';
    }
    return false;
  }
}exports.USyncContactProtocol = USyncContactProtocol; /* v9-4acbc8fffab41331 */
