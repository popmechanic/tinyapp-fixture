/**
 * Exam for Task 2 — "The done counter in the top bar, derived from the store".
 *
 * The state exam below is leg (p) [M5]: the seed of M3, `setTodoCompleted(store,
 * '1', true)`, the expected state of M3, the five-entry view of M5 and the one
 * mutant edit that unticks row 1. Everything a state exam cannot express is an
 * ordinary `bun:test` block beside it — the pure `countTodos` rows of M1, the
 * two JSON fixtures of M3, the schema read-back of M4, and each `Run:` line of
 * M2 executed verbatim so that "exits 0" is asserted as the Proof spells it.
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';

import {stateExam} from 'tinyapp-exam';

import {
  createTodosStore,
  setTodoCompleted,
  TABLES_SCHEMA,
} from '../../client/src/storeData';
import {countTodos} from '../../client/src/todoCounts';

// This file sits two directories below the repository root, which is also
// `bun test`'s cwd — the `Run:` lines and the fixture reads are anchored there.
const ROOT = join(import.meta.dir, '..', '..');

/** Runs one Proof `Run:` line from the repository root and returns its status. */
const runLine = (line: string): number =>
  Bun.spawnSync({
    cmd: ['bash', '-c', line],
    cwd: ROOT,
    stdout: 'ignore',
    stderr: 'ignore',
  }).exitCode;

const readJson = (...parts: string[]): unknown =>
  JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8'));

// --- M1: `countTodos` is pure, and counts rows and ticked rows ---------------

test('leg (a) [M1] countTodos over the todos table of the expected state of M3 is exactly {done: 1, total: 2}', () => {
  expect(
    countTodos({
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: true},
    }),
  ).toEqual({done: 1, total: 2});
});

test('leg (b) [M1] countTodos of the empty table is exactly {done: 0, total: 0}', () => {
  expect(countTodos({})).toEqual({done: 0, total: 0});
});

test('leg (c) [M1] countTodos of a two-row table whose rows are both completed is exactly {done: 2, total: 2}', () => {
  expect(
    countTodos({
      '0': {text: 'a', completed: true},
      '1': {text: 'b', completed: true},
    }),
  ).toEqual({done: 2, total: 2});
});

// --- M2: the span, the top bar's order, and the one lifted Provider ----------

test('leg (d) [M2] the Run line `grep -q \'countTodos(\' client/src/DoneCount.tsx` exits 0', () => {
  expect(runLine(`grep -q 'countTodos(' client/src/DoneCount.tsx`)).toBe(0);
});

test('leg (e) [M2] the Run line `grep -q \'id="doneCount"\' client/src/DoneCount.tsx` exits 0', () => {
  expect(runLine(`grep -q 'id="doneCount"' client/src/DoneCount.tsx`)).toBe(0);
});

test("leg (f) [M2] the Run line `grep -q 'useTable' client/src/DoneCount.tsx` exits 0", () => {
  expect(runLine(`grep -q 'useTable' client/src/DoneCount.tsx`)).toBe(0);
});

test('leg (g) [M2] the Run line `grep -qF \'{done} of {total} done\' client/src/DoneCount.tsx` exits 0', () => {
  expect(
    runLine(`grep -qF '{done} of {total} done' client/src/DoneCount.tsx`),
  ).toBe(0);
});

test("leg (h) [M2] the Run line `sed -n '/<Title/,/<Info/p' client/src/TopBar.tsx | grep -q 'DoneCount'` exits 0", () => {
  expect(
    runLine(
      `sed -n '/<Title/,/<Info/p' client/src/TopBar.tsx | grep -q 'DoneCount'`,
    ),
  ).toBe(0);
});

test('leg (i) [M2] the Run line `sed -n \'/<Provider>/,/<\\/Provider>/p\' client/src/App.tsx | tr \'\\n\' \' \' | grep -q \'<Provider>.*<TopBar.*<Main.*</Provider>\'` exits 0', () => {
  expect(
    runLine(
      String.raw`sed -n '/<Provider>/,/<\/Provider>/p' client/src/App.tsx | tr '\n' ' ' | grep -q '<Provider>.*<TopBar.*<Main.*</Provider>'`,
    ),
  ).toBe(0);
});

test('leg (j) [M2] the Run lines counting `<Provider>` and `</Provider>` in client/src/App.tsx each exit 0', () => {
  expect(runLine(`test "$(grep -c '<Provider>' client/src/App.tsx)" -eq 1`)).toBe(
    0,
  );
  expect(
    runLine(`test "$(grep -c '</Provider>' client/src/App.tsx)" -eq 1`),
  ).toBe(0);
});

test("leg (k) [M2] the Run line `grep -q 'const Main' client/src/App.tsx` exits 0", () => {
  expect(runLine(`grep -q 'const Main' client/src/App.tsx`)).toBe(0);
});

test("leg (l) [M2] the Run line `grep -q 'useTable' client/src/Store.tsx` exits 0", () => {
  expect(runLine(`grep -q 'useTable' client/src/Store.tsx`)).toBe(0);
});

// --- M3: the seed and the expected state, exactly ----------------------------

test('leg (m) [M3] state-exams/seeds/two-open-todos.json parses to exactly the two open todos', () => {
  expect(readJson('state-exams', 'seeds', 'two-open-todos.json')).toEqual([
    {
      todos: {
        '0': {text: 'buy milk', completed: false},
        '1': {text: 'walk the dog', completed: false},
      },
    },
    {},
  ]);
});

test('leg (n) [M3] state-exams/expected/two-todos-one-done.json parses to exactly the two todos, one done', () => {
  expect(
    readJson('state-exams', 'expected', 'two-todos-one-done.json'),
  ).toEqual([
    {
      todos: {
        '0': {text: 'buy milk', completed: false},
        '1': {text: 'walk the dog', completed: true},
      },
    },
    {},
  ]);
});

// --- M4: the count added no store state --------------------------------------

test('leg (o) [M4] TABLES_SCHEMA still has exactly the table todos with exactly the cells completed and text', () => {
  expect(Object.keys(TABLES_SCHEMA)).toEqual(['todos']);
  expect(Object.keys(TABLES_SCHEMA.todos).sort()).toEqual([
    'completed',
    'text',
  ]);
});

// --- M5 (and M1/M3 end to end): leg (p), the state exam itself ---------------

// Ticking one of two open todos reaches the expected state, and the page on
// that state reads `1 of 2 done` beside one ticked row of two.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: (store) => {
    setTodoCompleted(store, '1', true);
  },
  expected: 'state-exams/expected/two-todos-one-done.json',
  view: [
    {selector: '#doneCount', count: 1, text: '1 of 2 done'},
    {selector: 'input#todo-1', checked: true},
    {selector: 'input#todo-0', unchecked: true},
    {selector: '.todoItem.completed', count: 1},
    {selector: '.todoItem', count: 2},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'completed', value: false}],
});
