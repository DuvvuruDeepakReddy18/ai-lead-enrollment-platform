import { createLead, getLeadById, listDeliveries, listLeads, logDelivery, updateLeadStatus } from './db.js';
import { createSupabaseStorage, hasSupabaseConfig } from './supabase-store.js';

export function createStorage({ database, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const sqlite = database ? createSqliteStorage(database) : null;

  if (hasSupabaseConfig(env)) {
    const cloud = createSupabaseStorage({ env, fetchImpl });
    return sqlite ? createResilientStorage(cloud, sqlite) : cloud;
  }

  if (!sqlite) {
    throw new Error('A SQLite database is required when Supabase is not configured.');
  }

  return sqlite;
}

function createSqliteStorage(database) {
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

function createResilientStorage(primary, fallback) {
  const call = (method) => async (...args) => {
    try {
      return await primary[method](...args);
    } catch (error) {
      console.warn(`[storage] Supabase ${method} failed; using SQLite fallback: ${error.message}`);
      return fallback[method](...args);
    }
  };

  return {
    provider: 'supabase-with-sqlite-fallback',
    listLeads: call('listLeads'),
    createLead: call('createLead'),
    getLeadById: call('getLeadById'),
    updateLeadStatus: call('updateLeadStatus'),
    logDelivery: call('logDelivery'),
    listDeliveries: call('listDeliveries')
  };
}