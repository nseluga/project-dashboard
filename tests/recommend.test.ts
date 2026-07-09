import { describe, it, expect } from 'vitest';
import { scoreProject, getRecommendation } from '../src/lib/recommend.js';
import type { MergedProject } from '../src/types/project.js';

// Minimal valid MergedProject fixture
function makeProject(overrides: Partial<MergedProject> = {}): MergedProject {
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
    days_since_active: 10,
    due_date: null,
    overdue: false,
    hidden_fields: { due_date: false, priority: false },
    ...overrides,
  };
}

// today = 2026-07-09 for all tests below
const TODAY = '2026-07-09';

// ─── scoreProject() ──────────────────────────────────────────────────────────

describe('scoreProject()', () => {
  describe('excluded statuses', () => {
    it('returns -Infinity for complete projects', () => {
      const p = makeProject({ status: 'complete' });
      expect(scoreProject(p, TODAY)).toBe(-Infinity);
    });

    it('returns -Infinity for archived projects', () => {
      const p = makeProject({ status: 'archived' });
      expect(scoreProject(p, TODAY)).toBe(-Infinity);
    });
  });

  describe('priority component', () => {
    it('scores high priority as 3', () => {
      const p = makeProject({ priority: 'high', status: 'on-hold', days_since_active: 0 });
      // status weight on-hold=0, staleness=0, urgency=0 → total=3
      expect(scoreProject(p, TODAY)).toBe(3);
    });

    it('scores medium priority as 2', () => {
      const p = makeProject({ priority: 'medium', status: 'on-hold', days_since_active: 0 });
      expect(scoreProject(p, TODAY)).toBe(2);
    });

    it('scores low priority as 1', () => {
      const p = makeProject({ priority: 'low', status: 'on-hold', days_since_active: 0 });
      expect(scoreProject(p, TODAY)).toBe(1);
    });

    it('scores absent/unknown priority as 0', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 0 });
      expect(scoreProject(p, TODAY)).toBe(0);
    });
  });

  describe('status weight component', () => {
    it('scores active status as 2', () => {
      const p = makeProject({ status: 'active', priority: '', days_since_active: 0 });
      expect(scoreProject(p, TODAY)).toBe(2);
    });

    it('scores in-progress status as 1', () => {
      const p = makeProject({ status: 'in-progress', priority: '', days_since_active: 0 });
      expect(scoreProject(p, TODAY)).toBe(1);
    });

    it('scores on-hold status as 0', () => {
      const p = makeProject({ status: 'on-hold', priority: '', days_since_active: 0 });
      expect(scoreProject(p, TODAY)).toBe(0);
    });
  });

  describe('due-date urgency component', () => {
    it('scores overdue due_date as 4', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 0, due_date: '2026-07-01', overdue: true });
      expect(scoreProject(p, TODAY)).toBe(4);
    });

    it('scores due within 3 days as 3', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 0, due_date: '2026-07-11' });
      expect(scoreProject(p, TODAY)).toBe(3);
    });

    it('scores due within 3 days (exactly 3) as 3', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 0, due_date: '2026-07-12' });
      expect(scoreProject(p, TODAY)).toBe(3);
    });

    it('scores due within 7 days as 2', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 0, due_date: '2026-07-14' });
      expect(scoreProject(p, TODAY)).toBe(2);
    });

    it('scores due within 14 days as 1', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 0, due_date: '2026-07-20' });
      expect(scoreProject(p, TODAY)).toBe(1);
    });

    it('scores due beyond 14 days as 0', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 0, due_date: '2026-08-01' });
      expect(scoreProject(p, TODAY)).toBe(0);
    });

    it('scores null due_date as 0', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 0, due_date: null });
      expect(scoreProject(p, TODAY)).toBe(0);
    });

    it('scores malformed due_date as 0', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 0, due_date: '07/09/2026' });
      expect(scoreProject(p, TODAY)).toBe(0);
    });
  });

  describe('staleness bonus', () => {
    it('adds +1 when days_since_active > 14', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 15 });
      expect(scoreProject(p, TODAY)).toBe(1);
    });

    it('does not add bonus when days_since_active = 14 (boundary, not above)', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 14 });
      expect(scoreProject(p, TODAY)).toBe(0);
    });

    it('does not add bonus when days_since_active < 14', () => {
      const p = makeProject({ priority: '', status: 'on-hold', days_since_active: 5 });
      expect(scoreProject(p, TODAY)).toBe(0);
    });

    it('does not add bonus when days_since_active is NaN', () => {
      const pNaN = makeProject({ priority: '', status: 'on-hold', days_since_active: NaN });
      const pRef = makeProject({ priority: '', status: 'on-hold', days_since_active: 5 });
      expect(scoreProject(pNaN, TODAY)).toBe(scoreProject(pRef, TODAY));
    });
  });

  describe('combined score', () => {
    it('high priority active overdue stale project scores 4+3+2+1=10', () => {
      const p = makeProject({
        priority: 'high',
        status: 'active',
        due_date: '2026-07-01',
        overdue: true,
        days_since_active: 20,
      });
      // priority=3, urgency=4(overdue), status=2(active), staleness=1 → 10
      expect(scoreProject(p, TODAY)).toBe(10);
    });
  });
});

// ─── getRecommendation() ─────────────────────────────────────────────────────

describe('getRecommendation()', () => {
  it('returns null for empty list', () => {
    expect(getRecommendation([], TODAY)).toBeNull();
  });

  it('returns null when all projects are complete', () => {
    const projects = [
      makeProject({ id: 'a', status: 'complete' }),
      makeProject({ id: 'b', status: 'complete' }),
    ];
    expect(getRecommendation(projects, TODAY)).toBeNull();
  });

  it('returns null when all projects are archived', () => {
    const projects = [makeProject({ id: 'a', status: 'archived' })];
    expect(getRecommendation(projects, TODAY)).toBeNull();
  });

  it('returns null when all projects are complete or archived', () => {
    const projects = [
      makeProject({ id: 'a', status: 'complete' }),
      makeProject({ id: 'b', status: 'archived' }),
    ];
    expect(getRecommendation(projects, TODAY)).toBeNull();
  });

  it('excludes complete/archived and returns the only eligible project', () => {
    const projects = [
      makeProject({ id: 'done', status: 'complete' }),
      makeProject({ id: 'winner', status: 'active', priority: 'low' }),
    ];
    const result = getRecommendation(projects, TODAY);
    expect(result?.id).toBe('winner');
  });

  it('returns the single eligible project regardless of score', () => {
    const projects = [makeProject({ id: 'only', priority: 'low', status: 'on-hold' })];
    expect(getRecommendation(projects, TODAY)?.id).toBe('only');
  });

  it('overdue project wins over a non-overdue same-priority project', () => {
    const projects = [
      makeProject({ id: 'normal', priority: 'high', status: 'active', due_date: null }),
      makeProject({ id: 'overdue', priority: 'high', status: 'active', due_date: '2026-07-01', overdue: true }),
    ];
    // both high+active, overdue gets +4 urgency vs 0 → overdue wins
    expect(getRecommendation(projects, TODAY)?.id).toBe('overdue');
  });

  it('higher priority wins on equal score when tie-breaking', () => {
    // Both on-hold with no due date and no staleness
    const projects = [
      makeProject({ id: 'low-p', priority: 'low', status: 'on-hold', days_since_active: 0 }),
      makeProject({ id: 'high-p', priority: 'high', status: 'on-hold', days_since_active: 0 }),
    ];
    // high-p: 3+0+0+0=3; low-p: 1+0+0+0=1 → high-p wins by score
    expect(getRecommendation(projects, TODAY)?.id).toBe('high-p');
  });

  it('tie-breaking: equal score + priority → earlier due date wins', () => {
    // Both medium priority, on-hold, 20 days stale, no urgency due dates
    const projects = [
      makeProject({ id: 'later', priority: 'medium', status: 'on-hold', days_since_active: 20, due_date: '2026-08-15' }),
      makeProject({ id: 'earlier', priority: 'medium', status: 'on-hold', days_since_active: 20, due_date: '2026-08-01' }),
    ];
    // same score (2+0+0+1=3 each, due dates both >14 days → 0 urgency)
    expect(getRecommendation(projects, TODAY)?.id).toBe('earlier');
  });

  it('tie-breaking: equal score + priority → null due date comes last', () => {
    const projects = [
      makeProject({ id: 'no-date', priority: 'medium', status: 'on-hold', days_since_active: 20, due_date: null }),
      makeProject({ id: 'has-date', priority: 'medium', status: 'on-hold', days_since_active: 20, due_date: '2026-08-01' }),
    ];
    expect(getRecommendation(projects, TODAY)?.id).toBe('has-date');
  });

  it('tie-breaking: equal score + priority + no due date → alphabetical by id', () => {
    const projects = [
      makeProject({ id: 'zebra', priority: 'medium', status: 'on-hold', days_since_active: 20, due_date: null }),
      makeProject({ id: 'apple', priority: 'medium', status: 'on-hold', days_since_active: 20, due_date: null }),
    ];
    expect(getRecommendation(projects, TODAY)?.id).toBe('apple');
  });

  it('handles a mix of statuses and picks the best eligible project', () => {
    const projects = [
      makeProject({ id: 'complete-p', status: 'complete', priority: 'high' }),
      makeProject({ id: 'archived-p', status: 'archived', priority: 'high' }),
      makeProject({ id: 'low-active', priority: 'low', status: 'active', days_since_active: 5 }),
      makeProject({ id: 'high-hold', priority: 'high', status: 'on-hold', days_since_active: 5 }),
    ];
    // eligible: low-active (1+2=3), high-hold (3+0=3) → tie on score
    // tie-break: same priority? no — high-hold is high (3), low-active is low (1) → high-hold wins
    expect(getRecommendation(projects, TODAY)?.id).toBe('high-hold');
  });

  it('uses current date when today is not provided', () => {
    // Just verify it returns something without throwing when today is omitted
    const projects = [makeProject({ id: 'p', status: 'active' })];
    const result = getRecommendation(projects);
    expect(result?.id).toBe('p');
  });
});
