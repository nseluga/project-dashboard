# Engineer Report
**Task:** Item 6.5 — Smart notepad with auto-categorization
**Branch:** feat/stage5-6
**Date:** 2026-07-09

## Design Decisions
- `NoteEntry` added as a sibling interface in `types/manual.ts` alongside `TokenLogEntry` and `InboxItem` — same file, same pattern; `notes: NoteEntry[]` added to `ManualData` with explicit field construction in `readManual()` matching 5.2-enforced pattern
- `autoTag()` is a pure function in `src/lib/autoTag.ts` — no I/O, no imports, takes `(text, projectIds, projectNames)` arrays so it's injectable and trivially testable without mocking; returns the id of the project whose id or name appears earliest in the text (case-insensitive `indexOf`)
- POST `/api/note` calls `getMergedProjects(manual)` inside the mutex after reading manual to resolve current project list for auto-tagging — same single-read pattern as index.astro (6.4); PATCH does the same only when projectId is non-null
- PATCH returns 400 for unknown projectId and allows `null` (unsorted); DELETE returns 404 for missing id — all three handlers follow the token-log.ts shape exactly
- `notes.astro` calls `readManual()` once, passes manual to `getMergedProjects(manual)`, uses both results — no double read; single `daysAgoLabel()` helper in frontmatter keeps template clean
- Notes grouped by `projectId`: null → "Unsorted / New Ideas" section at top; per-project sections follow in project-list order (filter+map on projects array preserves priority order); projects with no notes are skipped
- All three `<script>` fetch calls use `AbortController` with 10 s timeout and `clearTimeout` in `finally` — matches STANDARDS.md team-memory rule
- Nav link uses `class="flex items-center gap-4"` on `<nav>` to space Momentum and Notes links — identical anchor classes to existing Momentum link

## Files Changed
- `src/types/manual.ts` — added `NoteEntry` interface; added `notes: NoteEntry[]` to `ManualData`
- `src/lib/manual.ts` — `EMPTY_MANUAL` gets `notes: []`; ENOENT return gets `notes: []`; `readManual()` return adds `notes: [...(parsed.notes ?? [])]`
- `src/lib/autoTag.ts` (new) — pure `autoTag(text, projectIds, projectNames): string | null`; O(n_projects × 2 indexOf) per call
- `src/pages/api/note.ts` (new) — POST / DELETE / PATCH handlers with mutex, body shape guard, try/catch 500 shape; MAX_NOTE_LENGTH = 2000
- `src/pages/notes.astro` (new) — SSR page; single readManual(); grouping in frontmatter; add-note form + per-note reassign select + delete button; all fetches with AbortController
- `src/pages/index.astro` — Notes nav link added alongside Momentum; `<nav>` gets `flex items-center gap-4`
- `tests/autoTag.test.ts` (new) — 13 unit tests covering exact name match, id match, no match, multi-match earliest-position, case-insensitivity, empty project list
- `tests/api.test.ts` — added `getMergedProjects` mock; imported `notePOST/DELETE/PATCH`; added 14 tests (POST 5, DELETE 3, PATCH 5 + id missing 1); added `notes: []` to `makeManual()`
- `tests/manual.test.ts` — all inline ManualData literals updated with `notes: []` (6 occurrences)
- `tests/merge.test.ts` — `makeManual()` gets `notes: []`
- `tests/board.test.ts` — `makeManual()` gets `notes: []`
- `tests/edit-controls.test.ts` — `makeManual()` gets `notes: []`

## Deferred / Out of Scope
- Behavioral test for note API (real I/O path) — unit tests with mocks cover the full contract; consistent with token-log precedent
- Pagination / search on /notes — out of spec for 6.5; single list is fine at personal scale

## Flags for Reviewer
- `autoTag` uses `indexOf` which finds substring matches — "alpha" matches "alphabetical"; spec says "exact match" which is ambiguous for substrings; current behavior is substring scan, not word-boundary match
- POST `/api/note` calls `getMergedProjects(manual)` inside the mutex, which calls `getProjects()` (git subprocesses) — adds latency to every note write; could pre-resolve project list and cache it but that's a separate concern
- `daysAgoLabel` in notes.astro computes `Date.now()` per note in the frontmatter loop — fine at personal scale; extract to a single `now` if performance becomes a concern
