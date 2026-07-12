import express from 'express';
import { createFollowUpPlan } from './followups.js';
import { buildAnalytics } from './analytics.js';
import { generateMessagesWithProvider } from './ai-provider.js';
import { getPublicIntegrationStatus } from './config.js';
import { sendEmailMessage, sendTwilioMessage, triggerFollowUpWebhook } from './delivery.js';
import { createStorage } from './storage.js';

export function createApp({ database, storage, env = process.env, fetchImpl = globalThis.fetch, transportFactory } = {}) {
  const app = express();
  const store = storage || createStorage({ database, env, fetchImpl });

  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, service: 'EFOS LeadFlow' });
  });

  app.get('/api/integrations', (_request, response) => {
    response.json({ integrations: getPublicIntegrationStatus(env) });
  });

  app.get('/api/leads', asyncHandler(async (request, response) => {
    response.json({
      leads: await store.listLeads(request.query)
    });
  }));

  app.post('/api/leads', asyncHandler(async (request, response) => {
    const lead = await store.createLead(request.body);
    response.status(201).json({ lead });
  }));

  app.post('/api/public/applications', asyncHandler(async (request, response) => {
    if (request.body.company) {
      response.status(201).json({ accepted: true });
      return;
    }

    const lead = await store.createLead({
      ...request.body,
      source: 'Website Application',
      websiteVisits: Math.max(1, Number(request.body.websiteVisits || 1)),
      downloadedBrochure: Boolean(request.body.downloadedBrochure)
    });

    response.status(201).json({
      accepted: true,
      applicationId: lead.id,
      message: 'Application received and added to the admissions pipeline.',
      lead
    });
  }));

  app.post('/api/webhooks/leads/:source', asyncHandler(async (request, response) => {
    const lead = await store.createLead({
      ...request.body,
      source: request.body.source || request.params.source
    });
    response.status(201).json({ lead });
  }));

  app.get('/api/leads/:id', asyncHandler(async (request, response) => {
    const lead = await store.getLeadById(request.params.id);
    if (!lead) {
      response.status(404).json({ error: 'Lead not found' });
      return;
    }
    response.json({ lead });
  }));

  app.patch('/api/leads/:id/status', asyncHandler(async (request, response) => {
    const lead = await store.updateLeadStatus(request.params.id, request.body.status || 'Contacted');
    if (!lead) {
      response.status(404).json({ error: 'Lead not found' });
      return;
    }
    response.json({ lead });
  }));

  app.post('/api/leads/:id/messages', asyncHandler(async (request, response) => {
    const lead = await store.getLeadById(request.params.id);
    if (!lead) {
      response.status(404).json({ error: 'Lead not found' });
      return;
    }
    const messages = await generateMessagesWithProvider(lead, { env, fetchImpl });
    response.json({ messages });
  }));

  app.post('/api/leads/:id/send/:channel', asyncHandler(async (request, response) => {
    const lead = await store.getLeadById(request.params.id);
    if (!lead) {
      response.status(404).json({ error: 'Lead not found' });
      return;
    }

    const messages = await generateMessagesWithProvider(lead, { env, fetchImpl });
    const channel = request.params.channel;
    const delivery = await sendForChannel({ channel, lead, messages, env, fetchImpl, transportFactory });
    const logged = await store.logDelivery({
      leadId: lead.id,
      ...delivery,
      messagePreview: messagePreviewForChannel(channel, messages)
    });

    response.json({ delivery: logged, messages });
  }));

  app.get('/api/leads/:id/followups', asyncHandler(async (request, response) => {
    const lead = await store.getLeadById(request.params.id);
    if (!lead) {
      response.status(404).json({ error: 'Lead not found' });
      return;
    }
    response.json({ followups: createFollowUpPlan(lead) });
  }));

  app.get('/api/followups', asyncHandler(async (_request, response) => {
    const followups = (await store.listLeads())
      .flatMap((lead) => createFollowUpPlan(lead).map((step) => ({ ...step, leadId: lead.id, leadName: lead.name })))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    response.json({ followups });
  }));

  app.get('/api/deliveries', asyncHandler(async (request, response) => {
    response.json({ deliveries: await store.listDeliveries(request.query) });
  }));

  app.get('/api/analytics', asyncHandler(async (_request, response) => {
    response.json(buildAnalytics(await store.listLeads()));
  }));

  app.use((error, _request, response, _next) => {
    response.status(error.statusCode || 500).json({ error: error.message || 'Unexpected server error' });
  });

  return app;
}

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

async function sendForChannel({ channel, lead, messages, env, fetchImpl, transportFactory }) {
  if (channel === 'email') {
    return sendEmailMessage({ lead, message: messages.email, env, transportFactory });
  }
  if (channel === 'sms') {
    return sendTwilioMessage({ lead, channel: 'sms', body: messages.sms, env, fetchImpl });
  }
  if (channel === 'whatsapp') {
    return sendTwilioMessage({ lead, channel: 'whatsapp', body: messages.whatsapp, env, fetchImpl });
  }
  if (channel === 'webhook') {
    return triggerFollowUpWebhook({
      lead,
      followup: createFollowUpPlan(lead)[0],
      messages,
      env,
      fetchImpl
    });
  }

  const error = new Error(`Unsupported send channel: ${channel}`);
  error.statusCode = 400;
  throw error;
}

function messagePreviewForChannel(channel, messages) {
  if (channel === 'email') return `${messages.email.subject}: ${messages.email.body}`.slice(0, 240);
  if (channel === 'sms') return messages.sms;
  if (channel === 'whatsapp') return messages.whatsapp;
  if (channel === 'webhook') return 'Follow-up automation webhook triggered';
  return null;
}
