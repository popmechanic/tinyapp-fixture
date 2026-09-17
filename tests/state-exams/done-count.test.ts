/**
 * Exam for Task 2 — "The done counter in the top bar, derived from the store".
 *
 * The state exam below is leg (p) [M5]: the seed of M3, `setTodoCompleted(store,
 * '1', true)`, the expected state of M3, the five-entry view of M5 and the one
 * mutant edit that unticks row 1. Everything a state exam cannot express is an
 * ordinary `bun:test` block beside it — the pure `countTodos` rows of M1, the
 * two JSON fixtures of M3, the schema read-back of M4, and each source predicate
 * of M2 asserted as an in-process read of the file it is about.
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

// This file sits two directories below the repository root, which is also the
// test runner's cwd — the source reads and the fixture reads are anchored there.
const ROOT = join(import.meta.dir, '..', '..');

/** The text of one repository file, read in this process. */
const readSource = (...parts: string[]): string =>
  readFileSync(join(ROOT, ...parts), 'utf8');

/**
 * The lines from the first one matching `from` through the next one matching
 * `to`, inclusive — a `sed -n '/from/,/to/p'` range, evaluated in this process.
 */
const lineRange = (text: string, from: RegExp, to: RegExp): string[] => {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => from.test(line));
  if (start === -1) return [];
  const offset = lines.slice(start + 1).findIndex((line) => to.test(line));
  return offset === -1 ? lines.slice(start) : lines.slice(start, start + offset + 2);
};

/** How many lines of `text` carry `needle` — a `grep -c` in this process. */
const countLines = (text: string, needle: string): number =>
  text.split('\n').filter((line) => line.includes(needle)).length;

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

test("leg (d) [M2] client/src/DoneCount.tsx carries `countTodos(`", () => {
  expect(readSource('client', 'src', 'DoneCount.tsx')).toContain('countTodos(');
});

test('leg (e) [M2] client/src/DoneCount.tsx carries `id="doneCount"`', () => {
  expect(readSource('client', 'src', 'DoneCount.tsx')).toContain(
    'id="doneCount"',
  );
});

test("leg (f) [M2] client/src/DoneCount.tsx carries `useTable`", () => {
  expect(readSource('client', 'src', 'DoneCount.tsx')).toContain('useTable');
});

test('leg (g) [M2] client/src/DoneCount.tsx carries the span text `{done} of {total} done`', () => {
  expect(readSource('client', 'src', 'DoneCount.tsx')).toContain(
    '{done} of {total} done',
  );
});

test("leg (h) [M2] the `<Title`…`<Info` span of client/src/TopBar.tsx carries `DoneCount`", () => {
  const span = lineRange(
    readSource('client', 'src', 'TopBar.tsx'),
    /<Title/,
    /<Info/,
  );
  expect(span.join('\n')).toContain('DoneCount');
});

test('leg (i) [M2] the `<Provider>` span of client/src/App.tsx reads `<Provider>` then `<TopBar` then `<Main` then `</Provider>`', () => {
  const span = lineRange(
    readSource('client', 'src', 'App.tsx'),
    /<Provider>/,
    /<\/Provider>/,
  );
  expect(span.join(' ')).toMatch(
    /<Provider>.*<TopBar.*<Main.*<\/Provider>/,
  );
});

test('leg (j) [M2] client/src/App.tsx carries exactly one `<Provider>` line and exactly one `</Provider>` line', () => {
  const app = readSource('client', 'src', 'App.tsx');
  expect(countLines(app, '<Provider>')).toBe(1);
  expect(countLines(app, '</Provider>')).toBe(1);
});

test("leg (k) [M2] client/src/App.tsx carries `const Main`", () => {
  expect(readSource('client', 'src', 'App.tsx')).toContain('const Main');
});

test("leg (l) [M2] client/src/Store.tsx carries `useTable`", () => {
  expect(readSource('client', 'src', 'Store.tsx')).toContain('useTable');
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

test('leg (o) [M4] TABLES_SCHEMA still carries the table todos, with the cells completed and text among its own', () => {
  // Among, never an exact list: the count added no store state, which is what
  // this leg means — and the schema goes on growing tables and cells beside
  // the ones it was written over.
  expect(Object.keys(TABLES_SCHEMA)).toContain('todos');
  expect(Object.keys(TABLES_SCHEMA.todos)).toContain('completed');
  expect(Object.keys(TABLES_SCHEMA.todos)).toContain('text');
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
    {selector: '#todo-1', checked: true},
    {selector: '#todo-0', unchecked: true},
    {selector: '#todoList li[data-completed="true"]', count: 1},
    {selector: '#todoList li', count: 2},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'completed', value: false}],
});
