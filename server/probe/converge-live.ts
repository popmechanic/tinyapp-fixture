/**
 * The live convergence probe: a driver's pre- and post-deploy check against a
 * running server with the exam surface off. Two clients sync through the
 * todos facet, A writes a row, B converges to it, and a third fresh client C
 * converges too. It dials only the sync socket, never the exam surface.
 *
 *   bun probe/converge-live.ts [http://127.0.0.1:9876]
 */
import {createMergeableStore, type MergeableStore} from 'tinybase';
import {createWsSynchronizer} from 'tinybase/synchronizers/synchronizer-ws-client';

const base = process.argv[2] ?? 'http://127.0.0.1:9876';
const ws = base.replace(/^http/, 'ws');
const t0 = performance.now();
const ms = () => Math.round(performance.now() - t0);
const same = (a: MergeableStore, b: MergeableStore) => JSON.stringify(a.getContent()) === JSON.stringify(b.getContent());
const until = async (label: string, pred: () => boolean, limit = 10_000) => {
  const start = performance.now();
  while (!pred()) {
    if (performance.now() - start > limit) throw new Error(`${label}: not within ${limit} ms`);
    await Bun.sleep(20);
  }
  return Math.round(performance.now() - start);
};
const client = async (facet: string) => {
  const store = createMergeableStore();
  const sync = await createWsSynchronizer(store, new WebSocket(`${ws}/sync/${facet}`));
  await sync.startSync();
  return {store, sync};
};

// A fresh facet for this probe so a rerun starts empty.
const F = `todos@live-${Date.now().toString(36)}`;

const A = await client(F);
const B = await client(F);
const connect_ms = ms();
A.store.setRow('todos', '0', {text: 'buy milk', completed: false});
const sync_ms = await until('B equals A', () => same(A.store, B.store));

const C = await client(F);
const converge_ms = await until('C converges', () => same(A.store, C.store));

console.log(JSON.stringify({facet: F, connect_ms, sync_ms, converge_ms}));
for (const c of [A, B, C]) await c.sync.destroy();
process.exit(0);
