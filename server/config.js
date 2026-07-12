import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';

export function loadDotEnv(filePath = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function getIntegrationStatus(env = process.env) {
  const openaiModel = env.OPENAI_MODEL || 'gpt-5.2';
  const openrouterModel = env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM && env.SMTP_USER && env.SMTP_PASS);
  const twilioBase = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
  const supabaseKey = getSupabaseServerKey(env);

  return {
    openrouter: {
      configured: Boolean(env.OPENROUTER_API_KEY),
      model: openrouterModel,
      freeOnly: true,
      modelAllowed: isOpenRouterFreeModel(openrouterModel)
    },
    openai: {
      configured: Boolean(env.OPENAI_API_KEY),
      model: openaiModel
    },
    supabase: {
      configured: Boolean(env.SUPABASE_URL && supabaseKey),
      url: env.SUPABASE_URL || null,
      mode: env.SUPABASE_URL && supabaseKey ? 'cloud' : 'sqlite-fallback'
    },
    smtp: {
      configured: smtpConfigured,
      from: env.SMTP_FROM || null
    },
    sms: {
      configured: Boolean(twilioBase && (env.TWILIO_SMS_FROM || env.TWILIO_MESSAGING_SERVICE_SID)),
      provider: 'twilio'
    },
    whatsapp: {
      configured: Boolean(twilioBase && env.TWILIO_WHATSAPP_FROM),
      provider: 'twilio'
    },
    webhook: {
      configured: Boolean(env.FOLLOWUP_WEBHOOK_URL)
    }
  };
}

export function getPublicIntegrationStatus(env = process.env) {
  return getIntegrationStatus(env);
}

export function getSupabaseServerKey(env = process.env) {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || '';
}

function isOpenRouterFreeModel(model) {
  const value = String(model || '').trim();
  return value === DEFAULT_OPENROUTER_MODEL || value.endsWith(':free');
}