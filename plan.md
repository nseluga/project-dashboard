# Project Dashboard — Execution Plan

> **What it is:** A single, local web page that shows the state of every project Nate is working on — status, staleness, next step, due date — sourced from each project's README in `~/os/projects/`. Includes a weekly digest, a momentum view, a "what to work on next" recommendation, and Claude token tracking. This is a **state board, not a task manager**: each project's own `PLAN.md`/`PROGRESS.md` remain the detailed trackers. The dashboard answers one question — *what am I working on, where does it stand, and what's due when.*

> **Data model — two stores, read-mostly:**
> - **Project READMEs** (`~/os/projects/<id>/README.md`, YAML frontmatter): `id` (dir name), `name`, `summary`, `repo`, `github`, `tags`, `status`, `priority`, `next_step`, `last_active`. `last_active` prefers live git (`git -C <repo> log -1 --format=%cI`); falls back to frontmatter. Computed: `days_since_active`, `overdue`.
> - **`data/manual.json`** (dashboard-owned, writable): `overrides` (per-project field overrides), `due_dates`, `hidden_fields` (per-project controls to hide), `token_log` (Claude token usage entries). Merge order: frontmatter → overridden by `manual.json.overrides`. File shape: `{ "overrides": {}, "due_dates": {}, "hidden_fields": {}, "token_log": [] }`.

> **Tech stack:** Astro + Tailwind + TypeScript, SSR via `@astrojs/node` (`output: 'server'`). Frontmatter parsed with `gray-matter`. `OS_PROJECTS_DIR` env var (default `~/os/projects`) points to the projects dir. API routes persist to `data/manual.json`. Run with `npm run dev`. No deploy — local personal tool.

> **Standards:** Follow `~/.claude/skills/dev-team/code-standards.md` and Astro/UI conventions in `~/portfolio/STANDARDS.md`. Read `~/portfolio/STANDARDS.md` before building any page or component.

> **Project inventory (6 projects, excluding os-evals which is a subset of os):**
> `os` (active), `portfolio-website` (in-progress), `patio` (active), `pitcher-injury-risk` (on-hold), `batting-average-ability` (on-hold), `nba-shot-value` (complete).

---

> **Completed stages 0–4** (scaffold, data layer, core board, v1 features, polish) are archived in [progress.md](./progress.md) with commit hashes.

---

## STAGE 5 — v1.5 UX improvements

### 5.1 — Collapsible edit controls (read-only default)
- **status:** todo
- **track:** full
- **owns_files:** `src/components/ProjectCard.astro`, `src/components/EditControls.astro`
- **blocked_by:** 4.2
- **blocks:** 5.2
- **task:** Change each project card so edit controls are collapsed/hidden by default. The card renders all fields read-only. Each card gets a small "Edit" button (or "⋮" icon) that toggles visibility of the `EditControls` panel using a `<details>`/`<summary>` element — no page reload, no added JS beyond what's already in EditControls. The `<summary>` should say "Edit" and be styled subtly (small, muted). The `EditControls` component itself is unchanged; just wrap it in `<details class="..."><summary>Edit</summary> ... </details>` inside `ProjectCard.astro`. Read `~/portfolio/STANDARDS.md` before touching any Tailwind.
- **done when:** visiting the dashboard shows all cards with edit controls hidden by default; clicking "Edit" on any card expands its controls; all existing edit functionality (due date, status override, priority) still works correctly after expand; no regressions in any other card behavior; no console errors.

### 5.2 — Per-project hide toggles for due date + priority fields
- **status:** todo
- **track:** full
- **owns_files:** `src/pages/api/field-visibility.ts` (new), `src/lib/manual.ts` (extend), `src/types/manual.ts` (extend), `src/lib/merge.ts` (extend), `src/types/project.ts` (extend MergedProject), `src/components/EditControls.astro` (extend)
- **blocked_by:** 5.1
- **blocks:** nothing
- **task:** Add per-project settings to hide the due date and/or priority controls for projects that don't use them. Implementation:
  1. Extend `ManualData` in `src/types/manual.ts` with `hidden_fields: Record<string, { due_date?: boolean; priority?: boolean }>`. Default empty `{}` in `readManual()`.
  2. New API route `POST /api/field-visibility` — body `{ projectId: string, field: 'due_date' | 'priority', hidden: boolean }`. Validates field name (400 if not one of the two allowed values). Updates `manual.hidden_fields[projectId][field]`. Returns `{ ok: true }`.
  3. In `getMergedProjects()` (merge.ts), attach `hidden_fields: { due_date: boolean; priority: boolean }` to each `MergedProject`, reading from `manual.hidden_fields[id]` (default both to `false`).
  4. In `EditControls.astro`, accept the updated `MergedProject` prop. Conditionally render the due date fieldset only when `!project.hidden_fields.due_date`. Conditionally render the priority select only when `!project.hidden_fields.priority`. Inside each section (when visible), add a small "Hide this field" link/button that POSTs `{ projectId, field, hidden: true }` to `/api/field-visibility` and reloads. When a section is hidden, the expanded edit panel shows a "Show due date" / "Show priority" restore button instead (posts `hidden: false`).
- **done when:** hiding due date removes the due date fieldset from that project's expanded edit controls and persists on reload; hiding priority removes the priority select and persists; the restore button brings each back; other projects are unaffected; `POST /api/field-visibility` with an invalid field name returns 400; tests cover the new API route and the merge layer's hidden_fields passthrough.

---

## STAGE 6 — v2 features

### 6.1 — Remove inbox
- **status:** todo
- **track:** light
- **owns_files:** `src/components/Inbox.astro` (delete), `src/pages/api/inbox.ts` (delete), `src/pages/index.astro` (remove import + usage), `src/types/manual.ts` (keep InboxItem for compat), `src/lib/manual.ts` (keep inbox field for compat)
- **blocked_by:** 4.2
- **blocks:** 6.2, 6.3, 6.4
- **task:** Remove the quick-capture inbox from the UI entirely. Delete `src/components/Inbox.astro` and `src/pages/api/inbox.ts`. Remove the Inbox import and `<Inbox />` usage from `src/pages/index.astro`. Keep the `InboxItem` type and `inbox` field in `ManualData` for backward compat (so existing `data/manual.json` files with inbox entries don't break on parse), but remove all rendering and interaction. Remove inbox-related tests, but keep the data model compiling correctly. Update `readManual()` default shape to still include `inbox: []` so any existing field is preserved on read and harmlessly ignored.
- **done when:** the page renders with no inbox UI; `GET /api/inbox` and `POST /api/inbox` return 404 (routes deleted); no TypeScript errors; no broken imports; existing `manual.json` with inbox data still parses without errors; test suite passes.

### 6.2 — Momentum view: project activity timeline
- **status:** todo
- **track:** full
- **owns_files:** `src/pages/momentum.astro` (new page), `src/lib/git.ts` (new), `src/components/MomentumView.astro` (new)
- **blocked_by:** 6.1
- **blocks:** nothing
- **task:** Build a `/momentum` page showing recent git activity and staleness across all projects. Implementation:
  1. Add `src/lib/git.ts` with `getCommitDates(repoPath: string, sinceDays: number): string[]` — runs `git -C <repoPath> log --format="%cI" --since="<N> days ago"` via `execSync`; returns ISO date strings. Returns `[]` if git errors or repo path is absent.
  2. Create `src/pages/momentum.astro`. Read `scope` from URL search params (`?scope=7` / `?scope=30` / `?scope=90`; default 30). Call `getMergedProjects()` and for each project with a `repo`, call `getCommitDates()` with the scope. Build a data structure: `{ project, commitDates: string[], commitCount: number, stalled: boolean }[]` where `stalled = project.days_since_active > 14`.
  3. Render `MomentumView.astro` which shows:
     - A scope selector bar (3 links: "7d" / "30d" / "90d") styled as tab-like links. The active scope is highlighted. Each link is `href="/momentum?scope=N"`.
     - Per project row: project name, a visual activity bar (Tailwind-only — a row of small squares or filled dots, one per day in the scope window, colored if a commit fell on that day), commit count, days since active, and a "moving" (green) or "stalled" (amber) badge.
     - Projects without a local repo show "no local repo" in place of the activity bar.
  4. Link to `/momentum` from the main `index.astro` nav (add a simple text link or tab at the top).
- **done when:** `/momentum` renders all projects; the scope selector changes the window and highlights the active choice; projects with git repos show activity bars with commit dots; projects without repos show the placeholder; stalled projects have amber badge; moving projects have green badge; page loads without errors; tests cover `getCommitDates()` (happy path + error path).

### 6.3 — "What to work on next" recommendation
- **status:** todo
- **track:** full
- **owns_files:** `src/lib/recommend.ts` (new), `src/components/NextUp.astro` (new), `src/pages/index.astro` (add NextUp above weekly digest)
- **blocked_by:** 6.1
- **blocks:** 6.4
- **task:** Add a "What to work on next" recommendation prominently at the top of the main board (above weekly digest). Implementation:
  1. `src/lib/recommend.ts` — implement `scoreProject(p: MergedProject, today: string): number`:
     - Priority: `high`=3, `medium`=2, `low`=1, absent=0
     - Due date urgency (compare against `today` as YYYY-MM-DD): overdue=4, due within 3 days=3, due within 7 days=2, due within 14 days=1, no due date or beyond 14 days=0
     - Status weight: `active`=2, `in-progress`=1, `on-hold`=0; exclude `complete`/`archived` (return -Infinity)
     - Staleness bonus: `days_since_active > 14` → +1
     Export `getRecommendation(projects: MergedProject[]): MergedProject | null` — filters out complete/archived, scores the rest, returns the highest-scoring project (ties: prefer higher priority, then earliest due date, then alphabetical by id). Returns `null` if no eligible projects.
  2. `src/components/NextUp.astro` — accepts `project: MergedProject | null`. If null, renders nothing. Otherwise renders a visually distinct card (use a colored left border or subtle banner) showing: "Up next:" label, project name, next_step text, and a row of small tag pills indicating why it was chosen (e.g. "overdue", "high priority", "14 days stale").
  3. In `index.astro`, call `getRecommendation(projects)` and render `<NextUp project={recommendation} />` above `<WeeklyDigest />`.
- **done when:** `getRecommendation()` returns the correct project for representative test cases (overdue wins, tie-breaking works, complete/archived excluded, null when all projects are complete); the `NextUp` component renders on the page with the correct project; an empty/all-complete projects set renders nothing; unit tests cover the scoring and tie-breaking logic.

### 6.4 — Claude token tracking (manual capture)
- **status:** todo
- **track:** full
- **owns_files:** `src/pages/api/token-log.ts` (new), `src/components/TokenTracker.astro` (new), `src/lib/manual.ts` (extend), `src/types/manual.ts` (extend), `src/pages/index.astro` (add TokenTracker at bottom)
- **blocked_by:** 6.3
- **blocks:** 6.5
- **task:** Add lightweight manual Claude token usage logging per project. Implementation:
  1. Extend `ManualData` in `src/types/manual.ts` with `token_log: TokenLogEntry[]` where `TokenLogEntry = { id: string; projectId: string; tokens: number; note: string | null; created: string }`. Default `token_log: []` in `readManual()`.
  2. New API route `src/pages/api/token-log.ts`:
     - `POST` — body `{ projectId: string, tokens: number, note?: string }`. Validates: `projectId` must be a non-empty string; `tokens` must be a positive integer. Appends `{ id: crypto.randomUUID(), projectId, tokens: Number(tokens), note: note ?? null, created: new Date().toISOString() }` to `manual.token_log`. Returns `{ ok: true }`.
     - `DELETE` — body `{ id: string }`. Removes entry with that id. Returns `{ ok: true }` or `404 { ok: false, error }` if not found.
  3. Extend `getMergedProjects()` (merge.ts) to attach `total_tokens: number` to each `MergedProject` — sum of `tokens` for all `token_log` entries matching `projectId`. Default 0.
  4. In `ProjectCard.astro`, render a small "Tokens: N" line below the repo/github section when `project.total_tokens > 0`.
  5. `src/components/TokenTracker.astro` — a section at the bottom of `index.astro` with:
     - A form: project `<select>` (all project ids/names), token count `<input type="number" min="1">`, optional note `<input type="text">`, "Log" button. Posts to `/api/token-log`. Reloads on success.
     - A table of recent entries (newest first) showing: project name, tokens, note (if any), date ("today" / "N days ago"), and a "×" delete button (posts DELETE to `/api/token-log`).
     - Empty state: "No token logs yet." when the list is empty.
- **done when:** logging a token entry persists and appears in the table; deleting removes it; a project card with logged tokens shows the total; the token count in the project card updates correctly after logging and deleting; invalid input (non-numeric tokens, zero/negative tokens, missing projectId) returns 400; empty state renders correctly; tests cover the API routes and the `total_tokens` merge computation.

### 6.5 — Smart notepad with auto-categorization
- **status:** todo
- **track:** full
- **owns_files:** `src/pages/notes.astro` (new page), `src/pages/api/note.ts` (new), `src/lib/manual.ts` (extend), `src/types/manual.ts` (extend), `src/lib/autoTag.ts` (new), `src/pages/index.astro` (add nav link)
- **blocked_by:** 6.4
- **blocks:** 7.1
- **task:** Build a `/notes` page — a scratchpad for miscellaneous ideas and thoughts that auto-categorizes under existing projects. Implementation:
  1. **Data model:** extend `ManualData` in `src/types/manual.ts` with `notes: NoteEntry[]` where `NoteEntry = { id: string; text: string; projectId: string | null; created: string }`. Default `notes: []` in `readManual()`. `projectId: null` means unsorted.
  2. **Auto-tagging:** `src/lib/autoTag.ts` — implement `autoTag(text: string, projectIds: string[], projectNames: string[]): string | null`. Scans `text` (case-insensitive) for exact matches of each project's `id` or `name`. Returns the first matching project's `id`, or `null` if none match. When multiple projects match, prefer the one whose name/id appears earliest in the text.
  3. **API routes** in `src/pages/api/note.ts`:
     - `POST` — body `{ text: string }`. Validates `text` is a non-empty string (max 2000 chars). Calls `autoTag(text, ...)` using all known project IDs/names from `readManual()` + the project list. Saves `{ id: crypto.randomUUID(), text: text.trim(), projectId, created: new Date().toISOString() }`. Returns `{ ok: true, projectId }`.
     - `DELETE` — body `{ id: string }`. Removes note with that id. Returns `{ ok: true }` or `404`.
     - `PATCH` — body `{ id: string, projectId: string | null }`. Updates `projectId` for manual reassignment. Validates `projectId` is a known project id or `null`. Returns `{ ok: true }`.
  4. **`/notes` page** (`src/pages/notes.astro`): SSR, calls `getMergedProjects()` and `readManual()`. Groups notes by `projectId`:
     - Per project with notes: show a section with the project name as heading and its notes listed below.
     - Notes with `projectId: null` shown in an **"Unsorted / New Ideas"** section at the top.
     - Each note shows: text, "today" / "N days ago" date, a project reassignment `<select>` (all project names + "— unsorted —"), and a "×" delete button. Reassignment `<select>` POSTs PATCH to `/api/note` on change and reloads.
     - A `<textarea>` at the top of the page with an "Add note" button. POSTs to `/api/note`. Reloads on success.
     - Empty state: "No notes yet." when the list is empty.
  5. **Nav link:** add a "Notes" link in the nav at the top of `index.astro` alongside the existing "Momentum" link.
- **done when:** adding a note auto-assigns it to a project when the project name appears in the text; notes mentioning no project land in "Unsorted / New Ideas"; manual reassignment via the dropdown persists on reload; deleting a note removes it; the PATCH route rejects unknown project IDs with 400; `autoTag` unit tests cover: exact name match, id match, no match, multi-match picks earliest; text over 2000 chars returns 400; the page renders correctly with zero notes.

---

## STAGE 7 — Visual design pass

### 7.1 — Typography, color, and visual polish
- **status:** todo
- **track:** full
- **owns_files:** `src/components/*.astro`, `src/pages/index.astro`, `src/pages/momentum.astro`, `src/pages/notes.astro`, `tailwind.config.cjs` (extend theme), `src/layouts/` (add a base layout if not present)
- **blocked_by:** 6.5
- **blocks:** nothing
- **task:** A focused design pass to make the dashboard feel considered and personal without breaking its minimal, scannable character. No new features — UI only. Specific requirements:
  - **Typography:** Add a single Google Font via `<link>` in a base layout (or per-page `<head>`). Use `Inter` for body text and `Cal Sans` or `Plus Jakarta Sans` for headings/project names — or a comparable pairing that reads clean at small sizes. Extend `tailwind.config.cjs` with `fontFamily` so Tailwind utilities pick up the font. Apply consistently across all pages.
  - **Color palette:** Replace ad-hoc Tailwind defaults with a tighter, intentional palette. Use `slate` as the neutral base (not `gray`). Choose one accent color (e.g., `indigo` or `violet`) for interactive elements, links, the "Up next" banner, and active scope tab. Keep status badge hues (green/blue/amber/gray/red) but shift to slightly richer shades (e.g., `emerald-100/emerald-700` instead of `green-100/green-700`).
  - **Card design:** Give `ProjectCard` a subtle left-border accent colored by status (3–4px, same hue as the badge). Remove the flat white box in favor of a very slight off-white (`slate-50`) card on a `slate-100` page background. Round corners to `rounded-xl`. Shadow: `shadow-sm` only — no heavy drop shadows.
  - **Section headings:** Status bucket headings (`Active`, `In Progress`, `On Hold`) should use a slightly larger font weight with a thin rule or spacing separator, not a full horizontal line.
  - **Interactive states:** All buttons and links get `transition-colors duration-150`. "Edit" expand toggle, "Set"/"Clear" buttons, delete buttons — all should have clearly distinct hover and focus-visible states using the accent color.
  - **Momentum page:** Activity bar dots use the accent color for active days, `slate-200` for empty days. Stalled badge uses `amber`, moving uses `emerald`. Scope selector tabs use the accent color for the active tab underline.
  - **Consistency sweep:** After making changes, read every `.astro` file and verify no leftover `gray-` classes remain (replace with `slate-`), no `text-blue-600` links exist outside the defined accent, and font utilities are applied consistently.
  - **No structural changes:** Do not add, remove, or reorder page sections. Do not change component props or API contracts.
- **done when:** the page loads using the chosen Google Font; all neutral colors use `slate`; status badges use richer hues; project cards have a left-border accent; card background is `slate-50` on `slate-100` page; all buttons have hover/focus-visible transitions; the momentum page uses the accent color for activity dots; no `gray-` classes remain in any component; `npm run dev` loads without console errors; `npm run build` exits cleanly.

---

## Order of execution (top to bottom, no skipping)
```
5.1 → 5.2 → 6.1 → 6.2 → 6.3 → 6.4 → 6.5 → 7.1
```

(Stages 0–4 are complete — see progress.md.) Each item must reach QA PASS + clean review before the next starts. The `blocked_by` fields explain the ordering — do not jump ahead.

## Non-goals (do not implement)
- Auth, deployment, or multi-user support
- Per-project task management (PLAN/PROGRESS in project repos are the detailed trackers)
- Writing status back into project code repos — only `~/os/projects` frontmatter and `data/manual.json` are written
- Mobile/responsive polish beyond basic usability
- Cross-project time tracking (hours/sessions) — token tracking only
- Auto-derive `last_active` beyond local git clones
