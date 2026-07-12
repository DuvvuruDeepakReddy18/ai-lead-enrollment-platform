import test from 'node:test';
import assert from 'node:assert/strict';

import { createSupabaseStorage } from '../server/supabase-store.js';

const env = {
  SUPABASE_URL: 'https://project-ref.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-secret'
};

const leadInput = {
  name: 'Supabase Student',
  email: 'supabase.student@example.com',
  phone: '9876543210',
  city: 'Hyderabad',
  qualification: '12th Completed Student',
  source: 'Google Forms',
  courseInterest: 'BTech',
  age: 17,
  downloadedBrochure: true,
  websiteVisits: 5
};

function createMockFetch(calls) {
  return async (url, options = {}) => {
    calls.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
    const method = options.method || 'GET';

    if (url.includes('/leads?select=') && method === 'GET') {
      return jsonResponse([
        {
          id: 'lead-supabase-1',
          name: 'Supabase Student',
          email: 'supabase.student@example.com',
          phone: '9876543210',
          city: 'Hyderabad',
          qualification: '12th Completed Student',
          source: 'Google Forms',
          course_interest: 'BTech',
          age: 17,
          downloaded_brochure: true,
          website_visits: 5,
          status: 'New',
          score: 100,
          temperature: 'Hot',
          score_breakdown: { interest: 20, education: 20, engagement: 15, age: 25, visits: 20 },
          counselor: { name: 'Kavya Sharma', channel: 'Admissions', phone: '+91 90000 11001' },
          created_at: '2026-07-09T10:00:00.000Z',
          updated_at: '2026-07-09T10:00:00.000Z'
        }
      ]);
    }

    if (url.includes('/leads') && method === 'POST') {
      return jsonResponse([{ ...calls.at(-1).body, created_at: '2026-07-09T10:00:00.000Z', updated_at: '2026-07-09T10:00:00.000Z' }], 201);
    }

    if (url.includes('/leads?id=eq.') && method === 'PATCH') {
      return jsonResponse([{ ...calls.at(-1).body, id: 'lead-supabase-1', name: 'Supabase Student', email: 'supabase.student@example.com', phone: '9876543210', city: 'Hyderabad', qualification: '12th Completed Student', source: 'Google Forms', course_interest: 'BTech', age: 17, downloaded_brochure: true, website_visits: 5, score: 100, temperature: 'Hot', score_breakdown: { interest: 20, education: 20, engagement: 15, age: 25, visits: 20 }, counselor: null, created_at: '2026-07-09T10:00:00.000Z' }]);
    }

    if (url.includes('/deliveries') && method === 'POST') {
      return jsonResponse([{ ...calls.at(-1).body, created_at: '2026-07-09T10:01:00.000Z' }], 201);
    }

    if (url.includes('/deliveries?select=') && method === 'GET') {
      return jsonResponse([]);
    }

    return jsonResponse({ message: `Unexpected request ${method} ${url}` }, 400, false);
  };
}

function jsonResponse(payload, status = 200, ok = true) {
  return {
    ok,
    status,
    text: async () => JSON.stringify(payload),
    json: async () => payload
  };
}

test('Supabase storage uses REST API with server-side key headers', async () => {
  const calls = [];
  const storage = createSupabaseStorage({ env, fetchImpl: createMockFetch(calls) });

  const leads = await storage.listLeads({ status: 'New' });
  assert.equal(leads.length, 1);
  assert.equal(leads[0].source, 'Google Forms');
  assert.equal(calls[0].url, 'https://project-ref.supabase.co/rest/v1/leads?select=*');
  assert.equal(calls[0].options.headers.apikey, 'service-secret');
  assert.equal(calls[0].options.headers.authorization, 'Bearer service-secret');
});

test('Supabase storage creates scored leads and logs deliveries', async () => {
  const calls = [];
  const storage = createSupabaseStorage({ env, fetchImpl: createMockFetch(calls) });

  const created = await storage.createLead(leadInput);
  assert.equal(created.score, 100);
  assert.equal(created.temperature, 'Hot');
  const createdCall = calls.find((call) => call.options.method === 'POST' && call.url.includes('/leads'));
  assert.equal(createdCall.body.course_interest, 'BTech');
  assert.equal(createdCall.body.downloaded_brochure, true);

  const updated = await storage.updateLeadStatus(created.id, 'Enrolled');
  assert.equal(updated.status, 'Enrolled');

  const delivery = await storage.logDelivery({
    leadId: created.id,
    channel: 'email',
    provider: 'smtp',
    status: 'sent',
    recipient: created.email,
    messagePreview: 'Welcome'
  });
  assert.equal(delivery.channel, 'email');
  assert.equal(delivery.status, 'sent');
});