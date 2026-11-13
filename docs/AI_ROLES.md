# Who does what

Claude Code builds, reviews and researches. Prashant decides.

| Role | Lead | Second check |
| --- | --- | --- |
| Product owner / business analyst | Prashant | Claude turns shop notes into specs |
| Domain expert | Prashant, learning from shop owners | Claude researches electrical trade practice to verify in shops |
| Architect | Claude | Fresh-context review of data model and tenancy; Prashant decides |
| UI/UX designer | Claude | Design review protocol; Prashant tests at the counter |
| Frontend developer | Claude and Prashant | Fresh-context review on Level 1 and 2 PRs |
| Backend developer | Claude | Fresh-context code and security review on stock, billing, serials, tax, tenancy, auth |
| QA / tester | Claude writes automated tests | Reviewer looks for missing tests; Prashant tests by hand |
| DevOps | Claude | Phase-gate audit; Prashant holds keys and deploys |
| Project manager | Claude keeps plan, tasks and docs | Prashant sets weekly priorities |
| Security reviewer | Claude security review on Level 2 PRs | Phase-gate audit |
| Tax and legal | Claude researches official sources and drafts formats | A CA checks a sample invoice |
| Support and sales | Prashant | Claude writes Hindi guides and scripts; a native speaker checks Hindi |

## Design tasks

| Task | Who |
| --- | --- |
| Competitor research | Claude |
| Screens, flows, PrimeNG theme, component states | Claude |
| Button labels, errors, empty states (English and Hindi draft) | Claude |
| Usability and accessibility review | Claude, fresh context, using DESIGN_REVIEW_PROTOCOL.md |
| Logo, app icon, illustrations | Prashant chooses a tool |
| Hindi wording check | Prashant or a native speaker |
| Final approval and counter test | Prashant |

Order per screen: Claude research notes -> Claude design -> fresh-context design review -> Claude revision -> Prashant counter test -> Claude builds.
