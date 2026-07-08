import type { MergedProject } from '../types/project.js';

export interface DigestBuckets {
  moved: MergedProject[];
  overdue: MergedProject[];
  comingUp: MergedProject[];
}

/**
 * Compute the three weekly-digest buckets from a list of merged projects.
 *
 * @param projects - full project list from getMergedProjects()
 * @param today - ISO-8601 date string (YYYY-MM-DD), defaults to current date
 * @param sevenDaysFromNow - ISO-8601 date string (YYYY-MM-DD), defaults to today + 7
 */
export function computeDigestBuckets(
  projects: MergedProject[],
  today: string = new Date().toISOString().slice(0, 10),
  sevenDaysFromNow: string = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })(),
): DigestBuckets {
  const moved: MergedProject[] = [];
  const overdue: MergedProject[] = [];
  const comingUp: MergedProject[] = [];

  for (const project of projects) {
    if (project.days_since_active <= 7) {
      moved.push(project);
    }
    if (project.overdue) {
      overdue.push(project);
    } else if (project.due_date && project.due_date <= sevenDaysFromNow) {
      comingUp.push(project);
    }
  }

  return { moved, overdue, comingUp };
}
