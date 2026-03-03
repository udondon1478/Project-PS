"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_PROVIDER = exports.DEFAULT_MODEL = exports.DEFAULT_CONTEXT_TOKENS = void 0; // Defaults for agent metadata when upstream does not supply them.
// Model id uses pi-ai's built-in Anthropic catalog.
const DEFAULT_PROVIDER = exports.DEFAULT_PROVIDER = "anthropic";
const DEFAULT_MODEL = exports.DEFAULT_MODEL = "claude-opus-4-5";
// Context window: Opus 4.5 supports ~200k tokens (per pi-ai models.generated.ts).
const DEFAULT_CONTEXT_TOKENS = exports.DEFAULT_CONTEXT_TOKENS = 200_000; /* v9-3103cd508d21c956 */
