import { createLead, getLeadById, listDeliveries, listLeads, logDelivery, updateLeadStatus } from './db.js';
import { createSupabaseStorage, hasSupabaseConfig } from './supabase-store.js';

export function createStorage({ database, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (hasSupabaseConfig(env)) {
    return createSupabaseStorage({ env, fetchImpl });
  }

  if (!database) {
    throw new Error('A SQLite database is required when Supabase is not configured.');
  }

  return {
    provider: 'sqlite',
    listLeads: async (filters) => listLeads(database, filters),
    createLead: async (input) => createLead(database, input),
    getLeadById: async (id) => getLeadById(database, id),
    updateLeadStatus: async (id, status) => updateLeadStatus(database, id, status),
    logDelivery: async (input) => logDelivery(database, input),
    listDeliveries: async (filters) => listDeliveries(database, filters)
  };
}
