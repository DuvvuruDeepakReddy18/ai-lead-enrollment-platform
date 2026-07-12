import test from 'node:test';
import assert from 'node:assert/strict';

import { createFollowUpPlan } from '../server/followups.js';

test('creates five follow-up steps on day 1, 3, 5, 7, and 10', () => {
  const plan = createFollowUpPlan(
    { name: 'Riya', courseInterest: 'Data Science', temperature: 'Hot' },
    new Date('2026-07-08T00:00:00.000Z')
  );

  assert.deepEqual(
    plan.map((step) => step.day),
    [1, 3, 5, 7, 10]
  );
  assert.deepEqual(
    plan.map((step) => step.status),
    ['scheduled', 'scheduled', 'scheduled', 'scheduled', 'scheduled']
  );
  assert.equal(plan[0].label, 'Welcome Message');
  assert.equal(plan.at(-1).label, 'Final Follow-Up');
  assert.match(plan[0].message, /Riya/);
});

