import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// We test manual.ts in a temp working directory so tests are isolated from
// the real data/manual.json file and from each other.

let tmpDir: string;
let dataDir: string;
let originalCwd: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-test-'));
  dataDir = path.join(tmpDir, 'data');
  fs.mkdirSync(dataDir);
  originalCwd = process.cwd();
  // Point process.cwd() at our temp dir so MANUAL_PATH() resolves there.
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Import under test — must be after vi.mock setup but the functions call
// process.cwd() at call time (via the lambdas), so spying beforeEach is enough.
const { readManual, writeManual } = await import('../src/lib/manual.js');

describe('readManual()', () => {
  it('returns empty shape when data/manual.json is absent', () => {
    const result = readManual();
    expect(result).toEqual({ overrides: {}, due_dates: {}, inbox: [], hidden_fields: {} });
  });

  it('returns parsed data when data/manual.json exists', () => {
    const data = {
      overrides: { 'my-project': { status: 'active' } },
      due_dates: { 'my-project': '2026-08-01' },
      inbox: [{ id: 'abc', text: 'todo', created: '2026-07-01', project: null, done: false }],
    };
    fs.writeFileSync(path.join(dataDir, 'manual.json'), JSON.stringify(data), 'utf-8');

    const result = readManual();
    expect(result).toEqual(data);
  });

  it('throws a descriptive error on malformed JSON', () => {
    fs.writeFileSync(path.join(dataDir, 'manual.json'), 'not-valid-json{{{', 'utf-8');
    expect(() => readManual()).toThrow(/\[manual\] failed to parse/);
  });
});

describe('writeManual()', () => {
  it('round-trips: writeManual then readManual returns the same data', () => {
    const data = {
      overrides: { 'pitcher-injury-risk': { priority: 'high' } },
      due_dates: { 'pitcher-injury-risk': '2026-09-15' },
      inbox: [
        { id: 'x1', text: 'Review model', created: '2026-07-08', project: 'pitcher-injury-risk', done: false },
      ],
    };

    writeManual(data);
    const result = readManual();
    expect(result).toEqual(data);
  });

  it('produces data/manual.json at the expected path', () => {
    writeManual({ overrides: {}, due_dates: {}, inbox: [], hidden_fields: {} });
    const exists = fs.existsSync(path.join(dataDir, 'manual.json'));
    expect(exists).toBe(true);
  });

  it('uses atomic rename: .tmp file is gone after write completes', () => {
    writeManual({ overrides: {}, due_dates: {}, inbox: [], hidden_fields: {} });
    const tmpExists = fs.existsSync(path.join(dataDir, 'manual.json.tmp'));
    expect(tmpExists).toBe(false);
  });

  it('atomic rename: writes to .tmp then renames — final file has correct content', () => {
    // Pre-existing final file has stale content — a non-atomic write that crashes
    // after opening the file could leave it empty. An atomic rename guarantees
    // the file is either the old content or the new content, never partial.
    const staleData = { overrides: {}, due_dates: { stale: '2025-01-01' }, inbox: [], hidden_fields: {} };
    fs.writeFileSync(path.join(dataDir, 'manual.json'), JSON.stringify(staleData), 'utf-8');

    const newData = {
      overrides: { 'os': { status: 'active' } },
      due_dates: {},
      inbox: [{ id: 'z1', text: 'Check logs', created: '2026-07-08', project: 'os', done: false }],
    };

    writeManual(newData);

    // Verify: final file reflects new data (not stale)
    const onDisk = JSON.parse(fs.readFileSync(path.join(dataDir, 'manual.json'), 'utf-8'));
    expect(onDisk).toEqual(newData);

    // Verify: no .tmp file left behind (rename completed)
    expect(fs.existsSync(path.join(dataDir, 'manual.json.tmp'))).toBe(false);
  });
});
