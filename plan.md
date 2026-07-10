# Project Dashboard — Execution Plan

> **What it is:** A single, local web page that shows the state of every project Nate is working on — status, staleness, next step, due date — sourced from each project's README in `~/os/projects/`. Includes a weekly digest, a momentum view, a "what to work on next" recommendation, and Claude token tracking. This is a **state board, not a task manager**: each project's own `PLAN.md`/`PROGRESS.md` remain the detailed trackers. The dashboard answers one question — *what am I working on, where does it stand, and what's due when.*

> **Data model — two stores, read-mostly:**
> - **Project READMEs** (`~/os/projects/<id>/README.md`, YAML frontmatter): `id` (dir name), `name`, `summary`, `repo`, `github`, `tags`, `status`, `priority`, `next_step`, `last_active`. `last_active` prefers live git (`git -C <repo> log -1 --format=%cI`); falls back to frontmatter. Computed: `days_since_active`, `overdue`.
> - **`data/manual.json`** (dashboard-owned, writable): `overrides` (per-project field overrides), `due_dates`, `hidden_fields` (per-project controls to hide), `token_log` (Claude token usage entries). Merge order: frontmatter → overridden by `manual.json.overrides`. File shape: `{ "overrides": {}, "due_dates": {}, "hidden_fields": {}, "token_log": [] }`.

> **Tech stack:** Astro + Tailwind + TypeScript, SSR via `@astrojs/node` (`output: 'server'`). Frontmatter parsed with `gray-matter`. `OS_PROJECTS_DIR` env var (default `~/os/projects`) points to the projects dir. API routes persist to `data/manual.json`. Run with `npm run dev`. No deploy — local personal tool.

> **Standards:** Follow `~/.claude/skills/dev-team/code-standards.md` and Astro/UI conventions in `~/portfolio/STANDARDS.md`. Read `~/portfolio/STANDARDS.md` before building any page or component.

> **Project inventory (6 projects, excluding os-evals which is a subset of os):**
> `os` (active), `portfolio-website` (in-progress), `patio` (active), `pitcher-injury-risk` (on-hold), `batting-average-ability` (on-hold), `nba-shot-value` (complete).

---

**All planned stages (0–7) are complete.** See [progress.md](./progress.md) for the full history.

## Non-goals (do not implement)
- Auth, deployment, or multi-user support
- Per-project task management (PLAN/PROGRESS in project repos are the detailed trackers)
- Writing status back into project code repos — only `~/os/projects` frontmatter and `data/manual.json` are written
- Mobile/responsive polish beyond basic usability
- Cross-project time tracking (hours/sessions) — token tracking only
- Auto-derive `last_active` beyond local git clones
