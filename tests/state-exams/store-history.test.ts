/**
 * The exam for Task 1 — "The history writer — the store's content committed to
 * a DoltLite file on every recorded callback".
 *
 * One `stateExam` call (leg a), because a file's whole state exam is the single
 * `stateExam` in it. Everything the state exam cannot express is an ordinary
 * `bun:test` block beside it, each one opening its own history on its own fresh
 * temp path: the file the writer creates (b), the log a recorded session leaves
 * (c), the refused call that leaves none (d), the snapshots read back (e), the
 * diffs between them (f), the two halves of the contract (g, h), the message
 * spelling (i) and the two `Run:` lines (j).
 *
 * Four readings this file makes, written down because the Proof leaves them to
 * the reader:
 *
 *   - Leg (b) asks for a *second* `DatabaseSync` on the same path, so that leg
 *     — and only that leg — loads `@dolthub/doltlite` by bare name, with
 *     `await import`. The history package itself is imported by relative path,
 *     since a bare `tinyapp-history` is linked into `node_modules` only by a
 *     `bun install` that has seen the new package; loading DoltLite inside the
 *     leg keeps the history module the one thing this file's load depends on,
 *     so a run before the implementation exists names that module and nothing
 *     else.
 *   - Legs (c) and (d) record two separate sessions rather than one. (c) is the
 *     two calls alone; (d) is the same two with `addTodo('')` between them.
 *     Folding the refused call into (c) would have made (c) assert something
 *     (c) does not say.
 *   - No commit hash is written down anywhere here. Every hash a leg uses is
 *     the one the call that made it resolved to, used in the same process; what
 *     is pinned is messages, counts, and the content `at()` reads back.
 *   - The `$values` row of leg (f) is asserted through `history.diff()` and not
 *     through SQL, because it is the module's own mapping of a `dolt_diff_vals`
 *     row into the `cells` shape — `dolt_diff_cells` says nothing about it.
 */

import {existsSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import {
  addTodo,
  createTodosStore,
  setFilter,
  setTodoCompleted,
  type TodosStore,
} from '../../client/src/storeData';
import {
  messageOf,
  openHistory,
  recordSession,
  type History,
} from '../../packages/tinyapp-history/src/history';

// Erased before the module is resolved, so the one module this file's load
// depends on is the history module itself; the class is loaded where leg (b)
// needs it, which is the only place this exam opens DoltLite for itself.
import type {DatabaseSync} from '@dolthub/doltlite';

/** This file sits two directories below the repository root, which is `bun test`'s cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/** The clock every exam of this file runs under. */
const CLOCK = '2026-01-01T00:00:00Z';

/** `Date.parse(CLOCK)` — what `Date.now()` reads inside a recorded callback. */
const PINNED_NOW = 1767225600000;

/** A commit hash as DoltLite spells it: 40 lowercase hexadecimal characters. */
const HASH = /^[0-9a-f]{40}$/;

/** A history's own tests are quick, but a native open on a cold image is not. */
const HISTORY_TIMEOUT_MS = 30_000;

/** A `tsc` over a package needs more than bun's default per-test 5 s. */
const SPAWN_TIMEOUT_MS = 180_000;

/** A path no file sits at yet, in a directory of this run's own. */
const freshPath = (): string =>
  join(mkdtempSync(join(tmpdir(), 'tinyapp-history-')), 'history.dolt');

/** A history on a fresh temp path — one per test, never shared. */
const freshHistory = (): History => openHistory(freshPath());

/** The three callbacks M2 records, spelled once. */
const CALLBACKS = {addTodo, setTodoCompleted, setFilter};

/** A fresh empty store, a fresh history, and a session recording over both. */
const recorded = () => {
  const history = freshHistory();
  const session = recordSession(
    createTodosStore([{}, {}]),
    history,
    CALLBACKS,
    CLOCK,
  );
  return {history, session};
};

/** Runs one Proof `Run:` line from the repository root and returns its status. */
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

/** The `name` and `pk` of each column a `PRAGMA table_info` row reports. */
const columnsOf = (db: DatabaseSync, table: string): {name: string; pk: number}[] =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as {name: string; pk: number}[]).map(
    ({name, pk}) => ({name, pk}),
  );

// --- M1: the file the writer opens, and the two tables in it -----------------

// Leg (b) [M1]: `openHistory` on a fresh temp path creates the file and leaves
// a log of exactly one entry, `Initialize data repository`; a second
// `DatabaseSync` on the same path sees exactly the two tables of the schema,
// with the primary keys the schema spells.
test(
  'leg (b) [M1] openHistory creates the file, its log is exactly the root commit, and the file holds cells and vals',
  async () => {
    const {DatabaseSync} = await import('@dolthub/doltlite');
    const path = freshPath();
    expect(existsSync(path)).toBe(false);

    const history = openHistory(path);
    try {
      expect(existsSync(path)).toBe(true);
      expect(history.path).toBe(path);

      const log = history.log();
      expect(log).toHaveLength(1);
      expect(log[0]!.message).toBe('Initialize data repository');

      const db = new DatabaseSync(path);
      try {
        expect(
          db
            .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name")
            .all(),
        ).toEqual([{name: 'cells'}, {name: 'vals'}]);

        expect(columnsOf(db, 'cells')).toEqual([
          {name: 'tbl', pk: 1},
          {name: 'row', pk: 2},
          {name: 'cell', pk: 3},
          {name: 'value', pk: 0},
        ]);

        expect(columnsOf(db, 'vals')).toEqual([
          {name: 'name', pk: 1},
          {name: 'value', pk: 0},
        ]);
      } finally {
        db.close();
      }
    } finally {
      history.close();
    }
  },
  HISTORY_TIMEOUT_MS,
);

// --- M2: one commit per call that moved the store ----------------------------

// Leg (c) [M2]: from `createTodosStore([{}, {}])`, each of the two recorded
// calls resolves to a 40-hex hash and the log reads, newest first, exactly the
// two messages, the `seed` commit and the root commit.
test(
  'leg (c) [M2] two recorded calls each resolve to a 40-hex hash and the log is exactly the four messages',
  async () => {
    const {history, session} = recorded();
    try {
      const first = await session.addTodo('buy milk');
      const second = await session.setTodoCompleted('0', true);

      expect(typeof first).toBe('string');
      expect(first).toMatch(HASH);
      expect(typeof second).toBe('string');
      expect(second).toMatch(HASH);

      expect(history.log().map(({message}) => message)).toEqual([
        'setTodoCompleted("0", true)',
        'addTodo("buy milk")',
        'seed',
        'Initialize data repository',
      ]);
    } finally {
      history.close();
    }
  },
  HISTORY_TIMEOUT_MS,
);

// --- M3: a call that moved nothing commits nothing ---------------------------

// Leg (d) [M3]: `addTodo('')` — refused by the app — resolves to `null` between
// the two calls of (c), and the log is still those four entries, with no
// `addTodo("")` among them.
test(
  'leg (d) [M3] a recorded addTodo("") resolves to null and adds no log entry',
  async () => {
    const {history, session} = recorded();
    try {
      const first = await session.addTodo('buy milk');
      const refused = await session.addTodo('');
      const second = await session.setTodoCompleted('0', true);

      expect(refused).toBeNull();
      expect(first).toMatch(HASH);
      expect(second).toMatch(HASH);

      const log = history.log();
      expect(log).toHaveLength(4);
      expect(log.map(({message}) => message)).toEqual([
        'setTodoCompleted("0", true)',
        'addTodo("buy milk")',
        'seed',
        'Initialize data repository',
      ]);
    } finally {
      history.close();
    }
  },
  HISTORY_TIMEOUT_MS,
);

// --- M4: a commit read back as the state the store was in --------------------

// Leg (e) [M4]: `at` of each call's hash is the `[tables, values]` snapshot as
// it was committed, and after a further `setFilter('done')` the values half of
// that commit is exactly `{filter: 'done'}`.
test(
  'leg (e) [M4] at(hash) is the snapshot the store was in when that call committed',
  async () => {
    const {history, session} = recorded();
    try {
      const first = await session.addTodo('buy milk');
      const second = await session.setTodoCompleted('0', true);

      expect(history.at(first!)).toEqual([
        {todos: {'0': {text: 'buy milk', completed: false}}},
        {},
      ]);
      expect(history.at(second!)).toEqual([
        {todos: {'0': {text: 'buy milk', completed: true}}},
        {},
      ]);

      const third = await session.setFilter('done');
      expect(third).toMatch(HASH);
      expect(history.at(third!)[1]).toEqual({filter: 'done'});
    } finally {
      history.close();
    }
  },
  HISTORY_TIMEOUT_MS,
);

// --- M5: one row per changed cell, values among them -------------------------

// Leg (f) [M5]: the diff between the two calls of (c) is exactly the one
// changed cell, and the diff between that and the `setFilter('done')` commit is
// exactly the one added store value, reported with `$values` as its table and
// the empty string as its row.
test(
  'leg (f) [M5] diff is one row per changed cell, a changed value among them under $values',
  async () => {
    const {history, session} = recorded();
    try {
      const first = await session.addTodo('buy milk');
      const second = await session.setTodoCompleted('0', true);
      const third = await session.setFilter('done');

      const firstToSecond = history.diff(first!, second!);
      expect(firstToSecond).toHaveLength(1);
      expect(firstToSecond[0]).toMatchObject({
        diff_type: 'modified',
        to_tbl: 'todos',
        to_row: '0',
        to_cell: 'completed',
        from_value: 'false',
        to_value: 'true',
      });

      const secondToThird = history.diff(second!, third!);
      expect(secondToThird).toHaveLength(1);
      expect(secondToThird[0]).toMatchObject({
        diff_type: 'added',
        to_tbl: '$values',
        to_row: '',
        to_cell: 'filter',
        to_value: '"done"',
      });
    } finally {
      history.close();
    }
  },
  HISTORY_TIMEOUT_MS,
);

// --- M6: a recorded call runs under the exam contract ------------------------

// Leg (g) [M6]: inside a recorded callback, `Date.now()` is `Date.parse(clock)`.
test(
  'leg (g) [M6] a recorded callback reads Date.now() as Date.parse(clock)',
  async () => {
    const history = freshHistory();
    try {
      // Held in an object rather than a `let`, so what the callback saw is
      // readable here whatever the recorded call resolved to.
      const seen: {now: number | null} = {now: null};
      const session = recordSession(
        createTodosStore([{}, {}]),
        history,
        {
          tick: (store: TodosStore) => {
            seen.now = Date.now();
            setFilter(store, 'done');
          },
        },
        CLOCK,
      );

      await session.tick();

      expect(seen.now).toBe(PINNED_NOW);
      expect(seen.now).toBe(Date.parse(CLOCK));
    } finally {
      history.close();
    }
  },
  HISTORY_TIMEOUT_MS,
);

// Leg (h) [M6]: a recorded callback that reaches for the network makes the
// recorded call reject, with a message starting `contract breach: <url>`.
test(
  'leg (h) [M6] a recorded callback that fetches makes the recorded call reject with contract breach',
  async () => {
    const history = freshHistory();
    try {
      const session = recordSession(
        createTodosStore([{}, {}]),
        history,
        {
          dial: async (store: TodosStore) => {
            await fetch('http://example.invalid/');
            setFilter(store, 'done');
          },
        },
        CLOCK,
      );

      let message: string | null = null;
      try {
        await session.dial();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).not.toBeNull();
      expect(message).toMatch(/^contract breach: http:\/\/example\.invalid\//);
    } finally {
      history.close();
    }
  },
  HISTORY_TIMEOUT_MS,
);

// Leg (i) [M2]: the message a recorded call commits under — the name, `(`, the
// arguments each `JSON.stringify`ed and joined by `, `, `)`.
test('leg (i) [M2] messageOf spells the call as the name and its JSON arguments', () => {
  expect(messageOf('setTodoCompleted', ['0', true])).toBe('setTodoCompleted("0", true)');
  expect(messageOf('clearCompleted', [])).toBe('clearCompleted()');
});

// --- M8: the package is typechecked by the suite -----------------------------

// Leg (j) [M8], the first `Run:` line.
test(
  'leg (j) [M8] the Run line `bunx tsc -p packages/tinyapp-history --noEmit` exits 0',
  () => {
    expect(runLine('bunx tsc -p packages/tinyapp-history --noEmit')).toBe(0);
  },
  SPAWN_TIMEOUT_MS,
);

// Leg (j) [M8], the second `Run:` line: the root script carries the new step
// immediately before the exam package's, which stays last — the trailing quote
// in the pattern is what pins that the script ends there.
test(
  'leg (j) [M8] the root typecheck script carries the new step immediately before the exam package`s',
  () => {
    expect(
      runLine(
        `grep -q 'bunx tsc -p packages/tinyapp-history --noEmit && bunx tsc -p packages/tinyapp-exam --noEmit"' package.json`,
      ),
    ).toBe(0);
  },
  SPAWN_TIMEOUT_MS,
);

// --- M7: recording changes nothing about where the store goes ----------------

// Leg (a) [M7]: the one state exam of this file. The action opens a history on
// a fresh temp path — the store move runs it twice on fresh stores, so the path
// is fresh per call — records `addTodo` over the store it is handed, and awaits
// the recorded call. The store still reaches `one-open-todo.json`, the page on
// that state shows the one open todo, and the mutant that ticks row `'0'` is
// killed.
stateExam({
  clock: CLOCK,
  entry: 'client/index.html',
  seed: 'state-exams/seeds/empty.json',
  store: () => createTodosStore(),
  action: async (store) => {
    const history = openHistory(freshPath());
    try {
      const session = recordSession(store, history, {addTodo}, CLOCK);
      await session.addTodo('buy milk');
    } finally {
      history.close();
    }
  },
  expected: 'state-exams/expected/one-open-todo.json',
  view: [
    {selector: '.todoItem', count: 1, text: 'buy milk'},
    {selector: '.todoItem input[type=checkbox]', unchecked: true},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: true}],
});
