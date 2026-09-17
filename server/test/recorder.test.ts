// The recorder: in exam mode every finished transaction of a module object is
// reported to the root, the root hands it to the harness over `/exam/events`,
// and the harness commits each one into a DoltLite history — one history for a
// two-page session, the truth's history, DoltLite never inside the app. The
// session itself runs in a child process (test/cases/record.ts): the client
// tests mock TinyBase's ws client for the life of this process.
import {afterAll, beforeAll, expect, test} from 'bun:test';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {startCelld, type Celld} from './celld';
import {runCase} from './child';

let on: Celld;
beforeAll(async () => {
  on = await startCelld({exam: true});
}, 90_000);
afterAll(async () => {
  await on?.stop();
}, 30_000);

test('a two-page session is one history of the module object', async () => {
  const m = `todos@rec-${Date.now().toString(36)}`;
  const dir = mkdtempSync(join(tmpdir(), 'tinyapp-history-'));
  try {
    const r = await runCase('record', on.url, m, join(dir, 'session.doltlite'));
    console.log(JSON.stringify(r.out));
    expect([r.code, r.err.trim()]).toEqual([0, '']);
    expect(r.out['seq_contiguous']).toBe(true);
    expect(r.out['last_equals_truth']).toBe(true);
    expect(r.out['truth_equals_page']).toBe(true);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
}, 60_000);
