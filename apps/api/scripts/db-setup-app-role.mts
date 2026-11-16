// Local and CI only: creates the API's LOGIN role named in DATABASE_URL and makes
// it a member of app_user. Run after pnpm db:migrate. Hosted environments create
// their login role by hand (Prashant), see docs/DATABASE.md.
//
// Safety: refuses unless both URLs are local (or CI=true), and refuses to touch an
// existing role that has superuser, BYPASSRLS or CREATEROLE.
import pg from 'pg';
import {
  describeTarget,
  loadLocalEnv,
  requireEnv,
  requireLocalOrCi,
} from './local-guard.mts';

loadLocalEnv();
const ownerUrl = requireEnv('MIGRATION_DATABASE_URL');
const appUrl = requireEnv('DATABASE_URL');
requireLocalOrCi(ownerUrl, appUrl);

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
  const { rows } = await client.query<{
    rolsuper: boolean;
    rolbypassrls: boolean;
    rolcreaterole: boolean;
  }>(
    'SELECT rolsuper, rolbypassrls, rolcreaterole FROM pg_roles WHERE rolname = $1',
    [user],
  );
  const existing = rows[0];
  if (
    existing &&
    (existing.rolsuper || existing.rolbypassrls || existing.rolcreaterole)
  ) {
    console.error(
      `Refusing: role ${user} already exists with admin powers; not changing it.`,
    );
    process.exit(1);
  }
  const verb = existing ? 'ALTER' : 'CREATE';
  // Local and CI throwaway password. Note: Postgres may log this statement if
  // log_statement is 'ddl' or 'all'. Never reuse this pattern for hosted roles.
  await client.query(
    `${verb} ROLE ${ident} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD ${secret}`,
  );
  await client.query(`GRANT app_user TO ${ident}`);
  console.log(`App role ready: ${describeTarget(appUrl)}`);
} finally {
  await client.end();
}
