// Exam for task 3 — "The two persistence exams on the fixture — a todo added survives a
// reload, a todo completed survives a reload" — legs (a) [M1], (b) [M2] and (d) [M4].
//
// M1. `state-exams/seeds/default-todos.json` parses to exactly
//     `[{"todos":{"1":{"text":"Learn TinyBase","completed":false},"2":{"text":"Build an
//     app","completed":false}}},{}]`, and `createTodosStore().getContent()` — the unseeded
//     store, the state an unseeded page starts from — deep-equals it.
// M2. The persistence exam on `client/index.html` with `assets`
//     `{'/sqlite3.wasm': 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm'}` and
//     `table` `todos`, typing `buy milk` into `{role: 'textbox', name: 'New todo'}` and
//     pressing `Enter` there, reaches after the reload
//     `state-exams/expected/default-todos-plus-buy-milk.json` — exactly
//     `[{"todos":{"0":{"text":"buy milk","completed":false},"1":{"text":"Learn
//     TinyBase","completed":false},"2":{"text":"Build an app","completed":false}}},{}]` —
//     with the rows read through `window.__TINYAPP_DB__` equal to it, the reloaded page
//     showing `#todoList li` exactly 3 times with text containing `buy milk` and `#todo-0`
//     unchecked, and the mutant setting row `0`'s `text` to `''` killed.
// M4. Each expected file is the seed plus one of the app's own moves, and nothing else
//     changed: on a store seeded from `state-exams/seeds/default-todos.json`,
//     `addTodo(store, 'buy milk')` returns `'0'` and leaves `getContent()` exactly the M2
//     literal; and each of the three files this task creates loads through
//     `createTodosStore` to a `getContent()` deep-equal to its own content.
//
// The registration below carries M2 whole: the store after the reload against the expected
// file, the rows the page's own persister wrote read back through `__TINYAPP_DB__`, the
// views, and the mutant — `runPersistenceExam` is what performs all four, and this file is
// what says which page, which action and which state.
//
// Every JSON read here happens inside a test body, never at module level: the lint capture
// child imports every file under `tests/state-exams/` with `tinyapp-exam` stubbed, so a
// module-level read of a file this task creates would fail the lint rather than a leg.
//
// The walls this exam leaves — `persist_ms`, `reload_ms` — are the issue's reading and are
// asserted by nothing here.

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {persistenceExam, type Snapshot} from 'tinyapp-exam';

import {
  addTodo,
  createTodosStore,
  type TodosContent,
} from '../../client/src/storeData';

/** This file sits two directories below the repository root. */
const ROOT = join(import.meta.dir, '..', '..');

/** The snapshot a path below the root parses to. */
const parse = (path: string): Snapshot =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as Snapshot;

/** A store's content as JSON sees it, which is how a checked-in file sees it too. */
const serialised = (content: Snapshot): Snapshot =>
  JSON.parse(JSON.stringify(content)) as Snapshot;

/** [M1] The state an unseeded page starts from, written out here rather than imported. */
const DEFAULT_TODOS: Snapshot = [
  {
    todos: {
      '1': {text: 'Learn TinyBase', completed: false},
      '2': {text: 'Build an app', completed: false},
    },
  },
  {},
];

/** [M2] The state the added todo leaves behind, written out here. */
const PLUS_BUY_MILK: Snapshot = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'Learn TinyBase', completed: false},
      '2': {text: 'Build an app', completed: false},
    },
  },
  {},
];

// ---------------------------------------------------------------- (b) [M2]

// The one persistence exam of this file, spelled as the task's Context gives it: the page
// opened unseeded on the driver's own loopback origin, `buy milk` typed into the box named
// `New todo` and `Enter` pressed there, the save waited for, the page reloaded, and the
// store and the rows read back against the expected file.
persistenceExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  assets: {'/sqlite3.wasm': 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm'},
  action: [
    {type: [{role: 'textbox', name: 'New todo'}, 'buy milk']},
    {key: [{role: 'textbox', name: 'New todo'}, 'Enter']},
  ],
  expected: 'state-exams/expected/default-todos-plus-buy-milk.json',
  table: 'todos',
  view: [
    {selector: '#todoList li', count: 3, text: 'buy milk'},
    {selector: '#todo-0', unchecked: true},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'text', value: ''}],
});

test('leg (b) [M2]: the expected file is exactly the state the added todo leaves', () => {
  // The literal M2 names, against the file the persistence exam above reaches for.
  expect(parse('state-exams/expected/default-todos-plus-buy-milk.json')).toEqual(
    PLUS_BUY_MILK,
  );
});

// ---------------------------------------------------------------- (a) [M1]

test("leg (a) [M1]: the seed is the app's own default, and the default is the seed", () => {
  // The file parses to the M1 literal and to nothing else.
  expect(parse('state-exams/seeds/default-todos.json')).toEqual(DEFAULT_TODOS);

  // And the unseeded store — the state an unseeded page starts from — deep-equals it,
  // serialised the way a checked-in file is.
  expect(serialised(createTodosStore().getContent())).toEqual(DEFAULT_TODOS);
});

// ---------------------------------------------------------------- (d) [M4]

test("leg (d) [M4]: the expected file is the seed plus the app's own addTodo, nothing else", () => {
  const store = createTodosStore(parse('state-exams/seeds/default-todos.json') as TodosContent);

  // The app's own move, on the state the seed documents: the new row takes id `0`.
  expect(addTodo(store, 'buy milk')).toBe('0');

  // And what it leaves is exactly the M2 literal — the seed plus that one todo.
  expect(serialised(store.getContent())).toEqual(PLUS_BUY_MILK);
});

test('leg (d) [M4]: state-exams/seeds/default-todos.json loads through createTodosStore to itself', () => {
  const content = parse('state-exams/seeds/default-todos.json');
  expect(serialised(createTodosStore(content as TodosContent).getContent())).toEqual(content);
});

test('leg (d) [M4]: state-exams/expected/default-todos-plus-buy-milk.json loads through createTodosStore to itself', () => {
  const content = parse('state-exams/expected/default-todos-plus-buy-milk.json');
  expect(serialised(createTodosStore(content as TodosContent).getContent())).toEqual(content);
});
