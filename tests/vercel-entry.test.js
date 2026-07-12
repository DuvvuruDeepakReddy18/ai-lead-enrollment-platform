import test from 'node:test';
import assert from 'node:assert/strict';

import { createServerlessApp } from '../api/index.js';

test('Vercel entry exports the Express API with a seeded memory fallback', async () => {
  const app = createServerlessApp({ env: {} });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    const healthResponse = await fetch(`http://127.0.0.1:${port}/api/health`);
    const health = await healthResponse.json();
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(health, { ok: true, service: 'EFOS LeadFlow' });

    const leadResponse = await fetch(`http://127.0.0.1:${port}/api/leads`);
    const payload = await leadResponse.json();
    assert.equal(leadResponse.status, 200);
    assert.ok(payload.leads.length >= 5);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
