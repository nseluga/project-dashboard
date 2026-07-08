# Dev-team memory log

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
