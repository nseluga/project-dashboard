# UI Report
**Task:** Item 3.2 — Quick-capture inbox UI
**Branch:** feat/astro-scaffold
**Date:** 2026-07-08

## Changes Made
- `src/components/Inbox.astro` — new component; renders add form with inline validation error ("Text is required"), item list with delete buttons, and empty state ("No items."); reads `readManual().inbox` server-side and filters `done: false` items; dates formatted as "today" or "N days ago"; optional project tag shown as a blue pill badge; buttons and inputs carry `aria-label` attributes; error message uses `role="alert"` + `aria-live="polite"`; follows WeeklyDigest section styling (white card, rounded border, shadow-sm).
- `src/pages/index.astro` — imported `Inbox` component and placed `<Inbox />` below the completed projects `<details>` section at the bottom of the page.

## Backend Flags
none — the existing `POST /api/inbox` and `DELETE /api/inbox` JSON routes handle both operations without modification.

## Deferred
none — all spec requirements implemented.
