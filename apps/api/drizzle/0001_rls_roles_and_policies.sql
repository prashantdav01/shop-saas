-- Row-level security for shop isolation. See RULES.md, Data rules.
--
-- Roles:
--   app_user  NOLOGIN group role. Holds the API's table grants. Never superuser,
--             never BYPASSRLS. Each environment creates its own LOGIN role and
--             grants it app_user (local and CI: scripts/db-setup-app-role.mts;
--             AWS: Prashant).
--   The migration owner (whoever runs this) owns the tables. FORCE ROW LEVEL
--   SECURITY makes the policies apply to the owner too, except superusers.

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
-- set_config(..., true) is transaction-local; after the transaction ends the
-- setting reads back as '' on the same pooled connection, so '' must mean NULL,
-- not a cast error and never "all shops".
CREATE OR REPLACE FUNCTION app_current_shop_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.shop_id', true), '')::uuid $$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION app_current_shop_id() TO app_user;
--> statement-breakpoint

-- plans: global, read-only for the API.
GRANT SELECT ON plans TO app_user;
--> statement-breakpoint

-- shops: the tenant row itself. id is the shop id.
GRANT SELECT, INSERT, UPDATE ON shops TO app_user;
--> statement-breakpoint
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE shops FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY shops_isolation ON shops
  USING (id = app_current_shop_id())
  WITH CHECK (id = app_current_shop_id());
