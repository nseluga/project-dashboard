import { Mutex } from 'async-mutex';

/** Single write-lock shared by all API route handlers that read-modify-write manual.json. */
export const manualMutex = new Mutex();
