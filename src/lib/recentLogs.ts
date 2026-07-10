import { readdir, readFile, stat } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { MergedProject } from '../types/project.js';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

// Minimum output tokens to qualify as a "major" session worth surfacing.
// Filters out quick one-off questions, memory updates, and trivial commands.
export const MAJOR_SESSION_MIN_TOKENS = 20_000;

export type SessionEntry = {
  sessionId: string;
  title: string;
  description: string | null; // first substantive user message (what they actually asked)
  outputTokens: number;
  mtime: number;
  projectDirName: string;
  projectName: string | null;
  projectId: string | null;
};

function expandTilde(p: string): string {
  if (p === '~') return homedir();
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

function repoDirName(repoPath: string): string {
  const expanded = expandTilde(repoPath);
  return expanded.replace(/\//g, '-');
}

function buildProjectDirMap(projects: MergedProject[]): Map<string, { name: string; id: string }> {
  const map = new Map<string, { name: string; id: string }>();
  for (const p of projects) {
    if (p.repo) {
      map.set(repoDirName(p.repo), { name: p.name, id: p.id });
    }
  }
  // project-dashboard is in SKIP_DIRS in projects.ts (avoids self-reference on the board)
  // but we still need to label its log sessions correctly here.
  const pdKey = repoDirName('~/project-dashboard');
  if (!map.has(pdKey)) {
    map.set(pdKey, { name: 'Project Dashboard', id: 'project-dashboard' });
  }
  return map;
}

function matchProjectDir(
  dirName: string,
  projectDirMap: Map<string, { name: string; id: string }>,
): { name: string; id: string } | null {
  // Exact match
  const exact = projectDirMap.get(dirName);
  if (exact) return exact;

  // Prefix match for worktree dirs:
  // e.g. `-Users-nateseluga-os-evals--claude-worktrees-foo` → os-evals
  // Worktree paths use double-dash `--` to separate repo dir from worktree name.
  const doubleDash = dirName.indexOf('--');
  if (doubleDash !== -1) {
    const prefix = dirName.slice(0, doubleDash);
    const prefixMatch = projectDirMap.get(prefix);
    if (prefixMatch) return prefixMatch;
  }

  return null;
}

function extractFirstUserMessage(lines: string[]): string | null {
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type !== 'user') continue;

      const content = obj.message?.content;
      let text = '';
      if (Array.isArray(content)) {
        for (const c of content) {
          if (c?.type === 'text') { text = c.text; break; }
        }
      } else if (typeof content === 'string') {
        text = content;
      }

      text = text.trim();
      // Skip system injections, slash commands, and very short messages
      if (!text || text.startsWith('<') || text.startsWith('/') || text.length < 25) continue;

      return text.slice(0, 160).replace(/\n+/g, ' ');
    } catch {
      // skip malformed lines
    }
  }
  return null;
}

async function parseSession(filePath: string): Promise<{
  title: string | null;
  description: string | null;
  outputTokens: number;
  mtime: number;
  sessionId: string;
} | null> {
  try {
    const [fileStat, content] = await Promise.all([
      stat(filePath),
      readFile(filePath, 'utf-8'),
    ]);

    const lines = content.split('\n');
    let title: string | null = null;
    let outputTokens = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'ai-title' && !title) {
          title = obj.aiTitle ?? null;
        }
        if (obj.type === 'assistant' && obj.message?.usage) {
          outputTokens += obj.message.usage.output_tokens ?? 0;
        }
      } catch {
        // skip malformed lines
      }
    }

    const description = extractFirstUserMessage(lines);
    const sessionId = filePath.split('/').pop()!.replace('.jsonl', '');
    return { title, description, outputTokens, mtime: fileStat.mtimeMs, sessionId };
  } catch {
    return null;
  }
}

export type RecentLogsResult = {
  globalFeed: SessionEntry[];
  byProject: Map<string, SessionEntry>;
};

export async function getRecentLogs(
  projects: MergedProject[],
  { limit = 7, minTokens = MAJOR_SESSION_MIN_TOKENS }: { limit?: number; minTokens?: number } = {},
): Promise<RecentLogsResult> {
  const projectDirMap = buildProjectDirMap(projects);

  let projectDirs: string[] = [];
  try {
    const entries = await readdir(CLAUDE_PROJECTS_DIR);
    projectDirs = entries.filter((e) => !e.includes('.'));
  } catch {
    return { globalFeed: [], byProject: new Map() };
  }

  const allSessions: SessionEntry[] = [];

  await Promise.all(
    projectDirs.map(async (dirName) => {
      const dirPath = join(CLAUDE_PROJECTS_DIR, dirName);
      let files: string[] = [];
      try {
        const entries = await readdir(dirPath);
        files = entries.filter((f) => f.endsWith('.jsonl'));
      } catch {
        return;
      }

      const matched = matchProjectDir(dirName, projectDirMap);

      await Promise.all(
        files.map(async (f) => {
          const session = await parseSession(join(dirPath, f));
          if (!session || !session.title || session.outputTokens < minTokens) return;

          allSessions.push({
            sessionId: session.sessionId,
            title: session.title,
            description: session.description,
            outputTokens: session.outputTokens,
            mtime: session.mtime,
            projectDirName: dirName,
            projectName: matched?.name ?? null,
            projectId: matched?.id ?? null,
          });
        }),
      );
    }),
  );

  allSessions.sort((a, b) => b.mtime - a.mtime);

  const globalFeed = allSessions.slice(0, limit);

  // Most recent major session per project, merging worktree and main-checkout sessions
  // under the same project ID so they don't appear as separate entries.
  const byProject = new Map<string, SessionEntry>();
  for (const s of allSessions) {
    const key = s.projectId ?? s.projectDirName;
    if (!byProject.has(key)) {
      byProject.set(key, s);
    }
  }

  return { globalFeed, byProject };
}

export function relativeTime(mtimeMs: number): string {
  const diffMs = Date.now() - mtimeMs;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 7)}w ago`;
}

export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}
