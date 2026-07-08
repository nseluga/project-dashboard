import { readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import type { ManualData } from '../types/manual.js';

const MANUAL_PATH = () => join(process.cwd(), 'data', 'manual.json');
const MANUAL_TMP_PATH = () => join(process.cwd(), 'data', 'manual.json.tmp');

const EMPTY_MANUAL: ManualData = {
  overrides: {},
  due_dates: {},
  inbox: [],
};

export function readManual(): ManualData {
  const filePath = MANUAL_PATH();
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return { overrides: {}, due_dates: {}, inbox: [] };
    }
    throw new Error(`[manual] failed to read ${filePath}: ${(e as Error).message}`);
  }

  try {
    return JSON.parse(raw) as ManualData;
  } catch (e) {
    throw new Error(`[manual] failed to parse ${filePath}: ${(e as Error).message}`);
  }
}

export function writeManual(data: ManualData): void {
  const filePath = MANUAL_PATH();
  const tmpPath = MANUAL_TMP_PATH();
  const serialized = JSON.stringify(data, null, 2) + '\n';

  writeFileSync(tmpPath, serialized, 'utf-8');
  renameSync(tmpPath, filePath);
}

export { EMPTY_MANUAL };
