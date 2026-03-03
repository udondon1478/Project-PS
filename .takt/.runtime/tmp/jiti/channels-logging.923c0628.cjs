"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.logAckFailure = logAckFailure;exports.logInboundDrop = logInboundDrop;exports.logTypingFailure = logTypingFailure;function logInboundDrop(params) {
  const target = params.target ? ` target=${params.target}` : "";
  params.log(`${params.channel}: drop ${params.reason}${target}`);
}
function logTypingFailure(params) {
  const target = params.target ? ` target=${params.target}` : "";
  const action = params.action ? ` action=${params.action}` : "";
  params.log(`${params.channel} typing${action} failed${target}: ${String(params.error)}`);
}
function logAckFailure(params) {
  const target = params.target ? ` target=${params.target}` : "";
  params.log(`${params.channel} ack cleanup failed${target}: ${String(params.error)}`);
} /* v9-c595970c16b7c32e */
