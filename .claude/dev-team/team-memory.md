# Dev-team memory log

## 2026-07-08 — dev-team-auto — 3.2 Quick-capture inbox UI
- **Outcome:** DONE — 2 attempts, full track, branch feat/astro-scaffold, commit 10db84a
- **What happened:** dt-ui built Inbox.astro with add form, item list, delete, empty state, and accessibility markup. Tests (206/206) passed on QA attempt 1. Review found 2 Important (readManual() uncaught in component frontmatter → page 500; no AbortController on fetch) + 1 borderline Important (no text length cap) + 2 Minor. Fix applied all 4. QA PASS on attempt 2; review clean.
- **What worked:** Existing inbox API route tests (inbox-ui.test.ts) already covered the full behavioral surface — no new test file needed.
- **What failed:** Initial Inbox.astro called readManual() without try/catch — a corrupt manual.json would crash the whole page. fetch calls had no AbortController, permanently disabling form controls on hung requests.
- **Remember next run:** Any component frontmatter calling readManual() (or any sync throwing function) needs try/catch with a safe fallback — exceptions in child component frontmatter propagate to the page and crash it. All fetch calls in Astro client scripts need AbortController with clearTimeout in finally. POST handlers that accept text blobs should cap length (500 chars) before write.

## 2026-07-07 00:00 — dev-team-auto — 0.1 Initialize Astro project with dependencies
- **Outcome:** DONE — 2 attempts, full track, branch feat/astro-scaffold, commit 4debf06
- **What happened:** Engineer manually created package.json, astro.config.mjs, tailwind configs without interactive CLI. QA PASS on attempt 1. Review caught gray-matter in devDependencies (Important). Fix applied; QA PASS on attempt 2; review clean.
- **What worked:** Manually writing package.json rather than CLI avoids interactive prompts. node:test runner (no extra deps) worked fine for scaffold verification.
- **What failed:** gray-matter was initially put in devDependencies — it must be in dependencies for @astrojs/node standalone builds (prod install omits devDeps).
- **Remember next run:** Any package imported at runtime in an Astro SSR project must be in `dependencies`, not `devDependencies`. Dev server started on port 4322 (4321 in use on this machine) — not a bug.

## 2026-07-07 00:01 — dev-team-auto — 0.2 Add .env.example
- **Outcome:** DONE — 1 attempt, trivial track, branch feat/astro-scaffold, commit 088d88d
- **What happened:** Direct file creation, no loop. .env already gitignored from initial commit. Build smoke check passed.
- **What worked:** Direct edit appropriate for trivial (no logic, no tests needed).
- **What failed:** none
- **Remember next run:** nothing

## 2026-07-08 — dev-team-auto — 1.1 src/lib/projects.ts: read frontmatter + resolve last_active
- **Outcome:** DONE — 2 attempts, full track, branch feat/astro-scaffold, commit 9b401f7
- **What happened:** Engineer implemented getProjects() with gray-matter, git resolution, and skip logic. QA PASS on attempt 1. Review found 2 Important (bare catch, uncaught matter()) + 2 Minor (shell injection via string interpolation, tags not validated). Fix applied all 4. QA PASS on attempt 2; review clean.
- **What worked:** execFileSync with arg array is the right pattern for any shell command with user-supplied paths. The Date guard for gray-matter bare YAML dates (instanceof Date → .toISOString()) is essential.
- **What failed:** Initial bare catch swallowed non-ENOENT errors; matter() was uncaught. execSync with string interpolation had shell-injection surface.
- **Remember next run:** project-dashboard dir itself is in ~/os/projects — must add it to SKIP_DIRS alongside os-evals to reach exactly 6 projects. gray-matter parses bare YAML dates as JS Date objects, not strings — always coerce. Use execFileSync with arg arrays for any git call with frontmatter-sourced paths.

## 2026-07-08 — dev-team-auto — 1.2 src/lib/manual.ts: safe read/write for data/manual.json
- **Outcome:** DONE — 1 attempt, full track, branch feat/astro-scaffold, commit fc6285d
- **What happened:** Engineer implemented readManual/writeManual with atomic rename and ENOENT discrimination. QA PASS first attempt. Review found 1 Minor (missing [manual] prefix on write errors). dt-fix applied; item marked done.
- **What worked:** Calling process.cwd() at invocation time (not module load) allows vi.spyOn to redirect I/O to temp dirs in tests — good pattern for path-dependent modules.
- **What failed:** none
- **Remember next run:** wrap both read AND write paths with consistent [module] context prefixes on rethrow. Atomic rename pattern: writeFileSync to .tmp then renameSync to final.

## 2026-07-08 — dev-team-auto — 1.3 Merge layer: getMergedProjects()
- **Outcome:** DONE — 1 attempt, light track, branch feat/astro-scaffold, commit d007d40
- **What happened:** Engineer implemented getMergedProjects() with vi.mock() stubs. QA PASS first attempt. No review pass (light track).
- **What worked:** vi.mock() stubs for getProjects/readManual kept tests fast and isolated. Parallel Promise.all for getProjects + readManual is the right pattern.
- **What failed:** none
- **Remember next run:** overdue uses YYYY-MM-DD lexicographic string comparison — simpler and timezone-safe vs Date arithmetic.

## 2026-07-08 — dev-team-auto — 1.4 API routes: inbox, due-date, override
- **Outcome:** DONE — 2 attempts, full track, branch feat/astro-scaffold, commit c57d9db
- **What happened:** Engineer implemented 4 Astro APIRoute handlers with validation. QA PASS attempt 1. Review found 2 Important: uncaught I/O errors (handlers need try/catch returning 500) and unguarded read-modify-write (concurrent requests could clobber each other). Fix installed async-mutex, shared via src/lib/mutex.ts. QA PASS attempt 2; review clean.
- **What worked:** Shared mutex singleton via a dedicated module (src/lib/mutex.ts) is the clean pattern for serializing writes across multiple route files.
- **What failed:** Initial handlers had no try/catch around readManual/writeManual — I/O errors surfaced as raw 500 pages instead of consistent JSON error shape.
- **Remember next run:** Any route that does read-modify-write on a shared file needs a mutex. Always wrap readManual/writeManual calls in try/catch returning { ok: false, error } with status 500. async-mutex must be in dependencies (not devDependencies).

## 2026-07-08 — dev-team-auto — 2.1 Board page: project cards grouped by status
- **Outcome:** DONE — 2 attempts, full track, branch feat/astro-scaffold, commit 0f1d3f1
- **What happened:** dt-ui built board page + ProjectCard. QA PASS attempt 1. Review found 2 Important: github field rendering raw value without http/https guard (javascript: URI risk) and no error boundary on getMergedProjects(). Also 2 Minor: override whitelist missing, NaN days guard missing. All fixed. QA PASS attempt 2; review clean.
- **What worked:** safeGithub pattern (compute safe value in frontmatter, use it in template) is clean for URL safety in Astro components.
- **What failed:** Raw github field rendered as href without scheme check — always guard URL fields from manual.json overrides.
- **Remember next run:** Any URL from frontmatter or manual.json overrides must be checked for http/https before rendering as href. Page-level data-fetch must have try/catch with fallback to empty array. Override key spread needs whitelist to prevent clobbering id/last_active/etc.

## 2026-07-08 — dev-team-auto — 2.2 Collapsed "Completed" section
- **Outcome:** DONE — 1 attempt, light track, branch feat/astro-scaffold, commit bf31e29
- **What happened:** Engineer extended index.astro with COLLAPSED_STATUSES Set + early continue to route complete/archived projects into completedProjects array, then native <details>/<summary> below main board. QA PASS first attempt. No review (light track).
- **What worked:** Set membership check for status routing is clean and O(1). Conditional render ({completedProjects.length > 0 &&}) keeps details off page when empty.
- **What failed:** none
- **Remember next run:** nothing

## 2026-07-08 — dev-team-auto — 2.3 Inline edit controls: due date, status override, priority
- **Outcome:** DONE — 2 attempts, full track, branch feat/astro-scaffold, commit 185eda8
- **What happened:** dt-ui built EditControls.astro with fetch-based controls. QA PASS attempt 1. Review found 1 Critical (field not validated in override route) + 2 Important (no fetch timeout, date format not validated) + 1 Minor. All fixed. QA PASS attempt 2; review clean. QA also added vitest.config.ts with fileParallelism:false to fix cross-file fixture contamination.
- **What worked:** ALLOWED_OVERRIDE_FIELDS Set at route boundary is the right pattern. AbortController with clearTimeout in finally is the correct timeout pattern.
- **What failed:** Initial override route accepted any field string, allowing injection of internal fields into manual.json.
- **Remember next run:** API routes that accept a 'field' param must validate against a server-side allowlist. Date string inputs need /^\d{4}-\d{2}-\d{2}$/ validation before writing. Fetch calls in Astro &lt;script&gt; need AbortController timeout. Behavioral tests sharing data/manual.json need vitest.config.ts with fileParallelism:false + pool:forks + isolate:true.

## 2026-07-08 — dev-team-auto — 3.1 Weekly digest section
- **Outcome:** DONE — 2 attempts, full track, branch feat/astro-scaffold, commit 5a4c800
- **What happened:** Engineer extracted computeDigestBuckets() as a pure function with injectable dates (great for testing). QA PASS attempt 1. Review found 2 Important: no lower bound on comingUp (past-due projects with overdue:false could appear), unvalidated due_date format. Also 2 Minor: split-clock hazard in default params, redundant date computation in component. All fixed. QA PASS attempt 2; review clean.
- **What worked:** Extracting bucket logic to a pure function in src/lib/digest.ts with injectable date params made unit tests trivial. Single new Date() call avoids split-clock hazard.
- **What failed:** Initial comingUp condition had no lower bound — any past due_date with overdue:false would land in "Coming up." DATE_RE validation at consumption boundary is needed even though the write boundary already validates.
- **Remember next run:** Future-bucket filters always need BOTH a lower bound (>= today) and upper bound (<= N days). Validate due_date format at consumption as well as write boundary. Extract digest/filter logic to a pure function with injectable timestamps for easy testing.
