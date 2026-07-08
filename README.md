# project-dashboard

A single, local dashboard for tracking Nate's active projects — status, staleness, next
step, due dates — plus a weekly digest and a quick-capture inbox. It reads each project's
status from the READMEs in `~/os/projects/` and stores its own writable data (due dates,
inbox) in `data/manual.json`.

**Status:** planning complete, app not yet built. See:
- [`plan.md`](./plan.md) — design doc (purpose, inventory, data model, tech stack, non-goals)
- [`progress.md`](./progress.md) — dependency-ordered build checklist for `dev-team-auto`

## Stack (planned)

Astro + Tailwind + TypeScript, SSR via `@astrojs/node`. Local-only; run with `npm run dev`.

## Build

The app is built by running `dev-team-auto` against `progress.md`:

```
cd ~/project-dashboard && claude   # then invoke /dev-team-auto
```
