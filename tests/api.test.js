import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../server/app.js';
import { createDatabase, seedDatabase } from '../server/db.js';

async function withServer(callback) {
  const database = createDatabase(':memory:');
  seedDatabase(database);
  const app = createApp({ database, env: {} });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    database.close();
  }
}

test('lead API lists seeded leads and creates a scored lead', async () => {
  await withServer(async (baseUrl) => {
    const leadList = await fetch(`${baseUrl}/api/leads`).then((response) => response.json());
    assert.ok(leadList.leads.length >= 3);
    assert.equal(leadList.leads[0].hasOwnProperty('score'), true);

    const created = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Ananya',
        email: 'ananya@example.com',
        phone: '9876543210',
        city: 'Hyderabad',
        qualification: '12th Completed Student',
        source: 'WhatsApp',
        courseInterest: 'BTech',
        age: 17,
        downloadedBrochure: true,
        websiteVisits: 5
      })
    }).then((response) => response.json());

    assert.equal(created.lead.score, 100);
    assert.equal(created.lead.temperature, 'Hot');
    assert.equal(created.lead.counselor.name, 'Kavya Sharma');
  });
});

test('API returns messages, follow-ups, and analytics', async () => {
  await withServer(async (baseUrl) => {
    const leadList = await fetch(`${baseUrl}/api/leads`).then((response) => response.json());
    const lead = leadList.leads[0];

    const messages = await fetch(`${baseUrl}/api/leads/${lead.id}/messages`, { method: 'POST' }).then((response) => response.json());
    assert.match(messages.messages.whatsapp, new RegExp(lead.name));

    const followups = await fetch(`${baseUrl}/api/leads/${lead.id}/followups`).then((response) => response.json());
    assert.equal(followups.followups.length, 5);

    const analytics = await fetch(`${baseUrl}/api/analytics`).then((response) => response.json());
    assert.ok(analytics.metrics.totalLeads >= 3);
    assert.ok(Array.isArray(analytics.sourcePerformance));
  });
});


test('API exposes integration status and logs real delivery attempts', async () => {
  await withServer(async (baseUrl) => {
    const leadList = await fetch(`${baseUrl}/api/leads`).then((response) => response.json());
    const lead = leadList.leads[0];

    const integrations = await fetch(`${baseUrl}/api/integrations`).then((response) => response.json());
    assert.equal(integrations.integrations.openai.configured, false);
    assert.equal(integrations.integrations.smtp.configured, false);
    assert.equal(integrations.integrations.sms.configured, false);

    const email = await fetch(`${baseUrl}/api/leads/${lead.id}/send/email`, { method: 'POST' }).then((response) => response.json());
    assert.equal(email.delivery.channel, 'email');
    assert.equal(email.delivery.status, 'not_configured');

    const webhook = await fetch(`${baseUrl}/api/leads/${lead.id}/send/webhook`, { method: 'POST' }).then((response) => response.json());
    assert.equal(webhook.delivery.channel, 'webhook');
    assert.equal(webhook.delivery.status, 'not_configured');

    const deliveries = await fetch(`${baseUrl}/api/deliveries?leadId=${lead.id}`).then((response) => response.json());
    assert.equal(deliveries.deliveries.length, 2);
    assert.deepEqual(
      deliveries.deliveries.map((delivery) => delivery.status),
      ['not_configured', 'not_configured']
    );
  });
});

test('API enforces valid lead statuses and updates enrollment analytics', async () => {
  await withServer(async (baseUrl) => {
    const leadList = await fetch(`${baseUrl}/api/leads`).then((response) => response.json());
    const lead = leadList.leads.find((candidate) => candidate.status !== 'Enrolled');

    const invalid = await fetch(`${baseUrl}/api/leads/${lead.id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'Maybe Later' })
    });
    assert.equal(invalid.status, 400);

    const updated = await fetch(`${baseUrl}/api/leads/${lead.id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'Enrolled' })
    }).then((response) => response.json());

    assert.equal(updated.lead.status, 'Enrolled');

    const analytics = await fetch(`${baseUrl}/api/analytics`).then((response) => response.json());
    assert.ok(analytics.metrics.enrollmentRate > 0);
  });
});
test('public application is scored and appears in the lead pipeline', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/public/applications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Public Applicant',
        email: 'public.applicant@example.com',
        phone: '9876509999',
        city: 'Pune',
        qualification: '12th Completed Student',
        courseInterest: 'BTech',
        age: 17,
        downloadedBrochure: true,
        consent: true
      })
    });
    const application = await response.json();

    assert.equal(response.status, 201);
    assert.equal(application.accepted, true);
    assert.equal(application.lead.source, 'Website Application');
    assert.equal(application.lead.temperature, 'Hot');

    const pipeline = await fetch(`${baseUrl}/api/leads?search=public.applicant`).then((result) => result.json());
    assert.equal(pipeline.leads.length, 1);
    assert.equal(pipeline.leads[0].id, application.applicationId);
  });
});
test('public application is not discarded when a browser autofills company', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/public/applications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Deepak Autofill Check',
        email: 'deepak.autofill@example.com',
        phone: '9876500099',
        city: 'Hyderabad',
        qualification: '12th Completed Student',
        courseInterest: 'BTech',
        age: 17,
        consent: true,
        company: 'Autofilled value'
      })
    });
    const application = await response.json();

    assert.equal(response.status, 201);
    assert.equal(application.accepted, true);
    assert.equal(application.lead.name, 'Deepak Autofill Check');
    assert.equal(application.lead.source, 'Website Application');
  });
});
