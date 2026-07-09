import type { APIRoute } from 'astro';
import { readManual, writeManual } from '../../lib/manual.js';
import { manualMutex } from '../../lib/mutex.js';
import type { TokenLogEntry } from '../../types/manual.js';

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

  const { projectId, tokens, note } = body as Record<string, unknown>;

  if (typeof projectId !== 'string' || projectId.trim() === '') {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing required field: projectId' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const tokensNum = Number(tokens);
  if (!Number.isInteger(tokensNum) || tokensNum <= 0) {
    return new Response(
      JSON.stringify({ ok: false, error: 'tokens must be a positive integer' }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const entry: TokenLogEntry = {
    id: crypto.randomUUID(),
    projectId,
    tokens: tokensNum,
    note: typeof note === 'string' && note.trim() !== '' ? note.trim() : null,
    created: new Date().toISOString(),
  };

  try {
    return await manualMutex.runExclusive(async () => {
      const manual = readManual();
      manual.token_log.push(entry);
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
      const index = manual.token_log.findIndex((entry) => entry.id === id);

      if (index === -1) {
        return new Response(
          JSON.stringify({ ok: false, error: `token log entry not found: ${id}` }),
          { status: 404, headers: JSON_HEADERS },
        );
      }

      manual.token_log.splice(index, 1);
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
