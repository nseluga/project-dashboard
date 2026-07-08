/**
 * Behavioral tests for Item 1.4 — exercise the live path with real file I/O.
 * These tests import the actual route handlers WITHOUT mocking manual.js,
 * so readManual/writeManual hit data/manual.json for real.
 *
 * A snapshot of manual.json is saved before each test and restored after, so
 * the file is always left in its original state even if a test fails.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const MANUAL_PATH = join(process.cwd(), 'data', 'manual.json');

let snapshot: string;

beforeEach(() => {
  snapshot = readFileSync(MANUAL_PATH, 'utf-8');
});

afterEach(() => {
  writeFileSync(MANUAL_PATH, snapshot, 'utf-8');
});

// Import route handlers after snapshot setup — they use the real I/O layer.
const { POST: inboxPOST, DELETE: inboxDELETE } = await import('../src/pages/api/inbox.js');
const { POST: dueDatePOST } = await import('../src/pages/api/due-date.js');
const { POST: overridePOST } = await import('../src/pages/api/override.js');

function makeContext(body: unknown, method = 'POST') {
  return {
    request: new Request('http://localhost/api/test', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  } as Parameters<typeof inboxPOST>[0];
}

function readManualFile() {
  return JSON.parse(readFileSync(MANUAL_PATH, 'utf-8'));
}

// ---------------------------------------------------------------------------
// POST /api/inbox — behavioral: appends item to data/manual.json
// ---------------------------------------------------------------------------

describe('POST /api/inbox [behavioral]', () => {
  it('returns 200 { ok: true } and writes item to manual.json', async () => {
    const before = readManualFile();
    const initialCount = before.inbox.length;

    const ctx = makeContext({ text: 'behavioral-inbox-item', project: 'test-proj' });
    const res = await inboxPOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const after = readManualFile();
    expect(after.inbox).toHaveLength(initialCount + 1);
    const added = after.inbox.find((i: { text: string }) => i.text === 'behavioral-inbox-item');
    expect(added).toBeDefined();
    expect(added.project).toBe('test-proj');
    expect(added.done).toBe(false);
    expect(typeof added.id).toBe('string');
  });

  it('returns 400 on missing text — manual.json unchanged', async () => {
    const before = readFileSync(MANUAL_PATH, 'utf-8');

    const ctx = makeContext({ project: 'test-proj' });
    const res = await inboxPOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);

    // File must be untouched
    expect(readFileSync(MANUAL_PATH, 'utf-8')).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/inbox — behavioral: removes item; 404 on unknown id
// ---------------------------------------------------------------------------

describe('DELETE /api/inbox [behavioral]', () => {
  it('returns 200 { ok: true } and removes item from manual.json', async () => {
    // The fixture already has id="b1" in inbox
    const ctx = makeContext({ id: 'b1' });
    const res = await inboxDELETE(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const after = readManualFile();
    expect(after.inbox.find((i: { id: string }) => i.id === 'b1')).toBeUndefined();
  });

  it('returns 404 with unknown id — manual.json unchanged', async () => {
    const before = readFileSync(MANUAL_PATH, 'utf-8');

    const ctx = makeContext({ id: 'does-not-exist' });
    const res = await inboxDELETE(ctx);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe('string');

    expect(readFileSync(MANUAL_PATH, 'utf-8')).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// POST /api/due-date — behavioral: writes due_dates to manual.json
// ---------------------------------------------------------------------------

describe('POST /api/due-date [behavioral]', () => {
  it('sets due date for a new project and writes to manual.json', async () => {
    const ctx = makeContext({ projectId: 'new-proj', date: '2026-12-31' });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const after = readManualFile();
    expect(after.due_dates['new-proj']).toBe('2026-12-31');
  });

  it('removes due date when date is null and writes to manual.json', async () => {
    // Fixture has test-proj with due_date 2026-09-01 — remove it
    const ctx = makeContext({ projectId: 'test-proj', date: null });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(200);
    const after = readManualFile();
    expect('test-proj' in after.due_dates).toBe(false);
  });

  it('returns 400 on invalid date type — manual.json unchanged', async () => {
    const before = readFileSync(MANUAL_PATH, 'utf-8');

    const ctx = makeContext({ projectId: 'test-proj', date: 99999 });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(400);
    expect(readFileSync(MANUAL_PATH, 'utf-8')).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// POST /api/override — behavioral: writes overrides to manual.json
// ---------------------------------------------------------------------------

describe('POST /api/override [behavioral]', () => {
  it('sets an override field and writes to manual.json', async () => {
    const ctx = makeContext({ projectId: 'test-proj', field: 'status', value: 'paused' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const after = readManualFile();
    expect(after.overrides['test-proj']['status']).toBe('paused');
    // Original field should still be present
    expect(after.overrides['test-proj']['priority']).toBe('high');
  });

  it('removes the last field and deletes the project key from overrides', async () => {
    // Fixture: test-proj has only { priority: "high" }
    const ctx = makeContext({ projectId: 'test-proj', field: 'priority', value: null });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(200);
    const after = readManualFile();
    expect('test-proj' in after.overrides).toBe(false);
  });

  it('returns 400 when field is missing — manual.json unchanged', async () => {
    const before = readFileSync(MANUAL_PATH, 'utf-8');

    const ctx = makeContext({ projectId: 'test-proj', value: 'active' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(400);
    expect(readFileSync(MANUAL_PATH, 'utf-8')).toBe(before);
  });
});
