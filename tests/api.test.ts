import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ManualData } from '../src/types/manual.js';

// Mock manual I/O before importing routes
vi.mock('../src/lib/manual.js', () => ({
  readManual: vi.fn(),
  writeManual: vi.fn(),
}));

const { POST: inboxPOST, DELETE: inboxDELETE } = await import('../src/pages/api/inbox.js');
const { POST: dueDatePOST } = await import('../src/pages/api/due-date.js');
const { POST: overridePOST } = await import('../src/pages/api/override.js');
const { POST: fieldVisibilityPOST } = await import('../src/pages/api/field-visibility.js');
const { readManual, writeManual } = await import('../src/lib/manual.js');

const mockReadManual = vi.mocked(readManual);
const mockWriteManual = vi.mocked(writeManual);

/** Build a minimal Astro APIContext with just the request field set. */
function makeContext(body: unknown): Parameters<typeof inboxPOST>[0] {
  return {
    request: new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  } as Parameters<typeof inboxPOST>[0];
}

function makeManual(overrides: Partial<ManualData> = {}): ManualData {
  return {
    overrides: {},
    due_dates: {},
    inbox: [],
    hidden_fields: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockWriteManual.mockReturnValue(undefined);
});

// ---------------------------------------------------------------------------
// POST /api/inbox
// ---------------------------------------------------------------------------

describe('POST /api/inbox', () => {
  it('returns 200 { ok: true } on valid input and appends item', async () => {
    const manual = makeManual();
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ text: 'review PR', project: 'my-project' });
    const res = await inboxPOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    expect(mockWriteManual).toHaveBeenCalledOnce();
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.inbox).toHaveLength(1);
    expect(written.inbox[0].text).toBe('review PR');
    expect(written.inbox[0].project).toBe('my-project');
    expect(written.inbox[0].done).toBe(false);
    expect(typeof written.inbox[0].id).toBe('string');
    expect(typeof written.inbox[0].created).toBe('string');
  });

  it('sets project to null when not provided', async () => {
    const manual = makeManual();
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ text: 'standalone task' });
    await inboxPOST(ctx);

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.inbox[0].project).toBeNull();
  });

  it('sets project to null when explicitly null', async () => {
    const manual = makeManual();
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ text: 'standalone task', project: null });
    await inboxPOST(ctx);

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.inbox[0].project).toBeNull();
  });

  it('returns 400 when text is missing', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ project: 'my-project' });
    const res = await inboxPOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe('string');
  });

  it('returns 400 when text is empty string', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ text: '' });
    const res = await inboxPOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('returns Content-Type: application/json', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ text: 'hello' });
    const res = await inboxPOST(ctx);

    expect(res.headers.get('content-type')).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/inbox
// ---------------------------------------------------------------------------

describe('DELETE /api/inbox', () => {
  it('returns 200 { ok: true } and removes the item when id is found', async () => {
    const manual = makeManual({
      inbox: [
        { id: 'item-1', text: 'first', created: '2026-07-08T00:00:00.000Z', project: null, done: false },
        { id: 'item-2', text: 'second', created: '2026-07-08T00:00:00.000Z', project: null, done: false },
      ],
    });
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ id: 'item-1' });
    const res = await inboxDELETE(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.inbox).toHaveLength(1);
    expect(written.inbox[0].id).toBe('item-2');
  });

  it('returns 404 when id is not found', async () => {
    mockReadManual.mockReturnValue(makeManual({ inbox: [] }));

    const ctx = makeContext({ id: 'does-not-exist' });
    const res = await inboxDELETE(ctx);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe('string');
    expect(mockWriteManual).not.toHaveBeenCalled();
  });

  it('returns 400 when id is missing', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({});
    const res = await inboxDELETE(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('returns Content-Type: application/json', async () => {
    mockReadManual.mockReturnValue(makeManual({
      inbox: [{ id: 'x', text: 'hi', created: '2026-07-08T00:00:00.000Z', project: null, done: false }],
    }));
    const ctx = makeContext({ id: 'x' });
    const res = await inboxDELETE(ctx);

    expect(res.headers.get('content-type')).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// POST /api/due-date
// ---------------------------------------------------------------------------

describe('POST /api/due-date', () => {
  it('sets due_date for a project when date is a string', async () => {
    const manual = makeManual();
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ projectId: 'alpha', date: '2026-09-01' });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.due_dates['alpha']).toBe('2026-09-01');
  });

  it('removes due_date when date is null', async () => {
    const manual = makeManual({ due_dates: { alpha: '2026-09-01' } });
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ projectId: 'alpha', date: null });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(200);
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect('alpha' in written.due_dates).toBe(false);
  });

  it('returns 400 when projectId is missing', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ date: '2026-09-01' });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('returns 400 when date is an invalid type (number)', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ projectId: 'alpha', date: 12345 });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('returns Content-Type: application/json', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ projectId: 'alpha', date: '2026-09-01' });
    const res = await dueDatePOST(ctx);

    expect(res.headers.get('content-type')).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// Mutex import verification (fix-report: mutex imported by all three route handlers)
// ---------------------------------------------------------------------------

describe('mutex.ts exports manualMutex', () => {
  it('manualMutex is a Mutex instance with runExclusive', async () => {
    const { manualMutex } = await import('../src/lib/mutex.js');
    expect(typeof manualMutex.runExclusive).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// I/O error → 500 { ok: false, error } (fix-report: I/O errors handled at boundary)
// ---------------------------------------------------------------------------

describe('I/O errors return 500 { ok: false, error }', () => {
  it('POST /api/inbox returns 500 when readManual throws', async () => {
    mockReadManual.mockImplementation(() => { throw new Error('disk read failure'); });
    const ctx = makeContext({ text: 'hello' });
    const res = await inboxPOST(ctx);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe('string');
    expect(json.error).toContain('disk read failure');
  });

  it('DELETE /api/inbox returns 500 when readManual throws', async () => {
    mockReadManual.mockImplementation(() => { throw new Error('disk read failure'); });
    const ctx = makeContext({ id: 'some-id' });
    const res = await inboxDELETE(ctx);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe('string');
  });

  it('POST /api/due-date returns 500 when readManual throws', async () => {
    mockReadManual.mockImplementation(() => { throw new Error('disk read failure'); });
    const ctx = makeContext({ projectId: 'alpha', date: '2026-09-01' });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe('string');
  });

  it('POST /api/override returns 500 when readManual throws', async () => {
    mockReadManual.mockImplementation(() => { throw new Error('disk read failure'); });
    const ctx = makeContext({ projectId: 'beta', field: 'status', value: 'active' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe('string');
  });

  it('POST /api/inbox returns 500 when writeManual throws', async () => {
    mockReadManual.mockReturnValue(makeManual());
    mockWriteManual.mockImplementation(() => { throw new Error('disk write failure'); });
    const ctx = makeContext({ text: 'hello' });
    const res = await inboxPOST(ctx);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain('disk write failure');
  });
});

// ---------------------------------------------------------------------------
// POST /api/override
// ---------------------------------------------------------------------------

describe('POST /api/override', () => {
  it('sets an override field for a project', async () => {
    const manual = makeManual();
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ projectId: 'beta', field: 'status', value: 'active' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.overrides['beta']['status']).toBe('active');
  });

  it('removes a field when value is null, and cleans up empty project entry', async () => {
    const manual = makeManual({ overrides: { beta: { status: 'active' } } });
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ projectId: 'beta', field: 'status', value: null });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(200);
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect('beta' in written.overrides).toBe(false);
  });

  it('removes a single field but retains others when multiple fields exist', async () => {
    const manual = makeManual({ overrides: { beta: { status: 'active', priority: 'high' } } });
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ projectId: 'beta', field: 'status', value: null });
    await overridePOST(ctx);

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect('status' in written.overrides['beta']).toBe(false);
    expect(written.overrides['beta']['priority']).toBe('high');
  });

  it('returns 400 when projectId is missing', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ field: 'status', value: 'active' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('returns 400 when field is missing', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ projectId: 'beta', value: 'active' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('returns 400 when value is an invalid type (number)', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ projectId: 'beta', field: 'priority', value: 99 });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('returns Content-Type: application/json', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ projectId: 'beta', field: 'status', value: 'active' });
    const res = await overridePOST(ctx);

    expect(res.headers.get('content-type')).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// POST /api/field-visibility
// ---------------------------------------------------------------------------

describe('POST /api/field-visibility', () => {
  it('hides due_date for a project (hidden: true)', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'alpha', field: 'due_date', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.hidden_fields['alpha']['due_date']).toBe(true);
  });

  it('hides priority for a project (hidden: true)', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'beta', field: 'priority', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(200);
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.hidden_fields['beta']['priority']).toBe(true);
  });

  it('shows due_date by removing hidden flag (hidden: false)', async () => {
    mockReadManual.mockReturnValue(makeManual({
      hidden_fields: { alpha: { due_date: true } },
    }));

    const ctx = makeContext({ projectId: 'alpha', field: 'due_date', hidden: false });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(200);
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    // Key should be deleted, project entry cleaned up since it was the last field
    expect('alpha' in written.hidden_fields).toBe(false);
  });

  it('shows priority by removing hidden flag, retains due_date entry', async () => {
    mockReadManual.mockReturnValue(makeManual({
      hidden_fields: { alpha: { due_date: true, priority: true } },
    }));

    const ctx = makeContext({ projectId: 'alpha', field: 'priority', hidden: false });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(200);
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect('priority' in (written.hidden_fields['alpha'] ?? {})).toBe(false);
    expect(written.hidden_fields['alpha']['due_date']).toBe(true);
  });

  it('cleans up empty project entry when last hidden field is shown', async () => {
    mockReadManual.mockReturnValue(makeManual({
      hidden_fields: { beta: { priority: true } },
    }));

    const ctx = makeContext({ projectId: 'beta', field: 'priority', hidden: false });
    await fieldVisibilityPOST(ctx);

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect('beta' in written.hidden_fields).toBe(false);
  });

  it('returns 400 for invalid field name', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'alpha', field: 'status', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(mockWriteManual).not.toHaveBeenCalled();
  });

  it('returns 400 for field "due-date" (hyphen, not underscore)', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'alpha', field: 'due-date', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(400);
    expect(mockWriteManual).not.toHaveBeenCalled();
  });

  it('returns 400 when projectId is missing', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ field: 'due_date', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('returns 400 when hidden is not a boolean', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'alpha', field: 'due_date', hidden: 'true' });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(400);
    expect(mockWriteManual).not.toHaveBeenCalled();
  });

  it('returns 500 when readManual throws', async () => {
    mockReadManual.mockImplementation(() => { throw new Error('disk read failure'); });

    const ctx = makeContext({ projectId: 'alpha', field: 'due_date', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('returns Content-Type: application/json', async () => {
    mockReadManual.mockReturnValue(makeManual());
    const ctx = makeContext({ projectId: 'alpha', field: 'due_date', hidden: true });
    const res = await fieldVisibilityPOST(ctx);

    expect(res.headers.get('content-type')).toBe('application/json');
  });

  it('does not disturb other projects hidden_fields when toggling one', async () => {
    mockReadManual.mockReturnValue(makeManual({
      hidden_fields: { gamma: { priority: true } },
    }));

    const ctx = makeContext({ projectId: 'delta', field: 'due_date', hidden: true });
    await fieldVisibilityPOST(ctx);

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.hidden_fields['gamma']['priority']).toBe(true);
    expect(written.hidden_fields['delta']['due_date']).toBe(true);
  });
});
