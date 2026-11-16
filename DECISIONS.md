# Decisions log

Every AI reads this before proposing changes. Add a row when Prashant decides something. Do not reopen a decision without new evidence.

| Date | Decision | Status | Notes |
| --- | --- | --- | --- |
| 2026-11-06 | First customer type is electrical and electronics shops | Decided | Generic core, electrical preset first |
| 2026-11-06 | Team is Prashant plus three AIs: Claude Code (builder, designer), Codex (reviewer), Gemini (auditor, researcher). No Copilot | Superseded | Replaced 2026-11-13, see below |
| 2026-11-06 | Claude leads UI/UX design; Codex reviews designs; Gemini researches competitors and checks Hindi | Superseded | Replaced 2026-11-13, see below |
| 2026-11-13 | Team is Prashant plus Claude Code only. Claude builds, reviews (fresh-context reviewer agent) and researches; Codex and Gemini retired | Decided | Fewer hand-offs. Trade-off: one model family, so Level 2 also gets a security review. Revisit if a missed bug reaches a shop |
| 2026-11-13 | Stack: Angular 21 + PrimeNG, NestJS, PostgreSQL with RLS, Redis, pnpm monorepo | Superseded (UI part) | UI library replaced 2026-11-16, see below; rest of the stack unchanged |
| 2026-11-16 | UI: Angular Material for components (own Material 3 theme) + Bootstrap for layout only (grid and utilities; no Bootstrap components or JS). PrimeNG dropped | Decided | Prashant's call. Bootstrap limited to layout so its styles do not fight Material's. No PrimeNG code existed yet |
| 2026-11-06 | Online-first MVP; offline billing after launch | Proposed | Confirm after shop visits |
| 2026-11-13 | Review limits: risk-based levels, max two rounds, only high/medium block, whole-repo audit at phase gates | Proposed | Reworded for a Claude-only team; see RULES.md, Reviews. Numbers can change |
| 2026-11-13 | ORM: Drizzle | Decided | SQL migrations; `set_config('app.shop_id', ..., true)` per transaction for RLS (renamed from app.tenant_id on 2026-11-16) |
| - | Auth: managed provider or own JWT with mobile OTP | Open | |
| - | Payment gateway for subscriptions | Open | |
| 2026-11-13 | Hosting: AWS Mumbai (ap-south-1) | Deferred | Still the target, but nothing is bought until the pilot (Phase 6); see next row |
| 2026-11-16 | No paid hosting, domain or SMS until the pilot. Phase 1 gate becomes: CI passes and publishes the API Docker image (GHCR, free for public repos); one command runs the whole app production-like on the local PC. Test OTP (no real SMS) until then | Decided | Prashant has no budget yet. The same image moves to AWS later; AWS runbook stays in docs/DATABASE.md |
| 2026-11-16 | The web app is a PWA: installable on phone and desktop, app shell cached, update prompt, offline page | Decided | Prashant's call. Online-first still holds: offline billing (sync, conflicts) stays on the later list. Service worker must never cache API responses that carry shop data |
| 2026-11-13 | Code repository lives in `shop-saas/`; `AI Rules/` copied to its root | Decided | Edit rules in the repo from now on |
| 2026-11-13 | Rejected Codex finding (PR #1): "`main.ts` resolves `.env` outside the repository" | Rejected | `apps/api/dist/main.js` + `../../../.env` is the repo root; verified by starting the built API with only the root `.env` and getting `/health` ok |
| 2026-11-16 | Three database roles: bootstrap superuser (local/CI only), owner (not superuser, BYPASSRLS, CREATEROLE) for migrations, restricted API role in `app_user` | Decided | Local and CI behave like AWS. See docs/DATABASE.md. RDS support for BYPASSRLS to be confirmed in step 9 |
| 2026-11-16 | New shops are created only by `app_create_shop()`: database picks the id, the `trial` plan and `trialing` status. The API cannot change `plan_id` or `subscription_status` | Decided | From the step 4 security review. Trial limits (2 stores, 3 staff, 500 items) are placeholders until pricing is set in Phase 4 |
