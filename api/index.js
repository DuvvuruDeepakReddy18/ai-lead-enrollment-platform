import { createApp } from '../server/app.js';
import { createDatabase, seedDatabase } from '../server/db.js';
import { hasSupabaseConfig } from '../server/supabase-store.js';

export function createServerlessApp({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  let database;

  if (!hasSupabaseConfig(env)) {
    database = createDatabase(':memory:');
    seedDatabase(database);
  }

  return createApp({ database, env, fetchImpl });
}

export default createServerlessApp();
