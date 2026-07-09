import { execFileSync, execFile } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';
import { join } from 'path';

const GIT_TIMEOUT_MS = 5_000;

/**
 * Expands a leading `~` or `~/` to the current user's home directory.
 * Only the bare home-dir form is supported: `~` and `~/…`.
 * `~username/foo` paths are passed through unchanged (git will reject them).
 */
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
  } catch (err) {
    console.warn('[git] getCommitDates failed:', expanded, err);
    return [];
  }
}

const execFileAsync = promisify(execFile);

/**
 * Async version of getCommitDates — uses execFile to avoid blocking the
 * SSR event loop when called concurrently via Promise.all.
 */
export async function getCommitDatesAsync(repoPath: string, sinceDays: number): Promise<string[]> {
  if (!repoPath) return [];

  const expanded = expandTilde(repoPath);

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', expanded, 'log', '--format=%cI', `--since=${sinceDays} days ago`],
      { encoding: 'utf-8', timeout: GIT_TIMEOUT_MS },
    );
    return stdout.trim().split('\n').filter(Boolean);
  } catch (err) {
    console.warn('[git] getCommitDates failed:', expanded, err);
    return [];
  }
}
