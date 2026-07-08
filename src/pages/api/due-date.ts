import type { APIRoute } from 'astro';
import { readManual, writeManual } from '../../lib/manual.js';
import { manualMutex } from '../../lib/mutex.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

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

  const { projectId, date } = body as Record<string, unknown>;

  if (typeof projectId !== 'string' || projectId.trim() === '') {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing required field: projectId' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (date !== null && typeof date !== 'string') {
    return new Response(
      JSON.stringify({ ok: false, error: 'date must be a string or null' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'date must be YYYY-MM-DD' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  try {
    return await manualMutex.runExclusive(async () => {
      const manual = readManual();

      if (date === null) {
        delete manual.due_dates[projectId];
      } else {
        manual.due_dates[projectId] = date;
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
