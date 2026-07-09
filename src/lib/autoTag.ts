/**
 * autoTag — pure function, no I/O.
 *
 * Scans `text` case-insensitively for whole-word matches of each project's id
 * or name. Returns the id of the project whose id/name appears earliest in the
 * text, or null if no match is found.
 *
 * Matches must occur at word boundaries so short ids like "os", "ai", or "ml"
 * don't false-positive inside words like "gross", "said", or "email".
 *
 * When multiple projects match at the same position, the first one in the
 * projectIds array wins.
 */
function isWordBoundary(text: string, start: number, end: number): boolean {
  const before = start === 0 || /\W/.test(text[start - 1]);
  const after = end >= text.length || /\W/.test(text[end]);
  return before && after;
}

function findWordBoundaryMatch(haystack: string, needle: string): number {
  let pos = 0;
  while (pos <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) return -1;
    if (isWordBoundary(haystack, idx, idx + needle.length)) return idx;
    pos = idx + 1;
  }
  return -1;
}

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

    const idPos = id ? findWordBoundaryMatch(lower, id.toLowerCase()) : -1;
    const namePos = name ? findWordBoundaryMatch(lower, name.toLowerCase()) : -1;

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
