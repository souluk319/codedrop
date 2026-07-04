# CodeDrop Agent Guidelines

## Product Principles
- Do not block the first screen behind account creation.
- Default flow is guest-first: users can enter the app, inspect modes, and play official DROP packs without signing in.
- Ask for login only at the moment a server-backed feature is needed: Pack Maker generation, saving packs, public review submission, custom pack ranking, official score upload, account deletion.
- If a feature is unavailable to guests, show a clear upgrade prompt in that feature context. Do not fail with raw `Session expired`.
- Never let stale localStorage auth produce a half-logged-in UI. Validate restored sessions on boot and either refresh them or return to a clean guest/login state.
- Language toggles are product-wide, not decorative. If ENG/KOR exists anywhere, menus, descriptions, placeholders, CTA buttons, and feature-gating popups must follow the same language state.
- Product names and technical command names may remain literal, but explanatory UI text must not mix Korean and English accidentally.

## Pack Maker Rules
- Pack Maker may be opened by guests.
- Guest users can view the editor and understand the feature, but ASK/SAVE/SUBMIT must prompt login instead of calling protected APIs.
- Natural-language prompts must work, not only perfect demo prompts.
- A request like `자동차 정비소에 취직하는데 한글로된 자동차정비에 자주등장하는 자동차부품 단어 50개만 뽑아서 카 파츠 팩 만들어줘` is the baseline E2E prompt.
- Do not report Pack Maker complete until browser E2E proves generation, editor rows, save, SELECT PACK selection, and DROP play.

## LLM Rules
- KUGNUS SERVER is the default engine for learning chat and Pack Maker.
- If KUGNUS seems offline, re-check `/api/llm/kugnus/health` immediately before showing a fallback prompt.
- Do not switch to GPT based only on stale cached health.
- If the browser shows an auth/session error, fix auth/session first. Do not describe it as an LLM delay or model-quality issue.

## Verification Rules
- The visible in-app browser is the source of truth for UI state.
- Static checks are necessary but never enough for "done".
- Use `npm run verify`, server health, DB readiness, and browser E2E for user-facing features.
- Final reports must say `PASS`, `FAIL`, or `BLOCKED` for unverified flows.
- Do not claim completion when E2E was not run or did not pass.
