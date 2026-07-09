import type { APIRoute } from 'astro';
import { readManual, writeManual } from '../../lib/manual.js';
import { manualMutex } from '../../lib/mutex.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const ALLOWED_FIELDS = new Set(['due_date', 'priority'] as const);

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

  const { projectId, field, hidden } = body as Record<string, unknown>;

  if (typeof projectId !== 'string' || projectId.trim() === '') {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing required field: projectId' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (typeof field !== 'string' || !ALLOWED_FIELDS.has(field as 'due_date' | 'priority')) {
    return new Response(
      JSON.stringify({ ok: false, error: 'field must be one of: due_date, priority' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (typeof hidden !== 'boolean') {
    return new Response(
      JSON.stringify({ ok: false, error: 'hidden must be a boolean' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  try {
    return await manualMutex.runExclusive(async () => {
      const manual = readManual();

      if (!hidden && !manual.hidden_fields[projectId]) {
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
      }

      if (!manual.hidden_fields[projectId]) {
        manual.hidden_fields[projectId] = {};
      }

      if (hidden) {
        manual.hidden_fields[projectId][field as 'due_date' | 'priority'] = true;
      } else {
        delete manual.hidden_fields[projectId][field as 'due_date' | 'priority'];
        if (Object.keys(manual.hidden_fields[projectId]).length === 0) {
          delete manual.hidden_fields[projectId];
        }
      }

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
