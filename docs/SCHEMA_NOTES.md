# Schema notes (v2)

The schema lives in [schema.dbml](schema.dbml). It is a design, not a migration: tables are created in Phase 2 (platform tables) and Phase 3 (catalogue onward), one slice at a time, each with RLS policies and tests.

## Where it came from

1. **2024 draft** (`InventoryMgmtSystem.pdf`, ER diagram, single shop). Kept: brands as a table, nested categories, reorder levels. Dropped: stored report tables (reports are computed from the ledgers), username and password login (OTP instead). Later list: purchase orders, supplier returns, supplier-product catalogue.
2. **2026 draft** (DBML from Prashant). The base for v2.
3. **v2** (this file): the 2026 draft changed to follow RULES.md.

## Changes from the 2026 draft

| Area | Draft | v2 | Why |
| --- | --- | --- | --- |
| Tenancy | `shop_id` on most tables | `shop_id` on every shop-owned table, including line tables; composite `(shop_id, id)` foreign keys | RLS can only filter on a column that exists; composite keys stop cross-shop references |
| Stock on hand | Only a ledger | `stock_levels` cache per store and variant | Rules: cached `on_hand` updated in the same transaction as the movement |
| Coils | `coil_batches` | Generic `batches` with `remaining_qty >= 0`, `mrp_paise`, `expiry_date` | Rules: generic core; a coil is a batch in metres; the medical preset reuses it |
| Quantities | `numeric(12,3)` | `numeric(14,3)` | Rules |
| Percentages | `numeric(5,2)` | Integer basis points (`_bp`) | Whole numbers like paise; no rounding surprises |
| Timestamps | `timestamp` | `timestamptz` | Stored in UTC |
| Module switches | Only `preset` | Eight `mod_*` booleans on `shops` | Rules: behaviour comes from switches, not shop type |
| Plan limits | Columns on `shops` | `plans` table | Roadmap Phase 4: limits live in plans |
| Invoice lines | Price, rate, tax | Also frozen description, HSN, unit, MRP, cost, CGST/SGST/IGST split, approver of discount | Rules: freeze price, MRP and tax; a bill must reprint exactly |
| Invoices | | Frozen customer name and GSTIN, round-off, payment mode, who issued and cancelled | Reprint and audit |
| Numbering | `invoice_number` only | `document_series` per shop, document type and financial year; unique indexes | Gap-free series per year; quotations separate |
| Returns | None | `credit_notes` and lines, with restock flag | Issued bills are immutable |
| Transfers | None | `stock_transfers` and lines | Godown to counter |
| Adjustments | Reason on ledger | `stock_adjustments` with reason code and approver | Every adjustment needs a reason; coil corrections audited |
| Warranty | One period | Brand and shop warranty months and end dates; claim history table | Roadmap decision: record both |
| Credit | `credit_ledger` | `payments` plus append-only `party_ledger` | Receipts are documents; balance is a ledger sum |
| Price lists | % from list price | `basis` (list or MRP) plus % plus optional per-item price; one default list | Roadmap: tiers set as discount from MRP or list |
| Memberships | | Unique per shop and user; `staff_pin_hash` | Fast staff switching and manager PIN |
| Uniqueness | None | SKU, barcode, serial per variant, batch code, supplier bill number, document numbers | Stops duplicates at the database |
| Shop | | `turnover_band`, `allow_negative_stock`, `mrp_policy` | HSN length, negative stock setting, MRP warn or block |

## Open questions (answer from shop visits or a CA)

1. Invoice number format and prefix per financial year: confirm with a CA.
2. HSN length per turnover band: confirm current bands with a CA.
3. Do shops sell loose wire without an MRP? `mrp_paise` is nullable for that.
4. Mixed payment on one bill (part cash, part UPI): kept as `payment_mode = mixed` plus `payments` rows; confirm it is common.
5. Purchase returns to suppliers: on the later list unless shops ask.

## Rules applied at build time, not visible in DBML

- RLS `ENABLE` and `FORCE` on every shop-owned table, policy `shop_id = current_setting('app.shop_id')::uuid`.
- The API connects as a role without superuser or `BYPASSRLS`.
- `stock_movements`, `party_ledger`, `audit_logs`, `warranty_claim_events` allow insert only (no update or delete grants).
- Issued `invoices` and `invoice_lines` cannot be updated except the cancel columns.
