/**
 * autoTag — pure function, no I/O.
 *
 * Scans `text` case-insensitively for exact matches of each project's id or
 * name. Returns the id of the project whose id/name appears earliest in the
 * text, or null if no match is found.
 *
 * When multiple projects match at the same position, the first one in the
 * projectIds array wins.
 */
export function autoTag(
  text: string,
  projectIds: string[],
  projectNames: string[],
): string | null {
  if (projectIds.length === 0) return null;

  const lower = text.toLowerCase();
  let bestId: string | null = null;
  let bestPos = Infinity;

  for (let i = 0; i < projectIds.length; i++) {
    const id = projectIds[i];
    const name = projectNames[i];

    const idPos = id ? lower.indexOf(id.toLowerCase()) : -1;
    const namePos = name ? lower.indexOf(name.toLowerCase()) : -1;

    const earliest = Math.min(
      idPos >= 0 ? idPos : Infinity,
      namePos >= 0 ? namePos : Infinity,
    );

    if (earliest < bestPos) {
      bestPos = earliest;
      bestId = id;
    }
  }

  return bestId;
}
