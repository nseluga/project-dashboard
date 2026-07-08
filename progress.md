# Project Dashboard — Progress

> Tracks what has actually landed against [plan.md](./plan.md). Update this file (not just
> the per-item `status` fields in plan.md) whenever an item is completed, so a fresh session
> can tell what's done without re-auditing the codebase.

**Last verified against code:** 2026-07-07

## Where we're at (one paragraph)

**Code:** Repo exists as a bare git repo with planning documents only — no Astro project has been scaffolded yet. The 6 project READMEs in `~/os/projects/*/` have been written with correct YAML frontmatter (done in the planning session). **Planning:** design is fully decided — tech stack, data model, API shape, and feature scope are locked in `plan.md`. No open design questions remain; every item is ready to implement in order.

## Status by stage

| Stage | Item | Status |
|---|---|---|
| pre | Project READMEs in `~/os/projects/*/` with YAML frontmatter | ✅ done (planning session) |
| 0 | 0.1 — Initialize Astro project with dependencies | not started |
| 0 | 0.2 — Add `.env.example` | not started |
| 1 | 1.1 — `src/lib/projects.ts`: read frontmatter + resolve `last_active` | not started |
| 1 | 1.2 — `src/lib/manual.ts`: safe read/write for `data/manual.json` | not started |
| 1 | 1.3 — Merge layer: `getMergedProjects()` | not started |
| 1 | 1.4 — API routes: inbox, due-date, override | not started |
| 2 | 2.1 — Board page: project cards grouped by status | not started |
| 2 | 2.2 — Collapsed "Completed" section | not started |
| 2 | 2.3 — Inline edit controls: due date, status override, priority | not started |
| 3 | 3.1 — Weekly digest section | not started |
| 3 | 3.2 — Quick-capture inbox UI | not started |
| 4 | 4.1 — Tailwind styling pass | not started |
| 4 | 4.2 — `README.md`: how to run | not started |

## How to update this file

After finishing a plan item: flip its row to `done [track] — [one-line summary + commit hash]` and update the matching `status:` field in `plan.md` to keep both in sync.
