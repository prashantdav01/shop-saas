# Who does what

Claude builds, Codex reviews code, Gemini audits and researches, Prashant decides.

| Role | Lead | Second check |
| --- | --- | --- |
| Product owner / business analyst | Prashant | Claude turns shop notes into specs |
| Domain expert | Prashant, learning from shop owners | Gemini researches electrical trade practice to verify in shops |
| Architect | Claude | Codex reviews data model and tenancy; Prashant decides |
| UI/UX designer | Claude | Codex reviews usability; Prashant tests at the counter |
| Frontend developer | Prashant | Claude Code helps; Codex reviews tricky screens |
| Backend developer | Claude Code | Codex reviews every PR on stock, billing and serials |
| QA / tester | Claude Code writes automated tests | Codex looks for missing tests; Prashant tests by hand |
| DevOps | Claude Code | Gemini audits; Prashant holds keys and deploys |
| Project manager | Claude keeps plan, tasks and docs | Prashant sets weekly priorities |
| Security reviewer | Codex first review | Claude fresh-session review, then Gemini whole-repo audit |
| Tax and legal | Gemini researches official sources | Claude drafts formats and policies; a CA checks a sample invoice |
| Support and sales | Prashant | Claude writes Hindi guides and scripts; Gemini checks Hindi |

## Design tasks

| Task | Who |
| --- | --- |
| Screens, flows, PrimeNG theme, component states | Claude |
| Button labels, errors, empty states (English and Hindi draft) | Claude |
| Usability and accessibility review | Codex / ChatGPT |
| Competitor research | Gemini |
| Logo, app icon, illustrations | ChatGPT or Gemini (image generation) |
| Hindi wording check | Gemini, then Prashant |
| Final approval and counter test | Prashant |

Order per screen: Gemini notes -> Claude design -> Codex review -> Claude revision -> Prashant counter test -> Claude Code builds.
