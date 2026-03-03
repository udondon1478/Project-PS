"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatErrorMessage = formatErrorMessage;exports.resolveOptionFromCommand = resolveOptionFromCommand;exports.runCommandWithRuntime = runCommandWithRuntime;exports.withManager = withManager;function formatErrorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}
async function withManager(params) {
  const { manager, error } = await params.getManager();
  if (!manager) {
    params.onMissing(error);
    return;
  }
  try {
    await params.run(manager);
  } finally
  {
    try {
      await params.close(manager);
    }
    catch (err) {
      params.onCloseError?.(err);
    }
  }
}
async function runCommandWithRuntime(runtime, action, onError) {
  try {
    await action();
  }
  catch (err) {
    if (onError) {
      onError(err);
      return;
    }
    runtime.error(String(err));
    runtime.exit(1);
  }
}
function resolveOptionFromCommand(command, key) {
  let current = command;
  while (current) {
    const opts = current.opts?.() ?? {};
    if (opts[key] !== undefined) {
      return opts[key];
    }
    current = current.parent ?? undefined;
  }
  return undefined;
} /* v9-02ae32125c5227e4 */
