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
