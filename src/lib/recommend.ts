import type { MergedProject } from '../types/project.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const EXCLUDED_STATUSES = new Set(['complete', 'archived']);

const PRIORITY_SCORE: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const STATUS_WEIGHT: Record<string, number> = {
  active: 2,
  'in-progress': 1,
  'on-hold': 0,
};

const STALENESS_THRESHOLD_DAYS = 14;

/**
 * Compute a numeric score for a single project.
 *
 * Returns -Infinity for complete/archived projects so they are never chosen.
 *
 * @param p     - project to score
 * @param today - YYYY-MM-DD string representing "now" (injectable for tests)
 */
export function scoreProject(p: MergedProject, today: string): number {
  if (EXCLUDED_STATUSES.has(p.status)) {
    return -Infinity;
  }

  const priority = PRIORITY_SCORE[p.priority] ?? 0;
  const statusWeight = STATUS_WEIGHT[p.status] ?? 0;
  const staleness = Number.isFinite(p.days_since_active) && p.days_since_active > STALENESS_THRESHOLD_DAYS ? 1 : 0;
  const urgency = computeUrgency(p.due_date, today);

  return priority + urgency + statusWeight + staleness;
}

function computeUrgency(dueDate: string | null, today: string): number {
  if (!dueDate || !DATE_RE.test(dueDate)) {
    return 0;
  }

  if (dueDate < today) {
    // Overdue
    return 4;
  }

  const daysUntilDue = daysBetween(today, dueDate);

  if (daysUntilDue <= 3) return 3;
  if (daysUntilDue <= 7) return 2;
  if (daysUntilDue <= 14) return 1;
  return 0;
}

/** Days from dateA to dateB (both YYYY-MM-DD). Assumes dateB >= dateA. */
function daysBetween(dateA: string, dateB: string): number {
  const msPerDay = 86_400_000;
  return Math.round((Date.parse(dateB) - Date.parse(dateA)) / msPerDay);
}

/**
 * Return the highest-scoring eligible project from the list, or null if none.
 *
 * Tie-breaking (in order):
 *   1. Higher priority string value (high > medium > low > absent)
 *   2. Earlier due date (null due dates come last)
 *   3. Alphabetical by id
 *
 * @param projects - full project list from getMergedProjects()
 * @param today    - YYYY-MM-DD string (defaults to current date)
 */
export function getRecommendation(
  projects: MergedProject[],
  today?: string,
): MergedProject | null {
  const resolvedToday = today ?? new Date().toISOString().slice(0, 10);

  const eligible = projects.filter((p) => !EXCLUDED_STATUSES.has(p.status));
  if (eligible.length === 0) return null;

  const scored = eligible.map((p) => ({
    project: p,
    score: scoreProject(p, resolvedToday),
  }));

  scored.sort((a, b) => {
    // 1. Higher score wins
    if (b.score !== a.score) return b.score - a.score;

    // 2. Higher priority wins
    const priorityDiff =
      (PRIORITY_SCORE[b.project.priority] ?? 0) -
      (PRIORITY_SCORE[a.project.priority] ?? 0);
    if (priorityDiff !== 0) return priorityDiff;

    // 3. Earlier due date wins; null due dates come last
    const aDue = validDate(a.project.due_date);
    const bDue = validDate(b.project.due_date);
    if (aDue !== null && bDue !== null) {
      if (aDue < bDue) return -1;
      if (aDue > bDue) return 1;
    } else if (aDue !== null) {
      return -1; // a has a date, b doesn't → a wins
    } else if (bDue !== null) {
      return 1;  // b has a date, a doesn't → b wins
    }

    // 4. Alphabetical by id
    return a.project.id.localeCompare(b.project.id, 'en');
  });

  return scored[0].project;
}

function validDate(d: string | null): string | null {
  return d && DATE_RE.test(d) ? d : null;
}
