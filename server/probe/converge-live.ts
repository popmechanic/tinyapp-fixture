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

// Wait for the origin itself to answer before dialing its sync socket: a
// server started a few seconds after the probe (or after a slow boot) is
// otherwise indistinguishable from one that will never come up.
const ready = async (origin: string, budgetMs = 30_000) => {
  while (true) {
    try {
      const res = await fetch(`${origin}/`);
      if (res.ok) return ms();
    } catch {
      // origin not accepting connections yet
    }
    if (performance.now() - t0 > budgetMs) throw new Error(`origin not answering within ${budgetMs} ms`);
    await Bun.sleep(500);
  }
};

// Retry opening a client within the remainder of the same budget: the root
// route can answer before the sync socket is ready to accept upgrades.
const clientWithRetry = async (facet: string, deadline: number) => {
  while (true) {
    try {
      return await client(facet);
    } catch (err) {
      if (performance.now() > deadline) throw err;
      await Bun.sleep(500);
    }
  }
};

// Overall budget for the whole run, including retried attempts. `ready`
// keeps its own 30 s sub-budget: a root that never answers is not retried
// as a convergence failure, it fails on its own terms.
const budgetMs = 90_000;
const deadline = t0 + budgetMs;
const ready_ms = await ready(base, 30_000);

// A fresh facet stamp for this run; each attempt gets its own facet suffix
// so a retried attempt never sees state left over from a prior one.
const stamp = Date.now().toString(36);

type Client = Awaited<ReturnType<typeof client>>;

// One convergence attempt: open A and B on a fresh facet, write a row on A,
// wait for B to see it, then open a fresh C and wait for it to converge
// too. On any throw, every client this attempt opened is destroyed (each
// destroy in its own try, best effort) before the error propagates.
const attempt = async (n: number) => {
  const start = performance.now();
  const facet = `todos@live-${stamp}-${n}`;
  const opened: Client[] = [];
  try {
    const A = await clientWithRetry(facet, deadline);
    opened.push(A);
    const B = await client(facet);
    opened.push(B);
    const connect_ms = Math.round(performance.now() - start);
    A.store.setRow('todos', '0', {text: 'buy milk', completed: false});
    // The first sync after a deploy is where a fresh server spends its
    // time, so give it the bulk of the budget.
    const sync_ms = await until('B equals A', () => same(A.store, B.store), 30_000);

    const C = await client(facet);
    opened.push(C);
    const converge_ms = await until('C converges', () => same(A.store, C.store), 10_000);

    for (const c of opened) await c.sync.destroy();
    return {facet, connect_ms, sync_ms, converge_ms};
  } catch (err) {
    for (const c of opened) {
      try {
        await c.sync.destroy();
      } catch {
        // best-effort cleanup; the original error is what matters
      }
    }
    throw err;
  }
};

let attempts = 0;
let result: {facet: string; connect_ms: number; sync_ms: number; converge_ms: number} | undefined;
const tries: Array<{n: number; ms: number; error?: string}> = [];
while (true) {
  attempts++;
  const triedAt = performance.now();
  try {
    result = await attempt(attempts);
    tries.push({n: attempts, ms: Math.round(performance.now() - triedAt)});
    break;
  } catch (err) {
    tries.push({
      n: attempts,
      ms: Math.round(performance.now() - triedAt),
      error: String((err as {message?: unknown})?.message ?? err),
    });
    if (deadline - performance.now() >= 2_000) {
      await Bun.sleep(2_000);
      continue;
    }
    break;
  }
}

if (result) {
  console.log(
    JSON.stringify({
      facet: result.facet,
      attempts,
      ready_ms,
      connect_ms: result.connect_ms,
      sync_ms: result.sync_ms,
      converge_ms: result.converge_ms,
      converged: true,
      tries,
    }),
  );
  process.exit(0);
} else {
  console.log(
    JSON.stringify({
      facet: null,
      attempts,
      ready_ms,
      connect_ms: null,
      sync_ms: null,
      converge_ms: null,
      converged: false,
      tries,
    }),
  );
  process.exit(1);
}
