import { readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import type { ManualData } from '../types/manual.js';

const MANUAL_PATH = () => join(process.cwd(), 'data', 'manual.json');
const MANUAL_TMP_PATH = () => join(process.cwd(), 'data', 'manual.json.tmp');

const EMPTY_MANUAL: ManualData = {
  overrides: {},
  due_dates: {},
  inbox: [],
  hidden_fields: {},
};

export function readManual(): ManualData {
  const filePath = MANUAL_PATH();
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return { overrides: {}, due_dates: {}, inbox: [], hidden_fields: {} };
    }
    throw new Error(`[manual] failed to read ${filePath}: ${(e as Error).message}`);
  }

  let parsed: Partial<ManualData>;
  try {
    parsed = JSON.parse(raw) as Partial<ManualData>;
  } catch (e) {
    throw new Error(`[manual] failed to parse ${filePath}: ${(e as Error).message}`);
  }

  return {
    overrides: { ...(parsed.overrides ?? {}) },
    due_dates: { ...(parsed.due_dates ?? {}) },
    inbox: [...(parsed.inbox ?? [])],
    hidden_fields: Object.fromEntries(Object.entries(parsed.hidden_fields ?? {}).map(([k, v]) => [k, { ...v }])),
  };
}

export function writeManual(data: ManualData): void {
  const filePath = MANUAL_PATH();
  const tmpPath = MANUAL_TMP_PATH();
  const serialized = JSON.stringify(data, null, 2) + '\n';

  try {
    writeFileSync(tmpPath, serialized, 'utf-8');
    renameSync(tmpPath, filePath);
  } catch (e) {
    throw new Error(`[manual] failed to write ${filePath}: ${(e as Error).message}`);
  }
}

export { EMPTY_MANUAL };
