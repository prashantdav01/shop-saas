# AI Rules

One set of project rules for all three AIs.

| File | Read by | Edit? |
| --- | --- | --- |
| RULES.md | source shared by all | Yes |
| roles/claude.md, roles/codex.md, roles/gemini.md | source for each AI's role | Yes |
| CLAUDE.md | Claude Code | No, generated |
| AGENTS.md | Codex | No, generated |
| GEMINI.md | Gemini CLI | No, generated |
| DECISIONS.md | all three | Yes, add a row per decision |
| BACKLOG.md | all three | Yes, low-severity review findings |
| docs/AI_ROLES.md | people and all three | Yes |
| docs/DESIGN_REVIEW_PROTOCOL.md | anyone designing or reviewing a screen | Yes |

## To change a rule

1. Edit RULES.md or a file in roles/.
2. Run `node sync-rules.mjs` in this folder.
3. All three tool files update together.

## When the code repository exists

Copy everything in this folder to the repository root and commit it. The three AIs read their files from the root automatically.
