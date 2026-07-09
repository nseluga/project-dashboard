import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promisify } from 'util';

// Mock child_process before importing git.ts.
// execFile needs util.promisify.custom so that promisify(execFile) resolves
// with { stdout, stderr } rather than a plain string.
const execFileMock = vi.fn();
(execFileMock as any)[promisify.custom] = vi.fn();

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
  execFile: execFileMock,
}));

const { execFileSync } = await import('child_process');
const { getCommitDates, getCommitDatesAsync } = await import('../src/lib/git.js');

const mockExecFileSync = vi.mocked(execFileSync);
// Access the custom promisify stub directly (this is what execFileAsync calls)
const mockExecFileAsync = (execFileMock as any)[promisify.custom] as ReturnType<typeof vi.fn>;

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

describe('getCommitDatesAsync()', () => {
  // getCommitDatesAsync uses promisify(execFile). Since execFile has a
  // promisify.custom symbol, we stub that directly so it resolves/rejects
  // with the right shape ({ stdout, stderr }).
  function resolveWith(stdout: string) {
    mockExecFileAsync.mockResolvedValue({ stdout, stderr: '' });
  }

  function rejectWith(err: Error) {
    mockExecFileAsync.mockRejectedValue(err);
  }

  describe('happy path', () => {
    it('returns an array of ISO date strings from async git log output', async () => {
      resolveWith('2026-07-08T14:30:00+00:00\n2026-07-07T10:00:00+00:00\n');

      const result = await getCommitDatesAsync('/some/repo', 30);

      expect(result).toEqual(['2026-07-08T14:30:00+00:00', '2026-07-07T10:00:00+00:00']);
    });

    it('returns [] when async git log output is empty', async () => {
      resolveWith('');

      const result = await getCommitDatesAsync('/some/repo', 7);

      expect(result).toEqual([]);
    });

    it('returns [] immediately when repoPath is empty string', async () => {
      const result = await getCommitDatesAsync('', 30);

      expect(result).toEqual([]);
      expect(mockExecFileAsync).not.toHaveBeenCalled();
    });
  });

  describe('error paths', () => {
    it('returns [] and warns when async git call throws (not a repo)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const err = new Error('fatal: not a git repository');
      rejectWith(err);

      const result = await getCommitDatesAsync('/not/a/repo', 30);

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith('[git] getCommitDatesAsync failed:', '/not/a/repo', err);
      warnSpy.mockRestore();
    });

    it('returns [] and warns when async git call times out (ETIMEDOUT)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const err = Object.assign(new Error('spawnSync git ETIMEDOUT'), { code: 'ETIMEDOUT' });
      rejectWith(err);

      const result = await getCommitDatesAsync('/some/repo', 30);

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith('[git] getCommitDatesAsync failed:', '/some/repo', err);
      warnSpy.mockRestore();
    });

    it('returns [] and warns when async git call throws ENOENT (no git binary)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      rejectWith(err);

      const result = await getCommitDatesAsync('/some/repo', 30);

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith('[git] getCommitDatesAsync failed:', '/some/repo', err);
      warnSpy.mockRestore();
    });
  });
});
