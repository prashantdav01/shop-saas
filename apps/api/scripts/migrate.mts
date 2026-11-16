// Applies SQL migrations in ./drizzle using the migration (owner) connection.
// Usage (from repo root): pnpm db:migrate
// Reads MIGRATION_DATABASE_URL; loads the repo-root .env if present (local only).
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(here, '../../../.env');
if (process.env.NODE_ENV !== 'production' && existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error('MIGRATION_DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), {
    migrationsFolder: resolve(here, '../drizzle'),
  });
  console.log('Migrations applied.');
} finally {
  await pool.end();
}
