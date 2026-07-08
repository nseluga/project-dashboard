import { getProjects } from './projects.js';
import { readManual } from './manual.js';
import type { MergedProject } from '../types/project.js';

export async function getMergedProjects(): Promise<MergedProject[]> {
  const [projects, manual] = await Promise.all([getProjects(), Promise.resolve(readManual())]);

  const today = new Date().toISOString().slice(0, 10);

  const OVERRIDE_WHITELIST = new Set([
    'name', 'summary', 'status', 'priority', 'next_step', 'repo', 'github', 'tags',
  ]);

  return projects.map((project) => {
    const rawOverrides = manual.overrides[project.id] ?? {};
    const overrideFields = Object.fromEntries(
      Object.entries(rawOverrides).filter(([k]) => OVERRIDE_WHITELIST.has(k)),
    );
    const due_date = manual.due_dates[project.id] ?? null;
    const overdue = due_date !== null && due_date < today;

    return {
      ...project,
      ...overrideFields,
      due_date,
      overdue,
    };
  });
}
