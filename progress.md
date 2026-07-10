# Project Dashboard — Progress

> Complete history of what landed. All stages are done — [plan.md](./plan.md) has been cleaned to reflect this.

**Last verified against code:** 2026-07-09

## Where we're at (one paragraph)

**v2 is shipped.** All stages 0–7 are complete. Dashboard now has: collapsible edit controls (5.1), per-project field hide toggles (5.2), inbox removed (6.1), momentum view with git activity bars (6.2), "What to work on next" recommendation card (6.3), Claude token tracking (6.4), smart notepad with auto-categorization (6.5), and a full visual design pass — slate palette, indigo accent, Inter+Plus Jakarta Sans fonts, emerald status badges, left-border card accents, WCAG-compliant focus rings (7.1). Branch feat/stage5-6 merged into main. No further plan items remain.

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
| 5 | 5.1 — Collapsible edit controls | done full — `<details><summary>Edit</summary>` wrapper in ProjectCard.astro, no JS, collapsed by default; test selectors fixed; Safari triangle fix in global.css (a9e6066) |
| 5 | 5.2 — Per-project field hide toggles | done full — new POST /api/field-visibility route, hidden_fields in ManualData/MergedProject/merge layer, conditional EditControls rendering with Hide/Show buttons; readManual() now uses explicit field-by-field construction to prevent unknown-key passthrough (cf1b33a) |
| 6 | 6.1 — Remove inbox | done light — deleted Inbox.astro + api/inbox.ts, removed from index.astro; InboxItem type retained for compat; inbox-removal tests added (51273f7) |
| 6 | 6.2 — Momentum view | done full — new /momentum page with scope selector, day-by-day activity bars, stalled/moving badges; git.ts with async execFile; Momentum nav link in index.astro (dc80fe3) |
| 6 | 6.3 — "What to work on next" recommendation | done full — recommend.ts with scoreProject/getRecommendation, NextUp.astro indigo card with reason pills; NaN guards, locale-stable sort, single clock read (a9f0cd7) |
| 6 | 6.4 — Claude token tracking | done full — TokenLogEntry type, POST+DELETE /api/token-log, total_tokens in merge (pre-aggregated Map), TokenTracker component with prop-based tokenLog, single readManual() pass-through in index.astro (5e7d213) |
| 6 | 6.5 — Smart notepad with auto-categorization | done full — NoteEntry type, POST/DELETE/PATCH /api/note, autoTag with word-boundary matching, /notes SSR page with grouping + inline errors; getMergedProjects() hoisted outside mutex (e8f4527) |
| 7 | 7.1 — Typography, color, and visual polish | done full — Inter+Plus Jakarta Sans via BaseLayout, slate palette sweep, indigo accent, emerald status badges, border-l-4 card accents, focus-visible rings, Momentum indigo dots (d3e71b2) |

