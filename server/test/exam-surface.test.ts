// The exam surface is off unless the runtime carries the exam flag, and sync
// works either way. Production is the flag-off case: a deploy never carries
// `.dev.vars`, so every `/exam/*` verb answers 404 there while `/sync/<module>`
// serves. Two celld instances, one per case, each on its own ports.
import {afterAll, beforeAll, expect, test} from 'bun:test';

import {startCelld, type Celld} from './celld';
import {runCase} from './child';

const VERBS = ['content?f=todos', 'rows?f=todos', 'fork?from=todos&to=todos@x', 'reload?f=todos', 'discard?f=todos@x', 'events', 'transition'];

let off: Celld;
beforeAll(async () => {
  off = await startCelld({exam: false});
}, 90_000);
afterAll(async () => {
  await off?.stop();
}, 30_000);

test('flag off: every exam verb is 404', async () => {
  for (const verb of VERBS) {
    const r = await fetch(`${off.url}/exam/${verb}`, verb === 'transition' ? {method: 'POST', body: '{}'} : undefined);
    expect([verb, r.status]).toEqual([verb, 404]);
  }
}, 30_000);

test('flag off: two clients still converge through the module object', async () => {
  // In a child process: the client tests mock TinyBase's ws client for the
  // life of this process, and a harness has to dial the real one.
  const m = `todos@off-${Date.now().toString(36)}`;
  const r = await runCase('converge', off.ws, m);
  console.log(JSON.stringify({flag: 'off', ...r.out}));
  expect([r.code, r.err.trim()]).toEqual([0, '']);
  expect(r.out['text']).toBe('buy milk');
}, 30_000);

test('flag on: the same verb answers 200', async () => {
  const on = await startCelld({exam: true});
  try {
    const r = await fetch(`${on.url}/exam/content?f=todos`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual([{}, {}]);
  } finally {
    await on.stop();
  }
}, 90_000);
