# Superseded production note

This earlier MVP note described the first self-contained local version. It has since been upgraded with OpenRouter free-model enforcement, Supabase/Postgres storage, real provider adapters, and webhook intake. See PDF_REQUIREMENTS_AUDIT.md and README.md for the current state.

# AI Lead Enrollment Platform Design

## Goal

Build a complete local MVP for the PDF brief: an AI-powered student lead qualification and enrollment automation system for EFOS. The app must collect leads, organize them, score lead quality, generate personalized outreach, model follow-up automation, assign counselors, and show conversion analytics.

## Scope

The deliverable is a self-contained full-stack project in `ai-lead-enrollment-platform`. It runs locally without Supabase, MySQL, n8n, Zapier, OpenAI, Gemini, or OpenRouter accounts. External integrations are represented by clean local adapter boundaries and deterministic fallback logic so the submission is demo-ready on any machine.

## User Experience

The first screen is the actual operations dashboard, not a landing page. It uses a professional EdTech SaaS layout with a left navigation rail, top search/filter controls, KPI strip, lead inbox table, selected lead detail panel, score breakdown, follow-up queue, counselor assignment card, and conversion/source analytics. The lead registration form is available as a primary workflow and creates scored leads immediately.

## Functional Requirements

- Lead collection form with name, email, phone, city, qualification, source, course interest, age, brochure download, and website visit count.
- Lead management dashboard with search, filters, sorting, status labels, and row selection.
- AI-style scoring engine based on the PDF rules: BTech interest, age 16-18, 12th completion, brochure download, and more than 3 website visits.
- Lead categories: Cold for 0-40, Warm for 41-70, Hot for 71-100.
- Personalized WhatsApp, email, and SMS generation under local fallback logic.
- Follow-up plan for Day 1, Day 3, Day 5, Day 7, and Day 10.
- Counselor assignment when score is greater than 80.
- Analytics for total leads, hot leads, qualified leads, enrollments, conversion rate, enrollment rate, and source performance.

## Architecture

The frontend is React + Vite. The backend is Node + Express. Persistence uses Node's built-in `node:sqlite` module through a small database layer, avoiding native npm SQLite packages. The backend exposes JSON APIs and serves the built frontend in production.

Core business logic is isolated in small modules:

- `server/scoring.js`: lead scoring and category calculation.
- `server/messaging.js`: WhatsApp, email, and SMS text generation.
- `server/followups.js`: automation schedule creation.
- `server/analytics.js`: aggregate dashboard metrics.
- `server/db.js`: SQLite schema, seeding, and repository operations.
- `server/app.js`: Express routes.

## Verification

Automated tests cover scoring, messaging, follow-up generation, analytics, and API behavior using Node's built-in test runner. Build verification uses `npm run build`. Browser verification checks the dashboard, lead creation flow, filtering, selected lead detail, message generation, and mobile layout.

## Non-Goals

The MVP does not send real WhatsApp, email, or SMS messages. It does not connect to Supabase/MySQL or external workflow tools. It does not call paid AI APIs by default. The README documents where those adapters would plug in.


