# Backlog of low-severity findings

Low findings from reviews go here instead of blocking a merge. Fix them in batches.

| Date | Source | File / area | Finding | Status |
| --- | --- | --- | --- | --- |
| 2026-11-13 | Codex, PR #1 | `apps/api/src/health/health.controller.ts` | The 2 s health timeout does not cancel the pending query or ping; repeated probes during an outage can pile up work. Partly bounded today by the pool's 3 s connect timeout and Redis `maxRetriesPerRequest: 1`. Fix: Postgres `statement_timeout` on the health query, Redis `commandTimeout`, and a repeated-timeout test. | Open |
| 2026-11-16 | Security review, step 4 | `apps/api/scripts/db-setup-app-role.mts` | The local/CI role password is sent in plain text in `CREATE/ALTER ROLE` and can appear in Postgres logs if `log_statement` is `ddl` or `all`. Local and CI throwaway values only; the script refuses non-local databases. Fix: send a SCRAM verifier instead of the plain password. | Open |
| 2026-11-16 | Security review, step 5 | API boundary (Phase 2/3) | Shared helpers check values, not business rules. When billing endpoints are built: map `MoneyError`, `QuantityError`, `DateError` to a 400 with a generic message; zod limits on string length and request size; qty > 0 and price >= 0 on sale/purchase lines (negatives only in returns and adjustments); discount within the role limit; warranty months within limits; cap lines per bill; load coils under `FOR UPDATE`, never from the request. | Open |
