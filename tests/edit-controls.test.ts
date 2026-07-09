/**
 * Tests for Item 2.3 — Inline edit controls: due date, status override, priority
 *
 * Gate mode: tests+behavioral (unit/mocked part)
 *
 * Section A — Unit tests (mocked manual I/O): verify the API routes handle the
 *   exact JSON payload format that EditControls.astro sends via fetch.
 *
 * Section B — Source inspection: verify EditControls.astro contains the correct
 *   payload shapes, sentinel-to-null mapping, and is wired into ProjectCard.astro.
 *
 * Behavioral I/O tests live in edit-controls-behavioral.test.ts (no mocks).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ManualData } from '../src/types/manual.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// SECTION A — Unit tests (mocked I/O)
// ============================================================================

vi.mock('../src/lib/manual.js', () => ({
  readManual: vi.fn(),
  writeManual: vi.fn(),
}));

const { POST: dueDatePOST } = await import('../src/pages/api/due-date.js');
const { POST: overridePOST } = await import('../src/pages/api/override.js');
const { readManual, writeManual } = await import('../src/lib/manual.js');

const mockReadManual = vi.mocked(readManual);
const mockWriteManual = vi.mocked(writeManual);

function makeContext(body: unknown): Parameters<typeof dueDatePOST>[0] {
  return {
    request: new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  } as Parameters<typeof dueDatePOST>[0];
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
// Due date — payload: { projectId: string, date: string | null }
// ---------------------------------------------------------------------------

describe('Item 2.3: POST /api/due-date — setting a due date persists', () => {
  it('sets due_date with the payload EditControls sends (projectId + date string)', async () => {
    const manual = makeManual();
    mockReadManual.mockReturnValue(manual);

    // Exact payload shape used by EditControls.astro postJson:
    // postJson('/api/due-date', { projectId, date: dateVal || null })
    const ctx = makeContext({ projectId: 'os', date: '2026-08-01' });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.due_dates['os']).toBe('2026-08-01');
  });

  it('clears due_date when date is null (Clear button payload)', async () => {
    const manual = makeManual({ due_dates: { os: '2026-08-01' } });
    mockReadManual.mockReturnValue(manual);

    // Clear button: postJson('/api/due-date', { projectId, date: null })
    const ctx = makeContext({ projectId: 'os', date: null });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(200);
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect('os' in written.due_dates).toBe(false);
  });

  it('due_date key is deleted (not set to null) when cleared — clean removal', async () => {
    const manual = makeManual({ due_dates: { portfolio: '2026-07-15' } });
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ projectId: 'portfolio', date: null });
    await dueDatePOST(ctx);

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    // Key should be deleted entirely, not set to null
    expect(Object.prototype.hasOwnProperty.call(written.due_dates, 'portfolio')).toBe(false);
  });

  it('empty-string date from empty input maps to null in clear payload (route accepts null)', async () => {
    // EditControls: const dateVal = dateInput?.value?.trim() ?? ''; date: dateVal || null
    // An empty input resolves to null — route must accept null
    const manual = makeManual({ due_dates: { patio: '2026-09-30' } });
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ projectId: 'patio', date: null });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(200);
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect('patio' in written.due_dates).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Status override — payload: { projectId, field: 'status', value: string | null }
// ---------------------------------------------------------------------------

describe('Item 2.3: POST /api/override — status change persists', () => {
  it('sets status override with exact EditControls payload shape', async () => {
    const manual = makeManual();
    mockReadManual.mockReturnValue(manual);

    // Status change: postJson('/api/override', { projectId, field: 'status', value })
    const ctx = makeContext({ projectId: 'patio', field: 'status', value: 'on-hold' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.overrides['patio']['status']).toBe('on-hold');
  });

  it('removes status override when __reset__ sentinel maps to null', async () => {
    const manual = makeManual({ overrides: { patio: { status: 'on-hold' } } });
    mockReadManual.mockReturnValue(manual);

    // Reset: rawVal === '__reset__' → value = null
    const ctx = makeContext({ projectId: 'patio', field: 'status', value: null });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(200);
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect('patio' in written.overrides).toBe(false);
  });

  it('updates status without disturbing other overrides for same project', async () => {
    const manual = makeManual({ overrides: { patio: { priority: 'high', status: 'active' } } });
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ projectId: 'patio', field: 'status', value: 'complete' });
    await overridePOST(ctx);

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.overrides['patio']['status']).toBe('complete');
    expect(written.overrides['patio']['priority']).toBe('high');
  });

  it('accepts all valid status values from the EditControls select options', async () => {
    const statuses = ['active', 'in-progress', 'on-hold', 'complete'];
    for (const status of statuses) {
      vi.clearAllMocks();
      mockWriteManual.mockReturnValue(undefined);
      mockReadManual.mockReturnValue(makeManual());

      const ctx = makeContext({ projectId: 'os', field: 'status', value: status });
      const res = await overridePOST(ctx);
      expect(res.status).toBe(200);
      const written: ManualData = mockWriteManual.mock.calls[0][0];
      expect(written.overrides['os']['status']).toBe(status);
    }
  });
});

// ---------------------------------------------------------------------------
// Priority override — payload: { projectId, field: 'priority', value: string | null }
// ---------------------------------------------------------------------------

describe('Item 2.3: POST /api/override — priority change persists', () => {
  it('sets priority override with exact EditControls payload shape', async () => {
    const manual = makeManual();
    mockReadManual.mockReturnValue(manual);

    // Priority change: postJson('/api/override', { projectId, field: 'priority', value })
    const ctx = makeContext({ projectId: 'os', field: 'priority', value: 'high' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(200);
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect(written.overrides['os']['priority']).toBe('high');
  });

  it('removes priority override when reset sentinel maps to null', async () => {
    const manual = makeManual({ overrides: { os: { priority: 'high' } } });
    mockReadManual.mockReturnValue(manual);

    // Reset: rawVal === '__reset__' → value = null
    const ctx = makeContext({ projectId: 'os', field: 'priority', value: null });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(200);
    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect('os' in written.overrides).toBe(false);
  });

  it('accepts all valid priority values from the EditControls select options', async () => {
    const priorities = ['high', 'medium', 'low'];
    for (const priority of priorities) {
      vi.clearAllMocks();
      mockWriteManual.mockReturnValue(undefined);
      mockReadManual.mockReturnValue(makeManual());

      const ctx = makeContext({ projectId: 'os', field: 'priority', value: priority });
      const res = await overridePOST(ctx);
      expect(res.status).toBe(200);
      const written: ManualData = mockWriteManual.mock.calls[0][0];
      expect(written.overrides['os']['priority']).toBe(priority);
    }
  });

  it('removes priority but retains status override when both exist', async () => {
    const manual = makeManual({ overrides: { os: { priority: 'medium', status: 'active' } } });
    mockReadManual.mockReturnValue(manual);

    const ctx = makeContext({ projectId: 'os', field: 'priority', value: null });
    await overridePOST(ctx);

    const written: ManualData = mockWriteManual.mock.calls[0][0];
    expect('priority' in written.overrides['os']).toBe(false);
    expect(written.overrides['os']['status']).toBe('active');
  });
});

// ============================================================================
// SECTION B — Source inspection: EditControls.astro payload shapes + wiring
// ============================================================================

describe('Item 2.3: Source — EditControls.astro payload shapes and ProjectCard wiring', () => {
  const editControlsSrc = readFileSync(
    join(process.cwd(), 'src/components/EditControls.astro'),
    'utf-8'
  );
  const projectCardSrc = readFileSync(
    join(process.cwd(), 'src/components/ProjectCard.astro'),
    'utf-8'
  );

  // Due date payload
  it('EditControls sends { projectId, date } to /api/due-date for set', () => {
    expect(editControlsSrc).toContain("'/api/due-date'");
    expect(editControlsSrc).toContain('projectId');
    expect(editControlsSrc).toContain('date:');
  });

  it('EditControls sends date: null to /api/due-date for clear', () => {
    expect(editControlsSrc).toContain('date: null');
  });

  // Status + priority override payloads
  it("EditControls sends { projectId, field: 'status', value } to /api/override", () => {
    expect(editControlsSrc).toContain("'/api/override'");
    expect(editControlsSrc).toContain("field: 'status'");
    expect(editControlsSrc).toContain("field: 'priority'");
  });

  // __reset__ sentinel maps to null for status/priority
  it('EditControls maps __reset__ sentinel to null (not literal "__reset__" as API value)', () => {
    // rawVal === '__reset__' ? null : rawVal
    expect(editControlsSrc).toMatch(/__reset__.*null|null.*__reset__/s);
  });

  // due date input pre-filled with current due_date
  it('EditControls pre-fills date input with project.due_date', () => {
    expect(editControlsSrc).toContain('project.due_date');
  });

  // Status/priority selects pre-selected to current merged values
  it('EditControls pre-selects status select to currentStatus', () => {
    expect(editControlsSrc).toContain('currentStatus');
  });

  it('EditControls pre-selects priority select to currentPriority', () => {
    expect(editControlsSrc).toContain('currentPriority');
  });

  // EditControls is wired into ProjectCard
  it('ProjectCard.astro imports and renders EditControls', () => {
    expect(projectCardSrc).toContain("import EditControls from './EditControls.astro'");
    expect(projectCardSrc).toContain('<EditControls');
  });

  // Uses fetch/JS (postJson) not native <form method="POST">
  it('EditControls uses fetch (postJson) — not native form POST — for API calls', () => {
    expect(editControlsSrc).toContain('postJson');
    expect(editControlsSrc).toContain("method: 'POST'");
    expect(editControlsSrc).toContain("'Content-Type': 'application/json'");
  });

  // window.location.reload() after success (simulates persist + display on reload)
  it('EditControls calls window.location.reload() after successful API call', () => {
    expect(editControlsSrc).toContain('window.location.reload()');
  });

  // data-project-id attribute scopes controls per project
  it('EditControls uses data-project-id to scope controls per project card', () => {
    expect(editControlsSrc).toContain('data-project-id');
    expect(editControlsSrc).toContain('project.id');
  });

  // Error display elements for all three controls
  it('EditControls has error display elements for all three controls (due-date, status, priority)', () => {
    expect(editControlsSrc).toContain('data-error="due-date"');
    expect(editControlsSrc).toContain('data-error="status"');
    expect(editControlsSrc).toContain('data-error="priority"');
  });

  // Both Set and Clear buttons present for due date
  it('EditControls has both Set and Clear buttons for due date', () => {
    expect(editControlsSrc).toContain('data-action="set-due-date"');
    expect(editControlsSrc).toContain('data-action="clear-due-date"');
  });

  // __reset__ option present in both selects
  it('EditControls has __reset__ option for status and priority selects', () => {
    const resetCount = (editControlsSrc.match(/__reset__/g) ?? []).length;
    // Should appear multiple times: in STATUS_OPTIONS, PRIORITY_OPTIONS, and comparisons
    expect(resetCount).toBeGreaterThan(2);
  });

  // Fix: AbortController with 10s timeout in postJson (review Important finding)
  it('EditControls.astro postJson uses AbortController with 10 s timeout', () => {
    expect(editControlsSrc).toContain('AbortController');
    // 10 000 ms timeout
    expect(editControlsSrc).toContain('10000');
    expect(editControlsSrc).toContain('controller.abort');
    expect(editControlsSrc).toContain('signal: controller.signal');
  });

  it('EditControls.astro postJson catches AbortError and surfaces "Request timed out"', () => {
    expect(editControlsSrc).toContain('AbortError');
    expect(editControlsSrc).toContain('Request timed out');
  });

  it('EditControls.astro postJson clears timeout in finally block', () => {
    expect(editControlsSrc).toContain('clearTimeout');
    expect(editControlsSrc).toContain('finally');
  });
});

// ============================================================================
// SECTION C — Fix verification: review findings (Critical + Important)
// ============================================================================

describe('Fix 2.3-Critical: POST /api/override rejects unknown field with 400', () => {
  it('returns 400 when field is not in ALLOWED_OVERRIDE_FIELDS (e.g. "id")', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'os', field: 'id', value: 'injected' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe('string');
    // writeManual must NOT have been called
    expect(mockWriteManual).not.toHaveBeenCalled();
  });

  it('returns 400 when field is "last_active" (not in allowlist)', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'os', field: 'last_active', value: '2099-01-01' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(400);
    expect(mockWriteManual).not.toHaveBeenCalled();
  });

  it('returns 400 when field is "tags" (not in allowlist)', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'os', field: 'tags', value: 'injected' });
    const res = await overridePOST(ctx);

    expect(res.status).toBe(400);
    expect(mockWriteManual).not.toHaveBeenCalled();
  });

  it('returns 200 for each field in ALLOWED_OVERRIDE_FIELDS', async () => {
    const allowedFields = ['name', 'summary', 'status', 'priority', 'next_step', 'repo', 'github'];
    for (const field of allowedFields) {
      vi.clearAllMocks();
      mockWriteManual.mockReturnValue(undefined);
      mockReadManual.mockReturnValue(makeManual());

      const ctx = makeContext({ projectId: 'os', field, value: 'test-value' });
      const res = await overridePOST(ctx);
      expect(res.status, `field "${field}" should be allowed`).toBe(200);
    }
  });
});

describe('Fix 2.3-Important: POST /api/due-date rejects non-YYYY-MM-DD date with 400', () => {
  it('returns 400 for date "20261231" (missing hyphens)', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'os', date: '20261231' });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(mockWriteManual).not.toHaveBeenCalled();
  });

  it('returns 400 for date "2026/12/31" (wrong separator)', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'os', date: '2026/12/31' });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(400);
    expect(mockWriteManual).not.toHaveBeenCalled();
  });

  it('returns 400 for date "December 31, 2026" (human-readable format)', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'os', date: 'December 31, 2026' });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(400);
    expect(mockWriteManual).not.toHaveBeenCalled();
  });

  it('returns 200 for a valid YYYY-MM-DD date', async () => {
    mockReadManual.mockReturnValue(makeManual());

    const ctx = makeContext({ projectId: 'os', date: '2026-12-31' });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(200);
    expect(mockWriteManual).toHaveBeenCalled();
  });

  it('returns 200 when date is null (clear operation)', async () => {
    mockReadManual.mockReturnValue(makeManual({ due_dates: { os: '2026-12-31' } }));

    const ctx = makeContext({ projectId: 'os', date: null });
    const res = await dueDatePOST(ctx);

    expect(res.status).toBe(200);
    expect(mockWriteManual).toHaveBeenCalled();
  });
});
