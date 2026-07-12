export async function sendEmailMessage({ lead, message, env = process.env, transportFactory } = {}) {
  const configured = Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM && env.SMTP_USER && env.SMTP_PASS);
  if (!configured) {
    return notConfigured('email', 'smtp', lead?.email, 'SMTP credentials are not configured.');
  }

  const createTransport = transportFactory || (await import('nodemailer')).default.createTransport;
  const transport = createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: String(env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  const info = await transport.sendMail({
    from: env.SMTP_FROM,
    to: lead.email,
    subject: message.subject,
    text: message.body
  });

  return {
    channel: 'email',
    provider: 'smtp',
    status: 'sent',
    recipient: lead.email,
    providerMessageId: info.messageId || null,
    detail: info.accepted?.join(', ') || 'Accepted by SMTP server.'
  };
}

export async function sendTwilioMessage({ lead, channel, body, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = channel === 'whatsapp' ? env.TWILIO_WHATSAPP_FROM : env.TWILIO_SMS_FROM;
  const messagingServiceSid = channel === 'sms' ? env.TWILIO_MESSAGING_SERVICE_SID : null;

  if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
    return notConfigured(channel, 'twilio', lead?.phone, `Twilio ${channel} credentials are not configured.`);
  }
  if (!fetchImpl) {
    throw new Error('Fetch is not available for Twilio requests.');
  }

  const params = new URLSearchParams();
  const recipientPhone = formatPhoneNumber(lead.phone, env);
  params.set('To', channel === 'whatsapp' ? toWhatsappAddress(recipientPhone) : recipientPhone);
  params.set('Body', body);
  if (messagingServiceSid) {
    params.set('MessagingServiceSid', messagingServiceSid);
  } else {
    params.set('From', from);
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const response = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || `Twilio ${channel} send failed.`);
  }

  return {
    channel,
    provider: 'twilio',
    status: payload.status || 'queued',
    recipient: params.get('To'),
    providerMessageId: payload.sid || null,
    detail: payload.status || 'queued'
  };
}

export async function triggerFollowUpWebhook({ lead, followup, messages, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!env.FOLLOWUP_WEBHOOK_URL) {
    return notConfigured('webhook', 'automation-webhook', lead?.id, 'Follow-up webhook URL is not configured.');
  }
  if (!fetchImpl) {
    throw new Error('Fetch is not available for webhook requests.');
  }

  const response = await fetchImpl(env.FOLLOWUP_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      lead,
      followup,
      messages,
      triggeredAt: new Date().toISOString()
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || 'Follow-up webhook failed.');
  }

  return {
    channel: 'webhook',
    provider: 'automation-webhook',
    status: 'sent',
    recipient: env.FOLLOWUP_WEBHOOK_URL,
    providerMessageId: null,
    detail: text || 'Webhook accepted.'
  };
}

function formatPhoneNumber(phone, env) {
  const raw = String(phone || '').trim();
  if (!raw || raw.startsWith('whatsapp:')) return raw;

  const compact = raw.replace(/[\s().-]/g, '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;

  const defaultCountryCode = env.PHONE_DEFAULT_COUNTRY_CODE || '+91';
  const normalizedCode = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
  if (/^\d{10}$/.test(compact)) return `${normalizedCode}${compact}`;
  return compact;
}

function toWhatsappAddress(phone) {
  const value = String(phone || '');
  if (value.startsWith('whatsapp:')) return value;
  return `whatsapp:${value}`;
}

function notConfigured(channel, provider, recipient, detail) {
  return {
    channel,
    provider,
    status: 'not_configured',
    recipient: recipient || null,
    providerMessageId: null,
    detail
  };
}

