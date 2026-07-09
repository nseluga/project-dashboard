# Engineer Report — Item 4.1
**Date:** 2026-07-08
**Track:** light
**Branch:** feat/astro-scaffold

## Changes Made

### `src/components/ProjectCard.astro`
- Status badge colors updated: `active` → `text-green-700` (was `text-green-800`), `in-progress` → `text-blue-700` (was `text-blue-800`), `on-hold` → `text-amber-700` (was `text-amber-800`), `complete` → `text-gray-500` (was `text-gray-700`).
- Added `archived` → `bg-gray-100 text-gray-500` to statusColors map (was previously falling through to default).
- Fallback `statusClass` default changed from `text-gray-700` to `text-gray-500` for consistency.
- Priority colors: `medium` changed from `bg-yellow-100 text-yellow-700` → `bg-amber-100 text-amber-700` to match spec.
- Priority badge rendered visually subordinate: `text-[10px]`, `px-1.5` (vs `px-2`), and `opacity-80` — smaller and dimmer than the status badge.
- Overdue card border: already correct — `border-2 border-red-400 bg-red-50` on overdue cards; no change needed.

### `src/pages/index.astro`
- Added `<hr class="border-t border-gray-200 my-6" />` between WeeklyDigest and the main board.
- Added `<hr class="border-t border-gray-200 mt-6" />` between the completed projects section and Inbox.
- Card grid already uses `gap-4`; board sections use `gap-10` in `<main>` — consistent spacing confirmed, no change needed.

### `src/components/WeeklyDigest.astro`
- Background changed from `bg-white` → `bg-slate-50` to visually separate it from the card board (which uses white cards).
- Border changed from `border-gray-200` → `border-blue-100` for subtle distinction.
- Bottom margin reduced from `mb-8` → `mb-6` to match the added `<hr my-6>` separator spacing.

### `src/components/Inbox.astro`
- Background changed from `bg-white` → `bg-slate-50` to visually distinguish the inbox section from the card board and match the digest's visual treatment.
- Existing `mt-8 border border-gray-200` and `shadow-sm` retained.

## Tests
11 test files, 206 tests — all passed.

## DONE WHEN criteria met?

- [x] Status badges: active = green-700, in-progress = blue-700, on-hold = amber-700, complete/archived = gray-500. Mapping object in frontmatter.
- [x] Overdue highlight: `border-2 border-red-400 bg-red-50` on overdue cards. Was already correct; confirmed no regression.
- [x] Priority badges: high = red-100/red-700, medium = amber-100/amber-700, low = gray-100/gray-500. Rendered smaller and subordinate (`text-[10px]`, `opacity-80`).
- [x] Consistent spacing: `gap-4` on all card grids, `gap-10` between board sections, `mt-8` on inbox.
- [x] Digest + inbox visually separated: two `<hr>` dividers bracket the main board; digest uses `bg-slate-50 border-blue-100`; inbox uses `bg-slate-50 border-gray-200`.
