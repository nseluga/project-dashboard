import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Project } from '../src/types/project.js';
import type { ManualData } from '../src/types/manual.js';

// Stub out the two I/O modules before importing merge.ts
vi.mock('../src/lib/projects.js', () => ({
  getProjects: vi.fn(),
}));

vi.mock('../src/lib/manual.js', () => ({
  readManual: vi.fn(),
}));

const { getMergedProjects } = await import('../src/lib/merge.js');
const { getProjects } = await import('../src/lib/projects.js');
const { readManual } = await import('../src/lib/manual.js');

const mockGetProjects = vi.mocked(getProjects);
const mockReadManual = vi.mocked(readManual);

// Minimal valid Project fixture
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getMergedProjects()', () => {
  describe('overrides', () => {
    it('override fields take precedence over frontmatter values', async () => {
      mockGetProjects.mockResolvedValue([makeProject({ id: 'alpha', status: 'paused', priority: 'low' })]);
      mockReadManual.mockReturnValue(makeManual({
        overrides: { alpha: { status: 'active', priority: 'high' } },
      }));

      const results = await getMergedProjects();

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('active');
      expect(results[0].priority).toBe('high');
    });

    it('non-overridden fields retain their frontmatter values', async () => {
      mockGetProjects.mockResolvedValue([makeProject({ id: 'beta', name: 'Beta Project', summary: 'original summary' })]);
      mockReadManual.mockReturnValue(makeManual({
        overrides: { beta: { status: 'done' } },
      }));

      const results = await getMergedProjects();

      expect(results[0].name).toBe('Beta Project');
      expect(results[0].summary).toBe('original summary');
      expect(results[0].status).toBe('done');
    });

    it('projects with no override entry are unaffected', async () => {
      mockGetProjects.mockResolvedValue([makeProject({ id: 'gamma', status: 'paused' })]);
      mockReadManual.mockReturnValue(makeManual({ overrides: {} }));

      const results = await getMergedProjects();

      expect(results[0].status).toBe('paused');
    });
  });

  describe('due_date', () => {
    it('attaches due_date from manual.due_dates when present', async () => {
      mockGetProjects.mockResolvedValue([makeProject({ id: 'delta' })]);
      mockReadManual.mockReturnValue(makeManual({ due_dates: { delta: '2026-09-01' } }));

      const results = await getMergedProjects();

      expect(results[0].due_date).toBe('2026-09-01');
    });

    it('sets due_date to null when not in manual', async () => {
      mockGetProjects.mockResolvedValue([makeProject({ id: 'epsilon' })]);
      mockReadManual.mockReturnValue(makeManual({ due_dates: {} }));

      const results = await getMergedProjects();

      expect(results[0].due_date).toBeNull();
    });
  });

  describe('overdue', () => {
    it('overdue is true when due_date is yesterday', async () => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

      mockGetProjects.mockResolvedValue([makeProject({ id: 'past' })]);
      mockReadManual.mockReturnValue(makeManual({ due_dates: { past: yesterday } }));

      const results = await getMergedProjects();

      expect(results[0].due_date).toBe(yesterday);
      expect(results[0].overdue).toBe(true);
    });

    it('overdue is false when due_date is tomorrow', async () => {
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

      mockGetProjects.mockResolvedValue([makeProject({ id: 'future' })]);
      mockReadManual.mockReturnValue(makeManual({ due_dates: { future: tomorrow } }));

      const results = await getMergedProjects();

      expect(results[0].due_date).toBe(tomorrow);
      expect(results[0].overdue).toBe(false);
    });

    it('overdue is false when due_date is null', async () => {
      mockGetProjects.mockResolvedValue([makeProject({ id: 'noduedate' })]);
      mockReadManual.mockReturnValue(makeManual({ due_dates: {} }));

      const results = await getMergedProjects();

      expect(results[0].due_date).toBeNull();
      expect(results[0].overdue).toBe(false);
    });
  });

  describe('multiple projects', () => {
    it('processes each project independently', async () => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

      mockGetProjects.mockResolvedValue([
        makeProject({ id: 'proj-a', status: 'paused' }),
        makeProject({ id: 'proj-b', status: 'paused' }),
      ]);
      mockReadManual.mockReturnValue(makeManual({
        overrides: { 'proj-a': { status: 'active' } },
        due_dates: { 'proj-a': yesterday, 'proj-b': tomorrow },
      }));

      const results = await getMergedProjects();

      expect(results).toHaveLength(2);

      const a = results.find((p) => p.id === 'proj-a')!;
      expect(a.status).toBe('active');
      expect(a.due_date).toBe(yesterday);
      expect(a.overdue).toBe(true);

      const b = results.find((p) => p.id === 'proj-b')!;
      expect(b.status).toBe('paused'); // no override for proj-b
      expect(b.due_date).toBe(tomorrow);
      expect(b.overdue).toBe(false);
    });
  });

  describe('hidden_fields', () => {
    it('defaults both hidden_fields to false when no entry in manual', async () => {
      mockGetProjects.mockResolvedValue([makeProject({ id: 'alpha' })]);
      mockReadManual.mockReturnValue(makeManual());

      const results = await getMergedProjects();

      expect(results[0].hidden_fields).toEqual({ due_date: false, priority: false });
    });

    it('reflects true when due_date is hidden', async () => {
      mockGetProjects.mockResolvedValue([makeProject({ id: 'alpha' })]);
      mockReadManual.mockReturnValue(makeManual({
        hidden_fields: { alpha: { due_date: true } },
      }));

      const results = await getMergedProjects();

      expect(results[0].hidden_fields.due_date).toBe(true);
      expect(results[0].hidden_fields.priority).toBe(false);
    });

    it('reflects true when priority is hidden', async () => {
      mockGetProjects.mockResolvedValue([makeProject({ id: 'beta' })]);
      mockReadManual.mockReturnValue(makeManual({
        hidden_fields: { beta: { priority: true } },
      }));

      const results = await getMergedProjects();

      expect(results[0].hidden_fields.due_date).toBe(false);
      expect(results[0].hidden_fields.priority).toBe(true);
    });

    it('hidden_fields for one project does not affect another', async () => {
      mockGetProjects.mockResolvedValue([
        makeProject({ id: 'proj-x' }),
        makeProject({ id: 'proj-y' }),
      ]);
      mockReadManual.mockReturnValue(makeManual({
        hidden_fields: { 'proj-x': { due_date: true, priority: true } },
      }));

      const results = await getMergedProjects();

      const x = results.find((p) => p.id === 'proj-x')!;
      expect(x.hidden_fields).toEqual({ due_date: true, priority: true });

      const y = results.find((p) => p.id === 'proj-y')!;
      expect(y.hidden_fields).toEqual({ due_date: false, priority: false });
    });
  });
});
