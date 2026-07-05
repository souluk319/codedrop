# CodeDrop

Cyberpunk typing game and EX280 study suite.

CodeDrop started as a falling-code typing game. It now has three product layers:

- **CODEDROP**: short-form falling word typing with official packs and custom packs.
- **OCP Edition**: EX280/OpenShift study modes, including learn mode, scenario practice, mock labs, and exam mode.
- **Pack Maker**: search-grounded custom data pack generation through KUGNUS SERVER or GPT mini fallback.

Live production currently runs on the Node/Express backend with MySQL-compatible storage. A Firebase migration can move Hosting/Auth/Firestore later, but LLM/search features still need a server-side function because API keys must not be exposed in browser code.

## Current Verified Flow

Before shipping a release candidate, verify these gates:

```bash
npm run verify
curl http://localhost:3001/ready
curl http://localhost:3001/api/llm/kugnus/health
npm run doctor:full -- --base-url=http://127.0.0.1:3001
```

Expected:

- `npm run verify` passes.
- `/ready` returns `{"server":"ok","db":"ok"}`.
- KUGNUS health returns `{ "ok": true, ... }`.
- `doctor:full` runs static checks, server/DB readiness, release diagnostics, and the real KUGNUS Pack Maker E2E. It may still report `BLOCKED` for release if public gateway/session/origin env is not configured.
- Browser E2E proves Pack Maker generation, save, SELECT PACK selection, DROP play, OCP Learn chat, README, MUSIC, and console errors.

## Features

- **Guest-first start**: users can inspect and play official packs without signing in.
- **Login-gated server features**: Pack Maker generation/save, custom pack ranking, public review submission, official score upload, and account deletion require login.
- **Official DROP packs**: Python, JavaScript, HTTP/Network, Terminal, Linux, OpenShift, Vocabulary, and Mix.
- **Custom packs**: saved packs are loaded into the normal DROP flow and use separate pack-specific leaderboards.
- **OCP Edition**:
  - Learn Mode with chat assistant.
  - CLI DROP fixed to OpenShift CLI terms.
  - Scenario practice.
  - Mock Lab.
  - Exam mode.
  - Study dashboard and review flow.
- **KUGNUS SERVER default**:
  - Learn chat and Pack Maker default to KUGNUS.
  - GPT mini fallback is allowed only after an explicit fallback decision.
- **README manual**:
  - EN/KOR toggle.
  - Contact links for GitHub, www.kugnus.com, blog, and email.
- **MUSIC island UI**:
  - Bottom-right compact/expanded player with SoundCloud fallback view.

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run db:local:up
npm start
```

Open:

```text
http://localhost:3001
```

Check readiness:

```bash
curl http://localhost:3001/ready
```

Expected:

```json
{"server":"ok","db":"ok"}
```

Reset local DB:

```bash
npm run db:local:reset
```

## Environment

Use `.env.local.example` for local development and `.env.production.example` as the deployment checklist. Do not commit real `.env` or secret-filled production files.

Minimum local DB variables:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=codedrop
DB_PASSWORD=codedrop_pw
DB_NAME=codedrop_db
DB_SSL=false
SESSION_SECRET=codedrop-local-dev-session-secret-change-for-release
ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
PACK_ADMIN_NICKNAMES=test
DEFAULT_CHAT_ENGINE=kugnus
```

Local/dev direct KUGNUS endpoint:

```env
LLM_BASE_URL=http://127.0.0.1:11434
LLM_MODEL=gemma4:12b-it-qat
```

Do not use `LLM_BASE_URL` for release unless you intentionally set `ALLOW_DIRECT_KUGNUS=1`. Release should use the public OpenAI-compatible gateway:

```env
KUGNUS_GATEWAY_BASE_URL=https://llm.yourdomain.com/v1
KUGNUS_GATEWAY_API_KEY=<KUGNUS_GATEWAY_API_KEY>
KUGNUS_GATEWAY_MODEL=gemma4:12b-it-qat
KUGNUS_EMBEDDING_MODEL=embeddinggemma:latest
KUGNUS_EMBEDDING_DIMENSIONS=768
```

GPT fallback variables:

```env
GPT_OPENAI_BASE_URL=https://api.openai.com/v1
GPT_OPENAI_API_KEY=<OPENAI_API_KEY>
GPT_OPENAI_MODEL=gpt-5.4-mini
```

The server rejects non-mini OpenAI models for chat fallback. Keep high-end models out of this app path.

## KUGNUS Routing

The server resolves KUGNUS in this order:

1. `KUGNUS_GATEWAY_BASE_URL` / `KUGNUS_GATEWAY_API_KEY` / `KUGNUS_GATEWAY_MODEL`
2. `KUGNUS_BASE_URL` / `KUGNUS_API_KEY` / `KUGNUS_MODEL` and other KUGNUS-prefixed gateway aliases.
3. `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL` when the model name looks like a KUGNUS/local model or `KUGNUS_USE_OPENAI_ENV=1`.
4. `LLM_BASE_URL` / `LLM_MODEL` direct Ollama-compatible local server.

For deployment, prefer the explicit `KUGNUS_GATEWAY_*` variables. `KUGNUS_BASE_URL` / `KUGNUS_API_KEY` / `KUGNUS_MODEL` is accepted as a shorter alias. If you use the OpenAI-compatible gateway alias from `local-llm-lab`, keep the full trio together:

```env
OPENAI_BASE_URL=https://llm.yourdomain.com/v1
OPENAI_API_KEY=<KUGNUS_GATEWAY_API_KEY>
OPENAI_MODEL=gemma4:12b-it-qat
```

When that alias is complete, the server intentionally routes KUGNUS through the alias even if a local `LLM_BASE_URL` is still present. Release checks still block direct `LLM_BASE_URL`; remove it from production env after gateway verification.

`npm run verify` includes `scripts/verify_kugnus_gateway_contract.mjs`, which starts a fake OpenAI-compatible KUGNUS gateway and proves explicit `KUGNUS_GATEWAY_*`, `KUGNUS_BASE_URL` alias, and `OPENAI_BASE_URL`/`OPENAI_API_KEY`/local-model alias paths.

After real gateway env values are present, run a live gateway check before release. The verifier accepts explicit `KUGNUS_GATEWAY_*`, `KUGNUS_BASE_URL` alias, or a safe `OPENAI_BASE_URL`/`OPENAI_API_KEY`/local-model alias that does not point at `api.openai.com`:

```bash
npm run verify:kugnus-live -- --env-file=.env.production
npm run verify:release-runtime -- --env-file=.env.production
```

Passing output must include:

```json
{
  "kugnusGatewayLive": "ok",
  "model": "gemma4:12b-it-qat"
}
```

`verify:release-runtime` must report `route` as `gateway` or `openai-env-alias`. If it reports `direct`, the app is still using local Ollama and is not ready for public deployment.

If the app shows `KUGNUS ROUTE: DIRECT`, it is still using `LLM_BASE_URL`/direct Ollama and is not ready for public deployment.

## Pack Maker QA Prompt

Baseline prompt:

```text
자동차 정비소에 취직하는데 한글로된 자동차정비에 자주등장하는 자동차부품 단어 50개만 뽑아서 카 파츠 팩 만들어줘
```

Passing criteria:

- title is `카 파츠 팩`.
- exactly 50 rows.
- Korean terms are present in all rows.
- no duplicate terms.
- sources are attached.
- `SAVE MY PACK` succeeds.
- saved pack appears in SELECT PACK.
- DROP uses the custom pack terms.
- typed custom term shows score/combo update and description toast.

## Scripts

```bash
npm start              # Run server
npm run verify         # Full static/content/server smoke verification
npm run verify:5x      # Repeat verification
npm run verify:db      # Local DB E2E: register, custom pack, score, withdraw
npm run verify:packmaker:kugnus
                       # Real KUGNUS E2E: vague prompt gate + 50 Korean auto-parts pack + save + custom leaderboard
npm run doctor:full     # Deep system doctor plus real KUGNUS Pack Maker E2E summary
npm run release:check  # Fail-fast release environment preflight
npm run db:local:up    # Start local MySQL
npm run db:local:down  # Stop local MySQL
npm run db:local:reset # Reset local MySQL data
```

## Deployment Notes

Current production-compatible shape:

```text
Node/Express server
MySQL-compatible DB
KUGNUS public gateway
GPT mini fallback
```

Direct `LLM_BASE_URL` KUGNUS routing is for local/dev smoke only.

Firebase migration target:

```text
Firebase Hosting  -> static UI
Firebase Auth     -> anonymous/member identity
Firestore         -> profiles, leaderboards, pack metadata
Cloud Functions   -> Pack Maker search, KUGNUS/GPT calls, private API keys
```

Do not move LLM keys or DuckDuckGo/search credentials into browser code.

See `FIREBASE_MIGRATION.md` before starting the migration. It lists the exact
Firebase Console inputs, Firestore collections, rules boundaries, server API
layer, and E2E gates required before Firebase can replace the current release
shape.

Run release preflight before deploying the current Node backend:

```bash
DEPLOY_TARGET=node npm run release:check
```

To validate a filled production env file locally before entering values in the deployment dashboard:

```bash
RELEASE_ENV_FILE=.env.production DEPLOY_TARGET=node npm run release:check
```

This intentionally fails if release env still uses `LLM_BASE_URL` direct local/Ollama routing instead of a public `https://` KUGNUS gateway. For a future Firebase release:

```bash
DEPLOY_TARGET=firebase npm run release:check
```

That target requires `firebase.json`, `.firebaserc`, `firestore.rules`, and a Functions/Cloud Run API layer for KUGNUS, DuckDuckGo, Pack Maker, and private keys.

When a release preflight fails, inspect the JSON `nextActions` field first. It is
the deployment punch list, not just a generic error dump.

## System Doctor

Use the doctor command when the local app feels inconsistent and you need a single evidence report:

```bash
npm run doctor
```

The output groups checks as `PASS`, `WARN`, `BLOCKED`, or `FAIL`. It reports the active KUGNUS route, DB readiness, release blockers, and whether the current environment is still using direct Ollama routing. For a heavier local sweep:

```bash
npm run doctor:deep
```

Add `-- --packmaker` only when you intentionally want the slow real KUGNUS Pack Maker 50-item E2E included.

## Product Rules

See `AGENTS.md` for the working product and verification rules used during implementation.
