import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Tables follow docs/schema.dbml. Row-level security, roles and grants are not
// expressible here; they live in hand-written SQL migrations (see drizzle/).

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/** Global (not shop-owned): plan limits read by the API. */
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  maxStores: integer('max_stores').notNull(),
  maxStaff: integer('max_staff').notNull(),
  maxItems: integer('max_items').notNull(),
});

/** The tenant. RLS: a session sees only the shop whose id is in app.shop_id. */
export const shops = pgTable(
  'shops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),
    name: text('name').notNull(),
    gstType: text('gst_type').notNull(),
    gstin: text('gstin'),
    stateCode: char('state_code', { length: 2 }).notNull(),
    turnoverBand: text('turnover_band').notNull(),
    preset: text('preset').notNull(),
    // No default: app_create_shop() sets 'trialing'; billing changes it later.
    subscriptionStatus: text('subscription_status').notNull(),
    modBatchTracking: boolean('mod_batch_tracking').notNull().default(false),
    modSerialTracking: boolean('mod_serial_tracking').notNull().default(false),
    modDecimalQty: boolean('mod_decimal_qty').notNull().default(false),
    modPriceLists: boolean('mod_price_lists').notNull().default(false),
    modQuotations: boolean('mod_quotations').notNull().default(false),
    modCreditLedger: boolean('mod_credit_ledger').notNull().default(false),
    modExpiryTracking: boolean('mod_expiry_tracking').notNull().default(false),
    modPharmacyCompliance: boolean('mod_pharmacy_compliance')
      .notNull()
      .default(false),
    allowNegativeStock: boolean('allow_negative_stock').notNull().default(true),
    mrpPolicy: text('mrp_policy').notNull().default('warn'),
    ...timestamps,
  },
  (t) => [
    check(
      'shops_gst_type_check',
      sql`${t.gstType} in ('regular', 'composition', 'unregistered')`,
    ),
    check(
      'shops_gstin_required_check',
      sql`${t.gstType} = 'unregistered' or ${t.gstin} is not null`,
    ),
    check('shops_state_code_check', sql`${t.stateCode} ~ '^[0-9]{2}$'`),
    check(
      'shops_subscription_status_check',
      sql`${t.subscriptionStatus} in ('trialing', 'active', 'past_due', 'read_only', 'cancelled')`,
    ),
    check('shops_mrp_policy_check', sql`${t.mrpPolicy} in ('warn', 'block')`),
  ],
);
