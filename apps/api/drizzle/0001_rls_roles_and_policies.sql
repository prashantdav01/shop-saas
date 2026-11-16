-- Row-level security for shop isolation. See RULES.md (Data rules) and docs/DATABASE.md.
--
-- Roles:
--   migration owner  Runs this file and owns every object. NOSUPERUSER, BYPASSRLS,
--                    CREATEROLE. Local and CI: scripts/db-bootstrap.mts. AWS: Prashant.
--                    BYPASSRLS lets migrations, backfills and fixtures see all shops
--                    even though FORCE ROW LEVEL SECURITY is on.
--   app_user         NOLOGIN group role holding the API's grants. Never superuser,
--                    never BYPASSRLS. Each environment creates a LOGIN role that is
--                    a member (local and CI: scripts/db-setup-app-role.mts).
--
-- Every new shop-owned table needs, in its own custom migration: grants to app_user,
-- ENABLE + FORCE RLS, a policy using public.app_current_shop_id(), and an
-- updated_at trigger if it has updated_at. The guard tests fail otherwise.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO app_user;
--> statement-breakpoint

-- The current shop for this transaction, or NULL when none is set.
-- set_config(..., true) is transaction-local; afterwards the setting reads back
-- as '' on the same pooled connection, so '' must mean NULL (no rows), never an
-- error and never "all shops".
CREATE OR REPLACE FUNCTION public.app_current_shop_id() RETURNS uuid
  LANGUAGE sql STABLE
  SET search_path = pg_catalog
  AS $$ SELECT nullif(current_setting('app.shop_id', true), '')::uuid $$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.app_current_shop_id() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.app_current_shop_id() TO app_user;
--> statement-breakpoint

-- Keeps updated_at honest on every UPDATE.
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = pg_catalog
  AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
--> statement-breakpoint

-- plans: global, read-only for the API. The trial plan is the default for new shops.
GRANT SELECT ON plans TO app_user;
--> statement-breakpoint
INSERT INTO plans (code, max_stores, max_staff, max_items)
  VALUES ('trial', 2, 3, 500)
  ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint

-- shops: the tenant row itself; id is the shop id.
-- The API may read its shop and edit its profile and settings. It may NOT insert
-- shops directly, change plan_id or subscription_status (billing owns those), or
-- delete shops.
GRANT SELECT ON shops TO app_user;
--> statement-breakpoint
GRANT UPDATE (
  name, gst_type, gstin, state_code, turnover_band,
  mod_batch_tracking, mod_serial_tracking, mod_decimal_qty, mod_price_lists,
  mod_quotations, mod_credit_ledger, mod_expiry_tracking, mod_pharmacy_compliance,
  allow_negative_stock, mrp_policy
) ON shops TO app_user;
--> statement-breakpoint
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE shops FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY shops_isolation ON shops
  USING (id = public.app_current_shop_id())
  WITH CHECK (id = public.app_current_shop_id());
--> statement-breakpoint
CREATE TRIGGER shops_set_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- Sign-up creates a shop through this function only. The database picks the id,
-- the trial plan and 'trialing'; the caller cannot choose them.
-- SECURITY DEFINER runs as the owner (BYPASSRLS), with a fixed search_path.
CREATE OR REPLACE FUNCTION public.app_create_shop(
  p_name text,
  p_gst_type text,
  p_gstin text,
  p_state_code char(2),
  p_turnover_band text,
  p_preset text
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
  AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.shops (plan_id, name, gst_type, gstin, state_code, turnover_band, preset, subscription_status)
  SELECT p.id, p_name, p_gst_type, p_gstin, p_state_code, p_turnover_band, p_preset, 'trialing'
    FROM public.plans p WHERE p.code = 'trial'
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'trial plan is missing';
  END IF;
  RETURN v_id;
END
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.app_create_shop(text, text, text, char, text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.app_create_shop(text, text, text, char, text, text) TO app_user;
