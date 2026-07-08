/**
 * Behavioral tests for Item 2.3 — Inline edit controls (real file I/O)
 *
 * These tests import the actual route handlers WITHOUT mocking manual.js,
 * so readManual/writeManual hit data/manual.json for real.
 *
 * A snapshot of manual.json is saved before each test and restored after, so
 * the file is always left in its original state even if a test fails.
 *
 * These tests exercise the exact payload format used by EditControls.astro's
 * postJson helper function, verifying that manual.json reflects the change.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ManualData } from '../src/types/manual.js';

const MANUAL_PATH = join(process.cwd(), 'data', 'manual.json');

function readManualFile(): ManualData {
  return JSON.parse(readFileSync(MANUAL_PATH, 'utf-8')) as ManualData;
}

let snapshot: string;

beforeEach(() => {
  snapshot = readFileSync(MANUAL_PATH, 'utf-8');
});

afterEach(() => {
  writeFileSync(MANUAL_PATH, snapshot, 'utf-8');
});

// Import live route handlers (no vi.mock in this file — real I/O)
const { POST: dueDatePOST } = await import('../src/pages/api/due-date.js');
const { POST: overridePOST } = await import('../src/pages/api/override.js');

function makeContext(body: unknown): Parameters<typeof dueDatePOST>[0] {
  return {
    request: new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  } as Parameters<typeof dueDatePOST>[0];
}

// ---------------------------------------------------------------------------
// Due date — setting a due date persists and displays on reload
// ---------------------------------------------------------------------------

describe('Item 2.3 Behavioral: due date persists in manual.json', () => {
  it('setting due date writes entry to manual.json due_dates', async () => {
    const ctx = makeContext({ projectId: 'os', date: '2026-10-01' });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const after = readManualFile();
    expect(after.due_dates['os']).toBe('2026-10-01');
  });

  it('due date is preserved as exact YYYY-MM-DD string in manual.json', async () => {
    const ctx = makeContext({ projectId: 'patio', date: '2026-08-15' });
    await dueDatePOST(ctx);

    const after = readManualFile();
    expect(after.due_dates['patio']).toBe('2026-08-15');
  });

  it('setting due date does not disturb other projects\' due dates', async () => {
    // test-proj already has a due date in the fixture
    const before = readManualFile();
    const testProjDate = before.due_dates['test-proj'];

    const ctx = makeContext({ projectId: 'os', date: '2026-10-01' });
    await dueDatePOST(ctx);

    const after = readManualFile();
    expect(after.due_dates['test-proj']).toBe(testProjDate);
    expect(after.due_dates['os']).toBe('2026-10-01');
  });
});

// ---------------------------------------------------------------------------
// Due date — clear correctly removes the value on reload
// ---------------------------------------------------------------------------

describe('Item 2.3 Behavioral: due date clear removes value in manual.json', () => {
  it('clearing due date (date: null) removes entry from manual.json due_dates', async () => {
    // First set a due date
    const setCtx = makeContext({ projectId: 'patio', date: '2026-09-15' });
    await dueDatePOST(setCtx);

    const afterSet = readManualFile();
    expect(afterSet.due_dates['patio']).toBe('2026-09-15');

    // Now clear it
    const clearCtx = makeContext({ projectId: 'patio', date: null });
    const clearRes = await dueDatePOST(clearCtx);
    expect(clearRes.status).toBe(200);

    const afterClear = readManualFile();
    expect('patio' in afterClear.due_dates).toBe(false);
  });

  it('clearing existing due date from fixture project removes it', async () => {
    // test-proj has due_date in fixture
    const before = readManualFile();
    expect('test-proj' in before.due_dates).toBe(true);

    const clearCtx = makeContext({ projectId: 'test-proj', date: null });
    const res = await dueDatePOST(clearCtx);
    expect(res.status).toBe(200);

    const after = readManualFile();
    expect('test-proj' in after.due_dates).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Status override — changing status moves card to correct bucket on reload
// ---------------------------------------------------------------------------

describe('Item 2.3 Behavioral: status override persists in manual.json', () => {
  it('status override writes to manual.json overrides and persists', async () => {
    const ctx = makeContext({ projectId: 'portfolio-website', field: 'status', value: 'on-hold' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const after = readManualFile();
    expect(after.overrides['portfolio-website']['status']).toBe('on-hold');
  });

  it('status override does not disturb other override fields for same project', async () => {
    // test-proj has { priority: 'high' } in fixture
    const ctx = makeContext({ projectId: 'test-proj', field: 'status', value: 'active' });
    await overridePOST(ctx);

    const after = readManualFile();
    expect(after.overrides['test-proj']['status']).toBe('active');
    expect(after.overrides['test-proj']['priority']).toBe('high');
  });
});

// ---------------------------------------------------------------------------
// Status override — reset correctly removes the value on reload
// ---------------------------------------------------------------------------

describe('Item 2.3 Behavioral: status reset removes value in manual.json', () => {
  it('status reset (value: null) removes entry from manual.json overrides', async () => {
    // Set status override first
    const setCtx = makeContext({ projectId: 'portfolio-website', field: 'status', value: 'on-hold' });
    await overridePOST(setCtx);

    const afterSet = readManualFile();
    expect(afterSet.overrides['portfolio-website']['status']).toBe('on-hold');

    // Now reset
    const resetCtx = makeContext({ projectId: 'portfolio-website', field: 'status', value: null });
    const resetRes = await overridePOST(resetCtx);
    expect(resetRes.status).toBe(200);

    const afterReset = readManualFile();
    const projectOverrides = afterReset.overrides['portfolio-website'];
    expect(
      projectOverrides === undefined || !('status' in projectOverrides)
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Priority override — priority change persists
// ---------------------------------------------------------------------------

describe('Item 2.3 Behavioral: priority override persists in manual.json', () => {
  it('priority override writes to manual.json overrides', async () => {
    const ctx = makeContext({ projectId: 'os', field: 'priority', value: 'medium' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const after = readManualFile();
    expect(after.overrides['os']['priority']).toBe('medium');
  });

  it('priority override does not disturb other projects\' overrides', async () => {
    const before = readManualFile();
    const testProjOverrides = { ...before.overrides['test-proj'] };

    const ctx = makeContext({ projectId: 'os', field: 'priority', value: 'high' });
    await overridePOST(ctx);

    const after = readManualFile();
    // test-proj overrides unchanged
    expect(after.overrides['test-proj']).toEqual(testProjOverrides);
  });
});

// ---------------------------------------------------------------------------
// Priority override — reset correctly removes the value on reload
// ---------------------------------------------------------------------------

describe('Item 2.3 Behavioral: priority reset removes value in manual.json', () => {
  it('priority reset (value: null) removes entry from manual.json overrides', async () => {
    // Set priority override first
    const setCtx = makeContext({ projectId: 'os', field: 'priority', value: 'low' });
    await overridePOST(setCtx);

    const afterSet = readManualFile();
    expect(afterSet.overrides['os']['priority']).toBe('low');

    // Now reset
    const resetCtx = makeContext({ projectId: 'os', field: 'priority', value: null });
    const resetRes = await overridePOST(resetCtx);
    expect(resetRes.status).toBe(200);

    const afterReset = readManualFile();
    const projectOverrides = afterReset.overrides['os'];
    expect(
      projectOverrides === undefined || !('priority' in projectOverrides)
    ).toBe(true);
  });

  it('priority reset preserves other fields on same project', async () => {
    // test-proj has { priority: 'high' } in fixture — also add a status override
    const setCtx = makeContext({ projectId: 'test-proj', field: 'status', value: 'active' });
    await overridePOST(setCtx);

    // Now reset priority only
    const resetCtx = makeContext({ projectId: 'test-proj', field: 'priority', value: null });
    await overridePOST(resetCtx);

    const afterReset = readManualFile();
    // priority should be gone, status override should remain
    const projectOverrides = afterReset.overrides['test-proj'];
    expect(
      projectOverrides === undefined || !('priority' in (projectOverrides ?? {}))
    ).toBe(true);
    expect(afterReset.overrides['test-proj']?.['status']).toBe('active');
  });
});
