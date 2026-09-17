// Child of a test: a two-page session recorded through the root's events
// socket into a DoltLite history. Own process, for the reason converge.ts gives.
//   bun test/cases/record.ts <http-base> <module> <history-path>
import {openHistory} from '../../../packages/tinyapp-history/src/history';
import type {Snapshot} from '../../../packages/tinyapp-exam/src/types';
import {client, same, until} from '../clients';

type Transition = {module: string; seq: number; content: Snapshot; at: number};
const canon = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canon) : v !== null && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]))
    : v;
const text = (v: unknown): string => JSON.stringify(canon(v));

const [url, m, path] = [process.argv[2]!, process.argv[3]!, process.argv[4]!];
const ws = url.replace(/^http/, 'ws');
const seen: Transition[] = [];
const events = new WebSocket(`${ws}/exam/events`);
await new Promise<void>((ok, no) => {
  events.onopen = () => ok();
  events.onerror = () => no(new Error('events socket failed'));
});
events.onmessage = (e) => seen.push(JSON.parse(String(e.data)) as Transition);

const history = openHistory(path);
history.commit([{}, {}], 'seed', '2026-01-01T00:00:00Z');
const t0 = performance.now();
const a = await client(ws, m);
const b = await client(ws, m);
a.store.setRow('todos', '0', {text: 'buy milk', completed: false});
await until('B equals A', () => same(a.store, b.store));
b.store.setCell('todos', '0', 'completed', true);
await until('A equals B', () => same(a.store, b.store));
const last_report_ms = await until(
  'the module reported the completed row',
  () => seen.some((t) => t.module === m && t.content[0]['todos']?.['0']?.['completed'] === true),
);
const mine = seen.filter((t) => t.module === m).sort((x, y) => x.seq - y.seq);
for (const t of mine) history.commit(t.content, `seq ${t.seq}`, new Date(t.at).toISOString());
const log = history.log();
const truth = (await (await fetch(`${url}/exam/content?f=${m}`)).json()) as Snapshot;
const last = history.at(log[0]!.commit_hash);
history.close();
events.close();
await a.sync.destroy();
await b.sync.destroy();
const out = {
  transitions_reported: mine.length,
  commits: log.length,
  seq_contiguous: mine.every((t, i) => i === 0 || t.seq === mine[i - 1]!.seq + 1),
  last_equals_truth: text(last) === text(truth),
  truth_equals_page: text(truth) === text(a.store.getContent()),
  session_ms: Math.round(performance.now() - t0),
  last_report_ms,
};
console.log(JSON.stringify(out));
process.exit(out.transitions_reported >= 2 && out.commits >= 3 && out.last_equals_truth && out.truth_equals_page ? 0 : 1);
