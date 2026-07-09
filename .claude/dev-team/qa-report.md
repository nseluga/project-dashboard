---
# QA Report
**Task:** Item 6.3 — "What to work on next" recommendation card above WeeklyDigest
**Branch:** feat/stage5-6
**Date:** 2026-07-09
**Gate mode:** tests+behavioral

## VERDICT: PASS

## Criteria Checked
- `getRecommendation()` returns correct project when overdue wins — "overdue project wins over a non-overdue same-priority project" test — PASS
- Tie-breaking works (priority → due date → alphabetical id) — 3 dedicated tie-breaking tests — PASS
- complete/archived projects excluded — 4 null tests + "excludes complete/archived and returns the only eligible project" — PASS
- null when all projects are complete or archived — "returns null when all projects are complete or archived" test — PASS
- `NextUp` component renders on page with correct project — behavioral: "Portfolio Website" card with indigo styling and reason tags appeared at position 725 (before WeeklyDigest at 1316) — PASS
- empty/all-complete set renders nothing — `{project && ...}` guard in NextUp.astro; null path unit-tested — PASS
- Unit tests cover scoring and tie-breaking logic — 34 tests across all scoring components (priority, status, urgency bands, staleness) and all 3 tie-breaking rules — PASS
- Full suite (excluding 3 pre-existing failures) — 282/285 pass; 3 failures in projects.test.ts + board.test.ts are pre-existing and unrelated — PASS

## Failures
none

## Tests Added
- `tests/recommend.test.ts` — 34 tests for `scoreProject()` (excluded statuses, priority, status weight, urgency bands, staleness, combined) and `getRecommendation()` (null cases, overdue wins, tie-breaking, mixed statuses, no-today default); written by Engineer

## Not Verifiable
- none
---
