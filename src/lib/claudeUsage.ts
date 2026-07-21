import { readdir, readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { MergedProject } from '../types/project.js';

export type ProjectUsage = {
  projectId: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  sessionCount: number;
  lastSessionDate: string | null;
};

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');
const HOME_DIR_KEY = homedir().replace(/\//g, '-');

function repoDirName(repoPath: string): string {
  const expanded =
    repoPath === '~'
      ? homedir()
      : repoPath.startsWith('~/')
        ? join(homedir(), repoPath.slice(2))
        : repoPath;
  return expanded.replace(/\//g, '-');
}

// Map from absolute repo path → projectId, for path-based project inference.
export function buildRepoPathMap(projects: MergedProject[]): Map<string, string> {
  const home = homedir();
  const map = new Map<string, string>();
  for (const p of projects) {
    if (!p.repo) continue;
    const expanded =
      p.repo === '~' ? home : p.repo.startsWith('~/') ? join(home, p.repo.slice(2)) : p.repo;
    map.set(expanded, p.id);
  }
  // project-dashboard is skipped from the board board (SKIP_DIRS) but still a real project
  const pdPath = join(home, 'project-dashboard');
  if (!map.has(pdPath)) map.set(pdPath, 'project-dashboard');
  return map;
}

// Infer which project a session belongs to by looking at file paths in tool calls.
export function inferProjectFromContent(
  content: string,
  repoPathMap: Map<string, string>,
): string | null {
  const home = homedir();
  const counts = new Map<string, number>();

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type !== 'assistant' || !Array.isArray(obj.message?.content)) continue;
      for (const block of obj.message.content as Record<string, unknown>[]) {
        if (block['type'] !== 'tool_use') continue;
        const input = block['input'] as Record<string, unknown> | undefined;
        if (!input) continue;

        const paths: string[] = [];
        if (typeof input['file_path'] === 'string') paths.push(input['file_path']);
        if (typeof input['command'] === 'string') {
          const m = input['command'].match(/(~\/[\w.\-/]+|\/Users\/[\w.\-/]+)/g);
          if (m) paths.push(...m);
        }

        for (const p of paths) {
          const abs = p.startsWith('~/') ? join(home, p.slice(2)) : p;
          for (const [repoPath, projectId] of repoPathMap) {
            if (abs === repoPath || abs.startsWith(repoPath + '/')) {
              counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
            }
          }
        }
      }
    } catch {
      // skip malformed lines
    }
  }

  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function sumJsonlContent(
  content: string,
  sinceMs?: number,
): {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  lastDate: string | null;
  counted: boolean;
} {
  let inputTokens = 0, outputTokens = 0, cacheCreationTokens = 0, cacheReadTokens = 0;
  let lastDate: string | null = null;
  let counted = false;

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.type === 'assistant' && msg.message?.usage) {
        if (sinceMs && msg.timestamp && new Date(msg.timestamp as string).getTime() < sinceMs) continue;
        const u = msg.message.usage;
        inputTokens += u.input_tokens ?? 0;
        outputTokens += u.output_tokens ?? 0;
        cacheCreationTokens += u.cache_creation_input_tokens ?? 0;
        cacheReadTokens += u.cache_read_input_tokens ?? 0;
        if (msg.timestamp && (!lastDate || msg.timestamp > lastDate)) lastDate = msg.timestamp as string;
        counted = true;
      }
    } catch {
      // skip malformed lines
    }
  }

  return { inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, lastDate, counted };
}

async function sumProjectDir(
  projectId: string,
  projectDir: string,
  sinceMs?: number,
): Promise<ProjectUsage> {
  let jsonlFiles: string[] = [];
  try {
    const entries = await readdir(projectDir);
    jsonlFiles = entries.filter((f) => f.endsWith('.jsonl'));
  } catch {
    return { projectId, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, sessionCount: 0, lastSessionDate: null };
  }

  const results = await Promise.all(
    jsonlFiles.map(async (f) => {
      const content = await readFile(join(projectDir, f), 'utf-8').catch(() => '');
      return sumJsonlContent(content, sinceMs);
    }),
  );

  let inputTokens = 0, outputTokens = 0, cacheCreationTokens = 0, cacheReadTokens = 0;
  let lastSessionDate: string | null = null;
  let sessionCount = 0;

  for (const r of results) {
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;
    cacheCreationTokens += r.cacheCreationTokens;
    cacheReadTokens += r.cacheReadTokens;
    if (r.lastDate && (!lastSessionDate || r.lastDate > lastSessionDate)) lastSessionDate = r.lastDate;
    if (r.counted) sessionCount++;
  }

  return { projectId, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, sessionCount, lastSessionDate };
}

export async function getClaudeUsage(
  projects: MergedProject[],
  { sinceMs }: { sinceMs?: number } = {},
): Promise<Map<string, ProjectUsage>> {
  const repoPathMap = buildRepoPathMap(projects);

  // Sum tokens for each project's dedicated dir
  const projectEntries = await Promise.all(
    projects
      .filter((p) => p.repo)
      .map((p) => sumProjectDir(p.id, join(CLAUDE_PROJECTS_DIR, repoDirName(p.repo!)), sinceMs)),
  );

  const map = new Map<string, ProjectUsage>();
  for (const entry of projectEntries) {
    map.set(entry.projectId, entry);
  }

  // Also include project-dashboard (in SKIP_DIRS, so not in projects list)
  const pdDir = join(CLAUDE_PROJECTS_DIR, repoDirName('~/project-dashboard'));
  const pdUsage = await sumProjectDir('project-dashboard', pdDir, sinceMs);
  if (!map.has('project-dashboard') && pdUsage.sessionCount > 0) {
    map.set('project-dashboard', pdUsage);
  } else if (map.has('project-dashboard')) {
    const existing = map.get('project-dashboard')!;
    existing.inputTokens += pdUsage.inputTokens;
    existing.outputTokens += pdUsage.outputTokens;
    existing.cacheCreationTokens += pdUsage.cacheCreationTokens;
    existing.cacheReadTokens += pdUsage.cacheReadTokens;
    existing.sessionCount += pdUsage.sessionCount;
    if (pdUsage.lastSessionDate && (!existing.lastSessionDate || pdUsage.lastSessionDate > existing.lastSessionDate)) {
      existing.lastSessionDate = pdUsage.lastSessionDate;
    }
  }

  // Attribute home dir (general terminal) sessions to their actual projects
  const homeDir = join(CLAUDE_PROJECTS_DIR, HOME_DIR_KEY);
  let homeFiles: string[] = [];
  try {
    const entries = await readdir(homeDir);
    homeFiles = entries.filter((f) => f.endsWith('.jsonl'));
  } catch {}

  await Promise.all(
    homeFiles.map(async (f) => {
      const content = await readFile(join(homeDir, f), 'utf-8').catch(() => '');
      if (!content) return;
      const projectId = inferProjectFromContent(content, repoPathMap);
      if (!projectId) return;
      const result = sumJsonlContent(content, sinceMs);
      if (!result.counted) return;

      const existing = map.get(projectId);
      if (existing) {
        existing.inputTokens += result.inputTokens;
        existing.outputTokens += result.outputTokens;
        existing.cacheCreationTokens += result.cacheCreationTokens;
        existing.cacheReadTokens += result.cacheReadTokens;
        existing.sessionCount += 1;
        if (result.lastDate && (!existing.lastSessionDate || result.lastDate > existing.lastSessionDate)) {
          existing.lastSessionDate = result.lastDate;
        }
      }
    }),
  );

  return map;
}
