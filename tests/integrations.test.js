import test from 'node:test';
import assert from 'node:assert/strict';

import { getIntegrationStatus } from '../server/config.js';
import { generateMessagesWithProvider } from '../server/ai-provider.js';
import { sendEmailMessage, sendTwilioMessage, triggerFollowUpWebhook } from '../server/delivery.js';

const lead = {
  id: 'lead-real-1',
  name: 'Ananya Reddy',
  email: 'ananya@example.com',
  phone: '9876543210',
  city: 'Hyderabad',
  qualification: '12th Completed Student',
  courseInterest: 'BTech',
  temperature: 'Hot',
  score: 100
};

test('detects configured real providers without exposing secrets', () => {
  const status = getIntegrationStatus({
    OPENAI_API_KEY: 'sk-test',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'sender@example.com',
    SMTP_PASS: 'secret',
    SMTP_FROM: 'EFOS <sender@example.com>',
    TWILIO_ACCOUNT_SID: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    TWILIO_AUTH_TOKEN: 'token',
    TWILIO_SMS_FROM: '+15551234567',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+15551234567',
    FOLLOWUP_WEBHOOK_URL: 'https://hooks.example.com/leadflow'
  });

  assert.deepEqual(status, {
    google: { configured: false, model: 'gemini-3.5-flash', freeTierOnly: true, modelAllowed: true },
    openrouter: { configured: false, model: 'openrouter/free', freeOnly: true, modelAllowed: true },
    openai: { configured: true, model: 'gpt-5.2' },
    supabase: { configured: false, url: null, mode: 'sqlite-fallback' },
    smtp: { configured: true, from: 'EFOS <sender@example.com>' },
    sms: { configured: true, provider: 'twilio' },
    whatsapp: { configured: true, provider: 'twilio' },
    webhook: { configured: true }
  });
});

test('uses Google Gemini as the primary structured outreach provider', async () => {
  const calls = [];
  const messages = await generateMessagesWithProvider(lead, {
    env: {
      GOOGLE_AI_API_KEY: 'google-test',
      GOOGLE_AI_MODEL: 'gemini-3.5-flash',
      OPENROUTER_API_KEY: 'sk-or-test',
      OPENROUTER_MODEL: 'openrouter/free'
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  whatsapp: 'Hi Ananya, EFOS can help with your BTech admission plan.',
                  email: {
                    subject: 'Your BTech admission plan',
                    body: 'Hi Ananya, here are your next EFOS counseling steps.'
                  },
                  sms: 'Hi Ananya, reply YES for EFOS BTech counseling.'
                })
              }]
            },
            finishReason: 'STOP'
          }]
        })
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent');
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'google-test');
  const requestBody = JSON.parse(calls[0].options.body);
  assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
  assert.equal(requestBody.generationConfig.thinkingConfig.thinkingLevel, 'minimal');
  assert.deepEqual(requestBody.generationConfig.responseJsonSchema.required, ['whatsapp', 'email', 'sms']);
  assert.equal(messages.provider, 'google');
  assert.equal(messages.model, 'gemini-3.5-flash');
});

test('falls back from Gemini to a strictly free OpenRouter model', async () => {
  const calls = [];
  const messages = await generateMessagesWithProvider(lead, {
    env: {
      GOOGLE_AI_API_KEY: 'google-test',
      OPENROUTER_API_KEY: 'sk-or-test',
      OPENROUTER_MODEL: 'nvidia/nemotron-nano-12b-v2-vl:free'
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) {
        return {
          ok: false,
          json: async () => ({ error: { message: 'Gemini capacity unavailable.' } })
        };
      }
      const body = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          model: body.model,
          choices: [{
            message: {
              content: JSON.stringify({
                whatsapp: 'Hi Ananya, EFOS can help with your BTech admission plan.',
                email: {
                  subject: 'Your BTech admission plan',
                  body: 'Hi Ananya, here are your next EFOS counseling steps.'
                },
                sms: 'Hi Ananya, reply YES for EFOS BTech counseling.'
              })
            }
          }]
        })
      };
    }
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /generativelanguage\.googleapis\.com/);
  assert.equal(JSON.parse(calls[1].options.body).model, 'nvidia/nemotron-nano-12b-v2-vl:free');
  assert.equal(messages.provider, 'openrouter');
});

test('uses OpenAI Responses API when an API key is configured', async () => {
  const calls = [];
  const messages = await generateMessagesWithProvider(lead, {
    env: {
      OPENAI_API_KEY: 'sk-test',
      OPENAI_MODEL: 'gpt-5.2'
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          output_text: JSON.stringify({
            whatsapp: 'Hi Ananya, your BTech admission profile is ready.',
            email: {
              subject: 'BTech admission guidance',
              body: 'Hi Ananya, EFOS can guide your BTech admission steps.'
            },
            sms: 'Hi Ananya, reply YES for EFOS BTech counseling.'
          })
        })
      };
    }
  });

  assert.equal(calls[0].url, 'https://api.openai.com/v1/responses');
  assert.equal(calls[0].options.headers.authorization, 'Bearer sk-test');
  assert.equal(JSON.parse(calls[0].options.body).model, 'gpt-5.2');
  assert.equal(messages.provider, 'openai');
  assert.match(messages.whatsapp, /Ananya/);
});

test('sends email through configured SMTP transport', async () => {
  const sent = [];
  const result = await sendEmailMessage({
    lead,
    message: {
      subject: 'BTech guidance',
      body: 'Hello from EFOS'
    },
    env: {
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'sender@example.com',
      SMTP_PASS: 'secret',
      SMTP_FROM: 'EFOS <sender@example.com>'
    },
    transportFactory: (options) => ({
      options,
      sendMail: async (payload) => {
        sent.push({ options, payload });
        return { messageId: 'smtp-123', accepted: [payload.to] };
      }
    })
  });

  assert.equal(result.status, 'sent');
  assert.equal(result.provider, 'smtp');
  assert.equal(result.providerMessageId, 'smtp-123');
  assert.equal(sent[0].payload.to, 'ananya@example.com');
});

test('sends SMS and WhatsApp through Twilio-compatible Messages API', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options, body: options.body.toString() });
    return {
      ok: true,
      json: async () => ({ sid: 'SM123', status: 'queued' })
    };
  };
  const env = {
    TWILIO_ACCOUNT_SID: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    TWILIO_AUTH_TOKEN: 'token',
    TWILIO_SMS_FROM: '+15551234567',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+15551234567'
  };

  const sms = await sendTwilioMessage({ lead, channel: 'sms', body: 'Hello SMS', env, fetchImpl });
  const whatsapp = await sendTwilioMessage({ lead, channel: 'whatsapp', body: 'Hello WhatsApp', env, fetchImpl });

  assert.equal(sms.status, 'queued');
  assert.equal(whatsapp.status, 'queued');
  assert.match(calls[0].url, /\/Messages\.json$/);
  assert.match(calls[0].body, /To=%2B919876543210/);
  assert.match(calls[0].body, /From=%2B15551234567/);
  assert.match(calls[1].body, /To=whatsapp%3A%2B919876543210/);
  assert.match(calls[1].body, /From=whatsapp%3A%2B15551234567/);
});

test('reports not configured instead of sending when provider credentials are missing', async () => {
  const email = await sendEmailMessage({ lead, message: { subject: 'x', body: 'y' }, env: {} });
  const sms = await sendTwilioMessage({ lead, channel: 'sms', body: 'Hello', env: {}, fetchImpl: async () => assert.fail('should not call fetch') });
  const webhook = await triggerFollowUpWebhook({ lead, followup: { day: 1 }, env: {}, fetchImpl: async () => assert.fail('should not call fetch') });

  assert.equal(email.status, 'not_configured');
  assert.equal(sms.status, 'not_configured');
  assert.equal(webhook.status, 'not_configured');
});


test('uses OpenRouter free chat completion when an OpenRouter key is configured', async () => {
  const calls = [];
  const messages = await generateMessagesWithProvider(lead, {
    env: {
      OPENROUTER_API_KEY: 'sk-or-test',
      OPENROUTER_MODEL: 'openrouter/free',
      OPENROUTER_HTTP_REFERER: 'http://127.0.0.1:4178',
      OPENROUTER_APP_TITLE: 'EFOS LeadFlow Test'
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  whatsapp: 'Hi Ananya, EFOS can help with your BTech admission plan.',
                  email: {
                    subject: 'Your BTech admission plan',
                    body: 'Hi Ananya, here are the next EFOS counseling steps for BTech.'
                  },
                  sms: 'Hi Ananya, reply YES for EFOS BTech counseling.'
                })
              }
            }
          ]
        })
      };
    }
  });

  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calls[0].options.headers.authorization, 'Bearer sk-or-test');
  assert.equal(calls[0].options.headers['http-referer'], 'http://127.0.0.1:4178');
  assert.equal(calls[0].options.headers['x-openrouter-title'], 'EFOS LeadFlow Test');
  const requestBody = JSON.parse(calls[0].options.body);
  assert.equal(requestBody.model, 'openrouter/free');
  assert.deepEqual(requestBody.response_format, { type: 'json_object' });
  assert.equal(requestBody.max_tokens, 900);
  assert.equal(messages.provider, 'openrouter');
  assert.equal(messages.model, 'openrouter/free');
  assert.match(messages.whatsapp, /Ananya/);
});

test('fails over between free OpenRouter models when the first endpoint is unavailable', async () => {
  const calls = [];
  const messages = await generateMessagesWithProvider(lead, {
    env: {
      OPENROUTER_API_KEY: 'sk-or-test',
      OPENROUTER_MODEL: 'nvidia/nemotron-nano-12b-v2-vl:free'
    },
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body.model);
      if (calls.length === 1) {
        return {
          ok: false,
          json: async () => ({ error: { message: 'Provider capacity unavailable.' } })
        };
      }
      return {
        ok: true,
        json: async () => ({
          model: body.model,
          choices: [{
            message: {
              content: JSON.stringify({
                whatsapp: 'Hi Ananya, EFOS can help with your BTech admission plan.',
                email: {
                  subject: 'Your BTech admission plan',
                  body: 'Hi Ananya, here are your next EFOS counseling steps.'
                },
                sms: 'Hi Ananya, reply YES for EFOS BTech counseling.'
              })
            }
          }]
        })
      };
    }
  });

  assert.deepEqual(calls, [
    'nvidia/nemotron-nano-12b-v2-vl:free',
    'google/gemma-4-26b-a4b-it:free'
  ]);
  assert.equal(messages.provider, 'openrouter');
  assert.equal(messages.model, 'google/gemma-4-26b-a4b-it:free');
});

test('rejects paid OpenRouter model identifiers before making a request', async () => {
  await assert.rejects(
    () => generateMessagesWithProvider(lead, {
      env: {
        OPENROUTER_API_KEY: 'sk-or-test',
        OPENROUTER_MODEL: 'anthropic/claude-sonnet-5'
      },
      fetchImpl: async () => assert.fail('paid model should not be called')
    }),
    /free OpenRouter models/i
  );
});
test('returns personalized fallback copy when a free provider is unavailable', async () => {
  const messages = await generateMessagesWithProvider(lead, {
    env: {
      OPENROUTER_API_KEY: 'sk-or-test',
      OPENROUTER_MODEL: 'openrouter/free'
    },
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({ error: { message: 'Free model capacity is temporarily unavailable.' } })
    })
  });

  assert.equal(messages.provider, 'local-fallback');
  assert.equal(messages.requestedProvider, 'openrouter');
  assert.equal(messages.requestedModel, 'openrouter/free');
  assert.match(messages.whatsapp, /Ananya/);
  assert.match(messages.email.body, /BTech/);
  assert.match(messages.fallbackReason, /temporarily unavailable/i);
});
