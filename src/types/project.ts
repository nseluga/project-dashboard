export interface Project {
  /** Directory name under OS_PROJECTS_DIR — stable identifier */
  id: string;
  name: string;
  summary: string | null;
  /** Raw repo path from frontmatter (tilde not expanded) */
  repo: string | null;
  github: string | null;
  tags: string[];
  status: string;
  priority: string;
  next_step: string | null;
  /** ISO-8601 string: git commit date if available, otherwise frontmatter value */
  last_active: string;
  /** Days elapsed since last_active, non-negative */
  days_since_active: number;
}
