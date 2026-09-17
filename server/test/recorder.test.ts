// The recorder: in exam mode every finished transaction of a module object is
// reported to the root, the root hands it to the harness over `/exam/events`,
// and the harness commits each one into a DoltLite history — one history for a
// two-page session, the truth's history, DoltLite never inside the app.
import {afterAll, beforeAll, expect, test} from 'bun:test';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// `history` directly, not the package index: the index re-exports the fixture
// session, whose client import needs a DOM lib this workspace does not carry.
import {openHistory} from '../../packages/tinyapp-history/src/history';
import type {Snapshot} from '../../packages/tinyapp-exam/src/types';

import {startCelld, type Celld} from './celld';
import {client, same, until} from './clients';

type Transition = {module: string; seq: number; content: Snapshot; at: number};

/** A snapshot with every object's keys sorted — the history reads back in key order, the store in write order. */
const canon = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canon) : v !== null && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]))
    : v;
const text = (v: unknown): string => JSON.stringify(canon(v));

let on: Celld;
beforeAll(async () => {
  on = await startCelld({exam: true});
}, 90_000);
afterAll(async () => {
  await on?.stop();
});

test('a two-page session is one history of the module object', async () => {
  const m = `todos@rec-${Date.now().toString(36)}`;
  const seen: Transition[] = [];
  const events = new WebSocket(`${on.ws}/exam/events`);
  await new Promise<void>((ok, no) => {
    events.onopen = () => ok();
    events.onerror = (e) => no(new Error(`events socket: ${String((e as ErrorEvent).message ?? e)}`));
  });
  events.onmessage = (e) => seen.push(JSON.parse(String(e.data)) as Transition);

  const dir = mkdtempSync(join(tmpdir(), 'tinyapp-history-'));
  const history = openHistory(join(dir, 'session.doltlite'));
  history.commit([{}, {}], 'seed', '2026-01-01T00:00:00Z');

  const t0 = performance.now();
  const a = await client(on.ws, m);
  const b = await client(on.ws, m);
  a.store.setRow('todos', '0', {text: 'buy milk', completed: false});
  await until('B equals A', () => same(a.store, b.store));
  b.store.setCell('todos', '0', 'completed', true);
  await until('A equals B', () => same(a.store, b.store));
  // The module reports asynchronously through SELF; wait for the last state.
  const lastMs = await until(
    'the module reported the completed row',
    () => seen.some((t) => t.module === m && t.content[0]['todos']?.['0']?.['completed'] === true),
  );
  const mine = seen.filter((t) => t.module === m).sort((x, y) => x.seq - y.seq);
  for (const t of mine) history.commit(t.content, `seq ${t.seq}`, new Date(t.at).toISOString());
  const log = history.log();
  const truth = (await (await fetch(`${on.url}/exam/content?f=${m}`)).json()) as Transition['content'];
  const last = history.at(log[0]!.commit_hash);
  history.close();
  events.close();
  await a.sync.destroy();
  await b.sync.destroy();
  rmSync(dir, {recursive: true, force: true});

  console.log(JSON.stringify({
    transitions_reported: mine.length,
    commits: log.length,
    seq_contiguous: mine.every((t, i) => i === 0 || t.seq === mine[i - 1]!.seq + 1),
    session_ms: Math.round(performance.now() - t0),
    last_report_ms: lastMs,
  }));
  expect(mine.length).toBeGreaterThanOrEqual(2);
  expect(log.length).toBeGreaterThanOrEqual(3);
  expect(text(last)).toBe(text(truth));
  expect(text(truth)).toBe(text(a.store.getContent()));
}, 60_000);
