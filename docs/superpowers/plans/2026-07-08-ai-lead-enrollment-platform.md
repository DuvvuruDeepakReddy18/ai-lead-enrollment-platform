# Superseded production note

This earlier MVP note described the first self-contained local version. It has since been upgraded with OpenRouter free-model enforcement, Supabase/Postgres storage, real provider adapters, and webhook intake. See PDF_REQUIREMENTS_AUDIT.md and README.md for the current state.

# AI Lead Enrollment Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable local full-stack MVP for EFOS lead collection, AI scoring, message personalization, follow-up automation, counselor assignment, and analytics.

**Architecture:** React + Vite provides the dashboard UI. Node + Express exposes JSON APIs and serves the production build. Node's built-in SQLite module stores leads locally while business logic remains testable in isolated modules.

**Tech Stack:** React, Vite, Express, Node `node:sqlite`, Node test runner, CSS modules through plain CSS.

---

## File Structure

- `package.json`: scripts and dependencies for the full app.
- `server/scoring.js`: score calculation and lead temperature category.
- `server/messaging.js`: deterministic WhatsApp, email, and SMS generators.
- `server/followups.js`: Day 1/3/5/7/10 follow-up schedule generator.
- `server/analytics.js`: dashboard metrics and source performance.
- `server/counselors.js`: counselor assignment rules.
- `server/db.js`: SQLite schema, seed data, and repository functions.
- `server/app.js`: Express API routes.
- `server/index.js`: runtime entrypoint.
- `scripts/dev.mjs`: starts API and Vite together for local development.
- `src/main.jsx`, `src/App.jsx`, `src/api.js`, `src/styles.css`: dashboard frontend.
- `tests/*.test.js`: behavior tests for core logic and API.
- `README.md`: setup, demo, architecture, and integration notes.

### Task 1: Core Lead Intelligence

**Files:**
- Create: `tests/scoring.test.js`
- Create: `tests/messaging.test.js`
- Create: `tests/followups.test.js`
- Create: `server/scoring.js`
- Create: `server/messaging.js`
- Create: `server/followups.js`
- Create: `server/counselors.js`

- [ ] **Step 1: Write failing tests**

Tests assert that a Rahul-style BTech lead scores 80, maps to Hot, receives a WhatsApp message under 80 words, gets five scheduled follow-ups, and receives a counselor only when score is above 80.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test`

Expected: FAIL because the production modules do not exist yet.

- [ ] **Step 3: Implement core modules**

Implement deterministic scoring, categories, message generators, follow-up schedule, and counselor assignment.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test`

Expected: PASS for core tests.

### Task 2: SQLite Repository And Express API

**Files:**
- Create: `tests/api.test.js`
- Create: `server/db.js`
- Create: `server/analytics.js`
- Create: `server/app.js`
- Create: `server/index.js`

- [ ] **Step 1: Write failing API tests**

Tests create an in-memory database, seed it, fetch leads, create a new lead, generate messages, and read analytics.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test`

Expected: FAIL because API and database modules are missing.

- [ ] **Step 3: Implement repository and API**

Implement schema creation, seed data, CRUD operations, analytics aggregation, and Express routes.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test`

Expected: PASS for all server tests.

### Task 3: React Dashboard

**Files:**
- Create: `index.html`
- Create: `vite.config.js`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/api.js`
- Create: `src/styles.css`

- [ ] **Step 1: Implement the dashboard shell**

Create a left navigation rail, header/search controls, KPI strip, lead table, selected detail panel, and analytics areas.

- [ ] **Step 2: Connect real API state**

Load leads and analytics from `/api`, submit new leads through the registration form, and request generated messages from the backend.

- [ ] **Step 3: Add responsive behavior**

Ensure desktop is table-first and mobile stacks into readable sections without overlap.

- [ ] **Step 4: Build verification**

Run: `npm run build`

Expected: Vite production build succeeds.

### Task 4: Demo Guide And Final Verification

**Files:**
- Create: `README.md`
- Create: `SUBMISSION_GUIDE.md`

- [ ] **Step 1: Document local setup**

Include `npm install`, `npm run dev`, API URL, app URL, and demo flow.

- [ ] **Step 2: Document project mapping**

Map each PDF phase to the implemented feature.

- [ ] **Step 3: Run final verification**

Run: `npm test`

Run: `npm run build`

Open the app locally, create a lead, verify score/category/counselor/message/follow-up/analytics behavior.


