import { generateMessages } from './messaging.js';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
export const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
const GOOGLE_FREE_TIER_MODELS = new Set(['gemini-3.5-flash', 'gemini-2.5-flash-lite']);
const DEFAULT_OPENROUTER_FALLBACK_MODELS = [
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free'
];

export function isGoogleFreeTierModel(model) {
  return GOOGLE_FREE_TIER_MODELS.has(String(model || '').trim());
}

export function isOpenRouterFreeModel(model) {
  const value = String(model || '').trim();
  return value === DEFAULT_OPENROUTER_MODEL || value.endsWith(':free');
}

export async function generateMessagesWithProvider(lead, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const attempts = [];
  const googleApiKey = env.GOOGLE_AI_API_KEY || env.GEMINI_API_KEY;

  if (googleApiKey) {
    const model = env.GOOGLE_AI_MODEL || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    if (!isGoogleFreeTierModel(model)) {
      throw new Error('Only Google models with a documented free tier are allowed.');
    }
    attempts.push({
      provider: 'google',
      model,
      generate: () => generateMessagesWithGemini(lead, { env, fetchImpl, apiKey: googleApiKey, model })
    });
  }

  if (env.OPENROUTER_API_KEY) {
    const model = env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
    if (!isOpenRouterFreeModel(model)) {
      throw new Error('Only free OpenRouter models are allowed. Use ' + DEFAULT_OPENROUTER_MODEL + ' or a model id ending in :free.');
    }
    attempts.push({
      provider: 'openrouter',
      model,
      generate: () => generateMessagesWithOpenRouter(lead, {
        env,
        fetchImpl,
        fallbackMode: Boolean(googleApiKey)
      })
    });
  }

  if (env.OPENAI_API_KEY) {
    const model = env.OPENAI_MODEL || 'gpt-5.2';
    attempts.push({
      provider: 'openai',
      model,
      generate: () => generateMessagesWithOpenAI(lead, { env, fetchImpl })
    });
  }

  if (!attempts.length) {
    return {
      ...generateMessages(lead),
      provider: 'local',
      model: null
    };
  }

  const errors = [];
  for (const attempt of attempts) {
    try {
      return await attempt.generate();
    } catch (error) {
      errors.push(attempt.provider + ': ' + (error?.message || 'provider unavailable'));
    }
  }

  return {
    ...generateMessages(lead),
    provider: 'local-fallback',
    model: null,
    requestedProvider: attempts.map((attempt) => attempt.provider).join(' -> '),
    requestedModel: attempts.map((attempt) => attempt.model).join(' -> '),
    fallbackReason: errors.join(' | ').slice(0, 240)
  };
}

async function generateMessagesWithGemini(lead, { env, fetchImpl, apiKey, model }) {
  if (!fetchImpl) throw new Error('Fetch is not available for Gemini requests.');

  const response = await fetchImpl(
    GEMINI_MODELS_URL + '/' + encodeURIComponent(model) + ':generateContent',
    {
      method: 'POST',
      signal: providerTimeoutSignal(env.GOOGLE_AI_TIMEOUT_MS, 18000, 20000),
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: 'Generate professional, student-focused enrollment outreach for EFOS. Follow the JSON schema exactly. Do not make false promises.'
          }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: buildMessagePrompt(lead) }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200,
          thinkingConfig: { thinkingLevel: 'minimal' },
          responseMimeType: 'application/json',
          responseJsonSchema: messageJsonSchema()
        }
      })
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Gemini message generation failed.');
  }

  const content = (payload.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('');
  const parsed = parseMessageJson(content, 'Google Gemini');
  return {
    ...parsed,
    provider: 'google',
    model
  };
}

function messageJsonSchema() {
  return {
    type: 'object',
    properties: {
      whatsapp: {
        type: 'string',
        description: 'A helpful WhatsApp message under 80 words.'
      },
      email: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          body: { type: 'string' }
        },
        required: ['subject', 'body']
      },
      sms: {
        type: 'string',
        description: 'A concise SMS under 160 characters.'
      }
    },
    required: ['whatsapp', 'email', 'sms']
  };
}
async function generateMessagesWithOpenRouter(lead, { env, fetchImpl, fallbackMode = false }) {
  if (!fetchImpl) throw new Error('Fetch is not available for OpenRouter requests.');

  const errors = [];
  const models = openRouterModels(env).slice(0, fallbackMode ? 1 : 3);
  for (const [index, model] of models.entries()) {
    try {
      return await requestOpenRouterModel(lead, model, {
        env,
        fetchImpl,
        timeoutMs: openRouterAttemptTimeout(env, index, fallbackMode)
      });
    } catch (error) {
      errors.push(error?.message || model + ' was unavailable.');
    }
  }

  throw new Error(errors.join(' | ') || 'All configured free OpenRouter models were unavailable.');
}

async function requestOpenRouterModel(lead, model, { env, fetchImpl, timeoutMs }) {
  const response = await fetchImpl(OPENROUTER_CHAT_URL, {
    method: 'POST',
    signal: providerTimeoutSignal(timeoutMs, timeoutMs, timeoutMs),
    headers: {
      authorization: 'Bearer ' + env.OPENROUTER_API_KEY,
      'content-type': 'application/json',
      'http-referer': env.OPENROUTER_HTTP_REFERER || 'http://127.0.0.1:4178',
      'x-openrouter-title': env.OPENROUTER_APP_TITLE || 'EFOS LeadFlow'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You generate JSON-only enrollment outreach copy for EFOS. Never include markdown.'
        },
        {
          role: 'user',
          content: buildMessagePrompt(lead)
        }
      ],
      temperature: 0.3,
      max_tokens: 900,
      response_format: { type: 'json_object' }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(model + ': ' + (payload.error?.message || payload.message || 'OpenRouter message generation failed.'));
  }

  const parsed = parseMessageJson(readMessageContent(payload.choices?.[0]?.message?.content), 'OpenRouter');
  return {
    ...parsed,
    provider: 'openrouter',
    model: payload.model || model
  };
}

function openRouterAttemptTimeout(env, index, fallbackMode = false) {
  if (fallbackMode) {
    const requested = Number(env.OPENROUTER_FALLBACK_TIMEOUT_MS);
    return Number.isFinite(requested) ? Math.min(8000, Math.max(4000, requested)) : 7500;
  }

  if (index === 0) {
    const requested = Number(env.OPENROUTER_PRIMARY_TIMEOUT_MS || env.OPENROUTER_TIMEOUT_MS);
    return Number.isFinite(requested) ? Math.min(18000, Math.max(8000, requested)) : 16000;
  }

  const requested = Number(env.OPENROUTER_FALLBACK_TIMEOUT_MS);
  return Number.isFinite(requested) ? Math.min(5000, Math.max(3000, requested)) : 4500;
}

function openRouterModels(env) {
  const configured = env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const customFallbacks = String(env.OPENROUTER_FALLBACK_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  const candidates = [configured, ...customFallbacks, ...DEFAULT_OPENROUTER_FALLBACK_MODELS];

  return [...new Set(candidates)]
    .filter(isOpenRouterFreeModel)
    .slice(0, 3);
}
async function generateMessagesWithOpenAI(lead, { env, fetchImpl }) {
  if (!fetchImpl) throw new Error('Fetch is not available for OpenAI requests.');

  const model = env.OPENAI_MODEL || 'gpt-5.2';
  const response = await fetchImpl(RESPONSES_URL, {
    method: 'POST',
    signal: providerTimeoutSignal(env.OPENAI_TIMEOUT_MS),
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ model, input: buildMessagePrompt(lead) })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'OpenAI message generation failed.');

  const parsed = parseOpenAIMessagePayload(payload);
  return { ...parsed, provider: 'openai', model };
}

function buildMessagePrompt(lead) {
  return [
    'Generate JSON only with keys: whatsapp, email, sms.',
    'email must be an object with subject and body.',
    'WhatsApp must stay under 80 words. SMS must stay under 160 characters.',
    'Use the lead exact full name in WhatsApp, email body, and SMS.',
    'Tone: helpful, professional, student-focused, no false promises.',
    `Lead: ${JSON.stringify({
      name: lead.name,
      city: lead.city,
      courseInterest: lead.courseInterest,
      qualification: lead.qualification,
      temperature: lead.temperature,
      score: lead.score
    })}`
  ].join('\n');
}

function parseOpenAIMessagePayload(payload) {
  const text = payload.output_text || collectOutputText(payload);
  return parseMessageJson(text, 'OpenAI');
}

function parseMessageJson(text, providerName) {
  try {
    const cleaned = extractJsonObject(stripJsonFence(text));
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed.whatsapp !== 'string' ||
      typeof parsed.email?.subject !== 'string' ||
      typeof parsed.email?.body !== 'string' ||
      typeof parsed.sms !== 'string'
    ) {
      throw new Error(`${providerName} response JSON is missing required message fields.`);
    }
    return parsed;
  } catch (error) {
    throw new Error(`${providerName} response was not valid message JSON: ${error.message}`);
  }
}

function stripJsonFence(text) {
  const value = String(text || '').trim();
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : value;
}

function extractJsonObject(text) {
  const value = String(text || '').trim();
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  return start >= 0 && end > start ? value.slice(start, end + 1) : value;
}

function readMessageContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => typeof part === 'string' ? part : part?.text || part?.content || '').join('');
  }
  return content?.text || content?.content || '';
}

function providerTimeoutSignal(value, fallbackMs = 24000, maxMs = 26000) {
  const requested = Number(value);
  const timeoutMs = Number.isFinite(requested)
    ? Math.min(maxMs, Math.max(3000, requested))
    : fallbackMs;
  return AbortSignal.timeout(timeoutMs);
}

function collectOutputText(payload) {
  const chunks = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n');
}