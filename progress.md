# Project Dashboard — Progress

> Tracks what has actually landed against [plan.md](./plan.md). Update this file (not just
> the per-item `status` fields in plan.md) whenever an item is completed, so a fresh session
> can tell what's done without re-auditing the codebase.

**Last verified against code:** 2026-07-08

## Where we're at (one paragraph)

**v1 is shipped.** All stages 0–4 are complete. The Astro SSR project is scaffolded, data layer solid (projects.ts, manual.ts, merge.ts), all API routes hardened, the project board with edit controls is live, weekly digest is built, and README is written. Next phase is v1.5 UX improvements (collapsible edit controls, per-project field hide toggles) followed by v2 features (momentum view, what-to-work-on-next recommendation, Claude token tracking, inbox removal).

## Status by stage

| Stage | Item | Status |
|---|---|---|
| pre | Project READMEs in `~/os/projects/*/` with YAML frontmatter | ✅ done (planning session) |
| 0 | 0.1 — Initialize Astro project with dependencies | done full — Astro 5 SSR scaffold with Node adapter, Tailwind, gray-matter in dependencies, 7-test suite passing (4debf06) |
| 0 | 0.2 — Add `.env.example` | done trivial — .env.example with OS_PROJECTS_DIR, .env confirmed gitignored (088d88d) |
| 1 | 1.1 — `src/lib/projects.ts`: read frontmatter + resolve `last_active` | done full — getProjects() returns 6 projects, git last_active resolution, error-path hardening, 10-test suite (9b401f7) |
| 1 | 1.2 — `src/lib/manual.ts`: safe read/write for `data/manual.json` | done full — atomic write with ENOENT discrimination, 7-test suite passing (fc6285d) |
| 1 | 1.3 — Merge layer: `getMergedProjects()` | done light — override/due_date/overdue logic, 9-test suite passing (d007d40) |
| 1 | 1.4 — API routes: inbox, due-date, override | done full — 4 endpoints with mutex serialization, I/O error wrapping, 38-test suite (c57d9db) |
| 2 | 2.1 — Board page: project cards grouped by status | done full — 3-bucket board with ProjectCard, URL guard, error boundary, 38-test suite (0f1d3f1) |
| 2 | 2.2 — Collapsed "Completed" section | done light — native &lt;details&gt; disclosure, nba-shot-value hidden by default, 57-test suite (bf31e29) |
| 2 | 2.3 — Inline edit controls: due date, status override, priority | done full — EditControls with field whitelist, date validation, AbortController timeout, 171-test suite (185eda8) |
| 3 | 3.1 — Weekly digest section | done full — computeDigestBuckets() with lower-bound guard and date validation, 19-test suite (5a4c800) |
| 3 | 3.2 — Quick-capture inbox UI | done full — Inbox.astro with try/catch error boundary, AbortController fetch timeout, 500-char text cap, aria-describedby, 206-test suite (10db84a) |
| 4 | 4.1 — Tailwind styling pass | done light — status/priority badge colors, overdue red border, section separators, bg-slate-50 on digest+inbox, 206-test suite (6bfba44) |
| 4 | 4.2 — `README.md`: how to run | done trivial — setup/run instructions, data/manual.json note, stack section (e90d94b) |
| 5 | 5.1 — Collapsible edit controls | todo |
| 5 | 5.2 — Per-project field hide toggles | todo |
| 6 | 6.1 — Remove inbox | todo |
| 6 | 6.2 — Momentum view | todo |
| 6 | 6.3 — "What to work on next" recommendation | todo |
| 6 | 6.4 — Claude token tracking | todo |
| 6 | 6.5 — Smart notepad with auto-categorization | todo |
| 7 | 7.1 — Typography, color, and visual polish | todo |

## How to update this file

After finishing a plan item: flip its row to `done [track] — [one-line summary + commit hash]` and update the matching `status:` field in `plan.md` to keep both in sync.
