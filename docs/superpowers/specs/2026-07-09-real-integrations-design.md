# Real Integrations Design

## Goal

Upgrade EFOS LeadFlow from a local demo into a real-ready enrollment automation app. The app should call live providers when credentials are configured and remain safe when credentials are missing.

## Provider Scope

- OpenAI Responses API generates WhatsApp, email, and SMS content when `OPENAI_API_KEY` is set.
- SMTP sends real email when SMTP environment variables are set.
- Twilio-compatible Messages API sends SMS and WhatsApp when Twilio credentials and senders are set.
- A generic webhook triggers n8n, Zapier, Make, or AgentHive follow-up automation when `FOLLOWUP_WEBHOOK_URL` is set.

## Safety And Configuration

No API key or provider secret is stored in source code. The app loads `.env` at runtime, exposes only configured/not-configured capability flags to the frontend, and logs delivery attempts without exposing secrets. Send buttons are disabled when the matching provider is not configured.

## User Experience

The dashboard keeps the current workflow. The message card gains provider status chips, real send buttons, a webhook trigger button, and a recent delivery log. When a send succeeds, the UI shows the provider status and ID. When missing credentials block a send, the UI explains which provider needs configuration.

## Data Model

Add a `deliveries` table with lead ID, channel, provider, status, recipient, provider message ID, error message, and timestamps. This makes real sends auditable and keeps the app useful even before external provider dashboards are opened.

## Verification

Tests mock external network and SMTP boundaries. They verify request payloads and behavior without sending real messages. Manual real-provider testing requires credentials in `.env`.

