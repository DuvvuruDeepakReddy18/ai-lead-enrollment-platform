# OpenRouter Supabase Production Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make EFOS LeadFlow use real OpenRouter free-model AI and Supabase/Postgres persistence while preserving local SQLite fallback.

**Architecture:** Add provider adapters behind existing API routes. OpenRouter is used only when `OPENROUTER_API_KEY` is set and the selected model is `openrouter/free` or ends with `:free`. Supabase is used only when server-side Supabase credentials are set; otherwise the existing SQLite store remains the fallback.

**Tech Stack:** Node.js, Express, React/Vite, OpenRouter Chat Completions REST API, Supabase REST/PostgREST, PostgreSQL SQL schema.

---

### Task 1: OpenRouter Free-Only AI Adapter

**Files:**
- Modify: `server/ai-provider.js`
- Modify: `server/config.js`
- Test: `tests/integrations.test.js`

- [x] Write failing tests proving OpenRouter calls `/api/v1/chat/completions`, parses JSON, and rejects non-free model IDs.
- [x] Implement `isOpenRouterFreeModel`, default `OPENROUTER_MODEL=openrouter/free`, and OpenRouter response parsing.
- [x] Expose OpenRouter integration status without leaking secrets.
- [x] Run `npm test` and verify the new tests pass.

### Task 2: Supabase Storage Adapter

**Files:**
- Create: `server/storage.js`
- Create: `server/supabase-store.js`
- Modify: `server/app.js`
- Modify: `server/index.js`
- Test: `tests/supabase-store.test.js`

- [x] Write failing tests using a mocked `fetch` to verify Supabase list/create/update/delivery calls.
- [x] Add `createStorage` to select Supabase when `SUPABASE_URL` and a server-side key are configured.
- [x] Make app routes async and route all lead/delivery reads and writes through the storage interface.
- [x] Preserve current SQLite behavior for tests and local fallback.

### Task 3: Supabase Schema and Setup Docs

**Files:**
- Create: `supabase/schema.sql`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `PDF_REQUIREMENTS_AUDIT.md`

- [x] Write PostgreSQL schema for `leads` and `deliveries` with lowercase identifiers, constraints, FK index, status check, and RLS enabled.
- [x] Add `.env.example` entries for Supabase and OpenRouter.
- [x] Document that secret/service keys stay server-side and are never exposed to the browser.
- [x] Mark Supabase/OpenRouter as implemented but requiring user credentials.

### Task 4: Verification

**Files:**
- Runtime checks only

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Restart local server on `http://127.0.0.1:4178`.
- [x] Verify `/api/integrations` reports OpenRouter and Supabase status fields.
