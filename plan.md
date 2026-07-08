# Project Dashboard — Plan

## Purpose

A single, local web page that shows the state of every project Nate is working on —
status, staleness, next step, and any due date — sourced from each project's README in
`~/os/projects/`, plus a weekly digest and a quick-capture inbox for stray ideas. It is
read-first, with light manual editing for due dates and status overrides. This is a
**state board, not a task manager**: each project's own `PLAN.md` / `PROGRESS.md` remain
the detailed trackers. The dashboard answers one question at a glance — *what am I working
on, where does it stand, and what's due when.*

## Project inventory (confirmed)

| id | Name | status | last_active | next step |
|---|---|---|---|---|
| os | os (incl. os-evals) | active | 2026-07-07 | ongoing — no discrete next step |
| portfolio-website | Portfolio Website | in-progress | 2026-07-07 | collaborative human refinement of content; polish the working architecture |
| patio | Patio | active | 2026-07-06 | backend refactor stages 0–9 via dev-team-auto |
| pitcher-injury-risk | Pitcher Injury Risk | on-hold | 2026-06-27 | refine the GitHub repo using baseball-research tooling to make it more presentable for viewers |
| batting-average-ability | Batting Average Ability | on-hold | 2025-12-01 | refine the GitHub repo using baseball-research tooling to make it more presentable for viewers |
| nba-shot-value | NBA Shot Value | complete | 2025-05-11 | none — complete; feature in os + portfolio |

`os-evals` is treated as a subset/extension of **os**, not its own row.

## Features

**v1 (must have)**
- Project board grouped by status, one card per project.
- Card shows: status badge, priority, days-since-active, next step, repo path + GitHub link.
- Manual due dates (entered in the dashboard) with overdue highlighting.
- Weekly digest: what moved (touched in last 7 days), what's overdue, what's coming up
  (due within 7 days).
- Quick-capture inbox: drop stray ideas/todos not yet triaged into a project.
- Collapsed "Completed" section for `complete`/`archived` projects.
- Manual status/priority override per project.

**v2 (later)**
- Momentum / staleness view with neglect alerts.
- "What to work on next" recommendation (due date + priority + staleness).
- Cross-project time / effort allocation view.
- Inbox → project triage flow.
- Auto-derive `last_active` from git for all repos (extend beyond local clones).

## Data model

**Project (derived, read-mostly)** — from `~/os/projects/<id>/README.md` YAML frontmatter:
`id`, `name`, `summary`, `repo`, `github`, `tags`, `status`, `priority`, `next_step`.
- `last_active`: preferred live from `git -C <repo> log -1 --format=%cI` when a local clone
  exists; falls back to the frontmatter `last_active` (e.g. NBA Shot Value, remote-only).
- Computed: `days_since_active`, `overdue` (due date < today).

**manual.json (dashboard-owned, writable)** at `data/manual.json`:
```json
{
  "overrides": { "portfolio-website": { "status": "in-progress" } },
  "due_dates": { "patio": "2026-08-01" },
  "inbox": [ { "id": "uuid", "text": "...", "created": "ISO", "project": null, "done": false } ]
}
```

**Merge order:** README frontmatter → overridden by `manual.json.overrides`. Due dates and
inbox items live only in `manual.json`.

### README frontmatter schema

```yaml
---
name: Patio
status: active            # active | in-progress | on-hold | complete
priority: high            # high | medium | low   (manual, optional)
last_active: 2026-07-06   # YYYY-MM-DD (git date preferred when a local clone exists)
next_step: "Backend refactor stages 0–9 via dev-team-auto"
repo: ~/Downloads/Patio
github: https://github.com/nseluga/patio
summary: "Full-stack social betting app for backyard games."
tags: [full-stack, mobile]
---
```

## Update mechanism & tradeoff

**Hybrid.** Project READMEs in `~/os/projects/` are the durable source of truth for project
facts (status lives where Nate already maintains it, inside os). `manual.json` holds
dashboard-only, frequently-edited data (due dates, inbox) plus optional field overrides.

- *Tradeoff:* READMEs must be kept current per project — mitigated by preferring the live
  git `last_active` so the most drift-prone field is automatic.
- `manual.json` keeps volatile fields (due dates) out of the READMEs to avoid churn, at the
  cost of status living in two possible places (README + optional override).

## Active vs. archived

`active` / `in-progress` / `on-hold` render on the main board. `complete` (and a future
`archived`) render in a collapsed section below it. Nothing is hidden in v1.

## Tech stack

- **Astro + Tailwind + TypeScript**, SSR via `@astrojs/node`. Matches the portfolio stack.
- Lives in its own repo (`~/project-dashboard`), separate from `~/os`.
- `src/lib/projects.ts` reads `${OS_PROJECTS_DIR}/*/README.md` (env `OS_PROJECTS_DIR`,
  default `~/os/projects`) and parses frontmatter with `gray-matter`.
- API routes persist writes to `data/manual.json`: `POST /api/inbox`, `DELETE /api/inbox`,
  `POST /api/due-date`, `POST /api/override`.
- Local-only tool, run with `npm run dev`. No deploy.
- Follows global `~/.claude/skills/dev-team/code-standards.md` and the Astro conventions in
  `~/portfolio/STANDARDS.md` (referenced, not restated here).

## Non-goals

- No auth, deployment, or multi-user — local personal tool.
- No per-project task management (per-repo PLAN/PROGRESS stay the detailed trackers).
- No time / effort tracking (v2).
- No "work on next" recommendation engine (declined for v1).
- No writing status back into project *code* repos — only `~/os/projects` frontmatter and
  `manual.json` are written.
- No mobile / responsive polish beyond basic layout.
