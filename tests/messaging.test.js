import test from 'node:test';
import assert from 'node:assert/strict';

import { generateMessages } from '../server/messaging.js';

test('generates personalized WhatsApp, email, and SMS content for a lead', () => {
  const messages = generateMessages({
    name: 'Rahul',
    city: 'Delhi',
    courseInterest: 'BTech',
    qualification: '12th Completed Student',
    temperature: 'Hot'
  });

  assert.match(messages.whatsapp, /Hi Rahul/);
  assert.match(messages.whatsapp, /BTech/);
  assert.match(messages.email.subject, /BTech/);
  assert.match(messages.email.body, /Delhi/);
  assert.match(messages.sms, /Rahul/);
  assert.ok(messages.whatsapp.split(/\s+/).length <= 80);
});

