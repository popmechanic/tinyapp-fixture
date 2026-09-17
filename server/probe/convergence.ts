/**
 * The convergence probe, by hand: two clients sync through the todos facet on
 * a running `celld dev`, A acts, B converges, the facet's rows and content are
 * read through the root's exam surface, a fork is taken from the live facet,
 * written to, and discarded, and a third fresh client converges to the truth.
 *
 *   bun probe/convergence.ts [http://127.0.0.1:9876]
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
const exam = async (verb: string, q: Record<string, string>) => {
  const r = await fetch(`${base}/exam/${verb}?${new URLSearchParams(q)}`);
  if (!r.ok) throw new Error(`${verb}: ${r.status} ${await r.text()}`);
  return r.headers.get('content-type')?.includes('json') ? r.json() : r.text();
};

// A fresh facet for this probe so a rerun starts empty.
const F = `todos@probe-${Date.now().toString(36)}`;
const walls: Record<string, number> = {};

const A = await client(F);
const B = await client(F);
walls.connect_ms = ms();
const before = performance.now();
A.store.setRow('todos', '0', {text: 'buy milk', completed: false});
walls.sync_ms = await until('B equals A', () => same(A.store, B.store));
B.store.setCell('todos', '0', 'completed', true);
walls.sync_back_ms = await until('A equals B', () => same(A.store, B.store));
void before;

const content = (await exam('content', {f: F})) as unknown;
const rows = (await exam('rows', {f: F})) as Record<string, unknown[]>;
const facetEqualsA = JSON.stringify(content) === JSON.stringify(A.store.getContent());
console.log('facet content equals A:', facetEqualsA);
console.log('facet tables:', Object.fromEntries(Object.entries(rows).map(([t, r]) => [t, r.length])));

const fork = `${F}-fork`;
const f0 = performance.now();
const forked = (await exam('fork', {from: F, to: fork})) as unknown;
walls.fork_ms = Math.round(performance.now() - f0);
console.log('fork content equals source:', JSON.stringify(forked) === JSON.stringify(content));
const X = await client(fork);
await until('X sees the fork', () => X.store.getCell('todos', '0', 'text') === 'buy milk');
X.store.setRow('todos', '1', {text: 'only in the fork', completed: false});
const hasRow1 = async () => {
  const c = (await exam('content', {f: fork})) as [Record<string, Record<string, unknown>>, unknown];
  return c[0].todos?.['1'] !== undefined;
};
const w0 = performance.now();
let seen = false;
while (performance.now() - w0 < 10_000 && !(seen = await hasRow1())) await Bun.sleep(50);
walls.fork_write_visible_ms = Math.round(performance.now() - w0);
console.log('fork has row 1 (through the socket, read via the exam surface):', seen);
const sourceAfter = (await exam('content', {f: F})) as unknown;
console.log('source unchanged by the fork write:', JSON.stringify(sourceAfter) === JSON.stringify(content));
console.log(await exam('discard', {f: fork}));

const C = await client(F);
walls.converge_ms = await until('C converges', () => same(A.store, C.store));
const reloaded = (await exam('reload', {f: F})) as unknown;
console.log('reload keeps state:', JSON.stringify(reloaded) === JSON.stringify(A.store.getContent()));
console.log(JSON.stringify(walls));
for (const c of [A, B, X, C]) await c.sync.destroy();
process.exit(0);
