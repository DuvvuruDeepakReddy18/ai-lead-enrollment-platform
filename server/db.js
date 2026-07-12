import { DatabaseSync } from 'node:sqlite';
import { calculateLeadScore } from './scoring.js';
import { assignCounselor } from './counselors.js';

export const VALID_LEAD_STATUSES = ['New', 'Contacted', 'Interested', 'Follow-Up', 'Qualified', 'Enrolled', 'Rejected'];

const SEED_LEADS = [
  {
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    phone: '9876501111',
    city: 'Delhi',
    qualification: '12th Completed Student',
    source: 'Website Form',
    courseInterest: 'BTech',
    age: 17,
    downloadedBrochure: true,
    websiteVisits: 2,
    status: 'New',
    createdAt: '2026-07-01T09:30:00.000Z'
  },
  {
    name: 'Riya Kapoor',
    email: 'riya.kapoor@example.com',
    phone: '9876502222',
    city: 'Hyderabad',
    qualification: '12th Completed Student',
    source: 'Google Forms',
    courseInterest: 'Data Science',
    age: 18,
    downloadedBrochure: true,
    websiteVisits: 5,
    status: 'Qualified',
    createdAt: '2026-07-02T10:10:00.000Z'
  },
  {
    name: 'Arjun Rao',
    email: 'arjun.rao@example.com',
    phone: '9876503333',
    city: 'Bengaluru',
    qualification: 'Diploma Student',
    source: 'Meta Ads',
    courseInterest: 'AI Automation',
    age: 19,
    downloadedBrochure: false,
    websiteVisits: 4,
    status: 'Follow-Up',
    createdAt: '2026-07-03T11:20:00.000Z'
  },
  {
    name: 'Sneha Iyer',
    email: 'sneha.iyer@example.com',
    phone: '9876504444',
    city: 'Chennai',
    qualification: '12th Studying',
    source: 'Referral Program',
    courseInterest: 'BTech',
    age: 16,
    downloadedBrochure: false,
    websiteVisits: 1,
    status: 'Contacted',
    createdAt: '2026-07-04T12:45:00.000Z'
  },
  {
    name: 'Kiran Das',
    email: 'kiran.das@example.com',
    phone: '9876505555',
    city: 'Pune',
    qualification: '12th Completed Student',
    source: 'Internship Registration',
    courseInterest: 'BTech',
    age: 18,
    downloadedBrochure: true,
    websiteVisits: 6,
    status: 'Enrolled',
    createdAt: '2026-07-05T14:00:00.000Z'
  }
];

export function createDatabase(location) {
  const database = new DatabaseSync(location);
  database.exec('PRAGMA foreign_keys = ON');
  initializeDatabase(database);
  return database;
}

export function initializeDatabase(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      qualification TEXT NOT NULL,
      source TEXT NOT NULL,
      course_interest TEXT NOT NULL,
      age INTEGER NOT NULL,
      downloaded_brochure INTEGER NOT NULL,
      website_visits INTEGER NOT NULL,
      status TEXT NOT NULL,
      score INTEGER NOT NULL,
      temperature TEXT NOT NULL,
      score_breakdown TEXT NOT NULL,
      counselor TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  database.exec(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      recipient TEXT,
      provider_message_id TEXT,
      detail TEXT,
      message_preview TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )
  `);
}

export function seedDatabase(database) {
  const count = database.prepare('SELECT COUNT(*) AS count FROM leads').get().count;
  if (count > 0) return;

  for (const lead of SEED_LEADS) {
    createLead(database, lead);
  }
}

export function buildLeadRecord(input, now = new Date().toISOString()) {
  const normalized = normalizeLeadInput(input);
  const score = calculateLeadScore(normalized);
  const lead = {
    ...normalized,
    id: input.id || `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: normalizeStatus(input.status || 'New'),
    score: score.total,
    temperature: score.temperature,
    scoreBreakdown: score.breakdown,
    createdAt: input.createdAt || input.created_at || now,
    updatedAt: input.updatedAt || input.updated_at || now
  };
  lead.counselor = assignCounselor(lead);
  return lead;
}
export function createLead(database, input) {
  const lead = buildLeadRecord(input);

  database
    .prepare(`
      INSERT INTO leads (
        id, name, email, phone, city, qualification, source, course_interest,
        age, downloaded_brochure, website_visits, status, score, temperature,
        score_breakdown, counselor, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      lead.id,
      lead.name,
      lead.email,
      lead.phone,
      lead.city,
      lead.qualification,
      lead.source,
      lead.courseInterest,
      lead.age,
      lead.downloadedBrochure ? 1 : 0,
      lead.websiteVisits,
      lead.status,
      lead.score,
      lead.temperature,
      JSON.stringify(lead.scoreBreakdown),
      lead.counselor ? JSON.stringify(lead.counselor) : null,
      lead.createdAt,
      lead.updatedAt
    );

  return lead;
}

export function listLeads(database, filters = {}) {
  const leads = database
    .prepare('SELECT * FROM leads')
    .all()
    .map(rowToLead);

  return filterAndSortLeads(leads, filters);
}

export function filterAndSortLeads(inputLeads, filters = {}) {
  let leads = [...inputLeads];

  if (filters.search) {
    const search = String(filters.search).toLowerCase();
    leads = leads.filter((lead) =>
      [lead.name, lead.email, lead.phone, lead.city, lead.courseInterest, lead.source]
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }

  if (filters.status && filters.status !== 'All') {
    leads = leads.filter((lead) => lead.status === filters.status);
  }

  if (filters.source && filters.source !== 'All') {
    leads = leads.filter((lead) => lead.source === filters.source);
  }

  const sort = filters.sort || 'score_desc';
  leads.sort((a, b) => {
    if (sort === 'created_asc') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'created_desc') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'name_asc') return a.name.localeCompare(b.name);
    return b.score - a.score;
  });

  return leads;
}
export function getLeadById(database, id) {
  const row = database.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  return row ? rowToLead(row) : null;
}

export function updateLeadStatus(database, id, status) {
  const updatedAt = new Date().toISOString();
  const nextStatus = normalizeStatus(status || 'Contacted');
  database.prepare('UPDATE leads SET status = ?, updated_at = ? WHERE id = ?').run(nextStatus, updatedAt, id);
  return getLeadById(database, id);
}

export function logDelivery(database, input) {
  const delivery = {
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

  database
    .prepare(`
      INSERT INTO deliveries (
        id, lead_id, channel, provider, status, recipient, provider_message_id,
        detail, message_preview, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      delivery.id,
      delivery.leadId,
      delivery.channel,
      delivery.provider,
      delivery.status,
      delivery.recipient,
      delivery.providerMessageId,
      delivery.detail,
      delivery.messagePreview,
      delivery.createdAt
    );

  return delivery;
}

export function listDeliveries(database, filters = {}) {
  if (filters.leadId) {
    return database
      .prepare('SELECT * FROM deliveries WHERE lead_id = ? ORDER BY created_at DESC')
      .all(filters.leadId)
      .map(rowToDelivery);
  }

  return database
    .prepare('SELECT * FROM deliveries ORDER BY created_at DESC')
    .all()
    .map(rowToDelivery);
}
export function normalizeStatus(status) {
  const value = String(status || '').trim();
  if (VALID_LEAD_STATUSES.includes(value)) return value;

  const error = new Error(`Invalid lead status: ${value || 'empty'}`);
  error.statusCode = 400;
  throw error;
}
export function normalizeLeadInput(input) {
  const required = ['name', 'email', 'phone', 'city', 'qualification', 'source'];
  const missing = required.filter((field) => !String(input[field] ?? '').trim());
  if (!String(input.courseInterest ?? input.course_interest ?? '').trim()) {
    missing.push('courseInterest');
  }
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  return {
    name: String(input.name).trim(),
    email: String(input.email).trim(),
    phone: String(input.phone).trim(),
    city: String(input.city).trim(),
    qualification: String(input.qualification).trim(),
    source: String(input.source).trim(),
    courseInterest: String(input.courseInterest ?? input.course_interest).trim(),
    age: Number(input.age ?? 0),
    downloadedBrochure: Boolean(input.downloadedBrochure ?? input.downloaded_brochure),
    websiteVisits: Number(input.websiteVisits ?? input.website_visits ?? 0)
  };
}

export function rowToLead(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    qualification: row.qualification,
    source: row.source,
    courseInterest: row.course_interest,
    age: row.age,
    downloadedBrochure: Boolean(row.downloaded_brochure),
    websiteVisits: row.website_visits,
    status: row.status,
    score: row.score,
    temperature: row.temperature,
    scoreBreakdown: parseMaybeJson(row.score_breakdown, {}),
    counselor: row.counselor ? parseMaybeJson(row.counselor, null) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}


export function rowToDelivery(row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    channel: row.channel,
    provider: row.provider,
    status: row.status,
    recipient: row.recipient,
    providerMessageId: row.provider_message_id,
    detail: row.detail,
    messagePreview: row.message_preview,
    createdAt: row.created_at
  };
}
function parseMaybeJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}