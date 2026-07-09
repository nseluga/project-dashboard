import type { APIRoute } from 'astro';
import { readManual, writeManual } from '../../lib/manual.js';
import { manualMutex } from '../../lib/mutex.js';
import { getMergedProjects } from '../../lib/merge.js';
import { autoTag } from '../../lib/autoTag.js';
import type { NoteEntry } from '../../types/manual.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MAX_NOTE_LENGTH = 2000;

// ---------------------------------------------------------------------------
// POST /api/note — create a note with auto-tagging
// ---------------------------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'invalid JSON body' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'body must be a JSON object' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const { text } = body as Record<string, unknown>;

  if (typeof text !== 'string' || text.trim() === '') {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing required field: text' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (text.length > MAX_NOTE_LENGTH) {
    return new Response(
      JSON.stringify({ ok: false, error: `text must be ${MAX_NOTE_LENGTH} characters or fewer` }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  try {
    const allProjects = await getMergedProjects();
    const projectId = autoTag(
      text.trim(),
      allProjects.map((p) => p.id),
      allProjects.map((p) => p.name),
    );

    return await manualMutex.runExclusive(async () => {
      const manual = readManual();

      const entry: NoteEntry = {
        id: crypto.randomUUID(),
        text: text.trim(),
        projectId,
        created: new Date().toISOString(),
      };

      manual.notes.push(entry);
      writeManual(manual);
      return new Response(
        JSON.stringify({ ok: true, projectId }),
        { status: 200, headers: JSON_HEADERS },
      );
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/note — remove a note by id
// ---------------------------------------------------------------------------

export const DELETE: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'invalid JSON body' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'body must be a JSON object' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const { id } = body as Record<string, unknown>;

  if (typeof id !== 'string' || id.trim() === '') {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing required field: id' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  try {
    return await manualMutex.runExclusive(async () => {
      const manual = readManual();
      const index = manual.notes.findIndex((note) => note.id === id);

      if (index === -1) {
        return new Response(
          JSON.stringify({ ok: false, error: `note not found: ${id}` }),
          { status: 404, headers: JSON_HEADERS },
        );
      }

      manual.notes.splice(index, 1);
      writeManual(manual);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/note — manually reassign a note's projectId
// ---------------------------------------------------------------------------

export const PATCH: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'invalid JSON body' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'body must be a JSON object' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const { id, projectId } = body as Record<string, unknown>;

  if (typeof id !== 'string' || id.trim() === '') {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing required field: id' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  // projectId must be null (unsorted) or a string (known project id — validated below)
  if (projectId !== null && typeof projectId !== 'string') {
    return new Response(
      JSON.stringify({ ok: false, error: 'projectId must be a string or null' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  try {
    // Validate projectId against known projects before entering the mutex
    if (projectId !== null) {
      const allProjects = await getMergedProjects();
      const knownIds = new Set(allProjects.map((p) => p.id));
      if (!knownIds.has(projectId as string)) {
        return new Response(
          JSON.stringify({ ok: false, error: `unknown projectId: ${projectId}` }),
          { status: 400, headers: JSON_HEADERS },
        );
      }
    }

    return await manualMutex.runExclusive(async () => {
      const manual = readManual();

      const note = manual.notes.find((n) => n.id === id);
      if (!note) {
        return new Response(
          JSON.stringify({ ok: false, error: `note not found: ${id}` }),
          { status: 404, headers: JSON_HEADERS },
        );
      }

      note.projectId = projectId as string | null;
      writeManual(manual);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
};
