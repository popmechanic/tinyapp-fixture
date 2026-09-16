/**
 * The exam for Task 1 — "The trash table — Delete moves the whole row there,
 * Undo moves it back".
 *
 * One `stateExam` call carries leg (a) [M1] — the whole state exam of this
 * file, as `tests/state-exams/clear-completed.test.ts` shows — and legs (b)–(k)
 * sit beside it as ordinary `bun:test` blocks.
 *
 * Two habits run through every assertion below, and both are the Global Check's:
 *
 *  - A state is compared against the *parsed* seed or expected file, never
 *    against a content literal spelled in here. A literal row like
 *    `{text: 'buy milk', completed: false}` pins the key set of a todos row,
 *    and a sibling run is adding a cell to that schema concurrently; the same
 *    assertion stated relatively — store against file, trash row against the
 *    todos row it was copied from — says what the clause says and survives the
 *    fold.
 *  - Where a clause says what the file itself must hold ("exactly the M2
 *    literal"), the exam pins what is not a row's cell set: which tables are in
 *    `content[0]`, which row ids each holds, and the cells the clause names by
 *    value, read one cell at a time.
 *
 * The three `state-exams/expected/*.json` files this task creates are the
 * implementation's, not the exam's: at BASE their absence is part of the
 * absent implementation and the read names the missing path.
 */

import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import {
  clearCompleted,
  createTodosStore,
  deleteTodo,
  INVARIANTS,
  TABLES_SCHEMA,
  undoDelete,
  type TodosContent,
} from '../../client/src/storeData';

// --- the shapes and the readers ---------------------------------------------

type Cell = string | number | boolean;
type Tables = Record<string, Record<string, Record<string, Cell>>>;
type Values = Record<string, Cell>;

/** Exactly TinyBase's `getContent()` shape, which is also every file's shape. */
type Content = [Tables, Values];

/** This file sits two directories below the repository root, `bun test`'s cwd. */
const ROOT = join(import.meta.dir, '..', '..');

const readJson = (...parts: string[]): Content =>
  JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8')) as Content;

const readText = (...parts: string[]): string =>
  readFileSync(join(ROOT, ...parts), 'utf8');

/** Runs one Proof `Run:` line from the repository root and returns its status. */
const runLine = (line: string): number | null =>
  Bun.spawnSync({
    cmd: ['bash', '-c', line],
    cwd: ROOT,
    stdout: 'ignore',
    stderr: 'ignore',
  }).exitCode;

const snapshot = (store: {getContent: () => unknown}): Content =>
  JSON.parse(JSON.stringify(store.getContent())) as Content;

const seeded = (content: Content) =>
  createTodosStore(content as unknown as TodosContent);

/** The seed M1–M5 are all stated over. */
const twoOpenTodos = (): Content =>
  readJson('state-exams', 'seeds', 'two-open-todos.json');

/**
 * A `bun test` of another file is a browser, a bundle and a lint child away
 * from bun's 5 s default.
 */
const CHILD_TIMEOUT_MS = 300_000;

// --- leg (a) [M1] -----------------------------------------------------------

// Clicking the first `.todoItem`'s `button` — its Delete, a `<button>` with no
// id inside the row, and `TodoList` renders rows ascending by row id so the
// first match is row `0` — moves that row out of the list and into `trash`.
// The view is the page M1 leaves: one row left, `walk the dog`, unticked. The
// mutant drops the trash row from the expected state; an exam that never looked
// at `trash` would not have noticed.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: {click: '.todoItem button'},
  expected: 'state-exams/expected/two-open-todos-first-trashed.json',
  view: [
    {selector: '.todoItem', count: 1, text: 'walk the dog'},
    {selector: '.todoItem input[type=checkbox]', unchecked: true},
  ],
  mutant: [{table: 'trash', row: '0', absent: true}],
});

// The half of M1 a state exam cannot spell: `todos` lacks `'0'`, and `trash`
// holds `'0'` with *every* cell the todos row held — the row copied whole,
// which is asserted against the seed's own row rather than against a list of
// cells, so a schema that grows a cell does not make this leg lie.
test('leg (a) [M1]: the delete leaves todos without `0` and trash holding that whole row', () => {
  const seed = twoOpenTodos();
  const store = seeded(seed);

  deleteTodo(store, '0');
  const content = snapshot(store);

  expect(content).toEqual(
    readJson('state-exams', 'expected', 'two-open-todos-first-trashed.json'),
  );

  expect(Object.keys(content[0]).sort()).toEqual(['todos', 'trash']);
  expect(Object.keys(content[0].todos!)).toEqual(['1']);
  expect(Object.keys(content[0].trash!)).toEqual(['0']);
  expect(content[0].trash!['0']).toEqual(seed[0].todos!['0']!);
  expect(content[0].todos!['1']).toEqual(seed[0].todos!['1']!);
});

// The expected state M1 names, as the file must parse: the table `todos` holding
// only `'1'` (`walk the dog`, open) beside the table `trash` holding only `'0'`
// (`buy milk`, open).
test('leg (a) [M1]: two-open-todos-first-trashed.json holds the state M1 names', () => {
  const parsed = readJson(
    'state-exams',
    'expected',
    'two-open-todos-first-trashed.json',
  );

  expect(Object.keys(parsed[0]).sort()).toEqual(['todos', 'trash']);
  expect(Object.keys(parsed[0].todos!)).toEqual(['1']);
  expect(parsed[0].todos!['1']!.text).toBe('walk the dog');
  expect(parsed[0].todos!['1']!.completed).toBe(false);
  expect(Object.keys(parsed[0].trash!)).toEqual(['0']);
  expect(parsed[0].trash!['0']!.text).toBe('buy milk');
  expect(parsed[0].trash!['0']!.completed).toBe(false);

  // The file is what the seeded page reaches: the same state, round-tripped.
  expect(snapshot(seeded(parsed))).toEqual(parsed);
});

// --- leg (b) [M2] -----------------------------------------------------------

// A second delete replaces the waiting row rather than joining it, and `todos`
// is gone from the content because it has no rows left.
test('leg (b) [M2]: deleting `0` then `1` leaves only the second row waiting in trash', () => {
  const seed = twoOpenTodos();
  const store = seeded(seed);

  deleteTodo(store, '0');
  deleteTodo(store, '1');
  const content = snapshot(store);

  expect(content).toEqual(
    readJson('state-exams', 'expected', 'second-delete-replaces-trash.json'),
  );

  expect(Object.keys(content[0])).toEqual(['trash']);
  expect(Object.keys(content[0].trash!)).toEqual(['1']);
  expect(content[0].trash!['1']).toEqual(seed[0].todos!['1']!);
});

// The M2 literal, as the file must parse: the one table `trash`, the one row
// `'1'`, `walk the dog` and open — and no `todos` table at all.
test('leg (b) [M2]: second-delete-replaces-trash.json holds the state M2 names', () => {
  const parsed = readJson(
    'state-exams',
    'expected',
    'second-delete-replaces-trash.json',
  );

  expect(Object.keys(parsed[0])).toEqual(['trash']);
  expect(parsed[0].todos).toBeUndefined();
  expect(Object.keys(parsed[0].trash!)).toEqual(['1']);
  expect(parsed[0].trash!['1']!.text).toBe('walk the dog');
  expect(parsed[0].trash!['1']!.completed).toBe(false);

  expect(snapshot(seeded(parsed))).toEqual(parsed);
});

// --- leg (c) [M3] -----------------------------------------------------------

// An undo puts the row back exactly as it was: the content is the seed's again,
// and nothing of `trash` is left behind.
test('leg (c) [M3]: an undo after a delete restores the seed content, with no trash table', () => {
  const seed = twoOpenTodos();
  const store = seeded(seed);

  deleteTodo(store, '0');
  undoDelete(store);
  const content = snapshot(store);

  expect(content).toEqual(seed);
  expect(content).toEqual(
    readJson('state-exams', 'expected', 'two-open-todos-restored.json'),
  );
  expect(Object.keys(content[0])).not.toContain('trash');
  expect(content[0].trash).toBeUndefined();
});

// The restored state is that seed content, which is what the file must hold.
test('leg (c) [M3]: two-open-todos-restored.json is the two-open seed content', () => {
  const parsed = readJson(
    'state-exams',
    'expected',
    'two-open-todos-restored.json',
  );

  expect(parsed).toEqual(twoOpenTodos());
  expect(Object.keys(parsed[0])).not.toContain('trash');
});

// --- leg (d) [M4] -----------------------------------------------------------

// An undo with nothing waiting does nothing at all.
test('leg (d) [M4]: undoDelete with an empty trash leaves the content deep-equal to before', () => {
  const store = seeded(twoOpenTodos());

  const before = snapshot(store);
  undoDelete(store);
  const after = snapshot(store);

  expect(after).toEqual(before);
});

// --- leg (e) [M5] -----------------------------------------------------------

// A delete of an id the list does not hold moves nothing — in particular it
// does not empty the trash, and it does not write a row of defaults.
test('leg (e) [M5]: deleteTodo of an id todos does not hold leaves the content deep-equal to before', () => {
  const store = seeded(twoOpenTodos());

  const before = snapshot(store);
  deleteTodo(store, '9');
  const after = snapshot(store);

  expect(after).toEqual(before);
});

// --- leg (f) [M6] -----------------------------------------------------------

// Clear completed fills no trash: only a single Delete is undoable.
test('leg (f) [M6]: clearCompleted reaches one-open-todo.json and leaves no trash table', () => {
  const store = seeded(readJson('state-exams', 'seeds', 'two-todos-one-done.json'));

  clearCompleted(store);
  const content = snapshot(store);

  expect(content).toEqual(readJson('state-exams', 'expected', 'one-open-todo.json'));
  expect(Object.keys(content[0])).not.toContain('trash');
  expect(content[0].trash).toBeUndefined();
});

// --- legs (g)–(i) [M7] ------------------------------------------------------

/** The one `INVARIANTS` entry M7 is about, or `undefined` when there is none. */
const trashInvariants = () => INVARIANTS.filter((entry) => entry.table === 'trash');

// The trash table is the todos table's schema, whatever cells that grows to —
// asserted as the one against the other, never as a list of cell names.
test('leg (g) [M7]: TABLES_SCHEMA.trash is TABLES_SCHEMA.todos, and one INVARIANTS entry is the trash one', () => {
  expect(TABLES_SCHEMA.trash).toEqual(TABLES_SCHEMA.todos);
  expect(trashInvariants()).toHaveLength(1);
});

// A trashed todo is a todos row copied whole, so the rule that holds of a todo
// holds of it: text-carrying rows pass.
test('leg (h) [M7]: the trash invariant holds for {text: `buy milk`, completed: false}', () => {
  const entry = trashInvariants()[0]!;

  expect(entry.predicate({text: 'buy milk', completed: false}, '0')).toBe(true);
});

// And a completed row with no text fails it, exactly as it does in `todos`.
test('leg (i) [M7]: the trash invariant fails for {text: ``, completed: true}', () => {
  const entry = trashInvariants()[0]!;

  expect(entry.predicate({text: '', completed: true}, '0')).toBe(false);
});

// --- leg (j) [M8] -----------------------------------------------------------

/** Every `.json` file under a snapshot directory, in name order. */
const jsonFiles = (dir: string): string[] =>
  readdirSync(join(ROOT, 'state-exams', dir))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => `state-exams/${dir}/${name}`);

// Every seed and every expected state loads through `createTodosStore` to
// itself. The round trip is what says the empty `trash` table appears in none
// of them: a table with no rows is absent from `getContent()`, so a file that
// carried `"trash": {}` would come back without it and fail here.
//
// The two maps are keyed by path so the failing file names itself in the diff.
test('leg (j) [M8]: every seed and expected file round-trips through createTodosStore', () => {
  const files = [...jsonFiles('seeds'), ...jsonFiles('expected')];

  // The three seeds and four expected states of BASE, plus this task's three.
  expect(files.length).toBeGreaterThanOrEqual(10);
  expect(files).toContain('state-exams/seeds/two-open-todos.json');
  expect(files).toContain(
    'state-exams/expected/two-open-todos-first-trashed.json',
  );
  expect(files).toContain(
    'state-exams/expected/second-delete-replaces-trash.json',
  );
  expect(files).toContain('state-exams/expected/two-open-todos-restored.json');

  const wanted: Record<string, Content> = {};
  const loaded: Record<string, Content> = {};
  files.forEach((path) => {
    const parsed = readJson(...path.split('/'));
    wanted[path] = parsed;
    loaded[path] = snapshot(seeded(parsed));
  });

  expect(loaded).toEqual(wanted);
});

// --- leg (k) [M9] -----------------------------------------------------------

// The eight `Run:` lines, each run verbatim from the repository root, so "exits
// 0" is asserted as the Proof spells it.

test(
  'leg (k) [M9] Run: `bun test packages/tinyapp-lint` exits 0',
  () => {
    expect(runLine('bun test packages/tinyapp-lint')).toBe(0);
  },
  CHILD_TIMEOUT_MS,
);

test('leg (k) [M9] Run: reachability.test.ts carries no `deleteTodo or setTodoCompleted` line', () => {
  expect(
    runLine(
      `test "$(grep -c 'deleteTodo or setTodoCompleted' packages/tinyapp-lint/test/reachability.test.ts)" -eq 0`,
    ),
  ).toBe(0);
});

test(
  'leg (k) [M9] Run: `bun test tests/smoke.test.ts` exits 0',
  () => {
    expect(runLine('bun test tests/smoke.test.ts')).toBe(0);
  },
  CHILD_TIMEOUT_MS,
);

test(
  'leg (k) [M9] Run: `bun test tests/state-exams/done-count.test.ts` exits 0',
  () => {
    expect(runLine('bun test tests/state-exams/done-count.test.ts')).toBe(0);
  },
  CHILD_TIMEOUT_MS,
);

test(
  'leg (k) [M9] Run: `bun test client/test/todos-store.test.ts` exits 0',
  () => {
    expect(runLine('bun test client/test/todos-store.test.ts')).toBe(0);
  },
  CHILD_TIMEOUT_MS,
);

test('leg (k) [M9] Run: the three greps over the loosened pins each exit 0', () => {
  expect(runLine(`grep -q 'toContain("todos")' tests/smoke.test.ts`)).toBe(0);
  expect(
    runLine(`grep -q "toContain('todos')" tests/state-exams/done-count.test.ts`),
  ).toBe(0);
  expect(
    runLine(
      String.raw`grep -q "getContent()\[0\].todos).toBeUndefined()" client/test/todos-store.test.ts`,
    ),
  ).toBe(0);
});

// "In place of the exact list", and never a new exact list: the two schema pins
// keep the `toContain` and no longer pin the table list, and leg (o) of
// `done-count` asks only that `completed` and `text` are among the cells. A
// file carrying both the new `toContain` and the old `toEqual` would pass the
// greps above while still going red the moment a sibling adds a cell.
test('leg (k) [M9]: neither schema pin still spells the exact table list', () => {
  const smoke = readText('tests', 'smoke.test.ts');
  const doneCount = readText('tests', 'state-exams', 'done-count.test.ts');

  expect(smoke).not.toContain('toEqual(["todos"])');
  expect(doneCount).not.toContain("toEqual(['todos'])");

  expect(doneCount).toContain("toContain('completed')");
  expect(doneCount).toContain("toContain('text')");
});
