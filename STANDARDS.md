# Project Standards

Project-specific conventions that extend the global dev-team review standards.

## Dependencies

- **Scaffold dependency placement**: Runtime packages (e.g. `gray-matter`, any data-parsing lib used in page routes) go in `dependencies`. Build and type tooling (`astro`, `tailwindcss`, `typescript`, Astro adapters/integrations) go in `devDependencies`. The standalone Node output produced by `npm run build` is deployed without dev deps (`npm install --omit=dev`), so anything imported at runtime must be in `dependencies`.

## Data Layer (src/lib/)

- **gray-matter date coercion**: gray-matter parses bare YAML date strings (e.g. `2025-05-11`) as JS `Date` objects, not strings. Always guard with `instanceof Date` before calling string methods; use `.toISOString()` to normalize to a consistent ISO-8601 string for storage.
- **Shell commands with user-derived paths**: When invoking git or other shell commands with paths that originate from frontmatter or env vars, pass arguments as an array to `execFileSync`/`execFile` rather than interpolating into a shell string — this avoids shell injection from embedded quotes or `$()` sequences in path values.
- **readFile ENOENT vs other errors**: In directory-scanning loops, catch `readFile` errors and check `(e as NodeJS.ErrnoException).code === 'ENOENT'` to distinguish a missing file (expected, skip silently) from permission or disk errors (unexpected, log and rethrow or continue with a warning).
- **writeFile error wrapping**: Wrap `writeFileSync`/`renameSync` calls in a try/catch that rethrows with a `[module]` context prefix (e.g. `[manual] failed to write ${filePath}: ...`) — consistent with the read-path error pattern in `readManual` and `readManual` equivalents, and needed for log triage when write failures occur.
- **due_date lower-bound guard on bucket filters**: Any filter that classifies projects by `due_date` into a "future" bucket (e.g. "Coming up") must include both a lower bound (`due_date >= today`) and an upper bound (`due_date <= window`). Relying solely on an upper bound causes projects with past due dates that are not flagged `overdue` (e.g. completed projects) to silently land in the wrong bucket.

## API Routes (src/pages/api/)

- **Route-level I/O error wrapping**: API route handlers must wrap all `readManual`/`writeManual` calls in a try/catch and return `{ ok: false, error: e.message }` with status 500 — ensures the consistent `{ ok: false, error: string }` contract holds even when `manual.json` is corrupt or a disk error occurs.
- **Synchronized read-modify-write**: Any handler that reads `manual.json`, mutates in memory, and writes back must hold a write lock (e.g. `async-mutex`) around the entire read-modify-write cycle to prevent concurrent requests from silently overwriting each other's mutations.

## Pages (src/pages/)

- **Page-level data-fetch error boundary**: Astro page frontmatter that `await`s async data functions (e.g. `getMergedProjects()`) must wrap in a try/catch. On error, log with `[page]` context prefix, set the data variable to an empty/safe default, and render an inline error banner so the page degrades gracefully rather than crashing to a 500 with a raw stack trace.

## Data Merging (src/lib/merge.ts)

- **Override key whitelist**: Before spreading `manual.overrides[id]` onto a typed project object, filter to an explicit allowlist of overridable fields (e.g. `name`, `summary`, `next_step`, `priority`). Spreading an unchecked `Record<string, string | null>` can silently clobber canonical fields like `id` or `status` if a key is injected via the override API route.

## API Routes (src/pages/api/) — extended

- **Field whitelist at the API boundary**: Override endpoints that write to `manual.overrides` must validate `field` against the same allowlist used in `merge.ts` and return 400 on any unknown field. Relying solely on the merge layer's read-time filter leaves injected keys in `manual.json` where future consumers could pick them up.
- **Date string format validation**: Any route that accepts a date string for storage in `manual.json` must validate the format (`/^\d{4}-\d{2}-\d{2}$/`) before writing. The `due_date < today` lexicographic comparison in `merge.ts` silently misbehaves for non-`YYYY-MM-DD` values.

## Client Scripts (src/components/)

- **Fetch timeout via AbortController**: Client-side `fetch` calls that disable form controls while in-flight must use `AbortController` with a ~10 s timeout. On `AbortError`, re-enable the controls and display a "request timed out" message — controls must never be permanently disabled if the server hangs.
