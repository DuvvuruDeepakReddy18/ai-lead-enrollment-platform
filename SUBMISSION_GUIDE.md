# Submission Guide

## Project Title

AI-Powered Student Lead Qualification & Enrollment Automation System

## PDF Phase Mapping

| PDF Phase | Implemented Feature |
| --- | --- |
| Lead Collection System | `New Lead` form plus `POST /api/webhooks/leads/:source` for external intake |
| Lead Management Dashboard | Searchable, filterable, sortable Lead Inbox table with status updates |
| AI Lead Scoring Engine | Rule-based scoring in `server/scoring.js` with Cold/Warm/Hot categories |
| AI Personalized Messaging Engine | WhatsApp, email, and SMS content from local fallback or OpenRouter free models |
| Follow-Up Automation | Day 1, 3, 5, 7, and 10 timeline from `server/followups.js` plus webhook trigger |
| Counselor Assignment System | Score greater than 80 assigns a counselor from `server/counselors.js` |
| Analytics Dashboard | Total leads, hot leads, qualified leads, enrollments, conversion rate, enrollment rate, and source performance |
| Database Layer | Supabase/Postgres when configured, SQLite fallback for local demos |

## Recommended Demo Script

1. Start the project with `npm run dev`.
2. Show the Lead Inbox with sample leads.
3. Add a new high-intent BTech lead.
4. Explain the score breakdown: interest, education, engagement, age, and visits.
5. Show the generated WhatsApp message.
6. Show the follow-up timeline.
7. Show that counselor assignment happens only when score is greater than 80.
8. Update one lead to `Enrolled` and show analytics changing.
9. Show the integration badges for OpenRouter, Supabase, SMTP, SMS, WhatsApp, and webhook.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Local database: SQLite through Node's built-in `node:sqlite`
- Cloud database: Supabase/Postgres REST API
- AI provider: OpenRouter Chat Completions with free-model enforcement
- Testing: Node's built-in test runner

## Real Integration Setup

The project includes real provider adapters in addition to local fallback behavior:

- Real AI copy: OpenRouter when `OPENROUTER_API_KEY` is set. The app rejects paid model IDs unless the model is `openrouter/free` or ends with `:free`.
- Real cloud database: Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set after running `supabase/schema.sql`.
- Real email: SMTP through Nodemailer when SMTP credentials are set.
- Real SMS and WhatsApp: Twilio-compatible Messages API when Twilio credentials are set.
- Real workflow automation: webhook POST to n8n, Zapier, Make, or AgentHive when `FOLLOWUP_WEBHOOK_URL` is set.
- Phone formatting: local 10-digit student numbers default to `+91` through `PHONE_DEFAULT_COUNTRY_CODE`.
- Delivery audit: every send attempt is saved in the `deliveries` table.

For classroom/demo use, keep credentials empty and the UI will show missing-provider states. For live testing, configure `.env` and send only to consented test recipients.
