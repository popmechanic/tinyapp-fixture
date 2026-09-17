/**
 * The exam for Task 2 — "The Undo button — shown only while a deleted todo
 * waits, gone once pressed".
 *
 * A file's whole state exam is the single `stateExam({…})` in it, as the
 * clear-completed and filter-bar exams show (a second page bundle in one test
 * runner process fails with `Bundle failed`), so leg (a) is that one call plus
 * the block that pins the expected file it names, and every other leg is an
 * ordinary `bun:test` block beside it: the static render of M2 (b), the static
 * render of M3 (c), and the five source predicates of M4 (d)–(h), each read
 * here out of the app file it names rather than out of a child `grep`'s exit
 * status — the same predicate over the same file, in this process.
 *
 * `renderStatic` is `react-dom/server` and calls no `Bun.build`, so legs (b) and
 * (c) cost no second bundle — and it is the linter's own render, so the markup
 * they read is the markup the linter checks views against.
 *
 * Three readings this file makes, written down because the Proof leaves them to
 * the reader:
 *
 *   - Nothing here imports `client/src/UndoDelete.tsx`. A named import of a
 *     module this task has yet to create would be one load error for the whole
 *     file; M4 is reached by reading that file's text instead, which is how the
 *     Proof words it, so each missing part of the contract is its own red.
 *   - Every fixture read happens inside a test body, never at module level, for
 *     the reason the filter-bar exam records: the state linter's capture child
 *     imports this file with `stateExam` and `bun:test` stubbed out.
 *   - Leg (c) and leg (a)'s expected-file block are green at BASE and are meant
 *     to be — they pin the negative edge and the restored file. The file's red
 *     at BASE is the missing button: the second click of leg (a) fails with
 *     `act: no element matches #undoDelete`, the render of leg (b) carries no
 *     `id="undoDelete"`, and the four predicates over a
 *     `client/src/UndoDelete.tsx` that does not exist yet find no such file.
 *
 * Nothing in this file lists the tables of `TABLES_SCHEMA`, the cells of a todos
 * row or the store's values, and no `due` cell is named anywhere in it: two
 * sibling runs on this same base are adding a cell and a values schema, and any
 * such list would be wrong at publish. The exact equalities it does carry are
 * the three contents M1, M2 and M3 spell out as literals, each pinned on the
 * clause's own words.
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import {renderStatic} from '../../client/src/StaticPage';
import {createTodosStore, type TodosContent} from '../../client/src/storeData';

/** This file sits two directories below the repository root, the runner's cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/**
 * The seed content of M1, as `state-exams/seeds/two-open-todos.json` holds it —
 * and, per M1, as `state-exams/expected/two-open-todos-restored.json` must hold
 * it too. It is also the content of M3: no `trash` table in it at all.
 */
const TWO_OPEN_TODOS: TodosContent = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
];

/** The content of M2: row `0` out of the list and waiting whole in `trash`. */
const FIRST_TRASHED: TodosContent = [
  {
    todos: {'1': {text: 'walk the dog', completed: false}},
    trash: {'0': {text: 'buy milk', completed: false}},
  },
  {},
];

/** One checked-in snapshot file, parsed from the repository root. */
const readJson = (...parts: string[]): unknown =>
  JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8'));

/**
 * One app file's text, or a failure naming the file the task has yet to write —
 * the reading a `grep -q` over an absent path used to report as a non-zero exit.
 */
const sourceOf = (relative: string): string => {
  try {
    return readFileSync(join(ROOT, relative), 'utf8');
  } catch {
    throw new Error(`${relative} does not exist — this task creates it`);
  }
};

// --- Leg (a) [M1]: the expected file the state exam below names --------------

// The restored state is the seed state: the parsed file is deep-equal to the
// seed literal M1 writes out, so a restored file that differs from it in any
// cell, id or table fails here naming the difference — and, since the literal
// carries none, a `trash` key in that file is one such difference.
test('leg (a) [M1] two-open-todos-restored.json parses to exactly the seed content of M1', () => {
  expect(readJson('state-exams', 'expected', 'two-open-todos-restored.json')).toEqual(
    TWO_OPEN_TODOS,
  );
});

// --- Leg (b) [M2]: the static render over a content whose trash holds a row ---

// Exactly one element carries `id="undoDelete"`, and it is a `<button>` whose
// text is `Undo`.
test('leg (b) [M2] renderStatic over the trashed content carries exactly one id="undoDelete", a <button> reading Undo', () => {
  const markup = renderStatic(FIRST_TRASHED);

  // Counted through `?? []` so a render with no button at all reads as
  // `Expected: 1, Received: 0` rather than as a null without a length.
  expect((markup.match(/id="undoDelete"/g) ?? []).length).toBe(1);
  expect(markup).toMatch(/<button[^>]*id="undoDelete"[^>]*>Undo<\/button>/);
});

// --- Leg (c) [M3]: the static render over a content with no trash table ------

// With nothing waiting there is no button at all — not a disabled one, not a
// hidden one: the string `undoDelete` does not occur in the markup.
test('leg (c) [M3] renderStatic over the two-open-todos content carries no undoDelete at all', () => {
  expect(renderStatic(TWO_OPEN_TODOS)).not.toContain('undoDelete');
});

// --- Legs (d)–(h) [M4]: the five source predicates, read in this process -----

// (d) the component is exported; (e) it calls the callback; (f) it reads the
// provided store; (g) it reads the `trash` table; (h) the list mounts it. Each
// needle is the literal the leg's `grep -q` searched for, over the same file.
for (const [leg, what, file, needle] of [
  ['d', 'the component is exported', 'client/src/UndoDelete.tsx', 'export const UndoDelete'],
  ['e', 'it calls the callback', 'client/src/UndoDelete.tsx', 'undoDelete('],
  ['f', 'it reads the provided store', 'client/src/UndoDelete.tsx', 'useStore(STORE_ID)'],
  ['g', 'it reads the trash table', 'client/src/UndoDelete.tsx', "useTable('trash'"],
  ['h', 'the list mounts it', 'client/src/TodoList.tsx', '<UndoDelete />'],
] as const) {
  test(`leg (${leg}) [M4] ${file} carries \`${needle}\` — ${what}`, () => {
    expect(sourceOf(file)).toContain(needle);
  });
}

// --- Leg (a) [M1]: the one state exam of this file ---------------------------

// Clicking the button named `Delete buy milk` — row `0`'s Delete — deletes row
// `'0'`; clicking the button named `Undo`, which exists only because that row is
// now waiting, puts it back. Both are named the way a person would name them,
// and the second has no name to carry until the first has run.
// The page store's `getContent()` is then deep-equal to the seed content,
// the page shows exactly the two todos and the button is gone, and the mutant
// that drops row `'0'` from the expected state is killed — so an exam that never
// looked at the restored row could not have passed.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: [
    {click: {role: 'button', name: 'Delete buy milk'}},
    {click: {role: 'button', name: 'Undo'}},
  ],
  expected: 'state-exams/expected/two-open-todos-restored.json',
  view: [
    {selector: '#undoDelete', absent: true},
    {selector: '#todoList li', count: 2},
  ],
  mutant: [{table: 'todos', row: '0', absent: true}],
});
