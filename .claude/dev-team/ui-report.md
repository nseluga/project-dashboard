# UI Report
**Task:** Item 7.1 — Typography, color, and visual polish
**Branch:** feat/stage5-6
**Date:** 2026-07-09

## Changes Made
- `src/styles/global.css` — added `@theme { --font-sans: 'Inter'; --font-display: 'Plus Jakarta Sans' }` for Tailwind v4 font extension
- `src/pages/index.astro` — Google Fonts `<link>` in `<head>`; `font-sans` on `<body>`; `font-display` on h1 and section headings; all `gray-` → `slate-`; `<hr>` → `<div role="separator">`; `<main>` gets `bg-slate-100 rounded-xl p-6`; nav links + Completed summary get `transition-colors duration-150`
- `src/pages/momentum.astro` — Google Fonts `<link>`; `font-sans` on body; `font-display` on h1; `gray-` → `slate-`; nav link gets transition
- `src/pages/notes.astro` — Google Fonts `<link>`; `font-sans` on body; `font-display` on h1 and section h2s; `gray-` → `slate-`; `blue-` → `indigo-` on textarea ring, Add note button; note cards `bg-slate-50 rounded-xl shadow-sm`; delete/reassign controls get `focus-visible:ring-*` and `transition-colors duration-150`
- `src/components/ProjectCard.astro` — status badge `green→emerald`, `gray→slate`; left-border accent by status (`border-l-4 border-emerald/blue/amber/slate`); overdue stays `border-2 border-red-400 bg-red-50`; card `bg-white→bg-slate-50`, `rounded-lg→rounded-xl`; project name gets `font-display`; GitHub link `blue-600→indigo-600` with transition; Edit summary hover `→text-indigo-600` with transition; due-date `gray-500→slate-500`
- `src/components/EditControls.astro` — all `gray-` → `slate-`; `blue-600/700` Set button → `indigo-600/700`; `blue-400` rings → `indigo-400`; all `focus:ring-*` → `focus-visible:ring-*`; Hide/Show/Clear buttons get `transition-colors duration-150`
- `src/components/MomentumView.astro` — scope tabs: active `bg-gray-800→bg-indigo-600`, inactive `gray-→slate-`; column headers `gray-→slate-`; project name gets `font-display`; activity dots `bg-blue-500→bg-indigo-500`, empty `bg-gray-200→bg-slate-200`; moving badge `bg-green-100/text-green-700→bg-emerald-100/text-emerald-700`; dividers `divide-gray-100→divide-slate-100`
- `src/components/TokenTracker.astro` — heading gets `font-display`; all `gray-` → `slate-`; `blue-600` Log button → `indigo-600` with transition; all `focus:ring-*` → `focus-visible:ring-*`; table row hover `bg-gray-50→bg-slate-50`; delete button `text-gray-300→text-slate-300` with transition
- `src/components/WeeklyDigest.astro` — heading gets `font-display`; all `gray-` → `slate-`
- `src/components/NextUp.astro` — project name heading gets `font-display`; `gray-900/gray-700` → `slate-900/slate-700`

## Backend Flags
none

## Deferred
- `WeeklyDigest.astro` retains `border-blue-100` on the card border — structural border, not an accent; could change to `border-indigo-100` for tighter consistency in a future pass
- `<main bg-slate-100>` wraps only the board sections; WeeklyDigest/NextUp/TokenTracker sit outside it — preserves existing layout hierarchy without structural changes, per constraint
