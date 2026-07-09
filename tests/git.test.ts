import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process before importing git.ts
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
  execFile: vi.fn(),
}));

const { execFileSync } = await import('child_process');
const { getCommitDates } = await import('../src/lib/git.js');

const mockExecFileSync = vi.mocked(execFileSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCommitDates()', () => {
  describe('happy path', () => {
    it('returns an array of ISO date strings from git log output', () => {
      mockExecFileSync.mockReturnValue(
        '2026-07-08T14:30:00+00:00\n2026-07-07T10:00:00+00:00\n2026-07-05T09:00:00+00:00\n',
      );

      const result = getCommitDates('~/myproject', 30);

      expect(result).toEqual([
        '2026-07-08T14:30:00+00:00',
        '2026-07-07T10:00:00+00:00',
        '2026-07-05T09:00:00+00:00',
      ]);
    });

    it('passes the correct git arguments including --since', () => {
      mockExecFileSync.mockReturnValue('2026-07-08T14:30:00+00:00\n');

      getCommitDates('/some/repo', 7);

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        ['-C', '/some/repo', 'log', '--format=%cI', '--since=7 days ago'],
        expect.objectContaining({ encoding: 'utf-8' }),
      );
    });

    it('returns [] when git log output is empty (no commits in window)', () => {
      mockExecFileSync.mockReturnValue('');

      const result = getCommitDates('/some/repo', 7);

      expect(result).toEqual([]);
    });

    it('returns [] when git log output is only whitespace', () => {
      mockExecFileSync.mockReturnValue('   \n  \n');

      const result = getCommitDates('/some/repo', 7);

      expect(result).toEqual([]);
    });

    it('filters blank lines from output', () => {
      mockExecFileSync.mockReturnValue('2026-07-08T14:30:00+00:00\n\n2026-07-07T10:00:00+00:00\n');

      const result = getCommitDates('/some/repo', 30);

      expect(result).toHaveLength(2);
    });
  });

  describe('error paths', () => {
    it('returns [] and warns when execFileSync throws (git error / not a repo)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockExecFileSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const result = getCommitDates('/not/a/repo', 30);

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        '[git] getCommitDates failed:',
        '/not/a/repo',
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });

    it('returns [] when repoPath is empty string', () => {
      const result = getCommitDates('', 30);

      expect(result).toEqual([]);
      expect(mockExecFileSync).not.toHaveBeenCalled();
    });

    it('returns [] and warns when execFileSync throws ENOENT (no git binary)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      mockExecFileSync.mockImplementation(() => { throw err; });

      const result = getCommitDates('/some/repo', 30);

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith('[git] getCommitDates failed:', '/some/repo', err);
      warnSpy.mockRestore();
    });

    it('returns [] and warns when git command times out', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const err = Object.assign(new Error('spawnSync git ETIMEDOUT'), { code: 'ETIMEDOUT' });
      mockExecFileSync.mockImplementation(() => { throw err; });

      const result = getCommitDates('/some/repo', 30);

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith('[git] getCommitDates failed:', '/some/repo', err);
      warnSpy.mockRestore();
    });
  });
});
