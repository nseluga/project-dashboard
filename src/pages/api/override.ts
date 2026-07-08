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

  const { projectId, field, value } = body as Record<string, unknown>;

  if (typeof projectId !== 'string' || projectId.trim() === '') {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing required field: projectId' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (typeof field !== 'string' || field.trim() === '') {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing required field: field' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (value !== null && typeof value !== 'string') {
    return new Response(
      JSON.stringify({ ok: false, error: 'value must be a string or null' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const manual = readManual();

  if (!manual.overrides[projectId]) {
    manual.overrides[projectId] = {};
  }

  if (value === null) {
    delete manual.overrides[projectId][field];
    if (Object.keys(manual.overrides[projectId]).length === 0) {
      delete manual.overrides[projectId];
    }
  } else {
    manual.overrides[projectId][field] = value;
  }

  writeManual(manual);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
};
