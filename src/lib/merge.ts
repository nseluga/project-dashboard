import { getProjects } from './projects.js';
import { readManual } from './manual.js';
import type { MergedProject } from '../types/project.js';

export async function getMergedProjects(): Promise<MergedProject[]> {
  const [projects, manual] = await Promise.all([getProjects(), Promise.resolve(readManual())]);

  const today = new Date().toISOString().slice(0, 10);

  const OVERRIDE_WHITELIST = new Set([
    'name', 'summary', 'status', 'priority', 'next_step', 'repo', 'github', 'tags',
  ]);

  const tokenTotals = new Map<string, number>();
  for (const entry of manual.token_log) {
    tokenTotals.set(entry.projectId, (tokenTotals.get(entry.projectId) ?? 0) + entry.tokens);
  }

  return projects.map((project) => {
    const rawOverrides = manual.overrides[project.id] ?? {};
    const overrideFields = Object.fromEntries(
      Object.entries(rawOverrides).filter(([k]) => OVERRIDE_WHITELIST.has(k)),
    );
    const due_date = manual.due_dates[project.id] ?? null;
    const overdue = due_date !== null && due_date < today;
    const rawHidden = manual.hidden_fields[project.id] ?? {};
    const hidden_fields = {
      due_date: rawHidden.due_date ?? false,
      priority: rawHidden.priority ?? false,
    };
    const total_tokens = tokenTotals.get(project.id) ?? 0;

    return {
      ...project,
      ...overrideFields,
      due_date,
      overdue,
      hidden_fields,
      total_tokens,
    };
  });
}
