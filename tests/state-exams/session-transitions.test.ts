/**
 * The exam for Task 2 — "The transition lister — a session's steps as candidate
 * exams, numbered for the pick".
 *
 * One `stateExam({…})` at column 0 for leg (a) — a file's whole state exam is
 * the single `stateExam` in it, as `clear-completed.test.ts` records — and every
 * other leg as an ordinary `bun:test` block beside it: `parseMessage`'s three
 * readings (b)–(d), the two walks of `listTransitions` (e)–(f), the three
 * renders of `renderTransitions` (g), and the Proof's one `Run:` line (h),
 * spawned as the Proof spells it.
 *
 * Four readings this file makes, written down because the Proof leaves them to
 * the reader:
 *
 *   - The module under exam is imported by relative path,
 *     `../../packages/tinyapp-history/src/transitions`, never by the bare name
 *     `tinyapp-history`: the package is linked into `node_modules` only by a
 *     `bun install` that has seen it, and this exam must be readable in a clone
 *     that has not run one.
 *   - `HistoryReader` is structural, so the readers here are plain objects
 *     spelling `log()` and `diff()` — no import of the real history module,
 *     which a sibling task owns and which does not exist at BASE. `LogEntry` and
 *     `DiffRow` are spelled out below, verbatim from the shared literal the
 *     Context quotes.
 *   - Leg (a)'s `listTransitions` call is made inside the action callback rather
 *     than at the file's top level. The Context allows either; inside, a
 *     `listTransitions` that yields nothing is this exam's red store move rather
 *     than a `TypeError` while the module loads, so the leg stays legible.
 *   - Every stub `log()` hands back a fresh array, the way a real reader that
 *     queries `dolt_log` does, so one leg's walk can never reach another's
 *     fixture.
 *
 * Nothing here pins a commit hash of a real recording: the stubs are the `c0`…
 * `c3` literals M2 and M3 name, and the one exam that touches the app reaches
 * its state through the store module's own callback.
 */

import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam, type Cell} from 'tinyapp-exam';

import {
  createTodosStore,
  setTodoCompleted,
  type TodosStore,
} from '../../client/src/storeData';
import {
  listTransitions,
  parseMessage,
  renderTransitions,
  type Transition,
} from '../../packages/tinyapp-history/src/transitions';

/** This file sits two directories below the repository root, which is `bun test`'s cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/** A child `bunx tsc` needs more than bun's default per-test 5 s. */
const SPAWN_TIMEOUT_MS = 120_000;

/** One row of `dolt_log`, verbatim from the shared literal the Context quotes. */
type LogEntry = {commit_hash: string; message: string};

/** One row of a DoltLite diff, verbatim from the shared literal the Context quotes. */
type DiffRow = {
  to_tbl: string | null;
  to_row: string | null;
  to_cell: string | null;
  to_value: string | null;
  to_commit: string;
  from_tbl: string | null;
  from_row: string | null;
  from_cell: string | null;
  from_value: string | null;
  from_commit: string;
  diff_type: 'added' | 'modified' | 'removed';
};

/** A stub reader, plus the `(from, to)` pairs its `diff` was asked for. */
type StubReader = {
  log(): LogEntry[];
  diff(from: string, to: string): DiffRow[];
  asked: [string, string][];
};

/**
 * The one `modified` row a stub's `diff` answers for a pair: `todos/0/completed`
 * moving from `'false'` to `'true'`, the two commits of the pair on its ends.
 */
const modifiedRow = (from: string, to: string): DiffRow => ({
  to_tbl: 'todos',
  to_row: '0',
  to_cell: 'completed',
  to_value: 'true',
  to_commit: to,
  from_tbl: 'todos',
  from_row: '0',
  from_cell: 'completed',
  from_value: 'false',
  from_commit: from,
  diff_type: 'modified',
});

/** The three-entry log of M2, newest first as `dolt_log` hands it. */
const THREE_ENTRY_LOG: LogEntry[] = [
  {commit_hash: 'c2', message: 'setTodoCompleted("0", true)'},
  {commit_hash: 'c1', message: 'seed'},
  {commit_hash: 'c0', message: 'Initialize data repository'},
];

/** The four-entry log of M2: `c3` `setFilter("done")` above the three. */
const FOUR_ENTRY_LOG: LogEntry[] = [
  {commit_hash: 'c3', message: 'setFilter("done")'},
  ...THREE_ENTRY_LOG,
];

/**
 * A reader over `entries`, answering one `modified` row for every pair and
 * recording the pairs it was asked for.
 */
const readerOver = (entries: LogEntry[]): StubReader => {
  const asked: [string, string][] = [];
  return {
    log: () => entries.map((entry) => ({...entry})),
    diff: (from: string, to: string) => {
      asked.push([from, to]);
      return [modifiedRow(from, to)];
    },
    asked,
  };
};

/**
 * The store module's own callbacks, by the name a recorded message carries.
 *
 * The cast widens the parameters a recorded argument list is spread into; the
 * value is `client/src/storeData.ts`'s own `setTodoCompleted` and nothing
 * wrapping it, so leg (a) runs the app's move and not a restatement of it.
 */
const callbacks: Record<string, (store: TodosStore, ...args: Cell[]) => void> = {
  setTodoCompleted: setTodoCompleted as (
    store: TodosStore,
    ...args: Cell[]
  ) => void,
};

/** The first line M3 spells over M2's first transition. */
const FIRST_LINE = '1. c1 --setTodoCompleted("0", true)--> c2 (1 change)';

/** The second line M3 spells over M2's second transition. */
const SECOND_LINE = '2. c2 --setFilter("done")--> c3 (1 change)';

/** Runs the Proof's `Run:` line from the repository root and returns its status. */
const runLine = (line: string): number => {
  const child = Bun.spawnSync({
    cmd: ['bash', '-c', line],
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (child.exitCode !== 0) {
    console.error(child.stdout.toString());
    console.error(child.stderr.toString());
  }
  return child.exitCode;
};

// --- M1: a recorded message read back into its call --------------------------

// Leg (b) [M1]: a message with arguments is the call's name and the arguments
// `JSON.parse`d back.
test('leg (b) [M1]: parseMessage(\'setTodoCompleted("0", true)\') is the call and its two arguments', () => {
  expect(parseMessage('setTodoCompleted("0", true)')).toEqual({
    name: 'setTodoCompleted',
    args: ['0', true],
  });
});

// Leg (c) [M1]: a message with no arguments is the call's name and an empty
// argument list — not `null`, and not a list holding one empty string.
test("leg (c) [M1]: parseMessage('clearCompleted()') is the call with no arguments", () => {
  expect(parseMessage('clearCompleted()')).toEqual({
    name: 'clearCompleted',
    args: [],
  });
});

// Leg (d) [M1]: the recorder's first commit, DoltLite's root, and a call whose
// argument is not a `Cell` are each read back as no call at all.
for (const message of ['seed', 'Initialize data repository', 'f([1])']) {
  test(`leg (d) [M1]: parseMessage(${JSON.stringify(message)}) is null`, () => {
    expect(parseMessage(message)).toBeNull();
  });
}

// --- M2: the walk of a log, oldest first -------------------------------------

// Leg (e) [M2]: over the three-entry log exactly one entry parses as a call, so
// exactly one transition comes back — its seed the entry immediately older
// (`seed`, whatever that message is), its expected the entry itself, and its
// changes what the reader answered for that pair.
test('leg (e) [M2]: over the three-entry log, listTransitions yields exactly the one transition c1 -> c2', () => {
  const reader = readerOver(THREE_ENTRY_LOG);

  const transitions = listTransitions(reader);

  expect(transitions).toHaveLength(1);
  expect(transitions[0]).toEqual({
    seed: 'c1',
    expected: 'c2',
    action: {name: 'setTodoCompleted', args: ['0', true]},
    message: 'setTodoCompleted("0", true)',
    changes: [modifiedRow('c1', 'c2')],
  });
});

// Leg (f) [M2]: a second call above the three yields a second transition, oldest
// first, whose seed is the call below it — and the reader's `diff` is asked for
// exactly the two pairs, in that order.
test('leg (f) [M2]: over the four-entry log, listTransitions yields two transitions and asks diff for exactly (c1, c2) then (c2, c3)', () => {
  const reader = readerOver(FOUR_ENTRY_LOG);

  const transitions = listTransitions(reader);

  expect(transitions).toHaveLength(2);
  expect(transitions[0]?.seed).toBe('c1');
  expect(transitions[1]?.seed).toBe('c2');
  expect(transitions[1]?.expected).toBe('c3');
  expect(reader.asked).toEqual([
    ['c1', 'c2'],
    ['c2', 'c3'],
  ]);
});

// --- M3: the numbered lines the pick is made from ----------------------------

// Leg (g) [M3]: one line per transition, numbered from 1, joined by `\n`, each
// line the seed's first eight characters, the message, the expected's first
// eight, and the row count — `change` at one row, `changes` at any other.
test('leg (g) [M3]: renderTransitions is the numbered lines M3 spells, exactly', () => {
  // Over leg (e)'s list: the one line, on its own.
  const one = listTransitions(readerOver(THREE_ENTRY_LOG));
  expect(renderTransitions(one)).toBe(FIRST_LINE);

  // Over leg (f)'s list: that line, `\n`, then the second.
  const two = listTransitions(readerOver(FOUR_ENTRY_LOG));
  expect(renderTransitions(two)).toBe(`${FIRST_LINE}\n${SECOND_LINE}`);

  // A transition whose `changes` holds two rows counts them, and says `changes`.
  const twoRows: Transition = {
    seed: 'c1',
    action: {name: 'clearCompleted', args: []},
    expected: 'c2',
    message: 'clearCompleted()',
    changes: [modifiedRow('c1', 'c2'), modifiedRow('c1', 'c2')],
  };
  expect(renderTransitions([twoRows])).toBe(
    '1. c1 --clearCompleted()--> c2 (2 changes)',
  );

  // And a hash longer than eight characters is cut to its first eight on both
  // ends — M3's `<seed's first 8 characters>`, which a stub hash never shows.
  const longHashes: Transition = {
    seed: '0123456789abcdef',
    action: {name: 'clearCompleted', args: []},
    expected: 'fedcba9876543210',
    message: 'clearCompleted()',
    changes: [modifiedRow('0123456789abcdef', 'fedcba9876543210')],
  };
  expect(renderTransitions([longHashes])).toBe(
    '1. 01234567 --clearCompleted()--> fedcba98 (1 change)',
  );
});

// --- M2: the module stands alone under the package's flags -------------------

// Leg (h) [M2], the Proof's `Run:` line: the module typechecks by itself, with
// no `packages/tinyapp-history/tsconfig.json` to carry the flags for it.
test(
  'leg (h) [M2]: the Run line typechecks transitions.ts alone under the package flags',
  () => {
    expect(
      runLine(
        'bunx tsc --noEmit --strict --skipLibCheck --types bun --module esnext --moduleResolution bundler --target es2022 packages/tinyapp-history/src/transitions.ts',
      ),
    ).toBe(0);
  },
  SPAWN_TIMEOUT_MS,
);

// --- M4: the call a transition names is one the app performs -----------------

// Leg (a) [M4]: the transition M2 lists over the three-entry stub, run by name
// through the store module's own callbacks, carries the page's seed of two open
// todos to the expected state — the first row done, the second untouched — the
// rendered page shows exactly two rows with the completed one ticked, and the
// mutant that unticks row `'0'` again is killed.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: (store) => {
    const transition = listTransitions(readerOver(THREE_ENTRY_LOG))[0];
    if (transition === undefined) {
      throw new Error(
        'listTransitions listed no transition over the three-entry log of M2',
      );
    }
    const call = callbacks[transition.action.name];
    if (call === undefined) {
      throw new Error(
        `the listed call ${transition.action.name} is not one the app performs`,
      );
    }
    call(store, ...transition.action.args);
  },
  expected: 'state-exams/expected/two-todos-first-done.json',
  view: [
    {selector: '#todoList li[data-completed="true"] [role=checkbox]', checked: true},
    {selector: '#todoList li', count: 2},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: false}],
});
