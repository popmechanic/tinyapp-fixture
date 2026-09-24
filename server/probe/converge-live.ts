/**
 * The live convergence probe: point it at a running server (exam surface may
 * be off) and it dials two clients through /sync/<facet>, has A write a row,
 * waits for B to converge, then opens a fresh third client C and waits for it
 * to converge too. Prints the walls as one JSON line and exits 0, or throws
 * (and exits non-zero) if a socket never opens or a wait runs past its limit.
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
const facet = `todos@live-${Date.now().toString(36)}`;
const walls: Record<string, number> = {};

const A = await client(facet);
const B = await client(facet);
walls.connect_ms = ms();
A.store.setRow('todos', '0', {text: 'buy milk', completed: false});
walls.sync_ms = await until('B equals A', () => same(A.store, B.store));

const C = await client(facet);
walls.converge_ms = await until('C equals A', () => same(A.store, C.store));

console.log(JSON.stringify({facet, connect_ms: walls.connect_ms, sync_ms: walls.sync_ms, converge_ms: walls.converge_ms}));
for (const c of [A, B, C]) await c.sync.destroy();
process.exit(0);
