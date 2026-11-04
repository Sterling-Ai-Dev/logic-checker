# Gamified Logic Checker

A fun way for laypeople and average folks to check whether their arguments are coherent, cogent, and valid!

Paste a deductive argument, and get one structured verdict back: is the reasoning **valid**, which **fallacies** show up, which **premises** are doubtful, and an overall **score** with a label (Solid / Shaky / Broken).

<!-- Add a screenshot here: ![Logic Checker screenshot](docs/screenshot.png) -->

## What it does

For each argument, the app returns:

- **Validity**: does the conclusion follow from the premises? This judges logical structure only, never real-world truth.
- **Fallacies**: each one named, with where it occurs and why.
- **Soundness doubts**: a per-premise list of premises with an articulable reason for doubt. It is never a global "sound/unsound" verdict.
- **Assessment**: `possible`, `doubtful`, or `not-applicable`.
- **Score**: 0-100 with a label (80+ Solid, 50-79 Shaky, below 50 Broken).

Input that isn't a deductive argument is rejected with an explanation.

## How it works

One generative API call per check: no agent loop, no retrieval, no database.

1. The React frontend posts the pasted text to `POST /api/check`.
2. The Express server makes a single Anthropic API call using structured output (`messages.parse()` with a Zod schema), so the model returns validated JSON, not free text.
3. **Deterministic backend code** then derives everything the model isn't trusted to decide:
   - `assessment`: an invalid argument is always `not-applicable` (an invalid argument is never "possibly sound"). Only valid arguments get `doubtful` (some premise flagged) or `possible` (none flagged).
   - `score`: starts at 100, then -40 if invalid, -15 per fallacy, -10 per doubtful premise, floored at 0.

Design choices worth noting:

- The API key is read server-side only and never reaches the browser.
- The model ID is read from the environment, never hardcoded, and the server fails fast at startup if it's unset.
- The schema is deliberately flat (no unions), and the server rebuilds a clean recognized/unrecognized response shape in code.
- Errors map to distinct HTTP statuses (400 bad input, 422 not an argument, 429 rate limit, 500/502 config or provider problems), with real errors logged server-side only.

## Tech stack

React 19 + Vite (frontend), Express 5 (backend), TypeScript, the Anthropic TypeScript SDK, and Zod.

## Getting started

**Prerequisites:** Node.js 20+ and an Anthropic API key from https://console.anthropic.com/settings/keys

```bash
git clone https://github.com/theajxx/gamified-logic-checker.git
cd gamified-logic-checker
npm install
cp .env.example .env   # on Windows PowerShell: Copy-Item .env.example .env
```

Edit `.env` and set:

- `ANTHROPIC_API_KEY`: your API key
- `ANTHROPIC_MODEL`: an exact Claude model ID (check the Anthropic Console or docs for current models)
- `PORT`: optional, defaults to `3001`

### Run in development

```bash
npm run dev
```

This starts the Express server (port 3001) and the Vite dev server together. Open the URL Vite prints (usually http://localhost:5173); `/api` requests are proxied to the server.

### Run as a single server

```bash
npm run build
npm start
```

Express serves both the API and the built frontend at http://localhost:3001.

### Other scripts

- `npm run typecheck`: type-check the frontend and server

## Project structure

```
server/
  index.ts            Express app, /api/check route, serves the built frontend
  checkArgument.ts    The route handler: the API call, assessment, score, error mapping
  schema.ts           Zod schema for the model's structured output
  systemPrompt.ts     Instructions given to the model
  anthropicClient.ts  Anthropic client (the only place the API key is read)
  config.ts           Env validation (fails fast if the model is unset)
src/
  App.tsx             The single-page UI
  types.ts            Response types (mirror the server's post-processed output)
```

## Limitations

This is a v0 side project. Arguments are capped at 10,000 characters, results come from an LLM and can be wrong, and the score weights are a judgment call rather than a formal measure.
