# Review Report
**Date:** 2026-07-07
**Files Reviewed:** 2 (`src/lib/projects.ts`, `src/types/project.ts`)
**Standards Applied:** efficiency, scalability, reliability, security

## Summary
The implementation is fundamentally sound for a local personal tool with a fixed small dataset: types are clean, `SKIP_DIRS` uses an O(1) Set, filesystem I/O is async, and git calls have a timeout and a graceful null fallback. The two most significant reliability gaps are a broad `catch` block that silently swallows non-ENOENT filesystem errors (causing invisible project omissions) and a missing `try/catch` around `matter()` that lets a single malformed README crash the entire function. Both are straightforward to fix and should be applied before the data layer is wired into any page route.

## Findings

### Important

- **`src/lib/projects.ts:48`** — Reliability / Handle Errors at Boundaries — the bare `catch` on `readFile` swallows all errors (permission denied, disk errors), not only `ENOENT`; a filesystem problem silently omits a project with no log and no indication of why the count is wrong. Fix: check `(e as NodeJS.ErrnoException).code === 'ENOENT'` and rethrow (or log + continue with a warning) for all other error codes, carrying `readmePath` in the message.

- **`src/lib/projects.ts:51`** — Reliability / Handle Errors at Boundaries — `matter(content)` throws on malformed YAML (via js-yaml under the hood) and is completely uncaught; a single invalid README.md frontmatter block crashes `getProjects()` entirely rather than skipping that project. Fix: wrap the `matter()` call in try/catch, skip the directory, and log the error with `readmePath` and the parse message.

### Minor

- **`src/lib/projects.ts:21`** — Scalability / Defer Expensive Work — `execSync` blocks the Node.js event loop for up to 5 s per repo on a slow or missing git index; under an SSR handler, concurrent requests stall until every git call completes, and worst case is N×5 s of event-loop blockage. Fix: replace with `util.promisify(execFile)` and `await` inside the loop so the event loop remains free during git I/O. (Engineer flagged this for reviewer assessment — parallelization across repos is separately deferred.)

- **`src/lib/projects.ts:22`** — Safety & Security / Validate at Boundaries — `repoPath` is string-interpolated inside a shell-invoked command string; an embedded `"` or `$()` sequence in a frontmatter repo path breaks the quoting or executes unintended shell code. Fix: use `execFileSync('git', ['-C', repoPath, 'log', '-1', '--format=%cI'], opts)` — passing arguments as an array bypasses the shell entirely and eliminates the injection surface.

- **`src/lib/projects.ts:77`** — Safety & Security / Validate at Boundaries — `fm.tags` passes through after only an `Array.isArray` guard; YAML arrays with non-string elements (integers, booleans, nested objects) satisfy the check but violate `Project.tags: string[]`, producing silent type inconsistencies downstream. Fix: coerce with `.map(String)` or filter with `.filter((t): t is string => typeof t === 'string')`.

## STANDARDS.md Updates
- **gray-matter date coercion**: normalize bare YAML date values with `instanceof Date` guard + `.toISOString()`.
- **Shell commands with user-derived paths**: use `execFileSync`/`execFile` with an argument array instead of shell-interpolated strings when paths come from frontmatter or env vars.
- **readFile ENOENT vs other errors**: in directory-scanning loops, check `code === 'ENOENT'` to distinguish expected missing files (skip silently) from unexpected errors (log + rethrow or warn).
