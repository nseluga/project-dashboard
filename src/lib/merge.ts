import { getProjects } from './projects.js';
import { readManual } from './manual.js';
import type { MergedProject } from '../types/project.js';

export async function getMergedProjects(): Promise<MergedProject[]> {
  const [projects, manual] = await Promise.all([getProjects(), Promise.resolve(readManual())]);

  const today = new Date().toISOString().slice(0, 10);

  return projects.map((project) => {
    const overrideFields = manual.overrides[project.id] ?? {};
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
