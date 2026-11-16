import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import { plans, shops } from '../src/db/schema';
import { type Db, withShop } from '../src/db/with-shop';

// Needs Docker services, then: pnpm db:bootstrap, pnpm db:migrate, pnpm db:setup-app-role.
const APP_URL =
  process.env.DATABASE_URL ??
  'postgres://shop_app:shop_app_local_only@localhost:5433/shop';
const OWNER_URL =
  process.env.MIGRATION_DATABASE_URL ??
  'postgres://shop_owner:shop_owner_local_only@localhost:5433/shop';

// Tables with no shop_id that every shop may read. Everything else is shop-owned.
const GLOBAL_TABLES = ['plans'];
// Schemas that are not application data.
const SYSTEM_SCHEMAS = [
  'pg_catalog',
  'information_schema',
  'pg_toast',
  'drizzle',
];

/**
 * Awaits work that must fail and returns the Postgres error message.
 * Drizzle wraps database errors ("Failed query: ..."); the real reason is in
 * `cause`. Checking it proves the database refused, not some other failure.
 */
async function dbError(work: Promise<unknown>): Promise<string> {
  try {
    await work;
  } catch (err) {
    const cause = (err as { cause?: { message?: string } }).cause;
    return cause?.message ?? (err as Error).message;
  }
  throw new Error('expected the database to refuse, but it succeeded');
}

const PERMISSION_DENIED = /permission denied/;

describe('Shop isolation (row-level security)', () => {
  // max: 1 so every query reuses one connection: proves a setting from an
  // earlier transaction does not leak into the next one.
  const appPool = new Pool({ connectionString: APP_URL, max: 1 });
  const ownerPool = new Pool({ connectionString: OWNER_URL, max: 1 });
  const db: Db = drizzle(appPool, { schema });
  const owner = drizzle(ownerPool, { schema });
  let shopA = '';
  let shopB = '';

  async function createShop(name: string): Promise<string> {
    // The real sign-up path: the API role calls app_create_shop().
    const { rows } = await appPool.query<{ id: string }>(
      `SELECT public.app_create_shop($1, 'regular', '09AAAAA0000A1Z5', '09', 'below_1_5_crore', 'electrical_electronics') AS id`,
      [name],
    );
    return rows[0].id;
  }

  beforeAll(async () => {
    shopA = await createShop('Shop A');
    shopB = await createShop('Shop B');
  });

  afterAll(async () => {
    // The owner has BYPASSRLS, so it can clean up any shop.
    await owner.delete(shops).where(sql`${shops.id} in (${shopA}, ${shopB})`);
    await appPool.end();
    await ownerPool.end();
  });

  describe('roles', () => {
    it('the API role is not a superuser, cannot bypass RLS and owns nothing', async () => {
      const { rows } = await appPool.query<{
        rolsuper: boolean;
        rolbypassrls: boolean;
        owns: number;
      }>(
        `SELECT r.rolsuper, r.rolbypassrls,
                (SELECT count(*)::int FROM pg_class c WHERE c.relowner = r.oid) AS owns
           FROM pg_roles r WHERE r.rolname = current_user`,
      );
      expect(rows[0]).toEqual({
        rolsuper: false,
        rolbypassrls: false,
        owns: 0,
      });
    });

    it('the migration owner is not a superuser (same as on AWS)', async () => {
      const { rows } = await ownerPool.query<{
        rolsuper: boolean;
        rolbypassrls: boolean;
      }>(
        'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
      );
      expect(rows[0]).toEqual({ rolsuper: false, rolbypassrls: true });
    });
  });

  describe('guards for every current and future table', () => {
    it('every shop-owned table has RLS enabled and forced', async () => {
      const { rows } = await ownerPool.query<{ name: string }>(
        `SELECT n.nspname || '.' || c.relname AS name FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind IN ('r', 'p')
            AND n.nspname <> ALL($1) AND n.nspname NOT LIKE 'pg_temp%'
            AND c.relname <> ALL($2)
            AND NOT (c.relrowsecurity AND c.relforcerowsecurity)`,
        [SYSTEM_SCHEMAS, GLOBAL_TABLES],
      );
      expect(rows.map((r) => r.name)).toEqual([]);
    });

    it('every shop-owned table has a real shop policy, and no policy allows everything', async () => {
      const { rows } = await ownerPool.query<{ name: string; problem: string }>(
        `WITH t AS (
           SELECT n.nspname AS schema, c.relname AS name FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind IN ('r', 'p')
              AND n.nspname <> ALL($1) AND n.nspname NOT LIKE 'pg_temp%'
              AND c.relname <> ALL($2))
         SELECT t.name, 'no policy' AS problem FROM t
          WHERE NOT EXISTS (SELECT 1 FROM pg_policies p
                             WHERE p.schemaname = t.schema AND p.tablename = t.name)
         UNION ALL
         SELECT p.tablename, 'policy ' || p.policyname || ' does not use app_current_shop_id()'
           FROM pg_policies p JOIN t ON t.schema = p.schemaname AND t.name = p.tablename
          WHERE p.permissive = 'PERMISSIVE'
            AND (coalesce(p.qual, '') NOT LIKE '%app_current_shop_id()%'
                 OR (p.cmd IN ('ALL', 'INSERT', 'UPDATE')
                     AND coalesce(p.with_check, p.qual, '') NOT LIKE '%app_current_shop_id()%'))`,
        [SYSTEM_SCHEMAS, GLOBAL_TABLES],
      );
      expect(rows).toEqual([]);
    });

    it('no views or materialized views bypass RLS', async () => {
      // Views run as their owner unless security_invoker is set; materialized
      // views have no RLS at all.
      const { rows } = await ownerPool.query<{ name: string }>(
        `SELECT n.nspname || '.' || c.relname AS name FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname <> ALL($1) AND n.nspname NOT LIKE 'pg_temp%'
            AND (c.relkind = 'm'
                 OR (c.relkind = 'v'
                     AND NOT coalesce('security_invoker=true' = ANY (c.reloptions), false)))`,
        [SYSTEM_SCHEMAS],
      );
      expect(rows.map((r) => r.name)).toEqual([]);
    });

    it('the API role can read every application table (no forgotten grants)', async () => {
      const { rows } = await ownerPool.query<{ name: string }>(
        `SELECT n.nspname || '.' || c.relname AS name FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind IN ('r', 'p')
            AND n.nspname <> ALL($1) AND n.nspname NOT LIKE 'pg_temp%'
            AND NOT has_table_privilege('app_user', c.oid, 'SELECT')`,
        [SYSTEM_SCHEMAS],
      );
      expect(rows.map((r) => r.name)).toEqual([]);
    });

    it('every shop-owned table except shops has UNIQUE (shop_id, id)', async () => {
      const { rows } = await ownerPool.query<{ name: string }>(
        `SELECT c.relname AS name FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind IN ('r', 'p') AND n.nspname = 'public'
            AND EXISTS (SELECT 1 FROM pg_attribute a
                         WHERE a.attrelid = c.oid AND a.attname = 'shop_id' AND NOT a.attisdropped)
            AND NOT EXISTS (
              SELECT 1 FROM pg_index i
               WHERE i.indrelid = c.oid AND i.indisunique AND i.indnkeyatts = 2
                 AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
                        FROM pg_attribute a
                       WHERE a.attrelid = c.oid AND a.attnum = ANY (i.indkey))
                     = ARRAY['id', 'shop_id'])`,
      );
      expect(rows.map((r) => r.name)).toEqual([]);
    });

    it('every foreign key between shop-owned tables includes shop_id on both sides', async () => {
      // A shop-owned row may reference a global table (users, plans) by id alone;
      // a reference to another shop-owned table must be (shop_id, x_id).
      const { rows } = await ownerPool.query<{ conname: string }>(
        `SELECT con.conname FROM pg_constraint con
           JOIN pg_class c ON c.oid = con.conrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE con.contype = 'f' AND n.nspname = 'public'
            AND EXISTS (SELECT 1 FROM pg_attribute a
                         WHERE a.attrelid = con.confrelid AND a.attname = 'shop_id'
                           AND NOT a.attisdropped)
            AND (NOT EXISTS (SELECT 1 FROM unnest(con.conkey) k
                               JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k
                              WHERE a.attname = 'shop_id')
                 OR NOT EXISTS (SELECT 1 FROM unnest(con.confkey) k
                                  JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k
                                 WHERE a.attname = 'shop_id'))`,
      );
      expect(rows.map((r) => r.conname)).toEqual([]);
    });
  });

  describe('shops', () => {
    it('sign-up creates a trial shop that its own context can see', async () => {
      const seen = await withShop(db, shopA, (tx) => tx.select().from(shops));
      expect(seen).toHaveLength(1);
      expect(seen[0].id).toBe(shopA);
      expect(seen[0].subscriptionStatus).toBe('trialing');
      const [plan] = await owner
        .select()
        .from(plans)
        .where(eq(plans.id, seen[0].planId));
      expect(plan.code).toBe('trial');
    });

    it('a shop sees only itself', async () => {
      const seen = await withShop(db, shopA, (tx) => tx.select().from(shops));
      expect(seen.map((s) => s.id)).toEqual([shopA]);
    });

    it('with no shop set, nothing is visible', async () => {
      expect(await db.select().from(shops)).toEqual([]);
    });

    it('the shop setting does not outlive its transaction on a reused connection', async () => {
      await withShop(db, shopA, (tx) => tx.select().from(shops));
      expect(await db.select().from(shops)).toEqual([]);
    });

    it('a failed transaction also leaves no shop set', async () => {
      await expect(
        withShop(db, shopA, async (tx) => {
          await tx.select().from(shops);
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
      expect(await db.select().from(shops)).toEqual([]);
    });

    it('cannot update another shop, and its row is unchanged', async () => {
      const [before] = await owner
        .select()
        .from(shops)
        .where(eq(shops.id, shopB));
      const updated = await withShop(db, shopA, (tx) =>
        tx
          .update(shops)
          .set({ name: 'hijacked' })
          .where(eq(shops.id, shopB))
          .returning(),
      );
      expect(updated).toEqual([]);
      const [after] = await owner
        .select()
        .from(shops)
        .where(eq(shops.id, shopB));
      expect(after).toEqual(before);
    });

    it('can edit its own profile, and updated_at moves', async () => {
      const [before] = await owner
        .select()
        .from(shops)
        .where(eq(shops.id, shopA));
      await withShop(db, shopA, (tx) =>
        tx
          .update(shops)
          .set({ name: 'Shop A renamed' })
          .where(eq(shops.id, shopA)),
      );
      const [after] = await owner
        .select()
        .from(shops)
        .where(eq(shops.id, shopA));
      expect(after.name).toBe('Shop A renamed');
      expect(after.updatedAt.getTime()).toBeGreaterThan(
        before.updatedAt.getTime(),
      );
    });

    it('cannot change its own plan or subscription status', async () => {
      const [trial] = await owner
        .select()
        .from(plans)
        .where(eq(plans.code, 'trial'));
      expect(
        await dbError(
          withShop(db, shopA, (tx) =>
            tx
              .update(shops)
              .set({ subscriptionStatus: 'active' })
              .where(eq(shops.id, shopA)),
          ),
        ),
      ).toMatch(PERMISSION_DENIED);
      expect(
        await dbError(
          withShop(db, shopA, (tx) =>
            tx
              .update(shops)
              .set({ planId: trial.id })
              .where(eq(shops.id, shopA)),
          ),
        ),
      ).toMatch(PERMISSION_DENIED);
    });

    it('cannot change its own id', async () => {
      expect(
        await dbError(
          withShop(db, shopA, (tx) =>
            tx
              .update(shops)
              .set({ id: randomUUID() })
              .where(eq(shops.id, shopA)),
          ),
        ),
      ).toMatch(PERMISSION_DENIED);
    });

    it('cannot insert shops directly, only through app_create_shop()', async () => {
      const [trial] = await owner
        .select()
        .from(plans)
        .where(eq(plans.code, 'trial'));
      const newId = randomUUID();
      expect(
        await dbError(
          withShop(db, newId, (tx) =>
            tx.insert(shops).values({
              id: newId,
              planId: trial.id,
              name: 'Direct insert',
              gstType: 'unregistered',
              stateCode: '09',
              turnoverBand: 'below_1_5_crore',
              preset: 'electrical_electronics',
              subscriptionStatus: 'active',
            }),
          ),
        ),
      ).toMatch(PERMISSION_DENIED);
    });

    it('cannot delete shops at all', async () => {
      expect(
        await dbError(
          withShop(db, shopA, (tx) =>
            tx.delete(shops).where(eq(shops.id, shopA)),
          ),
        ),
      ).toMatch(PERMISSION_DENIED);
    });
  });

  describe('withShop', () => {
    it('rejects a shop id that is not a UUID', async () => {
      await expect(
        withShop(db, "x' or 1=1 --", () => Promise.resolve(1)),
      ).rejects.toThrow(/UUID/);
    });

    it('fails and rolls back if the shop setting is changed inside the transaction', async () => {
      await expect(
        withShop(db, shopA, async (tx) => {
          await tx.execute(
            sql`select set_config('app.shop_id', ${shopB}, true)`,
          );
          await tx
            .update(shops)
            .set({ name: 'written as B' })
            .where(eq(shops.id, shopB));
        }),
      ).rejects.toThrow(/changed inside the transaction/);
      const [b] = await owner.select().from(shops).where(eq(shops.id, shopB));
      expect(b.name).toBe('Shop B');
    });
  });
});
