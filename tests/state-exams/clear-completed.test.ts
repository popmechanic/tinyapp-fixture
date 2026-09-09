/**
 * The exam for Task 1 — "Clear completed — one button, one store callback".
 *
 * One `stateExam` call (the store, render and mutant moves of legs a and k),
 * then the legs a state exam cannot express as ordinary `bun:test` blocks:
 * the callback's own return and content (a), the two edges of M2 (b, c), the
 * seed file (d) and the six texts the `Run:` greps read (e–j).
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import {
  addTodo,
  clearCompleted,
  createTodosStore,
  setTodoCompleted,
  type TodosContent,
} from '../../client/src/storeData';

/** The seed of M3, as the file must parse. */
const SEED: TodosContent = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: true},
    },
  },
  {},
];

/** The state M1 names: the one open todo, the ticked one gone. */
const ONE_OPEN_TODO = [
  {todos: {'0': {text: 'buy milk', completed: false}}},
  {},
];

/** This file sits two directories below the repository root. */
const fromRoot = (...parts: string[]): string =>
  join(import.meta.dir, '..', '..', ...parts);

const readText = (...parts: string[]): string =>
  readFileSync(fromRoot(...parts), 'utf8');

const snapshot = (store: {getContent: () => unknown}): unknown =>
  JSON.parse(JSON.stringify(store.getContent()));

// Leg (a) [M1] and leg (k) [M5]: pressing Clear completed on the seed of M3
// leaves exactly the one open todo, the rendered page shows exactly that one
// row unticked beside exactly one Clear completed button, and putting row `1`
// back into the expected state would have been noticed.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-todos-one-done.json',
  store: () => createTodosStore(),
  action: (store) => {
    clearCompleted(store);
  },
  expected: 'state-exams/expected/one-open-todo.json',
  view: [
    {selector: '.todoItem', count: 1, text: 'buy milk'},
    {selector: '.todoItem input[type=checkbox]', unchecked: true},
    {selector: '#clearCompleted', count: 1, text: 'Clear completed'},
  ],
  mutant: [
    {table: 'todos', row: '1', cell: 'text', value: 'walk the dog'},
    {table: 'todos', row: '1', cell: 'completed', value: true},
  ],
});

// Leg (a) [M1]: `clearCompleted` is a named export of `client/src/storeData.ts`
// that returns `undefined`, and on the seed of M3 it removes every completed
// row and no other row.
test('leg (a) [M1]: clearCompleted is an exported function returning undefined', () => {
  expect(typeof clearCompleted).toBe('function');

  const store = createTodosStore([
    {
      todos: {
        '0': {text: 'buy milk', completed: false},
        '1': {text: 'walk the dog', completed: true},
      },
    },
    {},
  ]);

  const returned = clearCompleted(store);

  expect(returned).toBe(undefined);
  expect(store.getContent()).toEqual(ONE_OPEN_TODO);
});

// Leg (b) [M2]: with no completed row there is nothing to clear, so the content
// is deep-equal to what it was immediately before the call.
test('leg (b) [M2]: no completed row leaves the content deep-equal to before', () => {
  const store = createTodosStore([{}, {}]);
  addTodo(store, 'a');
  addTodo(store, 'b');

  const before = snapshot(store);
  clearCompleted(store);
  const after = store.getContent();

  expect(after).toEqual(before);
  expect(after).toEqual([
    {
      todos: {
        '0': {text: 'a', completed: false},
        '1': {text: 'b', completed: false},
      },
    },
    {},
  ]);
});

// Leg (c) [M2]: when every row is completed the table is emptied, and a table
// with no rows does not exist in TinyBase — `[{}, {}]`, never `[{todos: {}}, {}]`.
test('leg (c) [M2]: every row completed leaves exactly [{}, {}]', () => {
  const store = createTodosStore([{}, {}]);
  addTodo(store, 'a');
  addTodo(store, 'b');
  setTodoCompleted(store, '0', true);
  setTodoCompleted(store, '1', true);

  clearCompleted(store);
  const after = store.getContent();

  expect(after).toEqual([{}, {}]);
  expect(Object.keys(after[0])).toEqual([]);
});

// Leg (d) [M3]: the seed file, read from the repository root, parses to exactly
// the two rows — one open, one done.
test('leg (d) [M3]: two-todos-one-done.json parses to the seed of M3', () => {
  const parsed = JSON.parse(
    readText('state-exams', 'seeds', 'two-todos-one-done.json'),
  );

  expect(parsed).toEqual([
    {
      todos: {
        '0': {text: 'buy milk', completed: false},
        '1': {text: 'walk the dog', completed: true},
      },
    },
    {},
  ]);
});

// Legs (e)–(i) [M4]: the five texts `grep -q` reads out of the component — the
// callback it calls, the button's id, its text, its click handler and the
// provided store. Each check is the grep's own semantics: a component that
// never calls the callback, a button without that id, a button with other text,
// a button with no click handler, or a component that does not read the
// provided store lacks the text and fails here exactly as `grep -q` exits 1.
test('legs (e)-(i) [M4]: ClearCompleted.tsx carries the five greppable texts', () => {
  const source = readText('client', 'src', 'ClearCompleted.tsx');

  expect(source).toContain('clearCompleted('); // (e)
  expect(source).toContain('id="clearCompleted"'); // (f)
  expect(source).toContain('Clear completed'); // (g)
  expect(source).toContain('onClick='); // (h)
  expect(source).toContain('useStore(STORE_ID)'); // (i)
});

// Leg (j) [M4]: the list mounts the button.
test('leg (j) [M4]: TodoList.tsx contains <ClearCompleted />', () => {
  expect(readText('client', 'src', 'TodoList.tsx')).toContain(
    '<ClearCompleted />',
  );
});
