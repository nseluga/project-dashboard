# Engineer Report
**Task:** Item 1.1 — `src/lib/projects.ts`: read frontmatter + resolve `last_active`
**Branch:** feat/astro-scaffold
**Date:** 2026-07-07

## Design Decisions
- **Module boundary:** `src/lib/projects.ts` owns all I/O (fs + git); `src/types/project.ts` owns the type — no logic in the type file.
- **SKIP_DIRS set:** Added `project-dashboard` alongside `os-evals` — both are in `~/os/projects/` but neither is a tracked project for the dashboard (project-dashboard is this app; os-evals is a sub-project of os). The spec only mentioned `os-evals` but the inventory requirement of exactly 6 made the second exclusion necessary.
- **gray-matter Date coercion:** gray-matter parses bare YAML dates (`2025-05-11`) as JS `Date` objects rather than strings; the implementation checks `instanceof Date` and calls `.toISOString()` so the stored value is always a parseable ISO-8601 string.
- **git timeout + stderr suppression:** `execSync` runs with `stdio: ['pipe','pipe','pipe']` and a 5 s timeout so a slow/missing repo never stalls the page load; errors are caught and return `null` to fall back to frontmatter.
- **`days_since_active` floored at 0:** `Math.max(0, ...)` guards against clock skew or future-dated frontmatter values producing a negative integer.
- **Test runner:** Added `vitest` (devDependency) for TypeScript-native testing; existing `node --test` scaffold tests unaffected. New `test:projects` script runs the vitest suite.

## Files Changed
- `src/types/project.ts` — `Project` interface with all frontmatter fields + `id`, `last_active`, `days_since_active`
- `src/lib/projects.ts` — `getProjects()`: expands `~`, enumerates dirs, parses frontmatter, resolves `last_active` via git or fallback, computes `days_since_active`
- `tests/projects.test.ts` — 7 vitest tests: count (6), os-evals exclusion, all 6 ids present, non-negative days, nba-shot-value frontmatter fallback, os git-derived date, field types
- `package.json` — added `test:projects` script and `vitest` devDependency
- `package-lock.json` — lockfile update for vitest

## Deferred / Out of Scope
- Caching / memoization of `getProjects()` — item 1.3 or page layer can add this if needed
- Parallelizing per-directory reads with `Promise.all` — sequential `for` loop is correct and simpler; at 6–7 projects the perf difference is negligible

## Flags for Reviewer
- `execSync` is synchronous and blocks the event loop for up to 5 s per repo — acceptable for a local personal tool with 6 projects, but would need replacement with `execAsync`/spawning if project count grows or this is called from a hot path
- The `project-dashboard` skip was inferred from the 6-project requirement, not stated in the spec — confirm this is the intended behavior
