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

function repoDirName(repoPath: string): string {
  const expanded =
    repoPath === '~'
      ? homedir()
      : repoPath.startsWith('~/')
        ? join(homedir(), repoPath.slice(2))
        : repoPath;
  return expanded.replace(/\//g, '-');
}

async function sumJsonlFile(filePath: string): Promise<{
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  lastDate: string | null;
}> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, lastDate: null };
  }

  let inputTokens = 0, outputTokens = 0, cacheCreationTokens = 0, cacheReadTokens = 0;
  let lastDate: string | null = null;

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.type === 'assistant' && msg.message?.usage) {
        const u = msg.message.usage;
        inputTokens += u.input_tokens ?? 0;
        outputTokens += u.output_tokens ?? 0;
        cacheCreationTokens += u.cache_creation_input_tokens ?? 0;
        cacheReadTokens += u.cache_read_input_tokens ?? 0;
        if (msg.timestamp && (!lastDate || msg.timestamp > lastDate)) {
          lastDate = msg.timestamp as string;
        }
      }
    } catch {
      // skip malformed lines
    }
  }

  return { inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, lastDate };
}

async function getProjectUsage(projectId: string, repoPath: string): Promise<ProjectUsage> {
  const projectDir = join(CLAUDE_PROJECTS_DIR, repoDirName(repoPath));

  let jsonlFiles: string[] = [];
  try {
    const entries = await readdir(projectDir);
    jsonlFiles = entries.filter((f) => f.endsWith('.jsonl'));
  } catch {
    return {
      projectId,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      sessionCount: 0,
      lastSessionDate: null,
    };
  }

  const results = await Promise.all(
    jsonlFiles.map((f) => sumJsonlFile(join(projectDir, f))),
  );

  let inputTokens = 0, outputTokens = 0, cacheCreationTokens = 0, cacheReadTokens = 0;
  let lastSessionDate: string | null = null;

  for (const r of results) {
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;
    cacheCreationTokens += r.cacheCreationTokens;
    cacheReadTokens += r.cacheReadTokens;
    if (r.lastDate && (!lastSessionDate || r.lastDate > lastSessionDate)) {
      lastSessionDate = r.lastDate;
    }
  }

  return { projectId, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, sessionCount: jsonlFiles.length, lastSessionDate };
}

export async function getClaudeUsage(projects: MergedProject[]): Promise<Map<string, ProjectUsage>> {
  const entries = await Promise.all(
    projects
      .filter((p) => p.repo)
      .map((p) => getProjectUsage(p.id, p.repo!)),
  );

  const map = new Map<string, ProjectUsage>();
  for (const entry of entries) {
    map.set(entry.projectId, entry);
  }
  return map;
}
