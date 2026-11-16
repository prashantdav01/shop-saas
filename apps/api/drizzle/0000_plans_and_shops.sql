CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"max_stores" integer NOT NULL,
	"max_staff" integer NOT NULL,
	"max_items" integer NOT NULL,
	CONSTRAINT "plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"name" text NOT NULL,
	"gst_type" text NOT NULL,
	"gstin" text,
	"state_code" char(2) NOT NULL,
	"turnover_band" text NOT NULL,
	"preset" text NOT NULL,
	"subscription_status" text NOT NULL,
	"mod_batch_tracking" boolean DEFAULT false NOT NULL,
	"mod_serial_tracking" boolean DEFAULT false NOT NULL,
	"mod_decimal_qty" boolean DEFAULT false NOT NULL,
	"mod_price_lists" boolean DEFAULT false NOT NULL,
	"mod_quotations" boolean DEFAULT false NOT NULL,
	"mod_credit_ledger" boolean DEFAULT false NOT NULL,
	"mod_expiry_tracking" boolean DEFAULT false NOT NULL,
	"mod_pharmacy_compliance" boolean DEFAULT false NOT NULL,
	"allow_negative_stock" boolean DEFAULT true NOT NULL,
	"mrp_policy" text DEFAULT 'warn' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shops_gst_type_check" CHECK ("shops"."gst_type" in ('regular', 'composition', 'unregistered')),
	CONSTRAINT "shops_gstin_required_check" CHECK ("shops"."gst_type" = 'unregistered' or "shops"."gstin" is not null),
	CONSTRAINT "shops_state_code_check" CHECK ("shops"."state_code" ~ '^[0-9]{2}$'),
	CONSTRAINT "shops_subscription_status_check" CHECK ("shops"."subscription_status" in ('trialing', 'active', 'past_due', 'read_only', 'cancelled')),
	CONSTRAINT "shops_mrp_policy_check" CHECK ("shops"."mrp_policy" in ('warn', 'block'))
);
--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;