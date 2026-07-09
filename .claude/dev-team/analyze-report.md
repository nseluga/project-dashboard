# Analysis Report
**Task:** Item 7.1 — Typography, color, and visual polish (pure UI pass)
**Date:** 2026-07-09

## Relevant Files

- `src/pages/index.astro` — page `<head>` lines 59-63 (font link goes here); `<hr>` line 87 (must remove); body/section `gray-` classes; no shared layout
- `src/pages/momentum.astro` — page `<head>` lines 49-53 (font link goes here); all `gray-` classes; activity dot class built inline line 112
- `src/pages/notes.astro` — page `<head>` lines 51-55 (font link goes here); `gray-` + `blue-` classes; JS string className at line 244
- `src/components/ProjectCard.astro` — status badge map lines 11-16; priority badge map lines 19-23; `cardBorder` logic lines 28-30; GitHub `text-blue-600` line 87; `rounded-lg` line 38
- `src/components/MomentumView.astro` — scope tab active `bg-gray-800` line 70; inactive tab border line 71; activity dot `bg-blue-500`/`bg-gray-200` line 112; badge map lines 93-94; `divide-gray-100` line 89
- `src/components/WeeklyDigest.astro` — `border-blue-100 bg-slate-50` line 14 (already has slate-50; border is blue-100 = non-accent blue that needs sweep); `gray-` classes throughout
- `src/components/NextUp.astro` — already uses `indigo-` accent consistently; only needs `gray-` → `slate-` sweep (lines 54, 56)
- `src/components/EditControls.astro` — `bg-blue-600`/`hover:bg-blue-700`/`focus:ring-blue-400` on every button; `border-gray-300`/`text-gray-` throughout; no `transition-colors`
- `src/components/TokenTracker.astro` — `bg-blue-600`/`hover:bg-blue-700`/`focus:ring-blue-400` on submit; `border-gray-300`/`text-gray-` throughout; `hover:bg-gray-50` on table rows; no `transition-colors`
- `src/styles/global.css` — 5 lines total; only `@import "tailwindcss"` + `summary` rules; **theme extension goes here as `@theme {}`**

## Data Flow

Pure UI pass — no data layer changes. All class names must remain complete strings (no concatenation splitting words) for Tailwind v4 purge. Dynamic class lookups in `ProjectCard.astro` (status/priority maps) and `MomentumView.astro` (badgeClass ternary) are computed in JS object literals — full string values required.

## Patterns to Follow

- **Tailwind v4 / no `tailwind.config.cjs`**: Project uses `@tailwindcss/vite` (Tailwind v4). Custom font tokens go in `src/styles/global.css` under `@theme { --font-sans: 'Inter', sans-serif; --font-display: 'Plus Jakarta Sans', sans-serif; }`. Do not create a `.cjs` config file — it has no effect with v4.
- **Font `<link>` in each `<head>`**: No shared layout; each of the 3 pages has its own `<html><head>`. Add Google Fonts preconnect + stylesheet link to all three identically.
- **Status badge map pattern** (`ProjectCard.astro` lines 11-16): full string values in a `Record<string, string>`, e.g. `active: 'bg-emerald-100 text-emerald-700'`. Keep the same structure; only the color values change.
- **No full `<hr>` elements**: replace `index.astro` line 87 with `<div class="border-t border-slate-200 my-6" />` or remove it and use heading/section padding.
- **`transition-colors duration-150`**: append to class strings on all `<button>` and `<a>` elements that are interactive; no JS changes needed.
- **`focus-visible:` prefix for focus rings**: replace bare `focus:ring-2 focus:ring-indigo-400` with `focus-visible:ring-2 focus-visible:ring-indigo-400` so keyboard-only focus rings don't appear on click.

## Likely Changes

- **`src/styles/global.css`**: Add `@theme { --font-sans: 'Inter', sans-serif; --font-display: 'Plus Jakarta Sans', sans-serif; }` block; optionally set `body { font-family: var(--font-sans); }` here (or via Tailwind utility on `<body>`)
- **`src/pages/index.astro`**: Add font `<link>` to `<head>`; `bg-gray-50` → `bg-slate-100` on `<body>`; `text-gray-900` → `text-slate-900`; remove `<hr>` line 87; `text-gray-500/700/800/400` → `slate-`; section `h2` → larger weight + border separator instead of `<hr>`; add `transition-colors` on nav links
- **`src/pages/momentum.astro`**: Add font `<link>`; `bg-gray-50` → `bg-slate-100`; all `gray-` → `slate-`; add `transition-colors` on nav link
- **`src/pages/notes.astro`**: Add font `<link>`; `bg-gray-50` → `bg-slate-100`; `border-gray-300` → `border-slate-300`; `gray-` → `slate-`; `bg-blue-600 hover:bg-blue-700 focus:ring-blue-500` → `bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500`; JS string at line 244 `text-red-600` stays (error color); `text-red-500 hover:text-red-700` delete btn stays; add `transition-colors duration-150` to submit button
- **`src/components/ProjectCard.astro`**: status map → `active: 'bg-emerald-100 text-emerald-700'`, `in-progress: 'bg-blue-100 text-blue-700'` (keep blue for in-progress per spec "blue"), `on-hold: 'bg-amber-100 text-amber-700'`, `complete: 'bg-slate-100 text-slate-500'`, `archived: 'bg-slate-100 text-slate-500'`; priority map `low: 'bg-slate-100 text-slate-500'`; `cardBorder` expand to per-status left border map + `bg-slate-50`; `border border-gray-200 bg-white` → `border border-slate-200 bg-slate-50`; `rounded-lg` → `rounded-xl`; GitHub `text-blue-600 hover:text-blue-800` → `text-indigo-600 hover:text-indigo-800`; `gray-` → `slate-` throughout; add `transition-colors` on GitHub link + summary toggle
- **`src/components/MomentumView.astro`**: scope tab active `bg-gray-800` → `bg-slate-800`; inactive tab `border-gray-200 hover:bg-gray-50` → slate; active tab → add `border-b-2 border-indigo-500` underline style instead of `bg-slate-800`; activity dot `bg-blue-500` → `bg-indigo-500`; `bg-gray-200` → `bg-slate-200`; badge `bg-green-100 text-green-700` → `bg-emerald-100 text-emerald-700`; `divide-gray-100` → `divide-slate-100`; `gray-` → `slate-` throughout; add `transition-colors` on scope tab `<a>` elements
- **`src/components/WeeklyDigest.astro`**: `border-blue-100` → `border-slate-200`; `gray-` → `slate-` throughout; heading weight bump
- **`src/components/NextUp.astro`**: `text-gray-900` → `text-slate-900`; `text-gray-700` → `text-slate-700`; indigo accent stays
- **`src/components/EditControls.astro`**: `bg-blue-600 hover:bg-blue-700 focus:ring-blue-400` → `bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-400`; `border-gray-300` → `border-slate-300`; `text-gray-` → `text-slate-`; `hover:bg-gray-100` → `hover:bg-slate-100`; `focus:ring-gray-400` → `focus-visible:ring-slate-400`; add `transition-colors duration-150` to all buttons
- **`src/components/TokenTracker.astro`**: same `blue→indigo` swap on submit button + focus rings; `border-gray-300` → `border-slate-300`; `text-gray-` → `text-slate-`; `hover:bg-gray-50` → `hover:bg-slate-50`; `border-gray-200`/`border-gray-100` → slate; delete btn `text-gray-300` → `text-slate-300`; add `transition-colors duration-150` to submit + delete buttons

## Risks

- **Tailwind v4 `@theme {}` syntax**: not `theme.extend.fontFamily` — it's CSS custom properties inside `@theme {}`. Format: `@theme { --font-sans: 'Inter', sans-serif; }`. Wrong syntax silently produces no output.
- **Purge safety on dynamic class values**: `ProjectCard.astro` and `MomentumView.astro` build class strings in JS objects/ternaries. The scanner reads `.astro` files as text — it will find `'bg-emerald-100 text-emerald-700'` if the string is a complete literal. Do not split e.g. `'bg-' + color + '-100'` — the scan misses it.
- **`cardBorder` expansion for left accent**: current two-branch ternary (`overdue ? ... : ...`) must grow into a status-keyed map for per-status left border color. Overdue card still takes priority — the overdue branch wins over the status branch.
- **Three separate `<head>` blocks**: font `<link>` must go in all three; missing one page leaves it unstyled.
- **`border-blue-100` in WeeklyDigest**: one non-accent `blue-` that the sweep rule targets; change to `border-slate-200`.
- **`text-blue-600` in ProjectCard GitHub link**: targeted for `text-indigo-600`; `hover:text-blue-800` must also change to `hover:text-indigo-800`.
- **`bg-blue-500` activity dot in MomentumView**: built inside a conditional class string — change both the active-dot and the inactive-dot (`bg-gray-200` → `bg-slate-200`) in the same line.
- **`in-progress` badge**: task spec says use `blue` for in-progress status — keep `bg-blue-100 text-blue-700` (not emerald/indigo). Confirm: it is already blue, just needs the sweep check (`blue-` here is intentional per spec).
- **`focus:` vs `focus-visible:`**: the spec says "distinct focus-visible with accent color" — use `focus-visible:` prefix, not bare `focus:`, so click-focus rings don't show. Check every `focus:ring-` and `focus:outline-none` occurrence.
- **JS-set className string** (`notes.astro` line 244): `errorEl.className = 'note-inline-error text-xs text-red-600 mt-1'` — Tailwind purge scans `<script>` tag contents, so these classes are included. No action needed unless color is changed.
