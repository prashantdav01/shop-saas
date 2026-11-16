import { defineConfig } from 'drizzle-kit';

// Used only by `pnpm db:generate` to write SQL migration files from src/db/schema.ts.
// It never connects to a database. Migrations are applied by scripts/migrate.mts.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
