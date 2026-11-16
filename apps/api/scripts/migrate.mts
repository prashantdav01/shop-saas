// Applies SQL migrations in ./drizzle as the migration owner.
// Usage (from repo root): pnpm db:migrate            local or CI
//                         pnpm db:migrate -- --yes   a non-local database (Prashant only)
//
// After migrating it checks that every migration in the journal is recorded as
// applied. Drizzle skips a migration whose timestamp is older than the newest
// applied one (possible when branches merge out of order); this turns that silent
// skip into a failure.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import {
  describeTarget,
  isLocal,
  loadLocalEnv,
  requireEnv,
} from './local-guard.mts';

loadLocalEnv();
const url = requireEnv('MIGRATION_DATABASE_URL');
const confirmed = process.argv.includes('--yes') || process.env.CI === 'true';
console.log(`Migrating ${describeTarget(url)}`);
if (!isLocal(url) && !confirmed) {
  console.error('Not a local database. Re-run with --yes if you mean it.');
  process.exit(1);
}

const folder = resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle');
const journal = JSON.parse(
  readFileSync(resolve(folder, 'meta/_journal.json'), 'utf8'),
) as {
  entries: { tag: string; when: number }[];
};

// Timestamps must strictly increase in journal order, or drizzle may skip one.
for (let i = 1; i < journal.entries.length; i++) {
  if (journal.entries[i]!.when <= journal.entries[i - 1]!.when) {
    console.error(
      `Migration ${journal.entries[i]!.tag} is older than ${journal.entries[i - 1]!.tag}. ` +
        'Regenerate it on top of main (pnpm --filter api db:generate).',
    );
    process.exit(1);
  }
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: folder });

  const applied = await pool.query<{ hash: string }>(
    'SELECT hash FROM drizzle.__drizzle_migrations',
  );
  const appliedHashes = new Set(applied.rows.map((r) => r.hash));
  const missing = journal.entries.filter((e) => {
    const sqlText = readFileSync(resolve(folder, `${e.tag}.sql`), 'utf8');
    return !appliedHashes.has(
      createHash('sha256').update(sqlText).digest('hex'),
    );
  });
  if (missing.length > 0) {
    console.error(`Not applied: ${missing.map((m) => m.tag).join(', ')}`);
    process.exit(1);
  }
  console.log(
    `Migrations applied (${journal.entries.length} in journal, all recorded).`,
  );
} finally {
  await pool.end();
}
