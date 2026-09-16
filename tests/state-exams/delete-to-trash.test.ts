/**
 * The exam for Task 1 — "The trash table — Delete moves the whole row there,
 * Undo moves it back".
 *
 * A file's whole state exam is the single `stateExam({…})` in it, as
 * `clear-completed.test.ts` shows, so leg (a) is that one call and every other
 * leg is an ordinary `bun:test` block beside it: the two store-move edges of
 * M2 and M3 (b, c), the two no-op edges of M4 and M5 (d, e), Clear completed
 * filling no trash (f), the schema and the invariant of M7 (g–i), the round
 * trip of every checked-in state of M8 (j), and each `Run:` line of M9 executed
 * verbatim so that "exits 0" is asserted as the Proof spells it (k).
 *
 * The store module is reached through one namespace import, the form
 * `client/test/todos-store.test.ts` already uses. A named import of
 * `undoDelete` would be a load error before the implementation exports it, and
 * a load error is one red for the whole file; this way each leg is its own red
 * and says which part of the contract is missing.
 *
 * Nothing here lists the tables of `TABLES_SCHEMA`, the cells of a todos row or
 * the store's values: two sibling runs are adding a cell and a values schema on
 * this same base, and any such list would be wrong at publish. The exact
 * equalities the exam does carry are the three states M1, M2 and M6 spell out
 * as literals, each pinned both on the implementer's expected file and on the
 * clause's own words.
 */

import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import * as sd from '../../client/src/storeData';
import type {TodosContent} from '../../client/src/storeData';

// This file sits two directories below the repository root, which is also
// `bun test`'s cwd — the `Run:` lines and the fixture reads are anchored there.
const ROOT = join(import.meta.dir, '..', '..');

const readJson = (...parts: string[]): TodosContent =>
  JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8')) as TodosContent;

/** A store's content as plain JSON, the shape a checked-in file parses to. */
const snapshot = (store: {getContent: () => unknown}): TodosContent =>
  JSON.parse(JSON.stringify(store.getContent())) as TodosContent;

/** The table ids a content holds — never the cell ids of a row. */
const tablesOf = (content: TodosContent): string[] => Object.keys(content[0]);

/** The seed of M1, M2, M3, M4 and M5, as `state-exams/seeds/two-open-todos.json`. */
const TWO_OPEN_TODOS: TodosContent = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
];

/** The state M1 names: row `0` gone from `todos`, waiting whole in `trash`. */
const FIRST_TRASHED = [
  {
    todos: {'1': {text: 'walk the dog', completed: false}},
    trash: {'0': {text: 'buy milk', completed: false}},
  },
  {},
];

/** The state M2 names: the second delete replaced the waiting row, `todos` gone. */
const SECOND_DELETE_REPLACES_TRASH = [
  {trash: {'1': {text: 'walk the dog', completed: false}}},
  {},
];

/** The state M6 names, the content of `state-exams/expected/one-open-todo.json`. */
const ONE_OPEN_TODO = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}];

// --- Leg (a) [M1]: the one state exam of the file ----------------------------

// Clicking the first `.todoItem`'s `button` — its Delete, the only button in
// the row — takes row `0` out of the list and leaves it whole in `trash`, the
// page then shows exactly the one remaining open todo, and the mutant that
// drops the trash row is killed, so an exam that never looked at `trash` could
// not have passed.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => sd.createTodosStore(),
  action: {click: '.todoItem button'},
  expected: 'state-exams/expected/two-open-todos-first-trashed.json',
  view: [
    {selector: '.todoItem', count: 1, text: 'walk the dog'},
    {selector: '.todoItem input[type=checkbox]', unchecked: true},
  ],
  mutant: [{table: 'trash', row: '0', absent: true}],
});

// Leg (a) [M1]: the expected file the exam above names holds exactly the state
// M1 spells — `todos` without `'0'`, and `trash` holding `'0'` with every cell
// the todos row held.
test('leg (a) [M1] two-open-todos-first-trashed.json holds exactly the state of M1', () => {
  expect(
    readJson('state-exams', 'expected', 'two-open-todos-first-trashed.json'),
  ).toEqual(FIRST_TRASHED);
});

// --- Leg (b) [M2]: the second delete replaces the waiting row ----------------

test('leg (b) [M2] deleteTodo of both rows leaves only the second one waiting in trash', () => {
  const store = sd.createTodosStore(TWO_OPEN_TODOS);

  sd.deleteTodo(store, '0');
  sd.deleteTodo(store, '1');
  const content = snapshot(store);

  expect(content).toEqual(SECOND_DELETE_REPLACES_TRASH);
  // `todos` is gone from the content because it has no rows.
  expect(tablesOf(content)).not.toContain('todos');

  const expected = readJson(
    'state-exams',
    'expected',
    'second-delete-replaces-trash.json',
  );

  expect(expected).toEqual(SECOND_DELETE_REPLACES_TRASH);
  expect(content).toEqual(expected);
});

// --- Leg (c) [M3]: an undo puts the row back exactly as it was ---------------

test('leg (c) [M3] deleteTodo then undoDelete restores the seed content with no trash table', () => {
  expect(typeof sd.undoDelete).toBe('function');

  const store = sd.createTodosStore(TWO_OPEN_TODOS);

  sd.deleteTodo(store, '0');
  sd.undoDelete(store);
  const content = snapshot(store);

  expect(content).toEqual(TWO_OPEN_TODOS);
  expect(content).toEqual(
    readJson('state-exams', 'seeds', 'two-open-todos.json'),
  );
  expect(tablesOf(content)).not.toContain('trash');

  const restored = readJson(
    'state-exams',
    'expected',
    'two-open-todos-restored.json',
  );

  expect(restored).toEqual(TWO_OPEN_TODOS);
  expect(content).toEqual(restored);
});

// --- Leg (d) [M4]: an undo with nothing waiting does nothing -----------------

test('leg (d) [M4] undoDelete with an empty trash leaves the content deep-equal to before', () => {
  expect(typeof sd.undoDelete).toBe('function');

  const store = sd.createTodosStore(TWO_OPEN_TODOS);

  const before = snapshot(store);
  sd.undoDelete(store);
  const after = snapshot(store);

  expect(after).toEqual(before);
});

// --- Leg (e) [M5]: deleting an id the table does not hold does nothing -------

test('leg (e) [M5] deleteTodo of an absent id leaves the content deep-equal to before', () => {
  const store = sd.createTodosStore(TWO_OPEN_TODOS);

  const before = snapshot(store);
  sd.deleteTodo(store, '9');
  const after = snapshot(store);

  expect(after).toEqual(before);
});

// --- Leg (f) [M6]: Clear completed never fills the trash ---------------------

test('leg (f) [M6] clearCompleted reaches one-open-todo.json and fills no trash', () => {
  const store = sd.createTodosStore(
    readJson('state-exams', 'seeds', 'two-todos-one-done.json'),
  );

  sd.clearCompleted(store);
  const content = snapshot(store);

  expect(content).toEqual(ONE_OPEN_TODO);
  // Only a single Delete is undoable: clearing completed todos leaves nothing
  // waiting behind.
  expect(tablesOf(content)).not.toContain('trash');

  const expected = readJson('state-exams', 'expected', 'one-open-todo.json');

  expect(expected).toEqual(ONE_OPEN_TODO);
  expect(content).toEqual(expected);
});

// --- Legs (g)–(i) [M7]: the schema of trash, and its one invariant -----------

/** The `INVARIANTS` entries that speak about `trash` — exactly one, per M7. */
const trashInvariants = (): typeof sd.INVARIANTS =>
  sd.INVARIANTS.filter((entry) => entry.table === 'trash');

test('leg (g) [M7] TABLES_SCHEMA.trash equals TABLES_SCHEMA.todos and trash has exactly one invariant', () => {
  expect(sd.TABLES_SCHEMA.trash).toEqual(sd.TABLES_SCHEMA.todos);
  expect(trashInvariants().length).toBe(1);
});

test('leg (h) [M7] the trash invariant holds for {text: buy milk, completed: false}', () => {
  const entry = trashInvariants()[0];

  expect(entry).toBeDefined();
  expect(entry!.predicate({text: 'buy milk', completed: false}, '0')).toBe(true);
});

test('leg (i) [M7] the trash invariant fails for {text: empty string, completed: true}', () => {
  const entry = trashInvariants()[0];

  expect(entry).toBeDefined();
  expect(entry!.predicate({text: '', completed: true}, '0')).toBe(false);
});

// --- Leg (j) [M8]: every checked-in state still loads to itself --------------

// One test per `.json` file found on the tree, so the name of a file that stops
// round-tripping is the name of the failing test. The list is read rather than
// pinned: the count of seeds and of expected states moves with this change and
// with the runs beside it.
for (const kind of ['seeds', 'expected'] as const) {
  for (const name of readdirSync(join(ROOT, 'state-exams', kind)).sort()) {
    if (!name.endsWith('.json')) {
      continue;
    }
    test(`leg (j) [M8] state-exams/${kind}/${name} loads through createTodosStore to its own content`, () => {
      const content = readJson('state-exams', kind, name);

      expect(snapshot(sd.createTodosStore(content))).toEqual(content);
    });
  }
}

// --- Leg (k) [M9]: the eight `Run:` lines, run verbatim ----------------------

/** One Proof `Run:` line, run from the repository root as the driver runs it. */
const expectExit0 = (line: string): void => {
  const run = Bun.spawnSync({
    cmd: ['bash', '-c', line],
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const tail = `${run.stdout.toString()}${run.stderr.toString()}`
    .trim()
    .split('\n')
    .slice(-15)
    .join('\n');

  expect(run.exitCode === 0 ? 'exit 0' : `exit ${run.exitCode}\n${tail}`).toBe(
    'exit 0',
  );
};

/** Long enough for the `Run:` lines that are themselves whole test suites. */
const RUN_LINE_TIMEOUT_MS = 300_000;

test(
  'leg (k) [M9] the Run line `bun test packages/tinyapp-lint` exits 0',
  () => {
    expectExit0('bun test packages/tinyapp-lint');
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);

test(
  'leg (k) [M9] the Run line counting `deleteTodo or setTodoCompleted` in reachability.test.ts exits 0',
  () => {
    expectExit0(
      `test "$(grep -c 'deleteTodo or setTodoCompleted' packages/tinyapp-lint/test/reachability.test.ts)" -eq 0`,
    );
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);

test(
  'leg (k) [M9] the Run line `bun test tests/smoke.test.ts` exits 0',
  () => {
    expectExit0('bun test tests/smoke.test.ts');
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);

test(
  'leg (k) [M9] the Run line `bun test tests/state-exams/done-count.test.ts` exits 0',
  () => {
    expectExit0('bun test tests/state-exams/done-count.test.ts');
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);

test(
  'leg (k) [M9] the Run line `bun test client/test/todos-store.test.ts` exits 0',
  () => {
    expectExit0('bun test client/test/todos-store.test.ts');
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);

test(
  'leg (k) [M9] the Run line `grep -q \'toContain("todos")\' tests/smoke.test.ts` exits 0',
  () => {
    expectExit0(`grep -q 'toContain("todos")' tests/smoke.test.ts`);
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);

test(
  'leg (k) [M9] the Run line `grep -q "toContain(\'todos\')" tests/state-exams/done-count.test.ts` exits 0',
  () => {
    expectExit0(
      `grep -q "toContain('todos')" tests/state-exams/done-count.test.ts`,
    );
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);

test(
  'leg (k) [M9] the Run line grepping `getContent()[0].todos).toBeUndefined()` in client/test/todos-store.test.ts exits 0',
  () => {
    expectExit0(
      String.raw`grep -q "getContent()\[0\].todos).toBeUndefined()" client/test/todos-store.test.ts`,
    );
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);
