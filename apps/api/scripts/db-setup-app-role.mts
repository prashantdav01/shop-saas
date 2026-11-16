// Local and CI only: creates the API's LOGIN role from DATABASE_URL and grants it
// app_user. Hosted environments create their login role by hand (Prashant).
// Usage (from repo root): pnpm db:setup-app-role   (after pnpm db:migrate)
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(here, '../../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

if (
  process.env.NODE_ENV === 'production' ||
  process.env.NODE_ENV === 'staging'
) {
  console.error('Refusing to run outside local or CI.');
  process.exit(1);
}

const ownerUrl = process.env.MIGRATION_DATABASE_URL;
const appUrl = process.env.DATABASE_URL;
if (!ownerUrl || !appUrl) {
  console.error('MIGRATION_DATABASE_URL and DATABASE_URL must both be set.');
  process.exit(1);
}

const app = new URL(appUrl);
const user = decodeURIComponent(app.username);
const password = decodeURIComponent(app.password);
if (!/^[a-z_][a-z0-9_]*$/.test(user) || !password) {
  console.error(
    'DATABASE_URL needs a simple lowercase user name and a password.',
  );
  process.exit(1);
}
if (user === new URL(ownerUrl).username) {
  console.error(
    'DATABASE_URL must use a different user from MIGRATION_DATABASE_URL.',
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: ownerUrl });
await client.connect();
try {
  const ident = client.escapeIdentifier(user);
  const secret = client.escapeLiteral(password);
  const exists = await client.query(
    'SELECT 1 FROM pg_roles WHERE rolname = $1',
    [user],
  );
  const verb = exists.rowCount ? 'ALTER' : 'CREATE';
  await client.query(
    `${verb} ROLE ${ident} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD ${secret}`,
  );
  await client.query(`GRANT app_user TO ${ident}`);
  console.log(`App role ${user} ready.`);
} finally {
  await client.end();
}
