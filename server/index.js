import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.js';
import { loadDotEnv } from './config.js';
import { createDatabase, seedDatabase } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(__dirname, 'data');
loadDotEnv();

const databasePath = process.env.DATABASE_PATH || path.join(dataDir, 'leadflow.sqlite');

const port = Number(process.env.PORT || 4178);

fs.mkdirSync(dataDir, { recursive: true });

const database = createDatabase(databasePath);
seedDatabase(database);

const app = createApp({ database });
const distDir = path.join(projectRoot, 'dist');

if (fs.existsSync(distDir)) {
  app.use(expressStatic(distDir));
  app.get('*splat', (_request, response) => {
    response.sendFile(path.join(distDir, 'index.html'));
  });
}

const server = app.listen(port, () => {
  console.log(`EFOS LeadFlow running at http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function expressStatic(directory) {
  return async (request, response, next) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      next();
      return;
    }

    const requestPath = decodeURIComponent(request.path);
    const resolved = path.resolve(directory, `.${requestPath}`);
    if (!resolved.startsWith(directory)) {
      response.status(403).end('Forbidden');
      return;
    }

    const filePath = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? path.join(resolved, 'index.html') : resolved;
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      next();
      return;
    }

    response.sendFile(filePath);
  };
}

