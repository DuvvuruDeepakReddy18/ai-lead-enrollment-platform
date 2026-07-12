import { buildLeadRecord, filterAndSortLeads, normalizeStatus, rowToDelivery, rowToLead } from './db.js';
import { getSupabaseServerKey } from './config.js';

export function createSupabaseStorage({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!fetchImpl) {
    throw new Error('Fetch is not available for Supabase requests.');
  }

  const baseUrl = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = getSupabaseServerKey(env);
  if (!baseUrl || !key) {
    throw new Error('SUPABASE_URL and a server-side Supabase key are required.');
  }

  async function request(path, { method = 'GET', body, prefer } = {}) {
    const headers = {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json'
    };
    if (prefer) headers.prefer = prefer;

    const response = await fetchImpl(`${baseUrl}/rest/v1/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(payload?.message || payload?.hint || `Supabase request failed with status ${response.status}`);
    }
    return payload;
  }

  return {
    provider: 'supabase',

    async listLeads(filters = {}) {
      const rows = await request('leads?select=*');
      return filterAndSortLeads(rows.map(rowToLead), filters);
    },

    async createLead(input) {
      const lead = buildLeadRecord(input);
      const rows = await request('leads', {
        method: 'POST',
        body: leadToRow(lead),
        prefer: 'return=representation'
      });
      return rowToLead(rows[0]);
    },

    async getLeadById(id) {
      const rows = await request(`leads?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
      return rows[0] ? rowToLead(rows[0]) : null;
    },

    async updateLeadStatus(id, status) {
      const nextStatus = normalizeStatus(status || 'Contacted');
      const rows = await request(`leads?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { status: nextStatus, updated_at: new Date().toISOString() },
        prefer: 'return=representation'
      });
      return rows[0] ? rowToLead(rows[0]) : null;
    },

    async logDelivery(input) {
      const delivery = buildDeliveryRecord(input);
      const rows = await request('deliveries', {
        method: 'POST',
        body: deliveryToRow(delivery),
        prefer: 'return=representation'
      });
      return rowToDelivery(rows[0]);
    },

    async listDeliveries(filters = {}) {
      const filter = filters.leadId ? `&lead_id=eq.${encodeURIComponent(filters.leadId)}` : '';
      const rows = await request(`deliveries?select=*${filter}&order=created_at.desc`);
      return rows.map(rowToDelivery);
    }
  };
}

export function hasSupabaseConfig(env = process.env) {
  return Boolean(env.SUPABASE_URL && getSupabaseServerKey(env));
}

function leadToRow(lead) {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    qualification: lead.qualification,
    source: lead.source,
    course_interest: lead.courseInterest,
    age: lead.age,
    downloaded_brochure: lead.downloadedBrochure,
    website_visits: lead.websiteVisits,
    status: lead.status,
    score: lead.score,
    temperature: lead.temperature,
    score_breakdown: lead.scoreBreakdown,
    counselor: lead.counselor,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt
  };
}

function buildDeliveryRecord(input) {
  return {
    id: input.id || `delivery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    leadId: input.leadId,
    channel: input.channel,
    provider: input.provider,
    status: input.status,
    recipient: input.recipient || null,
    providerMessageId: input.providerMessageId || null,
    detail: input.detail || null,
    messagePreview: input.messagePreview || null,
    createdAt: input.createdAt || new Date().toISOString()
  };
}

function deliveryToRow(delivery) {
  return {
    id: delivery.id,
    lead_id: delivery.leadId,
    channel: delivery.channel,
    provider: delivery.provider,
    status: delivery.status,
    recipient: delivery.recipient,
    provider_message_id: delivery.providerMessageId,
    detail: delivery.detail,
    message_preview: delivery.messagePreview,
    created_at: delivery.createdAt
  };
}