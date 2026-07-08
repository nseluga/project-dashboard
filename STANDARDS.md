# Project Standards

Project-specific conventions that extend the global dev-team review standards.

## Dependencies

- **Scaffold dependency placement**: Runtime packages (e.g. `gray-matter`, any data-parsing lib used in page routes) go in `dependencies`. Build and type tooling (`astro`, `tailwindcss`, `typescript`, Astro adapters/integrations) go in `devDependencies`. The standalone Node output produced by `npm run build` is deployed without dev deps (`npm install --omit=dev`), so anything imported at runtime must be in `dependencies`.

## Data Layer (src/lib/)

- **gray-matter date coercion**: gray-matter parses bare YAML date strings (e.g. `2025-05-11`) as JS `Date` objects, not strings. Always guard with `instanceof Date` before calling string methods; use `.toISOString()` to normalize to a consistent ISO-8601 string for storage.
- **Shell commands with user-derived paths**: When invoking git or other shell commands with paths that originate from frontmatter or env vars, pass arguments as an array to `execFileSync`/`execFile` rather than interpolating into a shell string — this avoids shell injection from embedded quotes or `$()` sequences in path values.
- **readFile ENOENT vs other errors**: In directory-scanning loops, catch `readFile` errors and check `(e as NodeJS.ErrnoException).code === 'ENOENT'` to distinguish a missing file (expected, skip silently) from permission or disk errors (unexpected, log and rethrow or continue with a warning).
