import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateLeadScore, getLeadTemperature } from '../server/scoring.js';
import { assignCounselor } from '../server/counselors.js';

test('scores Rahul-style BTech lead from the PDF as a hot lead with total 80', () => {
  const result = calculateLeadScore({
    courseInterest: 'BTech',
    age: 17,
    qualification: '12th Completed Student',
    downloadedBrochure: true,
    websiteVisits: 2
  });

  assert.equal(result.total, 80);
  assert.equal(result.temperature, 'Hot');
  assert.deepEqual(result.breakdown, {
    interest: 20,
    education: 20,
    engagement: 15,
    age: 25,
    visits: 0
  });
});

test('maps score ranges to Cold, Warm, and Hot categories', () => {
  assert.equal(getLeadTemperature(40), 'Cold');
  assert.equal(getLeadTemperature(41), 'Warm');
  assert.equal(getLeadTemperature(70), 'Warm');
  assert.equal(getLeadTemperature(71), 'Hot');
});

test('assigns counselor only when lead score is greater than 80', () => {
  assert.equal(assignCounselor({ courseInterest: 'BTech', score: 80 }), null);

  const assigned = assignCounselor({ courseInterest: 'BTech', score: 88 });
  assert.deepEqual(assigned, {
    name: 'Kavya Sharma',
    specialization: 'Engineering Admissions',
    channel: 'WhatsApp + Phone'
  });
});

