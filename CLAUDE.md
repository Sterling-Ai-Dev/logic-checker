# Logic Checker — v0

Single-page tool: paste a deductive argument, get one structured verdict from
one Anthropic API call. Minimal by design — every file must be explainable in
an interview.

## Invariants (don't violate without flagging)
- One generative API call per check. No agent loop, no retrieval, no DB in v0.
- API key is server-side only (read in server/anthropicClient.ts from env).
  It must never reach the browser or appear in client code.
- Model ID is never hardcoded. Read ANTHROPIC_MODEL from .env; the server
  fails fast at startup if it's unset.
- `assessment` ("possible"/"doubtful"/"not-applicable") is derived in backend
  code, never emitted by the model. Soundness presupposes validity: if
  `validity.holds === "invalid"`, assessment is always "not-applicable"
  regardless of the soundness list — an invalid argument is never "possibly
  sound." Only when valid does "doubtful" (soundness non-empty) vs. "possible"
  (soundness empty) apply.
- Soundness is a per-premise doubt list ({premise, why}), never a global
  sound/unsound verdict. Flag a premise only with an articulable reason.
- Validity is logical only — judge structure, never real-world truth.
- `score`/`scoreLabel` are backend arithmetic (100 start; -40 invalid;
  -15/fallacy; -10/doubtful premise; floor 0; 80+ Solid, 50-79 Shaky, else
  Broken) over a verdict already in hand — deterministic, never asked of the
  model, no second API call.

## Conventions
- Stack: React + Vite (frontend), Express (backend), Anthropic TS SDK + Zod
  for structured output via messages.parse() + zodOutputFormat().
- Single-purpose, readable files over clever ones. Prefer fewer files.
- src/types.ts mirrors the server's post-processed output shape by hand —
  change one, change both.
- Verify structured-output assumptions against live Anthropic docs, not memory.
  The flat (non-union) schema is a deliberate safe default; smoke-test it first.

## Error categories (server → browser)
- Rate limit → 429 (transient, retryable). Non-argument input → 422.
  Bad/empty input → 400. Auth/config/connection → 500/502, real error logged
  server-side only.
