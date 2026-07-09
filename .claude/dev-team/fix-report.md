---
# Fix Report — Item 3.2 (Inbox.astro review findings)
**Date:** 2026-07-08
**Findings addressed:** 4 of 4 total

## Changes Made
- `src/components/Inbox.astro:5–12` — wrapped `readManual()` in try/catch; on error sets `loadError` and falls back to `items = []`; template renders "Could not load inbox items." banner when `loadError` is set — review Important 1
- `src/components/Inbox.astro:99–114` — added `fetchWithTimeout` helper with `AbortController` (10 s timeout, `clearTimeout` in `finally`); AbortError rethrown as `'Request timed out'`; both POST and DELETE fetch calls now use it — review Important 2
- `src/pages/api/inbox.ts:28–33` — added `text.length > 500` guard returning `400 { ok: false, error: 'text must be 500 characters or fewer' }` before the mutex write — review Important 3 (borderline)
- `src/components/Inbox.astro:41` — added `aria-describedby="inbox-add-error"` to the `inbox-text` input — review Minor

## Disputed
none

## Deferred
- Delete failures showing only in console (Minor 5) — acceptable for a local tool; explicitly excluded from fix scope
- `formatCreated` mutation concern (Minor 6) — logic is correct; explicitly excluded from fix scope

---
# Fix Report — Item 3.1 (digest.ts and WeeklyDigest.astro review findings)
**Date:** 2026-07-08
**Findings addressed:** 4 of 4 total: 0 QA failures + 4 review findings (2 Important, 2 Minor)

## Changes Made
- `src/lib/digest.ts:35` — added `due >= resolvedToday &&` lower bound on comingUp condition; past-due-date projects not flagged overdue are now excluded from the bucket — review Important
- `src/lib/digest.ts:35` — added `DATE_RE = /^\d{4}-\d{2}-\d{2}$/` constant; `project.due_date` normalised to null when malformed before any bucket comparison — review Important
- `src/lib/digest.ts:19-23` — replaced split default-param `new Date()` calls with a single `const now = new Date()` at top of function body; both resolved dates derive from it — review Minor
- `src/components/WeeklyDigest.astro:11-13` — removed redundant explicit date computation; `computeDigestBuckets(projects)` now called with no date args, using function defaults — review Minor

## Disputed
none

## Deferred
none

---
# Fix Report — Item 2.3 (edit controls review findings)
**Date:** 2026-07-08
**Findings addressed:** 4 of 4 total: 0 QA failures + 4 review findings (1 Critical, 2 Important, 1 Minor)

## Changes Made

- `src/pages/api/override.ts:5` — added `ALLOWED_OVERRIDE_FIELDS` Set; unknown `field` values now return `400 { ok: false, error: 'Invalid field' }` before any read/write — review Critical
- `src/components/EditControls.astro:147–170` — wrapped `fetch` in `postJson` with `AbortController`; 10 s timeout aborts the request and rethrows as `'Request timed out'`; `clearTimeout` in `finally` — review Important
- `src/pages/api/due-date.ts:34–40` — added `/^\d{4}-\d{2}-\d{2}$/` regex guard on `date`; non-conforming values return `400 { ok: false, error: 'date must be YYYY-MM-DD' }` before mutex entry — review Important
- `src/components/EditControls.astro:175` — hoisted `[dateInput, setBtn, clearBtn].filter(Boolean)` to a single `const dueDateControls` after the element queries; removed duplicate local declarations in both click handlers — review Minor

## Disputed
none

## Deferred
none

---
# Fix Report — Item 2.1 (board page review findings)
**Date:** 2026-07-08
**Findings addressed:** 4 of 4 total: 0 QA failures + 4 review findings (2 Important, 2 Minor)

## Changes Made
- `src/components/ProjectCard.astro:30-33,79-91` — computed `safeGithub` null-ified for non-http/https values; template renders `<a>` only when `safeGithub` is truthy, plain `<p>` otherwise — review Important 1 (security: `javascript:` URI injection)
- `src/pages/index.astro:6-13,51-55` — wrapped `getMergedProjects()` in try/catch; on error logs to `console.error`, falls back to `allProjects = []`, renders red error banner in template — review Important 2 (reliability: no error boundary)
- `src/lib/merge.ts:11-18` — added `OVERRIDE_WHITELIST` Set; filters `manual.overrides[project.id]` entries through the whitelist before spreading, preventing unknown keys from clobbering canonical project fields — review Minor 3 (security: unchecked override key spread)
- `src/lib/projects.ts:78-79` — replaced `Math.max(0, Math.floor(...))` with `Number.isFinite(rawDays) ? Math.max(0, rawDays) : 0` guard, eliminating "NaN days ago" when `last_active` is "Invalid Date" — review Minor 4 (reliability: NaN days ago)

## Disputed
none

## Deferred
none

---

---
# Fix Report — Item 1.4 (API route handler review findings)
**Date:** 2026-07-08
**Findings addressed:** 2 of 3 total: 0 QA failures + 2 review findings (both Important)

## Changes Made
- `src/lib/mutex.ts` — new file; exports a single `manualMutex` (`Mutex` from `async-mutex`) shared by all three route handlers — review Important (Reliability / Scalability)
- `package.json` — installed `async-mutex@^0.5.0` as a runtime dependency — review Important (Reliability / Scalability)
- `src/pages/api/inbox.ts:35-37`, `62-73` — wrapped both POST and DELETE read-modify-write cycles in `manualMutex.runExclusive()` with an outer try/catch returning `{ ok: false, error }` status 500 on I/O failure — review Important (Reliability + Concurrency)
- `src/pages/api/due-date.ts:33-41` — wrapped POST read-modify-write cycle in `manualMutex.runExclusive()` with outer try/catch returning `{ ok: false, error }` status 500 on I/O failure — review Important (Reliability + Concurrency)
- `src/pages/api/override.ts:40-55` — wrapped POST read-modify-write cycle in `manualMutex.runExclusive()` with outer try/catch returning `{ ok: false, error }` status 500 on I/O failure — review Important (Reliability + Concurrency)

## Disputed
none

## Deferred
- `src/pages/api/inbox.ts:63` (O(n) findIndex scan on DELETE) — task instructions explicitly say to accept the linear scan; Minor finding skipped per task spec

---

---
# Fix Report
**Date:** 2026-07-07
**Findings addressed:** 2 of 2 total: 0 QA failures + 2 review findings

## Changes Made
- `package.json` — moved `gray-matter` from `devDependencies` to `dependencies`; `npm install` updated `package-lock.json` accordingly — review Important (reliability)
- `tailwind.config.cjs:3` — trimmed content glob from `{astro,ts,tsx}` to `{astro,ts}` — review Minor (least privilege / safety)

## Disputed
none

## Deferred
none
---

---
# Fix Report — Item 1.1 (projects.ts review findings)
**Date:** 2026-07-07
**Findings addressed:** 4 of 4: 0 QA failures + 4 review findings (2 Important, 2 Minor)

## Changes Made
- `src/lib/projects.ts:48` — narrowed bare `catch` to ENOENT check; unexpected fs errors now log with `readmePath` and continue — review Important
- `src/lib/projects.ts:51` — wrapped `matter(content)` in try/catch; parse failures skip the directory and log with `readmePath` and error message — review Important
- `src/lib/projects.ts:22` — replaced `execSync` string interpolation with `execFileSync('git', ['-C', repoPath, ...], opts)` to eliminate shell-injection surface from frontmatter `repo` paths — review Minor
- `src/lib/projects.ts:77` — added `.filter((t): t is string => typeof t === 'string')` on `fm.tags` to drop non-string YAML array elements — review Minor

## Disputed
none

## Deferred
- `src/lib/projects.ts:21` (execSync blocking) — explicitly deferred per task instructions; acceptable for a local tool at 6 projects
---

---
# Fix Report — Item 1.2 (manual.ts review findings)
**Date:** 2026-07-08
**Findings addressed:** 1 of 1 total: 0 QA failures + 1 review finding

## Changes Made
- `src/lib/manual.ts:38–39` — wrapped `writeFileSync` + `renameSync` in a try/catch that rethrows `new Error(\`[manual] failed to write ${filePath}: ${(e as Error).message}\`)` — review Minor (Reliability / Log with Context)

## Disputed
none

## Deferred
none
---
