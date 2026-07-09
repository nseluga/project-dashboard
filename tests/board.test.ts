/**
 * QA tests for Item 2.1 — Board page: project cards grouped by status
 *
 * Tests:
 *  - Bucket grouping logic (active / in-progress / on-hold)
 *  - nba-shot-value (status: complete) excluded from main buckets
 *  - ProjectCard renders all required fields
 *  - Overdue markup conditional is wired correctly in source
 *  - Behavioral checks against the running dev server (port 4322)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Project } from '../src/types/project.js';
import type { ManualData } from '../src/types/manual.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test-project',
    name: 'Test Project',
    summary: null,
    repo: null,
    github: null,
    tags: [],
    status: 'active',
    priority: 'medium',
    next_step: null,
    last_active: '2026-07-01T00:00:00.000Z',
    days_since_active: 7,
    ...overrides,
  };
}

function makeManual(overrides: Partial<ManualData> = {}): ManualData {
  return {
    overrides: {},
    due_dates: {},
    inbox: [],
    hidden_fields: {},
    token_log: [],
    notes: [],
    ...overrides,
  };
}

// ── Unit: bucket grouping logic ───────────────────────────────────────────────

vi.mock('../src/lib/projects.js', () => ({ getProjects: vi.fn() }));
vi.mock('../src/lib/manual.js', () => ({ readManual: vi.fn() }));

const { getMergedProjects } = await import('../src/lib/merge.js');
const { getProjects } = await import('../src/lib/projects.js');
const { readManual } = await import('../src/lib/manual.js');

const mockGetProjects = vi.mocked(getProjects);
const mockReadManual = vi.mocked(readManual);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Board page bucket grouping', () => {
  const BOARD_STATUSES = ['active', 'in-progress', 'on-hold'] as const;

  /** Simulate the grouping logic from index.astro */
  function groupIntoBuckets(projects: { status: string; id: string; name: string }[]) {
    const buckets: Record<string, typeof projects> = {
      active: [],
      'in-progress': [],
      'on-hold': [],
    };
    for (const p of projects) {
      if (p.status in buckets) buckets[p.status].push(p);
    }
    return buckets;
  }

  it('active bucket contains os and patio', async () => {
    mockGetProjects.mockResolvedValue([
      makeProject({ id: 'os', name: 'os', status: 'active' }),
      makeProject({ id: 'patio', name: 'Patio', status: 'active' }),
      makeProject({ id: 'portfolio-website', name: 'Portfolio Website', status: 'in-progress' }),
      makeProject({ id: 'pitcher-injury-risk', name: 'Pitcher Injury Risk', status: 'on-hold' }),
      makeProject({ id: 'batting-average-ability', name: 'Batting Average Ability', status: 'on-hold' }),
      makeProject({ id: 'nba-shot-value', name: 'NBA Shot Value', status: 'complete' }),
    ]);
    mockReadManual.mockReturnValue(makeManual());

    const merged = await getMergedProjects();
    const buckets = groupIntoBuckets(merged);

    const activeIds = buckets['active'].map((p) => p.id);
    expect(activeIds).toContain('os');
    expect(activeIds).toContain('patio');
    expect(activeIds).toHaveLength(2);
  });

  it('in-progress bucket contains only portfolio-website', async () => {
    mockGetProjects.mockResolvedValue([
      makeProject({ id: 'os', status: 'active' }),
      makeProject({ id: 'patio', status: 'active' }),
      makeProject({ id: 'portfolio-website', status: 'in-progress' }),
      makeProject({ id: 'pitcher-injury-risk', status: 'on-hold' }),
      makeProject({ id: 'batting-average-ability', status: 'on-hold' }),
      makeProject({ id: 'nba-shot-value', status: 'complete' }),
    ]);
    mockReadManual.mockReturnValue(makeManual());

    const merged = await getMergedProjects();
    const buckets = groupIntoBuckets(merged);

    const inProgressIds = buckets['in-progress'].map((p) => p.id);
    expect(inProgressIds).toContain('portfolio-website');
    expect(inProgressIds).toHaveLength(1);
  });

  it('on-hold bucket contains pitcher-injury-risk and batting-average-ability', async () => {
    mockGetProjects.mockResolvedValue([
      makeProject({ id: 'os', status: 'active' }),
      makeProject({ id: 'patio', status: 'active' }),
      makeProject({ id: 'portfolio-website', status: 'in-progress' }),
      makeProject({ id: 'pitcher-injury-risk', status: 'on-hold' }),
      makeProject({ id: 'batting-average-ability', status: 'on-hold' }),
      makeProject({ id: 'nba-shot-value', status: 'complete' }),
    ]);
    mockReadManual.mockReturnValue(makeManual());

    const merged = await getMergedProjects();
    const buckets = groupIntoBuckets(merged);

    const onHoldIds = buckets['on-hold'].map((p) => p.id);
    expect(onHoldIds).toContain('pitcher-injury-risk');
    expect(onHoldIds).toContain('batting-average-ability');
    expect(onHoldIds).toHaveLength(2);
  });

  it('nba-shot-value (complete) does NOT appear in any of the three main buckets', async () => {
    mockGetProjects.mockResolvedValue([
      makeProject({ id: 'os', status: 'active' }),
      makeProject({ id: 'patio', status: 'active' }),
      makeProject({ id: 'portfolio-website', status: 'in-progress' }),
      makeProject({ id: 'pitcher-injury-risk', status: 'on-hold' }),
      makeProject({ id: 'batting-average-ability', status: 'on-hold' }),
      makeProject({ id: 'nba-shot-value', status: 'complete' }),
    ]);
    mockReadManual.mockReturnValue(makeManual());

    const merged = await getMergedProjects();
    const buckets = groupIntoBuckets(merged);

    const allMainIds = [
      ...buckets['active'].map((p) => p.id),
      ...buckets['in-progress'].map((p) => p.id),
      ...buckets['on-hold'].map((p) => p.id),
    ];
    expect(allMainIds).not.toContain('nba-shot-value');
  });

  it('main buckets together hold exactly 5 projects (6 minus the complete one)', async () => {
    mockGetProjects.mockResolvedValue([
      makeProject({ id: 'os', status: 'active' }),
      makeProject({ id: 'patio', status: 'active' }),
      makeProject({ id: 'portfolio-website', status: 'in-progress' }),
      makeProject({ id: 'pitcher-injury-risk', status: 'on-hold' }),
      makeProject({ id: 'batting-average-ability', status: 'on-hold' }),
      makeProject({ id: 'nba-shot-value', status: 'complete' }),
    ]);
    mockReadManual.mockReturnValue(makeManual());

    const merged = await getMergedProjects();
    const buckets = groupIntoBuckets(merged);

    const total =
      buckets['active'].length +
      buckets['in-progress'].length +
      buckets['on-hold'].length;
    expect(total).toBe(5);
  });
});

// ── Unit: ProjectCard.astro source — required fields and overdue markup ───────

describe('ProjectCard.astro source contains required field markup', () => {
  let cardSource: string;

  beforeEach(() => {
    cardSource = readFileSync(resolve(ROOT, 'src/components/ProjectCard.astro'), 'utf-8');
  });

  it('renders status badge', () => {
    expect(cardSource).toMatch(/project\.status/);
  });

  it('renders days_since_active', () => {
    expect(cardSource).toMatch(/days_since_active/);
    expect(cardSource).toMatch(/days ago/);
  });

  it('renders next_step', () => {
    expect(cardSource).toMatch(/next_step/);
  });

  it('renders repo as plain text (not an anchor)', () => {
    expect(cardSource).toMatch(/project\.repo/);
    // repo should not be wrapped in an <a> tag — it should be in a <p>
    expect(cardSource).toMatch(/<p[^>]*>\{project\.repo\}/);
    // Make sure it's not rendered as an anchor
    expect(cardSource).not.toMatch(/<a[^>]*>\{project\.repo\}/);
  });

  it('renders github as a link with target="_blank" and aria-label', () => {
    expect(cardSource).toMatch(/target="_blank"/);
    expect(cardSource).toMatch(/aria-label=/);
    expect(cardSource).toMatch(/project\.github/);
  });

  it('overdue projects get a red visual treatment (border-red / bg-red classes)', () => {
    // The component must apply red classes when project.overdue is true
    expect(cardSource).toMatch(/project\.overdue/);
    expect(cardSource).toMatch(/border-red/);
    expect(cardSource).toMatch(/bg-red/);
  });

  it('github link opens in new tab (rel="noopener noreferrer")', () => {
    expect(cardSource).toMatch(/rel="noopener noreferrer"/);
  });
});

// ── Unit: index.astro source — section structure ─────────────────────────────

describe('index.astro source — board section structure', () => {
  let indexSource: string;

  beforeEach(() => {
    indexSource = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf-8');
  });

  it('defines BOARD_STATUSES with active, in-progress, on-hold', () => {
    expect(indexSource).toMatch(/active/);
    expect(indexSource).toMatch(/in-progress/);
    expect(indexSource).toMatch(/on-hold/);
  });

  it('calls getMergedProjects()', () => {
    expect(indexSource).toMatch(/getMergedProjects/);
  });

  it('renders a section for each status bucket', () => {
    expect(indexSource).toMatch(/section-\$\{status\}|section-active|aria-labelledby.*section/);
  });

  it('shows project count in each section heading', () => {
    expect(indexSource).toMatch(/projects\.length/);
  });

  it('imports and uses ProjectCard component', () => {
    expect(indexSource).toMatch(/ProjectCard/);
    expect(indexSource).toMatch(/import ProjectCard/);
  });
});

// ── Unit: Fix verification — javascript: URI guard ───────────────────────────

describe('Fix 2.1-Important-1: javascript: URI in github field renders as plain text', () => {
  it('safeGithub logic blocks javascript: URIs', () => {
    // Replicate the safeGithub computation from ProjectCard.astro line 30-33
    function computeSafeGithub(github: string | null | undefined): string | null {
      return github?.startsWith('http://') || github?.startsWith('https://')
        ? github
        : null;
    }

    // javascript: URI must be nullified
    expect(computeSafeGithub('javascript:alert(1)')).toBeNull();
    expect(computeSafeGithub('javascript:void(0)')).toBeNull();
    // data: URI must also be blocked
    expect(computeSafeGithub('data:text/html,<h1>hi</h1>')).toBeNull();
    // Valid URLs pass through
    expect(computeSafeGithub('https://github.com/nseluga/os')).toBe('https://github.com/nseluga/os');
    expect(computeSafeGithub('http://github.com/foo')).toBe('http://github.com/foo');
    // null/undefined returns null
    expect(computeSafeGithub(null)).toBeNull();
    expect(computeSafeGithub(undefined)).toBeNull();
  });

  it('ProjectCard.astro source: safeGithub computed before href; <a> uses safeGithub not project.github', () => {
    const cardSource = readFileSync(resolve(ROOT, 'src/components/ProjectCard.astro'), 'utf-8');
    // safeGithub must be declared in the frontmatter
    expect(cardSource).toMatch(/const safeGithub/);
    // The anchor href must reference safeGithub, not project.github directly
    expect(cardSource).toMatch(/href=\{safeGithub\}/);
    // project.github must NOT be used directly as href
    expect(cardSource).not.toMatch(/href=\{project\.github\}/);
  });

  it('ProjectCard.astro source: non-https github value renders as <p>, not <a>', () => {
    const cardSource = readFileSync(resolve(ROOT, 'src/components/ProjectCard.astro'), 'utf-8');
    // Must have a fallback <p> element for non-safe values
    expect(cardSource).toMatch(/project\.github\}/);
    // The <p> fallback should appear alongside the conditional safeGithub check
    expect(cardSource).toMatch(/safeGithub\s*\?\s*\(/);
    expect(cardSource).toMatch(/<p[^>]*>\{project\.github\}<\/p>/);
  });
});

// ── Unit: Fix verification — getMergedProjects() error boundary ───────────────

describe('Fix 2.1-Important-2: getMergedProjects() error falls back gracefully', () => {
  it('index.astro source: getMergedProjects() is wrapped in try/catch', () => {
    const indexSource = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf-8');
    // Must have a try block containing getMergedProjects
    expect(indexSource).toMatch(/try\s*\{/);
    expect(indexSource).toMatch(/getMergedProjects/);
    expect(indexSource).toMatch(/catch/);
  });

  it('index.astro source: loadError flag set to true in catch block', () => {
    const indexSource = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf-8');
    expect(indexSource).toMatch(/loadError\s*=\s*true/);
  });

  it('index.astro source: allProjects initialized to empty array before try block', () => {
    const indexSource = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf-8');
    // Must fall back to empty array if getMergedProjects() throws
    expect(indexSource).toMatch(/allProjects.*=.*\[\]/);
  });

  it('index.astro source: error banner rendered when loadError is true', () => {
    const indexSource = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf-8');
    // Error banner must be conditional on loadError
    expect(indexSource).toMatch(/loadError/);
    // Banner must use red styling
    expect(indexSource).toMatch(/bg-red-100/);
    // Banner must include a helpful error message
    expect(indexSource).toMatch(/Failed to load/);
  });

  it('getMergedProjects() throws when getProjects() rejects, confirming the error boundary is necessary', async () => {
    mockGetProjects.mockRejectedValue(new Error('OS_PROJECTS_DIR not set'));
    mockReadManual.mockReturnValue(makeManual());

    // getMergedProjects itself should propagate the error (index.astro catches it)
    await expect(getMergedProjects()).rejects.toThrow('OS_PROJECTS_DIR not set');
  });
});

// ── Behavioral: hit the running dev server ────────────────────────────────────

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

describe('Behavioral: rendered HTML from dev server', () => {
  let html: string;

  beforeEach(async () => {
    const result = await fetchPage();
    if (!result) {
      throw new Error(`Dev server not reachable at ${BASE_URL} — start with \`npm run dev\``);
    }
    html = result;
  });

  it('dev server responds with 200 and HTML', () => {
    expect(html).toBeTruthy();
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });

  it('page title is "Project Dashboard"', () => {
    expect(html).toContain('<title>Project Dashboard</title>');
  });

  it('active section contains os and Patio (2 projects)', () => {
    const activeMatch = html.match(
      /<section[^>]*aria-labelledby="section-active"[^>]*>([\s\S]*?)<\/section>/
    );
    expect(activeMatch, 'active section not found').toBeTruthy();
    const activeContent = activeMatch![1];
    expect(activeContent).toMatch(/\bos\b/);
    expect(activeContent).toContain('Patio');
    const names = [...activeContent.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((m) => m[1].trim());
    expect(names).toHaveLength(2);
  });

  it('in-progress section contains Portfolio Website (1 project)', () => {
    const match = html.match(
      /<section[^>]*aria-labelledby="section-in-progress"[^>]*>([\s\S]*?)<\/section>/
    );
    expect(match, 'in-progress section not found').toBeTruthy();
    const content = match![1];
    expect(content).toContain('Portfolio Website');
    const names = [...content.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((m) => m[1].trim());
    expect(names).toHaveLength(1);
  });

  it('on-hold section contains pitcher-injury-risk and batting-average-ability (2 projects)', () => {
    const match = html.match(
      /<section[^>]*aria-labelledby="section-on-hold"[^>]*>([\s\S]*?)<\/section>/
    );
    expect(match, 'on-hold section not found').toBeTruthy();
    const content = match![1];
    expect(content).toContain('Pitcher Injury Risk');
    expect(content).toContain('Batting Average Ability');
    const names = [...content.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((m) => m[1].trim());
    expect(names).toHaveLength(2);
  });

  it('nba-shot-value does not appear in any of the three main buckets', () => {
    const sections = [...html.matchAll(
      /<section[^>]*aria-labelledby="section-(active|in-progress|on-hold)"[^>]*>([\s\S]*?)<\/section>/g
    )];
    for (const [, status, content] of sections) {
      expect(content.toLowerCase()).not.toContain('nba');
      expect(content.toLowerCase()).not.toContain('shot value');
    }
  });

  it('each card shows a status badge', () => {
    // Five status badges expected (one per main-bucket project)
    const badgeMatches = html.match(/bg-green-100|bg-blue-100|bg-amber-100/g) ?? [];
    expect(badgeMatches.length).toBeGreaterThanOrEqual(5);
  });

  it('each card shows days-since-active', () => {
    const daysMatches = html.match(/\d+ days ago/g) ?? [];
    expect(daysMatches.length).toBeGreaterThanOrEqual(5);
  });

  it('each card shows next_step text', () => {
    // 5 cards, but batting-average-ability and pitcher-injury-risk share the same next_step
    const nextStepMatches = html.match(/Next step/g) ?? [];
    expect(nextStepMatches.length).toBeGreaterThanOrEqual(5);
  });

  it('each card shows repo path as plain text', () => {
    // Match <p class="font-mono..."> with optional extra attributes (e.g. data-astro-source-*)
    const repoMatches = html.match(/<p class="font-mono[^>]*>([^<]+)<\/p>/g) ?? [];
    expect(repoMatches.length).toBeGreaterThanOrEqual(4); // nba-shot-value has no repo
  });

  it('each github-linked project has a link with target="_blank" and aria-label', () => {
    const linkMatches = html.match(/<a[^>]+target="_blank"[^>]+aria-label="[^"]+on GitHub[^"]*"/g) ?? [];
    expect(linkMatches.length).toBeGreaterThanOrEqual(5); // all 5 main-bucket projects have GitHub
    for (const link of linkMatches) {
      expect(link).toContain('rel="noopener noreferrer"');
    }
  });

  it('overdue markup uses red classes in the component (source check)', () => {
    // No current project has a due date, so we verify via source rather than live HTML
    const cardSource = readFileSync(
      resolve(ROOT, 'src/components/ProjectCard.astro'),
      'utf-8'
    );
    expect(cardSource).toMatch(/border-red-\d+/);
    expect(cardSource).toMatch(/bg-red-\d+/);
    // The conditional must reference overdue
    expect(cardSource).toMatch(/project\.overdue/);
  });

  it('page renders without obvious JS console errors (no <script> error markers in HTML)', () => {
    // The rendered HTML should not include uncaught error dumps or Astro error overlays
    expect(html).not.toContain('Uncaught Error');
    expect(html).not.toContain('astro-error-overlay');
    expect(html).not.toContain('500 Internal Server Error');
  });
});

// ── Item 2.2: Unit — index.astro source — collapsed completed section ──────────

describe('Item 2.2: index.astro source — collapsed completed section', () => {
  let indexSource: string;

  beforeEach(() => {
    indexSource = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf-8');
  });

  it('source defines COLLAPSED_STATUSES including "complete"', () => {
    expect(indexSource).toMatch(/COLLAPSED_STATUSES/);
    expect(indexSource).toMatch(/complete/);
  });

  it('source uses early-continue guard to prevent complete/archived projects from entering main buckets', () => {
    // The early-continue before bucket assignment is the enforcement mechanism
    expect(indexSource).toMatch(/COLLAPSED_STATUSES\.has/);
    expect(indexSource).toMatch(/continue/);
  });

  it('source renders a native <details> element (no JS) for the completed section', () => {
    expect(indexSource).toMatch(/<details/);
    // Must NOT have the `open` attribute (collapsed by default)
    expect(indexSource).not.toMatch(/<details[^>]*\bopen\b/);
  });

  it('source wraps completed section in <details>/<summary> without any JS event listeners', () => {
    // The <details> must not attach click/toggle listeners via addEventListener
    expect(indexSource).not.toMatch(/addEventListener.*toggle/);
    expect(indexSource).not.toMatch(/addEventListener.*click/);
  });

  it('summary text shows count via completedProjects.length', () => {
    expect(indexSource).toMatch(/completedProjects\.length/);
    expect(indexSource).toMatch(/Completed/);
  });

  it('completed section renders ProjectCard for each completed project', () => {
    // Must iterate completedProjects and pass to ProjectCard
    expect(indexSource).toMatch(/completedProjects\.map/);
    // Must use ProjectCard inside the details/completed block
    const detailsMatch = indexSource.match(/<details[\s\S]*?<\/details>/);
    expect(detailsMatch, '<details> block not found in source').toBeTruthy();
    expect(detailsMatch![0]).toContain('ProjectCard');
  });

  it('completed section grid uses the same layout classes as main board', () => {
    // Same grid as the main board for visual consistency
    const detailsMatch = indexSource.match(/<details[\s\S]*?<\/details>/);
    expect(detailsMatch, '<details> block not found in source').toBeTruthy();
    expect(detailsMatch![0]).toMatch(/grid-cols-1.*gap-4.*sm:grid-cols-2.*lg:grid-cols-3/);
  });
});

// ── Item 2.2: Unit — bucket grouping excludes complete/archived ───────────────

describe('Item 2.2: bucket grouping excludes complete and archived projects', () => {
  /** Replicate the COLLAPSED_STATUSES guard from index.astro */
  function groupWithCollapsedGuard(projects: { status: string; id: string }[]) {
    const COLLAPSED_STATUSES = new Set(['complete', 'archived']);
    const buckets: Record<string, typeof projects> = {
      active: [],
      'in-progress': [],
      'on-hold': [],
    };
    const completed: typeof projects = [];
    for (const p of projects) {
      if (COLLAPSED_STATUSES.has(p.status)) {
        completed.push(p);
        continue;
      }
      if (p.status in buckets) buckets[p.status].push(p);
    }
    return { buckets, completed };
  }

  it('complete project is routed to completedProjects, not any main bucket', () => {
    const { buckets, completed } = groupWithCollapsedGuard([
      { id: 'nba-shot-value', status: 'complete' },
      { id: 'os', status: 'active' },
    ]);
    expect(completed.map((p) => p.id)).toContain('nba-shot-value');
    const allMainIds = [...buckets.active, ...buckets['in-progress'], ...buckets['on-hold']].map((p) => p.id);
    expect(allMainIds).not.toContain('nba-shot-value');
  });

  it('archived project is routed to completedProjects, not any main bucket', () => {
    const { buckets, completed } = groupWithCollapsedGuard([
      { id: 'old-project', status: 'archived' },
      { id: 'patio', status: 'active' },
    ]);
    expect(completed.map((p) => p.id)).toContain('old-project');
    const allMainIds = [...buckets.active, ...buckets['in-progress'], ...buckets['on-hold']].map((p) => p.id);
    expect(allMainIds).not.toContain('old-project');
  });

  it('active/in-progress/on-hold projects still reach their correct buckets when complete projects are present', () => {
    const { buckets, completed } = groupWithCollapsedGuard([
      { id: 'os', status: 'active' },
      { id: 'patio', status: 'active' },
      { id: 'portfolio-website', status: 'in-progress' },
      { id: 'pitcher-injury-risk', status: 'on-hold' },
      { id: 'batting-average-ability', status: 'on-hold' },
      { id: 'nba-shot-value', status: 'complete' },
    ]);
    expect(buckets.active.map((p) => p.id)).toEqual(['os', 'patio']);
    expect(buckets['in-progress'].map((p) => p.id)).toEqual(['portfolio-website']);
    expect(buckets['on-hold'].map((p) => p.id)).toEqual(['pitcher-injury-risk', 'batting-average-ability']);
    expect(completed.map((p) => p.id)).toEqual(['nba-shot-value']);
  });
});

// ── Helper: extract the completed-section <details> block (balanced, handles nested <details>) ──
function extractCompletedDetailsBlock(html: string): string | null {
  // Find the index of "Completed (" text which appears in the section's <summary>
  const summaryIdx = html.search(/Completed\s*\(/);
  if (summaryIdx === -1) return null;
  // Walk back from that position to find the opening <details> tag
  const before = html.slice(0, summaryIdx);
  const openTagIdx = before.lastIndexOf('<details');
  if (openTagIdx === -1) return null;
  // Walk forward from openTagIdx, tracking nesting depth to find the balanced </details>
  let depth = 0;
  let i = openTagIdx;
  while (i < html.length) {
    if (html.startsWith('<details', i)) {
      // Skip self-closing check — <details> is never self-closing in HTML
      depth++;
      i += '<details'.length;
    } else if (html.startsWith('</details>', i)) {
      depth--;
      if (depth === 0) {
        return html.slice(openTagIdx, i + '</details>'.length);
      }
      i += '</details>'.length;
    } else {
      i++;
    }
  }
  return null;
}

// ── Item 2.2: Behavioral — live HTML confirms collapsed section ───────────────

describe('Item 2.2: Behavioral — collapsed completed section in rendered HTML', () => {
  let html: string;

  beforeEach(async () => {
    const result = await fetchPage();
    if (!result) {
      throw new Error(`Dev server not reachable at ${BASE_URL} — start with \`npm run dev\``);
    }
    html = result;
  });

  it('<details> element is present in the rendered HTML', () => {
    expect(html).toContain('<details');
  });

  it('<details> element does NOT have the "open" attribute (collapsed by default)', () => {
    // Match the opening <details> tag and ensure it has no "open" attribute
    const detailsTagMatch = html.match(/<details[^>]*>/);
    expect(detailsTagMatch, '<details> tag not found').toBeTruthy();
    expect(detailsTagMatch![0]).not.toMatch(/\bopen\b/);
  });

  it('<details> contains "NBA Shot Value" inside — visible when expanded', () => {
    // Extract the completed-section <details> by finding its opening tag (before "Completed" summary)
    // and walking the HTML to the balanced </details> so nested card <details> don't truncate it
    const completedDetailsBlock = extractCompletedDetailsBlock(html);
    expect(completedDetailsBlock, 'completed-section <details> block not found').toBeTruthy();
    expect(completedDetailsBlock).toContain('NBA Shot Value');
  });

  it('<details> inner content uses ProjectCard <article> layout', () => {
    // Extract the completed-section <details> by finding its opening tag (before "Completed" summary)
    // and walking the HTML to the balanced </details> so nested card <details> don't truncate it
    const completedDetailsBlock = extractCompletedDetailsBlock(html);
    expect(completedDetailsBlock, 'completed-section <details> block not found').toBeTruthy();
    // ProjectCard renders an <article> element
    expect(completedDetailsBlock).toContain('<article');
    // And a grid wrapper
    expect(completedDetailsBlock).toMatch(/grid-cols-1/);
  });

  it('nba-shot-value does NOT appear in the active section HTML', () => {
    const activeMatch = html.match(
      /<section[^>]*aria-labelledby="section-active"[^>]*>([\s\S]*?)<\/section>/
    );
    expect(activeMatch, 'active section not found').toBeTruthy();
    expect(activeMatch![1].toLowerCase()).not.toContain('nba');
    expect(activeMatch![1].toLowerCase()).not.toContain('shot value');
  });

  it('nba-shot-value does NOT appear in the in-progress section HTML', () => {
    const match = html.match(
      /<section[^>]*aria-labelledby="section-in-progress"[^>]*>([\s\S]*?)<\/section>/
    );
    expect(match, 'in-progress section not found').toBeTruthy();
    expect(match![1].toLowerCase()).not.toContain('nba');
    expect(match![1].toLowerCase()).not.toContain('shot value');
  });

  it('nba-shot-value does NOT appear in the on-hold section HTML', () => {
    const match = html.match(
      /<section[^>]*aria-labelledby="section-on-hold"[^>]*>([\s\S]*?)<\/section>/
    );
    expect(match, 'on-hold section not found').toBeTruthy();
    expect(match![1].toLowerCase()).not.toContain('nba');
    expect(match![1].toLowerCase()).not.toContain('shot value');
  });

  it('no <script> block attaches event listeners to the <details> element (pure native HTML)', () => {
    // Extract all inline <script> blocks and verify none mention details/toggle/expand
    const scriptContents = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    for (const script of scriptContents) {
      expect(script.toLowerCase()).not.toMatch(/addeventlistener.*toggle/);
      expect(script.toLowerCase()).not.toMatch(/addeventlistener.*click.*detail/);
    }
  });

  it('summary element shows "Completed (1)" with the count', () => {
    // Target the completed-section <summary> specifically — "Edit" summaries will not match
    const allSummaries = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)];
    const completedSummary = allSummaries.find((m) => /Completed/i.test(m[1]));
    expect(completedSummary, 'completed-section <summary> not found').toBeTruthy();
    expect(completedSummary![1]).toMatch(/Completed\s*\(\s*1\s*\)/);
  });
});
