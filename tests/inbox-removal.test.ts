/**
 * Tests for item 6.1 — Remove inbox
 *
 * Done-when criteria:
 *  1. Page renders with no inbox UI (index.astro has no Inbox import/usage)
 *  2. GET /api/inbox returns 404 (route file deleted)
 *  3. POST /api/inbox returns 404 (route file deleted)
 *  4. No TypeScript errors (checked via tsc --noEmit)
 *  5. Existing manual.json with inbox data parses without errors
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ----- Criterion 2 & 3: /api/inbox route file does not exist -----
describe('/api/inbox route file', () => {
  it('src/pages/api/inbox.ts does not exist (GET/POST routes deleted)', () => {
    const routePath = path.join(process.cwd(), 'src/pages/api/inbox.ts');
    expect(fs.existsSync(routePath)).toBe(false);
  });
});

// ----- Criterion 1: index.astro has no Inbox import or <Inbox /> usage -----
describe('index.astro — no inbox UI references', () => {
  it('does not import Inbox component', () => {
    const indexPath = path.join(process.cwd(), 'src/pages/index.astro');
    const src = fs.readFileSync(indexPath, 'utf-8');
    expect(src).not.toMatch(/import\s+Inbox/);
  });

  it('does not render <Inbox', () => {
    const indexPath = path.join(process.cwd(), 'src/pages/index.astro');
    const src = fs.readFileSync(indexPath, 'utf-8');
    expect(src).not.toMatch(/<Inbox/);
  });
});

// ----- Criterion 1 (component): Inbox.astro component does not exist -----
describe('Inbox.astro component', () => {
  it('src/components/Inbox.astro does not exist', () => {
    const componentPath = path.join(process.cwd(), 'src/components/Inbox.astro');
    expect(fs.existsSync(componentPath)).toBe(false);
  });
});

// ----- Criterion 5: manual.json with inbox data parses without error -----
// Uses its own spied CWD isolated with beforeEach/afterEach
describe('manual.ts readManual() — inbox backward-compat', () => {
  let tmpDir: string;
  let dataDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-removal-test-'));
    dataDir = path.join(tmpDir, 'data');
    fs.mkdirSync(dataDir);
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses manual.json that contains inbox entries without throwing', async () => {
    const manualWithInbox = {
      overrides: {},
      due_dates: {},
      inbox: [
        { id: 'b1', text: 'behavioral test', created: '2026-07-08', project: 'test-proj', done: false },
        { id: 'b2', text: 'another item', created: '2026-07-09', project: null, done: true },
      ],
      hidden_fields: {},
    };
    fs.writeFileSync(path.join(dataDir, 'manual.json'), JSON.stringify(manualWithInbox));

    const { readManual } = await import('../src/lib/manual.js');
    let result: ReturnType<typeof readManual> | undefined;
    expect(() => { result = readManual(); }).not.toThrow();
    expect(result?.inbox).toHaveLength(2);
    expect(result?.inbox[0].id).toBe('b1');
  });

  it('returns inbox: [] as default when no inbox key present in manual.json', async () => {
    const manualWithoutInbox = { overrides: {}, due_dates: {}, hidden_fields: {} };
    fs.writeFileSync(path.join(dataDir, 'manual.json'), JSON.stringify(manualWithoutInbox));

    const { readManual } = await import('../src/lib/manual.js');
    const result = readManual();
    expect(result.inbox).toEqual([]);
  });
});
