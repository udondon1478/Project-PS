"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createTypingCallbacks = createTypingCallbacks;function createTypingCallbacks(params) {
  const stop = params.stop;
  const onReplyStart = async () => {
    try {
      await params.start();
    }
    catch (err) {
      params.onStartError(err);
    }
  };
  const onIdle = stop ?
  () => {
    void stop().catch((err) => (params.onStopError ?? params.onStartError)(err));
  } :
  undefined;
  return { onReplyStart, onIdle };
} /* v9-33ac2ee30cd892de */
