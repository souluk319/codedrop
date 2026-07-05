# CodeDrop Firebase Migration Plan

This document is the handoff checklist for moving CodeDrop from the current
Node/Express + MySQL release shape to Firebase Hosting/Auth/Firestore plus a
server-side API layer.

## Non-Negotiables

- Do not put `KUGNUS_GATEWAY_API_KEY`, OpenAI keys, DuckDuckGo keys, or any other
  private key in browser JavaScript.
- Firebase Hosting/Auth/Firestore can replace static hosting, sessions, users,
  profiles, packs, and leaderboards.
- Pack Maker search, KUGNUS/GPT calls, score verification, public review, and
  any private-key work must stay behind Cloud Run or Cloud Functions.
- Guest-first product behavior remains: official packs are playable without
  signup; Pack Maker generation/save, score upload, custom pack ranking, public
  review, and account deletion require identity.
- The baseline Pack Maker prompt must still pass end to end:

```text
자동차 정비소에 취직하는데 한글로된 자동차정비에 자주등장하는 자동차부품 단어 50개만 뽑아서 카 파츠 팩 만들어줘
```

## Inputs Needed Before Coding The Migration

From Firebase Console:

- Firebase project id.
- Web app `firebaseConfig`:
  - `apiKey`
  - `authDomain`
  - `projectId`
  - `storageBucket`
  - `messagingSenderId`
  - `appId`
- Enabled Auth providers:
  - Anonymous sign-in, required for guest-first identity.
  - Optional later: email/password or Google sign-in for account upgrade.
- Firestore region.
- Hosting site id, if different from project id.

From KUGNUS/server deployment:

- `KUGNUS_GATEWAY_BASE_URL=https://<public-gateway>/v1`
- `KUGNUS_GATEWAY_API_KEY`
- `KUGNUS_GATEWAY_MODEL=gemma4:12b-it-qat`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.4-mini`
- `EMBEDDING_MODEL=embeddinggemma:latest`
- `EMBEDDING_DIMENSIONS=768`
- DuckDuckGo/search API key, if Pack Maker grounding needs a paid/keyed API.
- Admin identity list for public pack review.

## Target Runtime Shape

```text
Firebase Hosting
  - index.html, js/, assets/, sound/, legal pages
  - rewrite /api/** to Cloud Run or Functions

Firebase Auth
  - anonymous uid for first play
  - nickname profile document
  - later account linking for durable identity

Firestore
  - profiles
  - nickname claims
  - official score submissions
  - custom packs
  - custom pack items
  - custom pack score submissions

Cloud Run or Cloud Functions
  - /api/llm/kugnus/health
  - /api/learn-chat/stream
  - /api/pack-maker/chat/stream
  - /api/packs review/admin helpers if rules are not enough
  - score verification and anti-abuse checks
```

## Suggested Firestore Collections

```text
profiles/{uid}
  nickname
  nicknameKey
  isAnonymous
  createdAt
  updatedAt

nicknames/{nicknameKey}
  uid
  createdAt

officialScores/{scoreId}
  uid
  nickname
  score
  wpm
  accuracy
  difficulty
  pack
  createdAt

customPacks/{packId}
  ownerUid
  title
  description
  status        draft | pending | approved | rejected
  reviewReason
  createdAt
  updatedAt
  approvedAt

customPacks/{packId}/items/{itemId}
  term
  description
  sources
  sortOrder

customPacks/{packId}/scores/{scoreId}
  uid
  nickname
  score
  wpm
  accuracy
  difficulty
  createdAt
```

## Security Rules Shape

Rules should enforce these product facts:

- Everyone can read approved public packs.
- A signed-in user can read/write their own draft and pending packs.
- Only the owner can edit draft/pending packs.
- Approved packs cannot be edited directly by the owner; edits must go back
  through review.
- Guests with anonymous Firebase Auth may have a profile, but Pack Maker writes
  should still be controlled by product policy.
- Public review approval should be server/admin controlled, not arbitrary client
  writes.
- Score documents must be bounded by sane numeric ranges and required fields.

Do not deploy temporary `allow read, write: if true` rules.

## Migration Stages

1. **Scaffold Firebase config**
   - Add `firebase.json`, `.firebaserc`, and `firestore.rules`.
   - Add Firebase client initialization.
   - Keep the current Node server running while client auth is introduced.

2. **Auth bridge**
   - Replace local nickname/password session flow with Firebase Auth anonymous
     identity plus profile nickname.
   - Keep guest-first UX.
   - Make session restoration deterministic: no half-logged-in UI.

3. **Firestore read/write migration**
   - Move leaderboard reads/writes.
   - Move custom pack save/list/detail.
   - Keep Pack Maker generation on the server API.

4. **Server API extraction**
   - Move LLM/search endpoints to Cloud Run or Functions.
   - Keep KUGNUS and GPT keys server-side only.
   - Add Firebase ID token verification on protected API routes.

5. **Hosting rewrite**
   - Firebase Hosting serves static files.
   - `/api/**` rewrites to the deployed Cloud Run/Functions service.

6. **E2E gates**
   - Auth guest flow.
   - Pack Maker with KUGNUS gateway.
   - `카 파츠 팩` 50 item generation.
   - Save custom pack.
   - SELECT PACK custom pack play.
   - Official and custom leaderboards stay separated.
   - OCP Learn chat stream.
   - README/MUSIC/global UI smoke.

## Release Checks

Before Firebase deploy:

```bash
DEPLOY_TARGET=firebase npm run release:check
```

This must not pass until all of these exist:

- `firebase.json`
- Firebase Hosting rewrite from `/api/**` to Cloud Run or Functions
- `.firebaserc` with the real Firebase project id from Firebase Console, not a
  placeholder such as `codedrop-test`
- `firestore.rules`
- Firestore rules for `profiles`, `officialScores`, and `customPacks` without
  open development `allow read, write: if true` style rules
- a real Cloud Run or Functions API layer
- private API endpoints for `/api/llm/kugnus/health`,
  `/api/learn-chat/stream`, and `/api/pack-maker/chat/stream`
- public `https://` KUGNUS gateway variables
- no browser exposure of private KUGNUS/OpenAI/DuckDuckGo keys

Current Node release check remains:

```bash
DEPLOY_TARGET=node npm run release:check
```

Use it until the Firebase migration has passed browser E2E.
