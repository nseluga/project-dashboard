import { execFileSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

const GIT_TIMEOUT_MS = 5_000;

function expandTilde(p: string): string {
  if (p === '~') return homedir();
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

/**
 * Returns ISO-8601 commit date strings (committer date) for commits in the
 * given repo that fall within the last `sinceDays` days.
 *
 * Returns [] when:
 *   - repoPath is empty/absent
 *   - git is not available or the directory is not a repo
 *   - no commits exist in the time window
 */
export function getCommitDates(repoPath: string, sinceDays: number): string[] {
  if (!repoPath) return [];

  const expanded = expandTilde(repoPath);

  try {
    const raw = execFileSync(
      'git',
      ['-C', expanded, 'log', '--format=%cI', `--since=${sinceDays} days ago`],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: GIT_TIMEOUT_MS },
    );
    return raw.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}
