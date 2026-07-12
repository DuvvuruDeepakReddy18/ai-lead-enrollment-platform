import { generateMessages } from './messaging.js';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';

export function isOpenRouterFreeModel(model) {
  const value = String(model || '').trim();
  return value === DEFAULT_OPENROUTER_MODEL || value.endsWith(':free');
}

export async function generateMessagesWithProvider(lead, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  if (env.OPENROUTER_API_KEY) {
    const model = env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
    if (!isOpenRouterFreeModel(model)) {
      throw new Error(`Only free OpenRouter models are allowed. Use ${DEFAULT_OPENROUTER_MODEL} or a model id ending in :free.`);
    }
    return withRuntimeFallback(
      lead,
      { provider: 'openrouter', model },
      () => generateMessagesWithOpenRouter(lead, { env, fetchImpl })
    );
  }

  if (env.OPENAI_API_KEY) {
    const model = env.OPENAI_MODEL || 'gpt-5.2';
    return withRuntimeFallback(
      lead,
      { provider: 'openai', model },
      () => generateMessagesWithOpenAI(lead, { env, fetchImpl })
    );
  }

  return {
    ...generateMessages(lead),
    provider: 'local',
    model: null
  };
}

async function generateMessagesWithOpenRouter(lead, { env, fetchImpl }) {
  if (!fetchImpl) throw new Error('Fetch is not available for OpenRouter requests.');

  const model = env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const response = await fetchImpl(OPENROUTER_CHAT_URL, {
    method: 'POST',
    signal: providerTimeoutSignal(env.OPENROUTER_TIMEOUT_MS),
    headers: {
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
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
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: 'json_object' }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || 'OpenRouter message generation failed.');
  }

  const parsed = parseMessageJson(readMessageContent(payload.choices?.[0]?.message?.content), 'OpenRouter');
  return {
    ...parsed,
    provider: 'openrouter',
    model: payload.model || model
  };
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

async function withRuntimeFallback(lead, requested, generate) {
  try {
    return await generate();
  } catch (error) {
    return {
      ...generateMessages(lead),
      provider: 'local-fallback',
      model: null,
      requestedProvider: requested.provider,
      requestedModel: requested.model,
      fallbackReason: String(error?.message || 'The AI provider was temporarily unavailable.').slice(0, 240)
    };
  }
}

function providerTimeoutSignal(value) {
  const requested = Number(value);
  const timeoutMs = Number.isFinite(requested) ? Math.min(25000, Math.max(3000, requested)) : 12000;
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