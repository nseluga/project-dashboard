---
# Review Report — Item 7.1 (re-review after fix pass)
**Date:** 2026-07-09
**Files Reviewed:** 10 (src/styles/global.css, src/layouts/BaseLayout.astro, src/components/ProjectCard.astro, EditControls.astro, MomentumView.astro, NextUp.astro, WeeklyDigest.astro, TokenTracker.astro, src/pages/index.astro, momentum.astro, notes.astro)
**Standards Applied:** efficiency, reliability, security

## Summary
All 4 prior findings are correctly resolved: `border-indigo-100` is in place in WeeklyDigest, `text-slate-500` is on both hidden-field labels (lines 79 and 153), the Log button ring is `ring-white ring-offset-2 ring-offset-indigo-600`, and all three pages import `<BaseLayout>` with no inline font links. Two new Minor findings: a `text-slate-300` delete button on a white-background row violates WCAG AA for interactive text, and the `bg-indigo-600` Set button in `EditControls.astro:60` still uses `ring-indigo-400` (the same pattern fixed in TokenTracker). Implementation is otherwise visually consistent and structurally sound.

## Findings

### Minor
- `src/components/TokenTracker.astro:110` — Safety & Security / Safe Defaults (WCAG AA) — `text-slate-300` on the `×` delete button (~1.65:1 on white `bg-white` row) is below WCAG AA 4.5:1 for interactive text; the `hover:text-red-500` only helps on hover — raise resting state to `text-slate-400` (meets 3:1 for large/icon targets) or `text-slate-500` for full compliance
- `src/components/EditControls.astro:60` — Safety & Security / Safe Defaults (WCAG 3:1 non-text UI) — `bg-indigo-600` Set button uses `focus-visible:ring-indigo-400` (~2.4:1 ring-to-button-surface), same pattern fixed in TokenTracker in this pass — replace with `focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600`

## STANDARDS.md Updates
none — all observed patterns already captured in prior passes

---
# Review Report — Item 7.1 (Typography, color, and visual polish)
**Date:** 2026-07-09
**Files Reviewed:** 10 (src/styles/global.css, src/components/ProjectCard.astro, EditControls.astro, MomentumView.astro, NextUp.astro, WeeklyDigest.astro, TokenTracker.astro, src/pages/index.astro, momentum.astro, notes.astro)
**Standards Applied:** efficiency, reliability, security

## Summary
The gray→slate and blue→indigo migrations are complete across nine of ten files; focus management was correctly upgraded to `focus-visible:` throughout; and the overdue border-override logic is correct (the ternary bypasses `statusBorderAccent` entirely, so no class collision). Three findings remain: one missed `blue-100` border in `WeeklyDigest`, a WCAG contrast failure on `text-slate-300` informational labels, and a below-threshold ring color on the indigo submit button. Font loading is duplicated verbatim across all three pages but carries no runtime cost — flagged as a Minor maintenance concern.

## Findings

### Important
- `src/components/WeeklyDigest.astro:14` — Safety & Security / Safe Defaults — `border-blue-100` was not migrated to `border-indigo-100`; spec says "blue-" accent replaced with indigo throughout except the in-progress badge, and WeeklyDigest is not a status badge — replace with `border-indigo-100`
- `src/components/EditControls.astro:79,153` — Safety & Security / Safe Defaults (WCAG AA) — `text-slate-300` on "Due date (hidden)" and "Priority (hidden)" informational labels produces ~1.65:1 contrast against the card background (slate-50); WCAG AA requires 4.5:1 for normal-size text — raise to `text-slate-400` (large+bold may pass 3:1) or `text-slate-500` for full compliance

### Minor
- `src/components/TokenTracker.astro:77` — Safety & Security / Safe Defaults (WCAG 3:1 non-text UI) — `focus-visible:ring-indigo-400` on `bg-indigo-600` button produces ~2.4:1 ring-to-button-surface contrast, below the WCAG 2.1 3:1 minimum for UI components — use `focus-visible:ring-white` with `focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600` so the ring is distinguishable against the button
- `src/pages/index.astro:63-65`, `momentum.astro:54-56`, `notes.astro:56-58` — Efficiency / Hoist Invariants — Google Font `<link>` block (`preconnect` × 2 + stylesheet) is copied verbatim into all three page `<head>`s; no shared layout exists — extract into a shared Astro layout component to eliminate the sync risk when font families or weights change

## STANDARDS.md Updates
- Added to **Client Scripts (src/components/) — accessibility**: Focus rings on filled buttons must contrast against the button surface, not just the page background. Use `ring-white ring-offset-2 ring-offset-{color}` when the button background is dark — `ring-indigo-400` on `bg-indigo-600` produces ~2.4:1, below the WCAG 3:1 non-text UI component minimum.
- Added to **Pages (src/pages/) — head deduplication**: Google Font `<link>` blocks and other shared `<head>` content must live in a single Astro layout component; copy-paste across pages is a maintenance hazard and a sync risk when weight sets or font families change.

---
