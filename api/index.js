import { createApp } from '../server/app.js';
import { createDatabase, seedDatabase } from '../server/db.js';

export function createServerlessApp({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const database = createDatabase(':memory:');
  seedDatabase(database);
  return createApp({ database, env, fetchImpl });
}

export default createServerlessApp();