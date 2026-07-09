# Review Report — Item 3.2
**Date:** 2026-07-08
**Attempt:** 1
**Files Reviewed:** `src/components/Inbox.astro`, `src/pages/index.astro`, `src/pages/api/inbox.ts`, `src/lib/manual.ts`, `src/types/manual.ts`, `STANDARDS.md`
**Standards Applied:** security, reliability, accessibility, code quality

## Summary

The implementation is structurally sound: the API route validates types correctly, uses the mutex for safe concurrent read-modify-write, and the component renders user text via Astro's expression interpolation (safe from XSS by default). Two issues stand out as Important: the Inbox component's `readManual()` call in frontmatter is not wrapped in a try/catch, which means a corrupt `manual.json` crashes the entire page to a 500 rather than degrading gracefully — violating the STANDARDS.md page-level error boundary rule. The client-side fetch calls also lack AbortController timeouts, which violates the explicit STANDARDS.md rule for fetch calls that disable controls.

## Findings

### Critical

None.

### Important

**1. `readManual()` in Inbox frontmatter is uncaught — violates page-level error boundary standard**
File: `src/components/Inbox.astro`, lines 5–6

```astro
const manual = readManual();
const items: InboxItem[] = manual.inbox.filter((item) => !item.done);
```

`readManual()` throws on JSON parse errors (e.g. corrupt `manual.json`) and on non-ENOENT disk errors. If it throws here, the entire page renders as a 500 — unlike `getMergedProjects()` in `index.astro` (lines 11–15) which wraps in try/catch and falls back to an error banner. STANDARDS.md § Pages requires the try/catch + safe default pattern for any frontmatter that calls a data function. This applies to component frontmatter too — a throw in a child component propagates and crashes the parent page.

Fix: wrap in try/catch, default `items` to `[]`, and render an inline error notice inside the `<section>` when the catch fires.

---

**2. Fetch calls lack AbortController timeout — violates client script standard**
File: `src/components/Inbox.astro`, lines 123 and 149

Both the POST (add) and DELETE (delete) fetch calls disable form controls while in-flight but do not set an AbortController timeout. If the server hangs indefinitely the submit button and input remain permanently disabled, trapping the user. STANDARDS.md § Client Scripts explicitly requires AbortController with a ~10 s timeout on any fetch that disables controls, with re-enable and "request timed out" message on AbortError.

Fix: create an AbortController per call, pass `signal` to `fetch`, set `setTimeout(() => controller.abort(), 10_000)`, and handle `AbortError` in the catch block.

---

**3. POST handler stores `text` without a length guard**
File: `src/pages/api/inbox.ts`, lines 21–26

The handler validates that `text` is a non-empty string, but imposes no upper bound. An arbitrarily large string (e.g. a multi-megabyte payload) passes validation, gets written to `manual.json`, and is subsequently read into memory on every page render. For a personal dashboard this is low risk, but a reasonable cap (e.g. `text.length > 1000`) would prevent accidental or malicious bloat of the data file.

Fix: add `|| text.length > 1000` to the existing validation guard on line 21.

### Minor

**4. `inbox-add-error` paragraph is not connected to the input via `aria-describedby`**
File: `src/components/Inbox.astro`, lines 29–50

The error paragraph (`id="inbox-add-error"`) is shown/hidden dynamically but the `<input id="inbox-text">` has no `aria-describedby="inbox-add-error"`. Screen readers will not automatically associate the error message with the field when it appears. The `role="alert"` + `aria-live="polite"` on the paragraph will announce the text when it becomes non-empty, so this is low impact — but connecting via `aria-describedby` is the correct ARIA pattern and costs one attribute.

Fix: add `aria-describedby="inbox-add-error"` to the `<input>` on line 29.

---

**5. Delete failure is swallowed silently from the user's perspective**
File: `src/components/Inbox.astro`, lines 159–161

When a DELETE call fails, the error is only logged to the console and the button is re-enabled, with no visible user feedback. The add form has `showAddError()`; the delete path has no equivalent. A user who sees the button re-enable after clicking has no indication that the deletion failed.

Fix: add a small per-row error state (or a shared status message area) that surfaces the failure message visibly.

---

**6. `formatCreated` mutates `today` via `setHours` during arithmetic**
File: `src/components/Inbox.astro`, lines 8–17

`today.setHours(0, 0, 0, 0)` is used as the left operand of the subtraction on line 14 — `setHours` returns a timestamp number, so the arithmetic is correct. However it also mutates the `today` object as a side effect, which is non-obvious and makes the function harder to reason about. Hoisting `today` out of the function (computed once at module init) and working with plain timestamp numbers would be cleaner.

This is minor — the current code produces correct output.

## STANDARDS.md Updates

**Recommended addition — component-level error boundary:**

Add to the "Pages (src/pages/)" section (or as a new "Components (src/components/)" section):

> **Component-level data-fetch error boundary**: Astro component frontmatter that calls synchronous data functions (e.g. `readManual()`) must wrap in a try/catch. On error, log the failure and render a safe fallback (empty list + inline error notice) rather than letting the exception propagate to a page-level 500. This applies even to sync calls — `readManual()` throws on parse errors and non-ENOENT I/O errors, and exceptions in child component frontmatter crash the parent page.
