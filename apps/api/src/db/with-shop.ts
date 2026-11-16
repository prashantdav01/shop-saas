import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The only way the API reads or writes shop-owned data.
 * Opens a transaction, sets app.shop_id for that transaction only, and runs `work`.
 * Row-level security then limits every query in `work` to this shop.
 */
export async function withShop<T>(
  db: Db,
  shopId: string,
  work: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!UUID_PATTERN.test(shopId)) {
    throw new Error('withShop: shopId must be a UUID');
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.shop_id', ${shopId}, true)`);
    const result = await work(tx);
    // If anything inside `work` changed the setting, fail and roll back rather
    // than commit writes made under another shop.
    const check = await tx.execute<{ shop_id: string | null }>(
      sql`select nullif(current_setting('app.shop_id', true), '') as shop_id`,
    );
    if (check.rows[0]?.shop_id !== shopId) {
      throw new Error('withShop: app.shop_id changed inside the transaction');
    }
    return result;
  });
}
