import { readdir, readFile, stat } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { MergedProject } from '../types/project.js';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');
const MAJOR_SESSION_MIN_TOKENS = 2000;

export type SessionEntry = {
  sessionId: string;
  title: string;
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
  return map;
}

async function parseSession(filePath: string): Promise<{
  title: string | null;
  outputTokens: number;
  mtime: number;
  sessionId: string;
} | null> {
  let outputTokens = 0;
  let title: string | null = null;

  try {
    const [fileStat, content] = await Promise.all([
      stat(filePath),
      readFile(filePath, 'utf-8'),
    ]);

    for (const line of content.split('\n')) {
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

    const sessionId = filePath.split('/').pop()!.replace('.jsonl', '');
    return { title, outputTokens, mtime: fileStat.mtimeMs, sessionId };
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
    // dirs don't have a dot extension
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

      const matched = projectDirMap.get(dirName);

      await Promise.all(
        files.map(async (f) => {
          const session = await parseSession(join(dirPath, f));
          if (!session || !session.title || session.outputTokens < minTokens) return;

          allSessions.push({
            sessionId: session.sessionId,
            title: session.title,
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

  // Most recent major session per project dir
  const byProject = new Map<string, SessionEntry>();
  for (const s of allSessions) {
    if (!byProject.has(s.projectDirName)) {
      byProject.set(s.projectDirName, s);
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
