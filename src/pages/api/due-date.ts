import type { APIRoute } from 'astro';
import { readManual, writeManual } from '../../lib/manual.js';

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

  const manual = readManual();

  if (date === null) {
    delete manual.due_dates[projectId];
  } else {
    manual.due_dates[projectId] = date;
  }

  writeManual(manual);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
};
