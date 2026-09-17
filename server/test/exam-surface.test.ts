// The exam surface is off unless the runtime carries the exam flag, and sync
// works either way. Production is the flag-off case: a deploy never carries
// `.dev.vars`, so every `/exam/*` verb answers 404 there while `/sync/<module>`
// serves. Two celld instances, one per case, each on its own ports.
import {afterAll, beforeAll, expect, test} from 'bun:test';

import {startCelld, type Celld} from './celld';
import {client, same, until} from './clients';

const VERBS = ['content?f=todos', 'rows?f=todos', 'fork?from=todos&to=todos@x', 'reload?f=todos', 'discard?f=todos@x', 'events', 'transition'];

let off: Celld;
beforeAll(async () => {
  off = await startCelld({exam: false});
}, 90_000);
afterAll(async () => {
  await off?.stop();
});

test('flag off: every exam verb is 404', async () => {
  for (const verb of VERBS) {
    const r = await fetch(`${off.url}/exam/${verb}`, verb === 'transition' ? {method: 'POST', body: '{}'} : undefined);
    expect([verb, r.status]).toEqual([verb, 404]);
  }
}, 30_000);

test('flag off: two clients still converge through the module object', async () => {
  const m = `todos@off-${Date.now().toString(36)}`;
  const a = await client(off.ws, m);
  const b = await client(off.ws, m);
  a.store.setRow('todos', '0', {text: 'buy milk', completed: false});
  const ms = await until('B equals A', () => same(a.store, b.store));
  expect(b.store.getCell('todos', '0', 'text')).toBe('buy milk');
  console.log(JSON.stringify({flag: 'off', sync_ms: ms}));
  await a.sync.destroy();
  await b.sync.destroy();
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
