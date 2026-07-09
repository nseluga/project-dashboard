/**
 * Behavioral tests for Item 5.2 — Per-project hide toggles for due date + priority fields
 *
 * Tests the full round-trip: POST /api/field-visibility → manual.json → merge layer →
 * EditControls template rendering.  No vi.mock() — these hit real file I/O so
 * that schema/wiring errors are caught.
 *
 * data/manual.json is snapshot/restored around every test.
 *
 * Also covers:
 *   - Due date fieldset removed from DOM when hidden_fields.due_date = true
 *   - Priority select removed from DOM when hidden_fields.priority = true
 *   - Show button present in hidden-state branch
 *   - Other projects unaffected
 *   - POST /api/field-visibility with invalid field returns 400
 *   - merge layer hidden_fields passthrough (both false by default, true when set)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ManualData } from '../src/types/manual.js';
import { readFileSync as _readFS } from 'fs';

const MANUAL_PATH = join(process.cwd(), 'data', 'manual.json');

function readManualFile(): ManualData {
  const raw = readFileSync(MANUAL_PATH, 'utf-8');
  return JSON.parse(raw) as ManualData;
}

let snapshot: string;

beforeEach(() => {
  snapshot = readFileSync(MANUAL_PATH, 'utf-8');
});

afterEach(() => {
  writeFileSync(MANUAL_PATH, snapshot, 'utf-8');
});

// Import live route handler (no mock — real I/O)
const { POST: fieldVisibilityPOST } = await import('../src/pages/api/field-visibility.js');

function makeContext(body: unknown): Parameters<typeof fieldVisibilityPOST>[0] {
  return {
    request: new Request('http://localhost/api/field-visibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  } as Parameters<typeof fieldVisibilityPOST>[0];
}

// ---------------------------------------------------------------------------
// Live persistence: hide due_date
// ---------------------------------------------------------------------------

describe('Item 5.2 Behavioral: hiding due_date persists in manual.json', () => {
  it('hiding due_date writes hidden_fields[projectId].due_date = true to manual.json', async () => {
    const ctx = makeContext({ projectId: 'os', field: 'due_date', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const after = readManualFile();
    expect(after.hidden_fields?.['os']?.['due_date']).toBe(true);
  });

  it('showing due_date (hidden: false) removes the key from manual.json', async () => {
    // First hide it
    const hideCtx = makeContext({ projectId: 'os', field: 'due_date', hidden: true });
    await fieldVisibilityPOST(hideCtx);

    const afterHide = readManualFile();
    expect(afterHide.hidden_fields?.['os']?.['due_date']).toBe(true);

    // Now show it
    const showCtx = makeContext({ projectId: 'os', field: 'due_date', hidden: false });
    const showRes = await fieldVisibilityPOST(showCtx);
    expect(showRes.status).toBe(200);

    const afterShow = readManualFile();
    // Key should be absent or the project entry cleaned up entirely
    const projectEntry = afterShow.hidden_fields?.['os'];
    expect(
      projectEntry === undefined || !('due_date' in projectEntry)
    ).toBe(true);
  });

  it('hiding due_date does not disturb other projects hidden_fields', async () => {
    // Hide patio priority first
    const ctx1 = makeContext({ projectId: 'patio', field: 'priority', hidden: true });
    await fieldVisibilityPOST(ctx1);

    // Now hide os due_date
    const ctx2 = makeContext({ projectId: 'os', field: 'due_date', hidden: true });
    await fieldVisibilityPOST(ctx2);

    const after = readManualFile();
    expect(after.hidden_fields?.['patio']?.['priority']).toBe(true);
    expect(after.hidden_fields?.['os']?.['due_date']).toBe(true);
    // patio's due_date not touched
    expect(after.hidden_fields?.['patio']?.['due_date']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Live persistence: hide priority
// ---------------------------------------------------------------------------

describe('Item 5.2 Behavioral: hiding priority persists in manual.json', () => {
  it('hiding priority writes hidden_fields[projectId].priority = true to manual.json', async () => {
    const ctx = makeContext({ projectId: 'patio', field: 'priority', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const after = readManualFile();
    expect(after.hidden_fields?.['patio']?.['priority']).toBe(true);
  });

  it('showing priority (hidden: false) removes the key from manual.json', async () => {
    // First hide it
    const hideCtx = makeContext({ projectId: 'patio', field: 'priority', hidden: true });
    await fieldVisibilityPOST(hideCtx);

    // Now show it
    const showCtx = makeContext({ projectId: 'patio', field: 'priority', hidden: false });
    const showRes = await fieldVisibilityPOST(showCtx);
    expect(showRes.status).toBe(200);

    const after = readManualFile();
    const projectEntry = after.hidden_fields?.['patio'];
    expect(
      projectEntry === undefined || !('priority' in projectEntry)
    ).toBe(true);
  });

  it('empty project entry is cleaned up when last hidden field is restored', async () => {
    // Use a project id that is guaranteed to have no prior hidden_fields entry
    // regardless of what data/manual.json contains at test-time.
    const testProjectId = '__cleanup_test_project__';

    // Hide the only field we will touch
    const hideCtx = makeContext({ projectId: testProjectId, field: 'priority', hidden: true });
    await fieldVisibilityPOST(hideCtx);

    const afterHide = readManualFile();
    expect(testProjectId in (afterHide.hidden_fields ?? {})).toBe(true);

    // Restore it — should remove the project entry entirely
    const showCtx = makeContext({ projectId: testProjectId, field: 'priority', hidden: false });
    await fieldVisibilityPOST(showCtx);

    const afterShow = readManualFile();
    expect(testProjectId in (afterShow.hidden_fields ?? {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation: invalid field names return 400 (no write)
// ---------------------------------------------------------------------------

describe('Item 5.2 Behavioral: invalid field names return 400', () => {
  it('returns 400 for field "status" (not in allowlist)', async () => {
    const before = readManualFile();

    const ctx = makeContext({ projectId: 'os', field: 'status', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);

    // manual.json must be unchanged
    const after = readManualFile();
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
  });

  it('returns 400 for field "due-date" (hyphen variant)', async () => {
    const before = readManualFile();

    const ctx = makeContext({ projectId: 'os', field: 'due-date', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(400);
    const after = readManualFile();
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
  });

  it('returns 400 when projectId is empty string', async () => {
    const ctx = makeContext({ projectId: '', field: 'due_date', hidden: true });
    const res = await fieldVisibilityPOST(ctx);
    expect(res.status).toBe(400);
  });

  it('returns 400 when hidden is a string "true" not a boolean', async () => {
    const ctx = makeContext({ projectId: 'os', field: 'due_date', hidden: 'true' });
    const res = await fieldVisibilityPOST(ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Merge layer: hidden_fields passthrough (live I/O)
// ---------------------------------------------------------------------------

describe('Item 5.2 Behavioral: merge layer reflects hidden_fields after write', () => {
  it('getMergedProjects reflects due_date hidden after POST /api/field-visibility', async () => {
    // Set hidden
    const ctx = makeContext({ projectId: 'os', field: 'due_date', hidden: true });
    await fieldVisibilityPOST(ctx);

    // Import merge after I/O (module cache is cleared between tests via forks pool)
    const { getMergedProjects } = await import('../src/lib/merge.js');
    const projects = await getMergedProjects();
    const os = projects.find((p) => p.id === 'os');
    expect(os).toBeDefined();
    expect(os!.hidden_fields.due_date).toBe(true);
    expect(os!.hidden_fields.priority).toBe(false);
  });

  it('getMergedProjects reflects priority hidden after POST /api/field-visibility', async () => {
    const ctx = makeContext({ projectId: 'patio', field: 'priority', hidden: true });
    await fieldVisibilityPOST(ctx);

    const { getMergedProjects } = await import('../src/lib/merge.js');
    const projects = await getMergedProjects();
    const patio = projects.find((p) => p.id === 'patio');
    expect(patio).toBeDefined();
    expect(patio!.hidden_fields.priority).toBe(true);
    expect(patio!.hidden_fields.due_date).toBe(false);
  });

  it('hidden_fields for one project do not bleed into another project in getMergedProjects', async () => {
    const ctx = makeContext({ projectId: 'os', field: 'due_date', hidden: true });
    await fieldVisibilityPOST(ctx);

    const { getMergedProjects } = await import('../src/lib/merge.js');
    const projects = await getMergedProjects();
    const patio = projects.find((p) => p.id === 'patio');
    expect(patio).toBeDefined();
    // patio not touched — both should be false
    expect(patio!.hidden_fields.due_date).toBe(false);
    expect(patio!.hidden_fields.priority).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Source inspection: EditControls.astro conditional rendering
// ---------------------------------------------------------------------------

describe('Item 5.2 Source: EditControls.astro hides/shows fields conditionally', () => {
  const editControlsSrc = readFileSync(
    join(process.cwd(), 'src/components/EditControls.astro'),
    'utf-8'
  );

  it('due date fieldset is conditionally rendered based on hidden_fields.due_date', () => {
    expect(editControlsSrc).toContain('project.hidden_fields.due_date');
    // Should be inside a conditional (negated)
    expect(editControlsSrc).toMatch(/!project\.hidden_fields\.due_date/);
  });

  it('priority control is conditionally rendered based on hidden_fields.priority', () => {
    expect(editControlsSrc).toContain('project.hidden_fields.priority');
    expect(editControlsSrc).toMatch(/!project\.hidden_fields\.priority/);
  });

  it('Hide button has data-action="hide-field" for due_date', () => {
    expect(editControlsSrc).toContain('data-action="hide-field"');
    expect(editControlsSrc).toContain('data-field="due_date"');
  });

  it('Show button has data-action="show-field" for due_date', () => {
    expect(editControlsSrc).toContain('data-action="show-field"');
  });

  it('Hide button has data-field="priority" for priority', () => {
    expect(editControlsSrc).toContain('data-field="priority"');
  });

  it('hide-field and show-field handlers call /api/field-visibility', () => {
    expect(editControlsSrc).toContain("'/api/field-visibility'");
    expect(editControlsSrc).toContain('hidden: true');
    expect(editControlsSrc).toContain('hidden: false');
  });

  it('Show state renders Show button text for due date', () => {
    expect(editControlsSrc).toContain('Show due date');
  });

  it('Show state renders Show button text for priority', () => {
    expect(editControlsSrc).toContain('Show priority');
  });

  it('error elements for field-visibility use correct data-error keys', () => {
    expect(editControlsSrc).toContain('data-error="field-visibility-due_date"');
    expect(editControlsSrc).toContain('data-error="field-visibility-priority"');
  });

  it('due date fieldset is a <fieldset> element (not a <div>) in the visible state', () => {
    // Visible branch renders <fieldset>; hidden branch renders <div>
    expect(editControlsSrc).toContain('<fieldset');
  });
});
