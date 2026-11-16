import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import { plans, shops } from '../src/db/schema';
import { type Db, withShop } from '../src/db/with-shop';

// Needs Docker services, `pnpm db:migrate` and `pnpm db:setup-app-role`.
const APP_URL =
  process.env.DATABASE_URL ??
  'postgres://shop_app:shop_app_local_only@localhost:5433/shop';
const OWNER_URL =
  process.env.MIGRATION_DATABASE_URL ??
  'postgres://shop:shop_local_only@localhost:5433/shop';

// Global tables (no shop_id). Every other table in public must be shop-isolated.
const GLOBAL_TABLES = ['plans', '__drizzle_migrations'];

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

describe('Shop isolation (row-level security)', () => {
  // max: 1 so every query reuses one connection: proves a setting from an
  // earlier transaction does not leak into the next one.
  const appPool = new Pool({ connectionString: APP_URL, max: 1 });
  const ownerPool = new Pool({ connectionString: OWNER_URL, max: 1 });
  const db: Db = drizzle(appPool, { schema });
  const shopA = randomUUID();
  const shopB = randomUUID();

  beforeAll(async () => {
    const owner = drizzle(ownerPool, { schema });
    const [plan] = await owner
      .insert(plans)
      .values({
        code: `test-${shopA}`,
        maxStores: 2,
        maxStaff: 5,
        maxItems: 1000,
      })
      .returning();
    const base = {
      planId: plan.id,
      gstType: 'regular',
      gstin: '09AAAAA0000A1Z5',
      stateCode: '09',
      turnoverBand: 'below_1_5_crore',
      preset: 'electrical_electronics',
    };
    // Owner is a superuser locally, so it can seed both shops past RLS.
    await owner.insert(shops).values([
      { ...base, id: shopA, name: 'Shop A' },
      { ...base, id: shopB, name: 'Shop B' },
    ]);
  });

  afterAll(async () => {
    const owner = drizzle(ownerPool, { schema });
    await owner.delete(shops).where(sql`${shops.id} in (${shopA}, ${shopB})`);
    await owner.delete(plans).where(eq(plans.code, `test-${shopA}`));
    await appPool.end();
    await ownerPool.end();
  });

  it('the API role is not a superuser and cannot bypass RLS', async () => {
    const { rows } = await appPool.query<{
      rolsuper: boolean;
      rolbypassrls: boolean;
    }>(
      'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
    );
    expect(rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
  });

  it('every non-global table has RLS enabled and forced', async () => {
    const { rows } = await ownerPool.query<{ relname: string }>(
      `SELECT c.relname FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND NOT (c.relrowsecurity AND c.relforcerowsecurity)
          AND c.relname <> ALL($1)`,
      [GLOBAL_TABLES],
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it('every foreign key from a shop-owned table includes shop_id', async () => {
    // Composite (shop_id, x_id) keys stop rows pointing at another shop's rows.
    const { rows } = await ownerPool.query<{ conname: string }>(
      `SELECT con.conname FROM pg_constraint con
         JOIN pg_class c ON c.oid = con.conrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE con.contype = 'f' AND n.nspname = 'public'
          AND EXISTS (SELECT 1 FROM pg_attribute a
                       WHERE a.attrelid = c.oid AND a.attname = 'shop_id')
          AND NOT EXISTS (SELECT 1 FROM unnest(con.conkey) k
                           JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k
                          WHERE a.attname = 'shop_id')`,
    );
    expect(rows.map((r) => r.conname)).toEqual([]);
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

  it('cannot update another shop', async () => {
    const updated = await withShop(db, shopA, (tx) =>
      tx
        .update(shops)
        .set({ name: 'hijacked' })
        .where(eq(shops.id, shopB))
        .returning(),
    );
    expect(updated).toEqual([]);
    const b = await withShop(db, shopB, (tx) => tx.select().from(shops));
    expect(b[0].name).toBe('Shop B');
  });

  it('cannot move its own row to another shop id', async () => {
    const message = await dbError(
      withShop(db, shopA, (tx) =>
        tx.update(shops).set({ id: randomUUID() }).where(eq(shops.id, shopA)),
      ),
    );
    expect(message).toMatch(/row-level security/);
  });

  it('cannot insert a row for a different shop', async () => {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.code, `test-${shopA}`));
    const message = await dbError(
      withShop(db, shopA, (tx) =>
        tx.insert(shops).values({
          id: randomUUID(),
          planId: plan.id,
          name: 'Intruder',
          gstType: 'unregistered',
          stateCode: '09',
          turnoverBand: 'below_1_5_crore',
          preset: 'electrical_electronics',
        }),
      ),
    );
    expect(message).toMatch(/row-level security/);
  });

  it('cannot delete shops at all', async () => {
    const message = await dbError(
      withShop(db, shopA, (tx) => tx.delete(shops).where(eq(shops.id, shopA))),
    );
    expect(message).toMatch(/permission denied/);
  });

  it('rejects a shop id that is not a UUID', async () => {
    await expect(
      withShop(db, "x' or 1=1 --", () => Promise.resolve(1)),
    ).rejects.toThrow(/UUID/);
  });
});
