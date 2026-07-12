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
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function getLeads(filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value && value !== 'All')
  );
  return request(`/api/leads${params.toString() ? `?${params}` : ''}`);
}

export function createLead(lead) {
  return request('/api/leads', {
    method: 'POST',
    body: JSON.stringify(lead)
  });
}

export function getAnalytics() {
  return request('/api/analytics');
}
export function updateLeadStatus(leadId, status) {
  return request(`/api/leads/${leadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
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
