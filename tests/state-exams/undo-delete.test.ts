/**
 * The exam for Task 2 — "The Undo button — shown only while a deleted todo
 * waits, gone once pressed".
 *
 * Leg (a) [M1] is the one `stateExam` of this file, in the shape the Proof
 * spells: the two-open seed, the two clicks, the restored expected state, the
 * two view entries and the mutant that drops row `'0'`. Legs (b)–(h) sit beside
 * it as ordinary `bun:test` blocks — the two static renders of M2 and M3, and
 * the five `Run:` lines of M4 executed verbatim so that "exits 0" is asserted
 * as the Proof spells it.
 *
 * One habit runs through every assertion below, and it is the Global Check's: a
 * state is compared against a *parsed* seed or expected file, never against a
 * content literal spelled in here. A literal row like `{text: 'buy milk',
 * completed: false}` pins the key set of a todos row, and a sibling run is
 * adding a cell to that schema on this same base; the same assertion stated
 * relatively — the restored file against the seed file it must equal — says
 * what the clause says and survives the fold. Where a clause names a value
 * ("`buy milk`", "no `trash` key"), that value is read one cell at a time,
 * which pins what the clause pins and not a row's cell set.
 *
 * For the same reason the two contents M2 and M3 are stated over are read from
 * the two files that already hold exactly them — `two-open-todos-first-trashed`
 * is the M2 content and the `two-open-todos` seed is the M3 content — each with
 * a guard beside it naming what the clause requires of that content, so a file
 * that drifted from the clause fails here saying so rather than quietly
 * rendering something else.
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import {renderStatic} from '../../client/src/StaticPage';
import {createTodosStore, type TodosContent} from '../../client/src/storeData';

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

/** Runs one Proof `Run:` line from the repository root and returns its status. */
const runLine = (line: string): number | null =>
  Bun.spawnSync({
    cmd: ['bash', '-c', line],
    cwd: ROOT,
    stdout: 'ignore',
    stderr: 'ignore',
  }).exitCode;

/** The seed of M1, and the content M3 is stated over: two open todos, no trash. */
const twoOpenTodos = (): Content =>
  readJson('state-exams', 'seeds', 'two-open-todos.json');

/** The content of M2: `walk the dog` in `todos`, `buy milk` waiting in `trash`. */
const oneWaitingInTrash = (): Content =>
  readJson('state-exams', 'expected', 'two-open-todos-first-trashed.json');

/** The restored state M1 names, as the file the exam compares against holds it. */
const restored = (): Content =>
  readJson('state-exams', 'expected', 'two-open-todos-restored.json');

const render = (content: Content): string =>
  renderStatic(content as unknown as TodosContent);

// --- leg (a) [M1]: the two clicks on the page -------------------------------

// Clicking the first `.todoItem`'s `button` — its Delete, a `<button>` with no
// id inside the row, and `TodoList` renders rows ascending by row id so the
// first match is row `0` — moves that row into `trash` and raises the Undo
// button; clicking `#undoDelete` puts it back. The page the second click lands
// on is the page the first click left, so `#undoDelete` has to have appeared by
// then or there is nothing to click.
//
// The state reached is the seed's own content again, which is what the restored
// expected file holds. The view is the page M1 names: exactly two rows, and no
// Undo button left once the waiting row has gone home. The mutant drops row
// `'0'` from that expected state — an exam that never looked at the restored
// row would not have noticed.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: [{click: '.todoItem button'}, {click: '#undoDelete'}],
  expected: 'state-exams/expected/two-open-todos-restored.json',
  view: [
    {selector: '#undoDelete', absent: true},
    {selector: '.todoItem', count: 2},
  ],
  mutant: [{table: 'todos', row: '0', absent: true}],
});

// The other half of leg (a) [M1]: the expected file the exam above compares
// against is the seed content itself — the same tables, the same row ids, the
// same cells — and carries no `trash` key. A restored file that differed from
// the seed in any cell, id or table fails the first assertion naming the
// difference; the reads after it name the values M1 names, one at a time.
test('leg (a) [M1]: two-open-todos-restored.json is the seed content of M1, with no trash key', () => {
  const parsed = restored();
  const seed = twoOpenTodos();

  expect(parsed).toEqual(seed);

  expect(Object.keys(parsed[0])).toContain('todos');
  expect(Object.keys(parsed[0])).not.toContain('trash');
  expect(parsed[0].trash).toBeUndefined();

  expect(Object.keys(parsed[0].todos!).sort()).toEqual(['0', '1']);
  expect(parsed[0].todos!['0']!.text).toBe('buy milk');
  expect(parsed[0].todos!['0']!.completed).toBe(false);
  expect(parsed[0].todos!['1']!.text).toBe('walk the dog');
  expect(parsed[0].todos!['1']!.completed).toBe(false);

  expect(parsed[1]).toEqual(seed[1]);
});

// --- leg (b) [M2]: the static render while a row waits ----------------------

// The content M2 is stated over, as the file that holds it must parse: the row
// `walk the dog` left in `todos`, the row `buy milk` waiting in `trash`.
test('leg (b) [M2]: the content M2 renders over holds one row in todos and one waiting in trash', () => {
  const content = oneWaitingInTrash();

  expect(Object.keys(content[0]).sort()).toEqual(['todos', 'trash']);
  expect(Object.keys(content[0].todos!)).toEqual(['1']);
  expect(content[0].todos!['1']!.text).toBe('walk the dog');
  expect(content[0].todos!['1']!.completed).toBe(false);
  expect(Object.keys(content[0].trash!)).toEqual(['0']);
  expect(content[0].trash!['0']!.text).toBe('buy milk');
  expect(content[0].trash!['0']!.completed).toBe(false);
});

// With a row waiting the page carries the Undo button exactly once, and it is a
// `<button>` whose text is `Undo` — the two regexes M2 names, over the markup
// `renderStatic` returns.
test('leg (b) [M2]: renderStatic with a row waiting carries `id="undoDelete"` once, on a <button> reading Undo', () => {
  const html = render(oneWaitingInTrash());

  // `?? []` so a page with no Undo button at all fails saying it found none,
  // rather than saying `null` has no length.
  expect((html.match(/id="undoDelete"/g) ?? []).length).toBe(1);
  expect(html).toMatch(/<button[^>]*id="undoDelete"[^>]*>Undo<\/button>/);
});

// --- leg (c) [M3]: the static render with nothing waiting -------------------

// The same render over the two-open-todos content — the seed of M1, which has no
// `trash` table at all — carries no `undoDelete` anywhere in it: not the id, not
// the word, not a disabled button kept in the markup.
test('leg (c) [M3]: renderStatic over the two-open-todos content carries no undoDelete at all', () => {
  const content = twoOpenTodos();

  expect(Object.keys(content[0])).not.toContain('trash');
  expect(content[0].trash).toBeUndefined();

  expect(render(content)).not.toContain('undoDelete');
});

// --- legs (d)-(h) [M4]: the five `Run:` lines, verbatim ---------------------

// Each line is run from the repository root exactly as the Proof spells it, so
// "exits 0" is asserted as `grep -q` decides it: a missing file, a component
// that is not exported, one that never calls the callback, never reads the
// provided store or never reads the `trash` table, and a list that does not
// mount it, each exit non-zero and fail the leg they belong to.

test("leg (d) [M4] Run: `grep -q 'export const UndoDelete' client/src/UndoDelete.tsx` exits 0", () => {
  expect(
    runLine(`grep -q 'export const UndoDelete' client/src/UndoDelete.tsx`),
  ).toBe(0);
});

test("leg (e) [M4] Run: `grep -q 'undoDelete(' client/src/UndoDelete.tsx` exits 0", () => {
  expect(runLine(`grep -q 'undoDelete(' client/src/UndoDelete.tsx`)).toBe(0);
});

test("leg (f) [M4] Run: `grep -q 'useStore(STORE_ID)' client/src/UndoDelete.tsx` exits 0", () => {
  expect(runLine(`grep -q 'useStore(STORE_ID)' client/src/UndoDelete.tsx`)).toBe(
    0,
  );
});

test(`leg (g) [M4] Run: \`grep -q "useTable('trash'" client/src/UndoDelete.tsx\` exits 0`, () => {
  expect(runLine(`grep -q "useTable('trash'" client/src/UndoDelete.tsx`)).toBe(0);
});

test("leg (h) [M4] Run: `grep -q '<UndoDelete />' client/src/TodoList.tsx` exits 0", () => {
  expect(runLine(`grep -q '<UndoDelete />' client/src/TodoList.tsx`)).toBe(0);
});
