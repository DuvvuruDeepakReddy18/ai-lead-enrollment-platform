# EFOS LeadFlow

AI-powered student lead qualification and enrollment automation MVP.

Live app: https://ai-lead-enrollment-platform.vercel.app

## What It Builds

This project implements the PDF brief as a runnable full-stack application:

- Lead collection form
- Lead management dashboard
- AI-style lead scoring engine
- Personalized WhatsApp, email, and SMS generation
- Day 1, 3, 5, 7, and 10 follow-up automation model
- Counselor assignment for scores greater than 80
- Enrollment and source analytics dashboard
- Real-ready OpenRouter, Supabase, SMTP, Twilio, and webhook integrations

## Run Locally

```bash
npm install
npm run dev
```

Open the frontend at:

```text
http://127.0.0.1:5173
```

The API runs at:

```text
http://127.0.0.1:4178
```

After `npm run build`, the Express server can serve the built app at:

```text
http://127.0.0.1:4178
```

## Verify

```bash
npm test
npm run build
```

## Demo Flow

1. Open the dashboard.
2. Click `New Lead`.
3. Add a BTech student aged 16-18 with 12th completed, brochure downloaded, and more than 3 website visits.
4. Confirm the lead receives a Hot score and counselor assignment.
5. Select the lead in the inbox.
6. Open AI Intelligence to review scoring, regenerate or copy outreach, and send through a connected provider or prefilled manual handoff.
7. Review the dedicated Follow-Ups and Analytics workspaces.

## Real Integrations

Copy `.env.example` to `.env` and fill in only the providers you want to use:

```bash
copy .env.example .env
```

Provider behavior:

- `OPENROUTER_API_KEY` enables real AI-generated WhatsApp/email/SMS copy through OpenRouter Chat Completions.
- OpenRouter is strictly free-only: `OPENROUTER_MODEL` must be `openrouter/free` or a model id ending in `:free`; paid model IDs are rejected before any API call.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` enable cloud persistence through Supabase/Postgres.
- If Supabase is not configured, the app automatically falls back to local SQLite.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` enable real email sending through SMTP.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_SMS_FROM` enable real SMS sending.
- `TWILIO_WHATSAPP_FROM` enables real WhatsApp sending through Twilio's WhatsApp channel.
- `PHONE_DEFAULT_COUNTRY_CODE` defaults local 10-digit student phone numbers to `+91` before Twilio sends.
- `FOLLOWUP_WEBHOOK_URL` enables a real automation webhook for n8n, Zapier, Make, or AgentHive.
- `POST /api/webhooks/leads/:source` accepts inbound lead payloads from external tools and scores them through the same pipeline.

Secrets stay on the server. The browser only receives configured/not-configured status flags. AI drafting always returns usable personalized copy: OpenRouter uses JSON mode with a bounded timeout, then falls back locally if a free model is unavailable. Without SMTP or Twilio credentials, the UI can still copy the draft or open a prefilled email, SMS, or WhatsApp handoff; automatic delivery remains available when those providers are configured.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase/schema.sql` from this repo.
4. Add these values to `.env`:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Use the service role key only on the server. Never expose it in frontend code or a public repo.

## Deploy To Vercel

The repository includes a Vercel serverless entry and SPA routing configuration.

1. Run `supabase/schema.sql` in your Supabase SQL Editor.
2. Deploy the project with `npx vercel@latest --prod`.
3. In Vercel, open Project Settings > Environment Variables and add at minimum:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openrouter/free
OPENROUTER_HTTP_REFERER=https://your-vercel-domain.vercel.app
OPENROUTER_APP_TITLE=EFOS LeadFlow
```

Add the SMTP, Twilio, and follow-up webhook variables from `.env.example` only for the delivery channels you want to enable. Redeploy after adding or changing variables.

Supabase is required for durable production data. Without Supabase variables, the Vercel function uses a seeded in-memory fallback that can reset whenever a function instance restarts.
## Production Notes

Real sending can cost money and transmit student contact data to the configured provider. Test with your own verified phone number/email first.


