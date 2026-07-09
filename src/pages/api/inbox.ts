import type { APIRoute } from 'astro';
import { readManual, writeManual } from '../../lib/manual.js';
import { manualMutex } from '../../lib/mutex.js';
import type { InboxItem } from '../../types/manual.js';

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

  const { text, project } = body as Record<string, unknown>;

  if (typeof text !== 'string' || text.trim() === '') {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing required field: text' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (text.length > 500) {
    return new Response(
      JSON.stringify({ ok: false, error: 'text must be 500 characters or fewer' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const item: InboxItem = {
    id: crypto.randomUUID(),
    text,
    created: new Date().toISOString(),
    project: typeof project === 'string' ? project : null,
    done: false,
  };

  try {
    return await manualMutex.runExclusive(async () => {
      const manual = readManual();
      manual.inbox.push(item);
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
      const index = manual.inbox.findIndex((item) => item.id === id);

      if (index === -1) {
        return new Response(
          JSON.stringify({ ok: false, error: `inbox item not found: ${id}` }),
          { status: 404, headers: JSON_HEADERS },
        );
      }

      manual.inbox.splice(index, 1);
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
