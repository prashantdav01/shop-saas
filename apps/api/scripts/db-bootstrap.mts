// Local and CI only. Run once on a fresh database, before pnpm db:migrate.
// Uses the container's superuser (BOOTSTRAP_DATABASE_URL) to create the
// migration owner role from MIGRATION_DATABASE_URL:
//   NOSUPERUSER  so local and CI behave like AWS, where the owner is not a superuser
//   BYPASSRLS    so migrations, backfills and test fixtures can see every shop
//   CREATEROLE   so migrations can create the app_user group role
// On AWS, Prashant creates the equivalent owner role by hand (see docs/DATABASE.md).
import pg from 'pg';
import {
  describeTarget,
  loadLocalEnv,
  requireEnv,
  requireLocalOrCi,
} from './local-guard.mts';

loadLocalEnv();
const bootstrapUrl = requireEnv('BOOTSTRAP_DATABASE_URL');
const ownerUrl = requireEnv('MIGRATION_DATABASE_URL');
requireLocalOrCi(bootstrapUrl, ownerUrl);

const owner = new URL(ownerUrl);
const ownerName = decodeURIComponent(owner.username);
const ownerPassword = decodeURIComponent(owner.password);
if (!/^[a-z_][a-z0-9_]*$/.test(ownerName) || !ownerPassword) {
  console.error(
    'MIGRATION_DATABASE_URL needs a simple lowercase user name and a password.',
  );
  process.exit(1);
}
if (ownerName === new URL(bootstrapUrl).username) {
  console.error(
    'MIGRATION_DATABASE_URL must use a different user from BOOTSTRAP_DATABASE_URL.',
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: bootstrapUrl });
await client.connect();
try {
  const ident = client.escapeIdentifier(ownerName);
  const secret = client.escapeLiteral(ownerPassword);
  const { rows } = await client.query<{ rolsuper: boolean }>(
    'SELECT rolsuper FROM pg_roles WHERE rolname = $1',
    [ownerName],
  );
  if (rows[0]?.rolsuper) {
    console.error(`Refusing: role ${ownerName} is a superuser.`);
    process.exit(1);
  }
  const verb = rows.length ? 'ALTER' : 'CREATE';
  await client.query(
    `${verb} ROLE ${ident} LOGIN NOSUPERUSER BYPASSRLS CREATEROLE NOCREATEDB PASSWORD ${secret}`,
  );
  const db = client.escapeIdentifier(owner.pathname.slice(1));
  await client.query(`GRANT CONNECT, CREATE ON DATABASE ${db} TO ${ident}`);
  await client.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${ident}`);
  console.log(`Owner role ready: ${describeTarget(ownerUrl)}`);
} finally {
  await client.end();
}
