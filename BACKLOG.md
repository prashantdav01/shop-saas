# Backlog of low-severity findings

Low findings from reviews go here instead of blocking a merge. Fix them in batches.

| Date | Source | File / area | Finding | Status |
| --- | --- | --- | --- | --- |
| 2026-11-13 | Codex, PR #1 | `apps/api/src/health/health.controller.ts` | The 2 s health timeout does not cancel the pending query or ping; repeated probes during an outage can pile up work. Partly bounded today by the pool's 3 s connect timeout and Redis `maxRetriesPerRequest: 1`. Fix: Postgres `statement_timeout` on the health query, Redis `commandTimeout`, and a repeated-timeout test. | Open |
