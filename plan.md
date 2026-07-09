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

## STAGE 0 — Scaffold

### 0.1 — Initialize Astro project with required dependencies
- **status:** done
- **track:** full
- **owns_files:** `package.json`, `astro.config.mjs`, `tailwind.config.cjs`, `tsconfig.json`, `src/` (skeleton), `.gitignore`
- **blocked_by:** none
- **blocks:** all other items
- **task:** Bootstrap an Astro project with SSR output in the repo root. Do NOT use the interactive `npm create astro` CLI — manually write `package.json` with scripts (`dev: astro dev`, `build: astro build`) and devDependencies, then create config files. Required packages: `astro`, `@astrojs/node`, `@astrojs/tailwind`, `tailwindcss`, `gray-matter`, `typescript`. `astro.config.mjs` must set `output: 'server'` and register the Node adapter (`@astrojs/node` with `mode: 'standalone'`) and the Tailwind integration. Create a minimal `src/pages/index.astro` that renders a `<h1>Project Dashboard</h1>`. Create empty `src/layouts/` and `src/components/` directories (add `.gitkeep` files). `tailwind.config.cjs` should include `./src/**/*.{astro,ts,tsx}` in its `content` array. `tsconfig.json` should extend `astro/tsconfigs/strict`. Add `dist/`, `node_modules/`, `.env` to `.gitignore`. Run `npm install` and verify `npm run dev` starts without errors.
- **done when:** `npm install && npm run dev` starts the Astro dev server at `localhost:4321` without errors; `astro.config.mjs` has `output: 'server'` with the Node adapter; `gray-matter` is in `package.json`; the index page renders; `npm run build` exits cleanly.

### 0.2 — Add `.env.example`
- **status:** done
- **track:** trivial
- **owns_files:** `.env.example`
- **blocked_by:** 0.1
- **blocks:** nothing
- **task:** Create `.env.example` with one entry: `OS_PROJECTS_DIR=~/os/projects`. Confirm `.env` is already in `.gitignore`.
- **done when:** `.env.example` exists with `OS_PROJECTS_DIR=~/os/projects`; `.env` is gitignored.

---

## STAGE 1 — Data layer

### 1.1 — `src/lib/projects.ts`: read frontmatter + resolve `last_active`
- **status:** done
- **track:** full
- **owns_files:** `src/lib/projects.ts`, `src/types/project.ts`
- **blocked_by:** 0.1
- **blocks:** 1.3
- **task:** Implement `getProjects(): Promise<Project[]>` that:
  1. Reads `process.env.OS_PROJECTS_DIR` with default `~/os/projects`; expand `~` to `os.homedir()`.
  2. Enumerates subdirectories of that path, reads each `README.md`, parses YAML frontmatter with `gray-matter`. Skips any directory named `os-evals`.
  3. Extracts typed `Project` fields from frontmatter: `id` (dir name), `name`, `summary`, `repo`, `github`, `tags`, `status`, `priority`, `next_step`.
  4. Resolves `last_active`: attempt `git -C <expanded_repo_path> log -1 --format=%cI` via `child_process.execSync`; if it returns a non-empty date string, use that. If `repo` is absent, the git command errors, or output is empty, fall back to the `last_active` string from frontmatter. Expand `~` in `repo` paths before passing to git.
  5. Computes `days_since_active: number` — `Math.floor((Date.now() - new Date(last_active).getTime()) / 86400000)`.
  Define `Project` type in `src/types/project.ts` including all frontmatter fields plus `id`, `last_active` (resolved string), `days_since_active`. Use `fs/promises` for reads.
- **done when:** `getProjects()` returns exactly 6 projects (the confirmed inventory); `os-evals` is excluded; `days_since_active` is a non-negative integer; projects with a local `repo` path get a git-derived `last_active`; `nba-shot-value` (no local clone) falls back to frontmatter `last_active`; a Vitest unit test (or similar) confirms the count and the exclusion.

### 1.2 — `src/lib/manual.ts`: safe read/write for `data/manual.json`
- **status:** done
- **track:** full
- **owns_files:** `src/lib/manual.ts`, `src/types/manual.ts`, `data/.gitkeep`, `.gitignore` update
- **blocked_by:** 0.1
- **blocks:** 1.3, 1.4
- **task:** Implement typed helpers for `data/manual.json`:
  - Define `InboxItem` (`id: string`, `text: string`, `created: string`, `project: string | null`, `done: boolean`) and `ManualData` (`overrides: Record<string, Record<string, string | null>>`, `due_dates: Record<string, string>`, `inbox: InboxItem[]`) in `src/types/manual.ts`.
  - `readManual(): ManualData` — reads `data/manual.json` relative to project root (`process.cwd()`). Returns `{ overrides: {}, due_dates: {}, inbox: [] }` if file is missing. Throws a descriptive error on JSON parse failure.
  - `writeManual(data: ManualData): void` — atomic write: write to `data/manual.json.tmp` then `fs.renameSync` to `data/manual.json`. Never partial-write.
  - Add `data/manual.json` to `.gitignore` (user-local, do not commit). Add `data/.gitkeep` so the `data/` directory is tracked.
- **done when:** `readManual()` returns the empty shape when the file is absent; `writeManual()` round-trips correctly; atomic rename is used (not direct overwrite); `data/manual.json` is gitignored; a unit test covers both functions.

### 1.3 — Merge layer: `getMergedProjects()`
- **status:** done
- **track:** light
- **owns_files:** `src/lib/merge.ts`, `src/types/project.ts` (extend with `MergedProject`)
- **blocked_by:** 1.1, 1.2
- **blocks:** 2.1, 3.1
- **task:** Implement `getMergedProjects(): Promise<MergedProject[]>`:
  1. Calls `getProjects()` for base data.
  2. Calls `readManual()` and applies `manual.overrides[id]` fields on top of frontmatter (override wins for any matching key).
  3. Attaches `due_date: string | null` from `manual.due_dates[id]` (null if not set).
  4. Computes `overdue: boolean` — `due_date` is present AND strictly before today (`new Date().toISOString().slice(0, 10)`, compare as YYYY-MM-DD strings).
  Extend `Project` in `src/types/project.ts` with `MergedProject` adding `due_date` and `overdue`.
- **done when:** a unit test confirms: overrides take precedence over frontmatter; `overdue` is `true` when `due_date` is yesterday; `overdue` is `false` when `due_date` is tomorrow; `overdue` is `false` when `due_date` is null.

### 1.4 — API routes: inbox, due-date, override
- **status:** done
- **track:** full
- **owns_files:** `src/pages/api/inbox.ts`, `src/pages/api/due-date.ts`, `src/pages/api/override.ts`
- **blocked_by:** 1.2
- **blocks:** 2.3, 3.2
- **task:** Four Astro server endpoints (export `POST` / `DELETE` functions), each using `readManual()`/`writeManual()`:
  - `POST /api/inbox` — body `{ text: string, project?: string | null }`: generate `InboxItem` with `id: crypto.randomUUID()`, `created: new Date().toISOString()`, `done: false`; append to `manual.inbox`; write; return `{ ok: true }`.
  - `DELETE /api/inbox` — body `{ id: string }`: remove item with that id; write; return `{ ok: true }`. Return `404 { ok: false, error }` if not found.
  - `POST /api/due-date` — body `{ projectId: string, date: string | null }`: set `manual.due_dates[projectId] = date` or delete the key when `date` is null; write; return `{ ok: true }`.
  - `POST /api/override` — body `{ projectId: string, field: string, value: string | null }`: set `manual.overrides[projectId][field] = value` or delete the field when null; write; return `{ ok: true }`.
  All return `Content-Type: application/json`. Missing required fields → `400 { ok: false, error: "..." }`.
- **done when:** each route returns `200 { ok: true }` on valid input; invalid input returns `400`; `DELETE /api/inbox` with unknown id returns `404`; `data/manual.json` is correctly updated after each call; a test exercises all four routes.

---

## STAGE 2 — Core board

### 2.1 — Board page: project cards grouped by status
- **status:** done
- **track:** full
- **owns_files:** `src/pages/index.astro`, `src/components/ProjectCard.astro`
- **blocked_by:** 1.3
- **blocks:** 2.2, 2.3
- **task:** Build the main board page. Call `getMergedProjects()` server-side in `index.astro`. Group projects into three status sections: `active`, `in-progress`, `on-hold`. Each section has a heading with status name + project count. Render a `ProjectCard` per project showing: status badge (color-coded), priority badge (if set), days-since-active ("X days ago"), next_step text, repo path as plain text, github as a link (open in new tab). Overdue projects get a red visual highlight (red border or background). Read `~/portfolio/STANDARDS.md` before writing any HTML/Tailwind. Follow its conventions for component structure, spacing, and color utilities.
- **done when:** `npm run dev` → `localhost:4321` renders all 6 projects; active bucket has os + patio; in-progress has portfolio-website; on-hold has pitcher-injury-risk + batting-average-ability; each card shows all fields; overdue projects are visually distinct (red); no console errors.

### 2.2 — Collapsed "Completed" section
- **status:** done
- **track:** light
- **owns_files:** `src/pages/index.astro` (extend)
- **blocked_by:** 2.1
- **blocks:** nothing
- **task:** Add a section below the main board for projects with `status === 'complete'` or `'archived'`. Use a `<details>`/`<summary>` element so it is collapsed by default without any JavaScript. Show the count in the summary (e.g. "Completed (1)"). When expanded, render the same `ProjectCard` layout. Complete/archived projects must NOT appear in the main board buckets.
- **done when:** nba-shot-value is hidden by default; expanding the `<details>` shows it with the full card; it does not appear in any status bucket above; the collapse/expand works without JavaScript.

### 2.3 — Inline edit controls: due date, status override, priority
- **status:** done
- **track:** full
- **owns_files:** `src/components/ProjectCard.astro` (extend), `src/components/EditControls.astro`
- **blocked_by:** 2.1, 1.4
- **blocks:** nothing
- **task:** Add inline edit controls to each project card:
  - **Due date:** `<input type="date">` pre-filled with the current due date (if any) + "Set" button. On submit (via `<form method="POST" action="/api/due-date">`), persist and reload. A "Clear" button posts `date: null` to remove it.
  - **Status override:** `<select>` with options `active`, `in-progress`, `on-hold`, `complete` pre-selected to current merged status. On change, POST to `/api/override` with `field: 'status'`. Include a "Reset" option that posts `value: null`.
  - **Priority:** `<select>` with `high`, `medium`, `low` and a "—" / Reset option. On change, POST to `/api/override` with `field: 'priority'`.
  Use `<form>` elements wherever possible (standard submit + redirect) to keep JS minimal. A small inline `<script>` to submit on `<select>` change is acceptable.
- **done when:** setting a due date persists and displays on reload; changing status moves the card to the correct bucket on reload; priority change persists; all three reset/clear correctly; no console errors.

---

## STAGE 3 — v1 features

### 3.1 — Weekly digest section
- **status:** done
- **track:** full
- **owns_files:** `src/components/WeeklyDigest.astro`, `src/pages/index.astro` (include it)
- **blocked_by:** 1.3
- **blocks:** nothing
- **task:** Build a weekly digest rendered server-side with three buckets. Compute from `getMergedProjects()`:
  - **Moved** — `days_since_active <= 7`. Show name + "active N days ago".
  - **Overdue** — `overdue === true`. Show name + due date.
  - **Coming up** — `due_date` present, `overdue === false`, and `due_date <= addDays(today, 7)`. Show name + "due YYYY-MM-DD".
  If a bucket has 0 items, show "Nothing here." (never omit the bucket entirely). Place the digest above the project board.
- **done when:** a project with `days_since_active = 2` appears in "Moved"; a project with `due_date = yesterday` appears in "Overdue"; a project with `due_date = 3 days from now` appears in "Coming up"; each empty bucket shows "Nothing here."; renders without errors.

### 3.2 — Quick-capture inbox UI
- **status:** done
- **track:** full
- **owns_files:** `src/components/Inbox.astro`, `src/pages/index.astro` (include it)
- **blocked_by:** 1.4
- **blocks:** nothing
- **task:** Build the quick-capture inbox at the bottom of the page:
  - A `<form>` with a text `<input name="text">` and "Add" button POSTing to `/api/inbox`. After submit, reload.
  - A list of existing `done: false` inbox items read server-side from `readManual().inbox`. Each item shows: text, created date ("today" or "N days ago"), and optional project tag.
  - Per item: a "×" delete button that POSTs `{ id }` to `DELETE /api/inbox` and reloads. (Deleting in v1 is fine; no separate "done" toggle needed.)
  - Empty state: "No items." when the list is empty.
- **done when:** adding an item persists and appears on reload; deleting an item removes it on reload; empty state shows "No items."; the page renders correctly with no items.

---

## STAGE 4 — Polish & verify

### 4.1 — Tailwind styling pass
- **status:** done
- **track:** light
- **owns_files:** `src/components/*.astro`, `src/pages/index.astro`
- **blocked_by:** 3.1, 3.2
- **blocks:** 4.2
- **task:** Final visual polish pass per `~/portfolio/STANDARDS.md`. Requirements:
  - **Status badges:** active = green, in-progress = blue, on-hold = amber/yellow, complete = gray. Use Tailwind color classes.
  - **Overdue highlight:** red border or red background tint on overdue cards.
  - **Priority badges:** high = red, medium = yellow, low = gray. Smaller, subordinate to status.
  - **Consistent spacing:** uniform padding, margins, font sizes across all cards and sections.
  - **Digest + inbox** visually separated from the board (section divider or subtle background difference).
  No new features, no structural changes — styling only.
- **done when:** all status badges are correctly color-coded; overdue cards have a clear red treatment; priority badges are visible; spacing is consistent; the page looks polished and consistent with `~/portfolio/STANDARDS.md` examples.

### 4.2 — `README.md`: how to run
- **status:** done
- **track:** trivial
- **owns_files:** `README.md`
- **blocked_by:** 4.1
- **blocks:** nothing
- **task:** Write a concise README (≤30 lines): **Setup** — clone, `npm install`, copy `.env.example` to `.env`, set `OS_PROJECTS_DIR` to absolute path of `~/os/projects`. **Run** — `npm run dev`, open `localhost:4321`. Note that `data/manual.json` is created automatically on first write and is gitignored.
- **done when:** the README accurately describes the run flow; commands match reality; no steps missing for a fresh clone.

---

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
- **blocks:** nothing
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

---

## Order of execution (top to bottom, no skipping)
```
0.1 → 0.2 → 1.1 → 1.2 → 1.3 → 1.4 → 2.1 → 2.2 → 2.3 → 3.1 → 3.2 → 4.1 → 4.2
→ 5.1 → 5.2 → 6.1 → 6.2 → 6.3 → 6.4
```

Each item must reach QA PASS + clean review before the next starts. The `blocked_by` fields explain the ordering — do not jump ahead.

## Non-goals (do not implement)
- Auth, deployment, or multi-user support
- Per-project task management (PLAN/PROGRESS in project repos are the detailed trackers)
- Writing status back into project code repos — only `~/os/projects` frontmatter and `data/manual.json` are written
- Mobile/responsive polish beyond basic usability
- Cross-project time tracking (hours/sessions) — token tracking only
- Auto-derive `last_active` beyond local git clones
