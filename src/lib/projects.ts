import { readdir, readFile } from 'fs/promises';
import { execFileSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import matter from 'gray-matter';
import type { Project } from '../types/project.js';

// os-evals is a sub-project of os; project-dashboard is this app itself
const SKIP_DIRS = new Set(['os-evals', 'project-dashboard']);
const MS_PER_DAY = 86_400_000;
const GIT_TIMEOUT_MS = 5_000;

function expandTilde(p: string): string {
  if (p === '~') return homedir();
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

function gitLastCommit(repoPath: string): string | null {
  try {
    const output = execFileSync(
      'git',
      ['-C', repoPath, 'log', '-1', '--format=%cI'],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: GIT_TIMEOUT_MS },
    ).trim();
    return output.length > 0 ? output : null;
  } catch {
    return null;
  }
}

export async function getProjects(): Promise<Project[]> {
  const rawDir = process.env.OS_PROJECTS_DIR ?? '~/os/projects';
  const projectsDir = expandTilde(rawDir);

  const entries = await readdir(projectsDir, { withFileTypes: true });
  const dirNames = entries
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name))
    .map((e) => e.name);

  const projects: Project[] = [];

  for (const dirName of dirNames) {
    const readmePath = join(projectsDir, dirName, 'README.md');
    let content: string;
    try {
      content = await readFile(readmePath, 'utf-8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        continue; // directory has no README.md — skip silently
      }
      console.warn(`[projects] unexpected error reading ${readmePath}:`, (e as Error).message);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fm: { [key: string]: any };
    try {
      ({ data: fm } = matter(content));
    } catch (e) {
      console.warn(`[projects] failed to parse frontmatter in ${readmePath}:`, (e as Error).message);
      continue;
    }

    const repoRaw: string | null = (fm.repo as string) ?? null;
    const repoExpanded = repoRaw ? expandTilde(repoRaw) : null;

    const gitDate = repoExpanded ? gitLastCommit(repoExpanded) : null;
    // gray-matter parses bare YAML dates (2025-05-11) as JS Date objects;
    // convert to ISO string to preserve the date value regardless of local tz.
    const frontmatterDate: string | null = fm.last_active
      ? fm.last_active instanceof Date
        ? fm.last_active.toISOString()
        : String(fm.last_active)
      : null;
    const last_active = gitDate ?? frontmatterDate ?? new Date().toISOString();

    const days_since_active = Math.max(
      0,
      Math.floor((Date.now() - new Date(last_active).getTime()) / MS_PER_DAY),
    );

    projects.push({
      id: dirName,
      name: fm.name ?? dirName,
      summary: fm.summary ?? null,
      repo: repoRaw,
      github: fm.github ?? null,
      tags: Array.isArray(fm.tags) ? fm.tags.filter((t): t is string => typeof t === 'string') : [],
      status: fm.status ?? 'unknown',
      priority: fm.priority ?? 'low',
      next_step: fm.next_step ?? null,
      last_active,
      days_since_active,
    });
  }

  return projects;
}
