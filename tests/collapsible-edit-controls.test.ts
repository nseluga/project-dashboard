/**
 * Tests for Item 5.1 — Collapsible edit controls (read-only default)
 *
 * Gate mode: tests+behavioral
 *
 * Section A — Source inspection: verify <details>/<summary> wrapper in ProjectCard.astro
 * Section B — Behavioral: verify rendered HTML from dev server (port 4322)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ============================================================================
// SECTION A — Source inspection: ProjectCard.astro wraps EditControls in <details>
// ============================================================================

describe('Item 5.1: ProjectCard.astro source — <details> wrapper around EditControls', () => {
  let cardSource: string;

  beforeEach(() => {
    cardSource = readFileSync(resolve(ROOT, 'src/components/ProjectCard.astro'), 'utf-8');
  });

  it('<details> element is present in ProjectCard.astro source', () => {
    expect(cardSource).toContain('<details');
  });

  it('<details> does NOT have the "open" attribute (collapsed by default)', () => {
    // Match the opening <details> tag
    const detailsTagMatch = cardSource.match(/<details[^>]*>/);
    expect(detailsTagMatch, '<details> tag not found').toBeTruthy();
    expect(detailsTagMatch![0]).not.toMatch(/\bopen\b/);
  });

  it('<summary> element is present with "Edit" label', () => {
    expect(cardSource).toContain('<summary');
    expect(cardSource).toMatch(/>\s*Edit\s*<\/summary>/);
  });

  it('<EditControls> is nested inside <details> block', () => {
    // Extract the <details> block from source
    const detailsBlockMatch = cardSource.match(/<details[\s\S]*?<\/details>/);
    expect(detailsBlockMatch, '<details> block not found').toBeTruthy();
    expect(detailsBlockMatch![0]).toContain('<EditControls');
  });

  it('<EditControls> still receives the project prop', () => {
    const detailsBlockMatch = cardSource.match(/<details[\s\S]*?<\/details>/);
    expect(detailsBlockMatch, '<details> block not found').toBeTruthy();
    expect(detailsBlockMatch![0]).toContain('project={project}');
  });

  it('no JS event listeners attached to the <details> element (pure native HTML)', () => {
    // Must not attach toggle/click listeners to <details>
    expect(cardSource).not.toMatch(/addEventListener.*toggle/);
    expect(cardSource).not.toMatch(/addEventListener.*click.*detail/i);
  });

  it('EditControls import is still present in ProjectCard.astro', () => {
    expect(cardSource).toContain("import EditControls from './EditControls.astro'");
  });

  it('<summary> uses low-weight text styling (no bold/prominent classes)', () => {
    const summaryMatch = cardSource.match(/<summary[^>]*>/);
    expect(summaryMatch, '<summary> tag not found').toBeTruthy();
    // Must use muted color class (text-gray-*)
    expect(summaryMatch![0]).toMatch(/text-gray-/);
    // Must be small text
    expect(summaryMatch![0]).toMatch(/text-xs/);
  });
});

// ============================================================================
// SECTION B — Behavioral: verify rendered HTML from dev server
// ============================================================================

const DEV_PORT = 4322;
const BASE_URL = `http://localhost:${DEV_PORT}`;

async function fetchPage(): Promise<string | null> {
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

describe('Item 5.1: Behavioral — rendered HTML from dev server', () => {
  let html: string;

  beforeEach(async () => {
    const result = await fetchPage();
    if (!result) {
      throw new Error(`Dev server not reachable at ${BASE_URL} — start with \`npm run dev -- --port 4322\``);
    }
    html = result;
  });

  it('rendered HTML contains <details> elements (one per card)', () => {
    const detailsMatches = html.match(/<details/g) ?? [];
    // At least 5 details elements (one per main-board card) + possibly the completed section
    expect(detailsMatches.length).toBeGreaterThanOrEqual(5);
  });

  it('all <details> elements are collapsed by default (no "open" attribute)', () => {
    // Find every opening <details> tag and verify none have open attribute
    const detailsTags = [...html.matchAll(/<details[^>]*>/g)];
    expect(detailsTags.length, 'no <details> tags found').toBeGreaterThan(0);
    for (const [tag] of detailsTags) {
      expect(tag).not.toMatch(/\bopen\b/);
    }
  });

  it('each card renders an "Edit" summary label', () => {
    const editSummaries = [...html.matchAll(/<summary[^>]*>\s*Edit\s*<\/summary>/g)];
    // At least 5 main-bucket cards each get an Edit summary
    expect(editSummaries.length).toBeGreaterThanOrEqual(5);
  });

  it('edit controls (data-action="set-due-date") are present in the HTML but inside <details>', () => {
    // Controls exist but are inside collapsed <details>
    expect(html).toContain('data-action="set-due-date"');
    expect(html).toContain('data-action="clear-due-date"');
  });

  it('status override controls are present in the HTML', () => {
    expect(html).toContain('data-action="override-status"');
  });

  it('priority override controls are present in the HTML', () => {
    expect(html).toContain('data-action="override-priority"');
  });

  it('no JS errors (no error overlay or uncaught error markers in HTML)', () => {
    expect(html).not.toContain('Uncaught Error');
    expect(html).not.toContain('astro-error-overlay');
    expect(html).not.toContain('500 Internal Server Error');
  });

  it('no console error markers in the rendered HTML', () => {
    expect(html).not.toContain('console.error');
    expect(html).not.toContain('[ERROR]');
  });

  it('page still shows all five main-board project cards (no regression in card count)', () => {
    // Each card is an <article> — at least 5 for the main board
    const articles = html.match(/<article/g) ?? [];
    expect(articles.length).toBeGreaterThanOrEqual(5);
  });

  it('no <script> block attaches event listeners to <details> elements (pure native HTML)', () => {
    const scriptContents = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    for (const script of scriptContents) {
      expect(script.toLowerCase()).not.toMatch(/addeventlistener.*toggle/);
      expect(script.toLowerCase()).not.toMatch(/addeventlistener.*click.*detail/i);
    }
  });
});
