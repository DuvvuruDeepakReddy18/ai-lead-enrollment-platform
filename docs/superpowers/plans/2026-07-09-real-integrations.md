# Real Integrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real OpenAI, SMTP, Twilio-compatible SMS/WhatsApp, and follow-up webhook integrations to EFOS LeadFlow while keeping safe disabled states when credentials are missing.

**Architecture:** Provider code is isolated behind small adapters. Express routes call those adapters and persist delivery logs in SQLite. The React UI shows configuration status and sends through backend endpoints so secrets never reach the browser.

**Tech Stack:** Node, Express, SQLite, browser `fetch`, Nodemailer SMTP transport, React, Vite.

---

### Task 1: Configuration And Provider Tests

**Files:**
- Create: `tests/integrations.test.js`
- Create: `server/config.js`
- Create: `server/ai-provider.js`
- Create: `server/delivery.js`

- [ ] **Step 1: Write failing tests**

Test configured provider detection, OpenAI request shape, SMTP transport usage, Twilio form payloads, and not-configured behavior.

- [ ] **Step 2: Run `npm test`**

Expected: FAIL because new modules do not exist.

- [ ] **Step 3: Implement config and provider adapters**

Create `.env` loading, capability flags, OpenAI generation, SMTP email sending, Twilio SMS/WhatsApp sending, and webhook posting.

- [ ] **Step 4: Run `npm test`**

Expected: PASS for provider tests.

### Task 2: Delivery Logs And API Routes

**Files:**
- Modify: `server/db.js`
- Modify: `server/app.js`
- Modify: `tests/api.test.js`

- [ ] **Step 1: Write failing API tests**

Test `/api/integrations`, `/api/leads/:id/send/email`, `/api/leads/:id/send/sms`, `/api/leads/:id/send/whatsapp`, `/api/leads/:id/send/webhook`, and delivery log persistence.

- [ ] **Step 2: Run `npm test`**

Expected: FAIL because API routes and delivery table are missing.

- [ ] **Step 3: Implement routes and persistence**

Add `deliveries` table, log helpers, integration status endpoint, real send endpoints, and webhook endpoint.

- [ ] **Step 4: Run `npm test`**

Expected: PASS for all backend tests.

### Task 3: Dashboard And Documentation

**Files:**
- Modify: `src/api.js`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Create: `.env.example`
- Modify: `README.md`
- Modify: `SUBMISSION_GUIDE.md`

- [ ] **Step 1: Wire frontend API helpers**

Add helpers for integration status, delivery logs, real send buttons, and webhook trigger.

- [ ] **Step 2: Update dashboard UI**

Show provider status, disabled send buttons, delivery feedback, and recent delivery logs.

- [ ] **Step 3: Document environment setup**

Add `.env.example` and README instructions for OpenAI, SMTP, Twilio, WhatsApp, and webhook configuration.

- [ ] **Step 4: Run verification**

Run `npm test`, `npm run build`, and a local browser smoke check.

