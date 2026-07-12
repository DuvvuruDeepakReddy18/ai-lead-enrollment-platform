import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = [
  '../src/DashboardApp.jsx',
  '../src/PipelineViews.jsx',
  '../src/OperationsViews.jsx',
  '../src/CommandViews.jsx',
  '../src/CommunicationViews.jsx',
  '../src/PublicApplication.jsx',
  '../src/LeadModal.jsx',
  '../src/dashboard-ui.jsx'
].map((path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const apiSource = fs.readFileSync(new URL('../src/api.js', import.meta.url), 'utf8');

test('dashboard exposes PDF-required controls across focused workspaces', () => {
  assert.match(apiSource, /export (?:async )?function updateLeadStatus/);
  assert.match(apiSource, /export function getAllFollowUps/);
  assert.match(source, /Enrollment Rate/);
  assert.match(source, /Sort/);
  assert.match(source, /Update Status/);
  assert.match(source, /created_desc/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-selected/);
  assert.match(source, /No leads match this view/);
});

test('sidebar routes to separate operational workspaces', () => {
  assert.match(source, /aria-current/);
  for (const view of ['overview', 'pipeline', 'priority', 'intelligence', 'messages', 'followups', 'enrollment', 'analytics', 'integrations']) {
    assert.match(source, new RegExp(`activeView === '${view}'`));
  }
  assert.match(source, /role="tablist"/);
  assert.match(source, /Scheduled Touchpoints/);
  assert.match(source, /Regenerate outreach draft/);
  assert.match(source, /Manual handoff available/);
  assert.match(source, /<Copy size=\{16\} \/> Copy/);
});

test('public application form submits through the shared lead API', () => {
  assert.match(apiSource, /export (?:async )?function submitApplication/);
  assert.match(source, /Application form/);
  assert.match(source, /Submit application/);
  assert.match(source, /Website Application Form/);
  assert.match(source, /Public application form/);
});