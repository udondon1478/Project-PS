"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.addWildcardAllowFrom = addWildcardAllowFrom;exports.promptAccountId = void 0;var _sessionKey = require("../../../routing/session-key.js");
const promptAccountId = async (params) => {
  const existingIds = params.listAccountIds(params.cfg);
  const initial = params.currentId?.trim() || params.defaultAccountId || _sessionKey.DEFAULT_ACCOUNT_ID;
  const choice = await params.prompter.select({
    message: `${params.label} account`,
    options: [
    ...existingIds.map((id) => ({
      value: id,
      label: id === _sessionKey.DEFAULT_ACCOUNT_ID ? "default (primary)" : id
    })),
    { value: "__new__", label: "Add a new account" }],

    initialValue: initial
  });
  if (choice !== "__new__") {
    return (0, _sessionKey.normalizeAccountId)(choice);
  }
  const entered = await params.prompter.text({
    message: `New ${params.label} account id`,
    validate: (value) => value?.trim() ? undefined : "Required"
  });
  const normalized = (0, _sessionKey.normalizeAccountId)(String(entered));
  if (String(entered).trim() !== normalized) {
    await params.prompter.note(`Normalized account id to "${normalized}".`, `${params.label} account`);
  }
  return normalized;
};exports.promptAccountId = promptAccountId;
function addWildcardAllowFrom(allowFrom) {
  const next = (allowFrom ?? []).map((v) => String(v).trim()).filter(Boolean);
  if (!next.includes("*")) {
    next.push("*");
  }
  return next;
} /* v9-9c07458f8ce99294 */
