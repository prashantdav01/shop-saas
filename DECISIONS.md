# Decisions log

Every AI reads this before proposing changes. Add a row when Prashant decides something. Do not reopen a decision without new evidence.

| Date | Decision | Status | Notes |
| --- | --- | --- | --- |
| 2026-11-06 | First customer type is electrical and electronics shops | Decided | Generic core, electrical preset first |
| 2026-11-06 | Team is Prashant plus three AIs: Claude Code (builder, designer), Codex (reviewer), Gemini (auditor, researcher). No Copilot | Superseded | Replaced 2026-11-13, see below |
| 2026-11-06 | Claude leads UI/UX design; Codex reviews designs; Gemini researches competitors and checks Hindi | Superseded | Replaced 2026-11-13, see below |
| 2026-11-13 | Team is Prashant plus Claude Code only. Claude builds, reviews (fresh-context reviewer agent) and researches; Codex and Gemini retired | Decided | Fewer hand-offs. Trade-off: one model family, so Level 2 also gets a security review. Revisit if a missed bug reaches a shop |
| 2026-11-13 | Stack: Angular 21 + PrimeNG, NestJS, PostgreSQL with RLS, Redis, pnpm monorepo | Decided | Confirmed by Prashant |
| 2026-11-06 | Online-first MVP; offline billing after launch | Proposed | Confirm after shop visits |
| 2026-11-13 | Review limits: risk-based levels, max two rounds, only high/medium block, whole-repo audit at phase gates | Proposed | Reworded for a Claude-only team; see RULES.md, Reviews. Numbers can change |
| 2026-11-13 | ORM: Drizzle | Decided | SQL migrations; SET LOCAL app.tenant_id per transaction for RLS |
| - | Auth: managed provider or own JWT with mobile OTP | Open | |
| - | Payment gateway for subscriptions | Open | |
| 2026-11-13 | Hosting: AWS Mumbai (ap-south-1) | Decided | Exact services (App Runner/ECS, RDS) chosen in Phase 1 step 9 |
| 2026-11-13 | Code repository lives in `shop-saas/`; `AI Rules/` copied to its root | Decided | Edit rules in the repo from now on |
| 2026-11-13 | Rejected Codex finding (PR #1): "`main.ts` resolves `.env` outside the repository" | Rejected | `apps/api/dist/main.js` + `../../../.env` is the repo root; verified by starting the built API with only the root `.env` and getting `/health` ok |
