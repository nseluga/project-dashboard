# QA Report
**Task:** Item 1.1 — `src/lib/projects.ts`: verify getProjects()
**Branch:** feat/astro-scaffold
**Date:** 2026-07-07
**Gate mode:** tests+behavioral

## VERDICT: PASS

## Criteria Checked
- `getProjects()` returns exactly 6 projects — test "returns exactly 6 projects" + behavioral (Count: 6) — PASS
- `os-evals` is excluded — test "excludes os-evals" + behavioral (os-evals excluded: true) — PASS
- `days_since_active` is a non-negative integer for all projects — test "has non-negative days_since_active for every project" + behavioral (all 6 projects: OK) — PASS
- Projects with a local `repo` path get a git-derived `last_active` — test "projects with a local repo get a git-derived last_active" + behavioral (os: `2026-07-07T23:27:49-04:00`, full ISO-8601 with tz offset from git) — PASS
- `nba-shot-value` (no local clone) falls back to frontmatter `last_active` — test "nba-shot-value falls back to frontmatter last_active" + behavioral (repo: null, last_active: `2025-05-11T00:00:00.000Z`) — PASS
- Vitest unit test confirms the count and exclusion — `tests/projects.test.ts` runs 7 vitest tests, all green (7 passed, 0 failed) — PASS

## Tests Added
- `tests/projects.test.ts` — 7 vitest tests covering count, os-evals exclusion, all 6 IDs, non-negative days_since_active, nba-shot-value frontmatter fallback, os git-derived date, and required field types. Written by engineer; QA ran them and confirmed all green. No new test infra created — vitest devDependency and `test:projects` script already wired by engineer.

## Not Verifiable
none
