# Project Dashboard — Progress

**Status: not started**

This file is the execution checklist for the autonomous dev team (`dev-team-auto`). Work
top to bottom — tasks are ordered by dependency. Update the status line above and check
boxes as you go so this doubles as a live progress tracker. See `plan.md` for the design.

Follow global standards in `~/.claude/skills/dev-team/code-standards.md` and the Astro
conventions in `~/portfolio/STANDARDS.md`.

---

## Phase 0 — Inventory & scaffold
- [x] Rewrite the 6 project READMEs in `~/os/projects/*/` with corrected status + YAML
      frontmatter (done during the planning session).
- [ ] Scaffold this repo as an Astro project: `@astrojs/node` (SSR, `output: 'server'`),
      Tailwind, TypeScript. Add `gray-matter`. Wire `npm run dev` / `npm run build`.
- [ ] Add `.env.example` with `OS_PROJECTS_DIR=~/os/projects`.

## Phase 1 — Data / storage
- [ ] `src/lib/projects.ts`: read `${OS_PROJECTS_DIR}/*/README.md`, parse frontmatter with
      `gray-matter`, return typed `Project[]`. Skip `os-evals` (subset of os).
- [ ] `last_active` resolver: prefer `git -C <repo> log -1 --format=%cI` when `repo` is a
      local clone; fall back to frontmatter `last_active`. Compute `days_since_active`.
- [ ] `src/lib/manual.ts`: safe read/merge/write helpers for `data/manual.json`
      (`overrides`, `due_dates`, `inbox`). Create the file if missing; never partial-write.
- [ ] Merge layer: apply `overrides` onto frontmatter; attach `due_dates`; compute `overdue`.
- [ ] API routes: `POST /api/inbox`, `DELETE /api/inbox`, `POST /api/due-date`,
      `POST /api/override` — validate input, persist via `manual.ts`.

## Phase 2 — Core board
- [ ] Board page (`src/pages/index.astro`): project cards grouped by status
      (active / in-progress / on-hold), each showing status badge, priority,
      days-since-active, next step, repo path + GitHub link.
- [ ] Collapsed "Completed" section for `complete` / `archived`.
- [ ] Inline edit controls: set/clear due date, override status, set priority
      (POST to the API routes, re-render).

## Phase 3 — v1 features
- [ ] Weekly digest section: three buckets — moved (touched ≤7 days), overdue
      (due < today), coming up (due ≤7 days out).
- [ ] Quick-capture inbox UI: text input to add; list with check-off / delete; optional
      project tag on an item.

## Phase 4 — Polish & verify
- [ ] Tailwind styling pass per portfolio STANDARDS (status color coding, overdue = red).
- [ ] `README.md`: how to run (`npm install`, set `OS_PROJECTS_DIR`, `npm run dev`).
- [ ] Manual verification: `npm run dev`, load the board and confirm all 6 projects render
      with correct statuses; add an inbox item and reload (persists); set a due date in the
      past and confirm it shows overdue and lands in the digest's "overdue" bucket.
