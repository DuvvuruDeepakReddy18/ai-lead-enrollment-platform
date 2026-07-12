const LOCAL_APPLICATIONS_KEY = 'leadflow.public-applications.v1';

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function getLeads(filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value && value !== 'All')
  );
  const data = await request(`/api/leads${params.toString() ? `?${params}` : ''}`);
  const remoteIds = new Set(data.leads.map((lead) => lead.id));
  const localOnly = readLocalApplications()
    .filter((lead) => !remoteIds.has(lead.id) && matchesFilters(lead, filters));
  return { ...data, leads: sortLeads([...data.leads, ...localOnly], filters.sort) };
}

export function createLead(lead) {
  return request('/api/leads', {
    method: 'POST',
    body: JSON.stringify(lead)
  });
}

export async function submitApplication(application) {
  const data = await request('/api/public/applications', {
    method: 'POST',
    body: JSON.stringify(application)
  });
  if (data.lead) rememberLocalApplication(data.lead);
  return data;
}

export function getAnalytics() {
  return request('/api/analytics');
}

export async function updateLeadStatus(leadId, status) {
  try {
    const data = await request(`/api/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    updateLocalApplication(data.lead);
    return data;
  } catch (error) {
    if (error.status !== 404) throw error;
    const localLead = readLocalApplications().find((lead) => lead.id === leadId);
    if (!localLead) throw error;
    const lead = { ...localLead, status, updatedAt: new Date().toISOString() };
    updateLocalApplication(lead);
    return { lead, localFallback: true };
  }
}

export function getMessages(leadId) {
  return request(`/api/leads/${leadId}/messages`, { method: 'POST' });
}

export function getFollowUps(leadId) {
  return request(`/api/leads/${leadId}/followups`);
}

export function getAllFollowUps() {
  return request('/api/followups');
}

export function getIntegrations() {
  return request('/api/integrations');
}

export function sendLeadMessage(leadId, channel) {
  return request(`/api/leads/${leadId}/send/${channel}`, { method: 'POST' });
}

export function getDeliveries(leadId) {
  const params = leadId ? `?leadId=${encodeURIComponent(leadId)}` : '';
  return request(`/api/deliveries${params}`);
}

function readLocalApplications() {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(LOCAL_APPLICATIONS_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function rememberLocalApplication(lead) {
  if (typeof window === 'undefined') return;
  const current = readLocalApplications().filter((item) => item.id !== lead.id);
  window.localStorage.setItem(LOCAL_APPLICATIONS_KEY, JSON.stringify([lead, ...current].slice(0, 100)));
}

function updateLocalApplication(lead) {
  if (!lead || typeof window === 'undefined') return;
  const current = readLocalApplications();
  if (!current.some((item) => item.id === lead.id)) return;
  window.localStorage.setItem(LOCAL_APPLICATIONS_KEY, JSON.stringify(current.map((item) => item.id === lead.id ? lead : item)));
}

function matchesFilters(lead, filters) {
  if (filters.status && filters.status !== 'All' && lead.status !== filters.status) return false;
  if (filters.source && filters.source !== 'All' && lead.source !== filters.source) return false;
  if (filters.search) {
    const query = String(filters.search).toLowerCase();
    const searchable = [lead.name, lead.email, lead.phone, lead.city, lead.courseInterest, lead.source].join(' ').toLowerCase();
    if (!searchable.includes(query)) return false;
  }
  return true;
}

function sortLeads(leads, sort = 'score_desc') {
  return leads.sort((a, b) => {
    if (sort === 'created_asc') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'created_desc') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'name_asc') return a.name.localeCompare(b.name);
    return b.score - a.score;
  });
}