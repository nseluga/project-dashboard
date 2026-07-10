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

## 2026-07-09 00:00 — dev-team-auto — 5.1 Collapsible edit controls
- **Outcome:** DONE — 2 attempts, full track, branch feat/stage5-6, commit a9e6066
- **What happened:** Engineer wrapped `<EditControls>` in `<details><summary>Edit</summary>` in ProjectCard.astro — minimal 4-line change, no JS added. QA FAIL on attempt 1: existing `board.test.ts` selectors used first-match regex for `<details>/<summary>`, which now matched the card Edit `<details>` instead of the completed-section one. Fix updated 3 test selectors with a depth-aware `extractCompletedDetailsBlock()` helper. QA PASS on attempt 2. Review: Minor only (Safari `::marker` not suppressed by `list-none`). Fix added `summary { list-style: none } summary::-webkit-details-marker { display: none }` to global.css. Done.
- **What worked:** Native `<details>/<summary>` requires zero JS. Following the existing completed-section pattern from `index.astro` was the right reference.
- **What failed:** Regex-based HTML selectors that assume position of `<details>` in the document break as soon as more `<details>` elements are added. All three `board.test.ts` test failures traced to this.
- **Remember next run:** When a change adds `<details>/<summary>` elements inside repeating components (cards), pre-existing tests that use first-match regex for `<details>` will break — fix selectors to match by content (e.g. "Completed" text) rather than position. `list-none` alone does not suppress `::marker` in Safari; always pair with `summary::-webkit-details-marker { display: none }` in global.css.

## 2026-07-09 00:00 — dev-team-auto — 5.2 Per-project field hide toggles
- **Outcome:** DONE — 4 attempts, full track, branch feat/stage5-6, commit cf1b33a
- **What happened:** Engineer built field-visibility API route, hidden_fields in types/manual/merge, conditional EditControls rendering. QA FAIL attempt 1: readManual() doesn't normalize missing keys — live manual.json had no hidden_fields, causing TypeError at runtime (mocked tests passed). Fix: `{ ...EMPTY_MANUAL, ...JSON.parse(raw) }`. QA FAIL attempt 2: shallow spread returns EMPTY_MANUAL.hidden_fields reference; field-visibility.ts mutates it, poisoning EMPTY_MANUAL for all subsequent calls. Fix: explicit deep-copy per nested field. QA PASS attempt 3. Review: 1 Important (Hide button error elements missing in visible-state branch) + 2 Minor. Fix applied. QA PASS attempt 4. Review clean (1 Minor: unknown-key passthrough from ...parsed spread). Fix: explicit field-by-field construction in readManual(). Done.
- **What worked:** Explicit field-by-field construction in readManual() is the correct pattern — both prevents unknown-key passthrough and prevents shared-mutable-constant bugs. Behavioral tests with real data/manual.json caught the runtime bug that mocked tests missed.
- **What failed:** Shallow spreading EMPTY_MANUAL causes two bugs: (1) keys missing in JSON get filled from the constant's reference, then callers mutate that shared object; (2) unknown keys in JSON silently pass through. Never spread `...EMPTY_MANUAL` or `...parsed` directly.
- **Remember next run:** readManual() must always use explicit per-field construction: `{ overrides: {...}, due_dates: {...}, inbox: [...], hidden_fields: Object.fromEntries(...) }`. Any future field added to ManualData must be added here too. When adding a new ManualData field, search for ALL test helper functions that build ManualData literals (makeManual, inline `{ overrides:` patterns) and update them simultaneously or tests will fail type-checking.

## 2026-07-09 00:00 — dev-team-auto — 6.1 Remove inbox
- **Outcome:** DONE — 1 attempt, light track, branch feat/stage5-6, commit 51273f7
- **What happened:** Engineer deleted Inbox.astro and api/inbox.ts, removed from index.astro, removed inbox tests while keeping InboxItem type and inbox field in ManualData. QA PASS first attempt.
- **What worked:** Keeping InboxItem type + inbox field in readManual() for backward compat is the right call — data/manual.json files with inbox entries parse cleanly.
- **What failed:** none
- **Remember next run:** When deleting UI components, also clean up paired <hr> separators in the parent layout. Check all test files for imports of the deleted module (inbox-ui.test.ts, api.test.ts, api-behavioral.test.ts all needed inbox cleanup).

## 2026-07-09 00:00 — dev-team-auto — 6.2 Momentum view
- **Outcome:** DONE — 2 attempts, full track, branch feat/stage5-6, commit dc80fe3
- **What happened:** Engineer built git.ts (getCommitDates + getCommitDatesAsync), momentum.astro, MomentumView.astro with day-by-day activity dots. QA PASS attempt 1. Review found 3 Important: bare catch {} (no warn logging), sync .map() blocking SSR event loop (need Promise.all + async execFile), buildActiveDaySet re-computed per render row. Fix applied all 3 + 3 Minor. QA PASS attempt 2. Re-review: 2 Minor (async warn prefix wrong, missing ENOENT test for async). Fixed. Done.
- **What worked:** execFileSync → promisify(execFile) for the async variant. Pre-computing derived data (active day Sets) in the page frontmatter rather than re-deriving per render row.
- **What failed:** Bare `catch {}` in git helpers silences all errors — always log `console.warn` with path + err. Sync .map() in Astro SSR frontmatter blocks the event loop when each iteration is a shell subprocess.
- **Remember next run:** SSR pages that call N subprocess helpers per project must use `Promise.all` + async variants to avoid blocking the event loop. Any shell helper's catch block needs `console.warn('[module] fn failed:', path, err)` before returning the safe default. expandTilde handles `~/` only — document `~username/` limitation.

## 2026-07-09 00:00 — dev-team-auto — 6.3 "What to work on next" recommendation
- **Outcome:** DONE — 2 attempts, full track, branch feat/stage5-6, commit a9f0cd7
- **What happened:** Engineer built pure recommend.ts + NextUp.astro; 34 unit tests. QA PASS attempt 1. Review found 1 Important (NaN > 14 is false, staleness silently scores 0) + 2 Minor. Fix applied. QA PASS attempt 2. Re-review: 2 Minor (priority score re-computed per sort call, no NaN guard test). Fixed. Done.
- **What worked:** Injectable `today` param (defaults via `new Date().toISOString().slice(0,10)`) is the right pattern for pure scoring functions — matches digest.ts convention and makes tests trivial.
- **What failed:** NaN comparisons in scoring are silent — `NaN > threshold` always returns false. Guards needed on every threshold comparison over user data.
- **Remember next run:** Scoring functions that compare numeric fields from user data (days_since_active, priority scores) need `Number.isFinite(value) &&` before threshold comparisons. Sort comparators should pre-compute per-element values rather than re-evaluating on every comparison call. Derive `today` once in the page frontmatter and thread it through to all components that need it (avoid multiple `new Date()` calls across SSR render).

## 2026-07-09 00:00 — dev-team-auto — 6.4 Claude token tracking
- **Outcome:** DONE — 3 attempts, full track, branch feat/stage5-6, commit 5e7d213
- **What happened:** Engineer built TokenLogEntry type, POST+DELETE route with mutex, total_tokens in merge, TokenTracker component, wired into index.astro. QA PASS attempt 1. Review: 2 Important (redundant readManual() in TokenTracker, O(n×m) filter+reduce in merge). Fixed: prop-based tokenLog, pre-aggregated Map. QA PASS attempt 2. Re-review: still 1 Important (getMergedProjects() internally called readManual() again, net still 2 reads). Fixed: getMergedProjects() accepts optional manual param; index.astro passes once-read manual to both. QA PASS attempt 3. Re-review clean (2 Minor: new Date() per row, DELETE shape guard missing from tests). Fixed. Done.
- **What worked:** Pre-aggregating token sums into a Map<string,number> before the project loop is the right pattern for any N×M join. Optional param on getMergedProjects() to accept a pre-read manual eliminates the double read without breaking callers.
- **What failed:** First fix for double-read was incomplete — moving readManual() out of TokenTracker still left the internal call inside getMergedProjects(). Review caught this on re-pass. Always verify the full call chain, not just the immediate fix site.
- **Remember next run:** When a composed page needs both getMergedProjects() output AND raw manual data (token_log, etc.), use the optional `manual?` param on getMergedProjects() to share a single read. Pattern: `const manual = await readManual(); const projects = await getMergedProjects(manual)`. Any component consuming list data should accept a prop rather than calling readManual() internally.

## 2026-07-09 00:00 — dev-team-auto — 6.5 Smart notepad with auto-categorization
- **Outcome:** DONE — 2 attempts, full track, branch feat/stage5-6, commit e8f4527
- **What happened:** Engineer built NoteEntry type, POST/DELETE/PATCH routes, autoTag with indexOf, notes.astro SSR page. QA PASS attempt 1. Review: 3 Important (getMergedProjects() inside mutex on POST+PATCH, autoTag using substring match — "os" matches inside "gross"). Fix: hoisted getMergedProjects outside mutex in both handlers; replaced indexOf with findWordBoundaryMatch+isWordBoundary. 3 Minor (notes assigned before getMergedProjects awaited, delete/reassign no inline errors, Date.now() per note). Fix applied all 6. QA PASS attempt 2. Re-review clean (1 Minor: shape-guard tests missing for DELETE+PATCH). Fixed. Done.
- **What worked:** Word-boundary guard with \W regex is the right pattern for autoTag — prevents "os" from matching inside "gross", "ml" inside "email", etc. Hoisting getMergedProjects() outside mutex is the right fix for any read that triggers git shell calls.
- **What failed:** Initial autoTag used indexOf (substring match) — required word-boundary fix. Expensive work (git shell calls via getMergedProjects) must never run inside a mutex.
- **Remember next run:** autoTag or any keyword-matching function must use word-boundary checks, not bare indexOf. Any work that involves I/O or shell calls (getMergedProjects, getProjects, getCommitDates) must be resolved BEFORE entering manualMutex.runExclusive — the lock should only protect the read-modify-write step itself.

## 2026-07-09 00:00 — dev-team-auto — 7.1 Typography, color, and visual polish
- **Outcome:** DONE — 3 attempts, full track, branch feat/stage5-6, commit d3e71b2
- **What happened:** dt-ui did the full gray→slate sweep, blue→indigo accent, emerald status badges, border-l-4 card accents, focus-visible rings, Google Fonts. QA FAIL attempt 1: test assertion used /text-gray-/ on the Edit summary which was changed to text-slate-400. Fix (test selector). QA PASS attempt 2. Review: 2 Important (border-blue-100 not migrated in WeeklyDigest, text-slate-300 fails WCAG on hidden labels), 2 Minor. Fix applied all + extracted BaseLayout for shared Google Font link. QA PASS attempt 3. Re-review: 2 Minor (delete button text-slate-300 contrast, Set button ring contrast). Fixed. Done.
- **What worked:** Systematic gray-→slate- inventory from the analyzer made the sweep reliable. White ring with offset (ring-white ring-offset-2 ring-offset-indigo-600) is the right pattern for focus rings on filled indigo buttons — ring-indigo-400 on indigo-600 background fails WCAG 3:1.
- **What failed:** Any test that checks for a specific color class (text-gray-, text-blue-) will break on a color sweep. Style tests should check for semantic class patterns (text-sm, font-medium) or use regex that doesn't anchor to specific color values.
- **Remember next run:** Before a color palette sweep, check all test files for color-anchored assertions (text-gray-, text-blue-, etc.) — update them in the same commit as the sweep, not as a follow-up fix. text-slate-300 fails WCAG AA as interactive text — minimum is text-slate-500 for interactive elements on white/slate-50 backgrounds. focus-visible rings on filled colored buttons need ring-white with offset, not a lighter tint of the same color.
