# Database: roles, migrations and shop isolation

## The three roles

| Role | Used by | Powers | Created by |
| --- | --- | --- | --- |
| Bootstrap (container superuser `shop`) | `pnpm db:bootstrap` only | Everything | Docker image (local), CI service |
| Owner (`shop_owner`) | `pnpm db:migrate`, test fixtures | Owns all objects; **not** superuser; `BYPASSRLS`; `CREATEROLE` | `pnpm db:bootstrap` (local, CI); Prashant on AWS |
| API (`shop_app`, member of `app_user`) | The running API | Only the grants in migrations; RLS always applies | `pnpm db:setup-app-role` (local, CI); Prashant on AWS |

Running migrations as a non-superuser owner locally and in CI means they behave the same as on AWS.

## Local setup (fresh database)

```bash
docker compose up -d --wait
pnpm db:bootstrap
pnpm db:migrate
pnpm db:setup-app-role
pnpm test:e2e
```

The scripts refuse to run unless every database URL points at this machine (or `CI=true`). `db:migrate` against a non-local database needs `-- --yes`.

## Adding a shop-owned table (checklist)

1. Add it to `apps/api/src/db/schema.ts` with `shop_id`, following `docs/schema.dbml`. Add `UNIQUE (shop_id, id)` and composite `(shop_id, x_id)` foreign keys to other shop-owned tables.
2. `pnpm --filter api db:generate` for the table.
3. `pnpm --filter api exec drizzle-kit generate --custom --name <table>_rls` and in it:
   - `GRANT` only the needed privileges to `app_user` (column-level `UPDATE` where some columns must stay fixed).
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and `... FORCE ROW LEVEL SECURITY;`
   - `CREATE POLICY <table>_isolation ON <table> USING (shop_id = public.app_current_shop_id()) WITH CHECK (shop_id = public.app_current_shop_id());`
   - `CREATE TRIGGER <table>_set_updated_at BEFORE UPDATE ... EXECUTE FUNCTION public.set_updated_at();` if it has `updated_at`.
4. `pnpm db:migrate` and `pnpm test:e2e`. The guard tests fail if any of the above is missing.

Never edit a migration after it is merged. Read and write shop-owned tables only inside `withShop(db, shopId, tx => ...)`.

## AWS (Phase 1 step 9, done by Prashant)

To be confirmed when RDS is set up. Unverified: whether the RDS master user can grant `BYPASSRLS` on the current engine version; check the AWS documentation for the chosen Postgres version before relying on it.

1. As the RDS master user, create the owner role: `CREATE ROLE shop_owner LOGIN NOSUPERUSER BYPASSRLS CREATEROLE PASSWORD '...'`, grant it `CONNECT, CREATE` on the database and `USAGE, CREATE` on schema `public`.
2. Store the owner and API connection strings in AWS Secrets Manager, not in the repository.
3. Run `pnpm db:migrate -- --yes` with `MIGRATION_DATABASE_URL` set to the owner.
4. Create the API login role: `CREATE ROLE shop_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '...'; GRANT app_user TO shop_app;`
