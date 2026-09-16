// Exam for task 3 — "The two persistence exams on the fixture — a todo added survives a
// reload, a todo completed survives a reload" — legs (c) [M3] and (d) [M4].
//
// M3. The persistence exam on the same entry, assets and table, clicking
//     `{role: 'checkbox', name: 'Learn TinyBase'}`, reaches after the reload
//     `state-exams/expected/default-todos-first-done.json` — exactly
//     `[{"todos":{"1":{"text":"Learn TinyBase","completed":true},"2":{"text":"Build an
//     app","completed":false}}},{}]` — with the rows equal to it, the reloaded page showing
//     `#todo-1` checked, `#todo-2` unchecked and `#todoList li` exactly 2 times, and the
//     mutant setting row `1`'s `completed` to `false` killed.
// M4. Each expected file is the seed plus one of the app's own moves, and nothing else
//     changed: on a store seeded from `state-exams/seeds/default-todos.json`,
//     `setTodoCompleted(store, '1', true)` leaves `getContent()` exactly the M3 literal; and
//     each of the three files this task creates loads through `createTodosStore` to a
//     `getContent()` deep-equal to its own content.
//
// The checkbox of row `1` is named `Learn TinyBase` through its `aria-label`, so the click
// below is the click a person makes — the checkbox called Learn TinyBase — and lands on that
// row and no other whatever the page is styled with.
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
  createTodosStore,
  setTodoCompleted,
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

/** [M3] The state ticking the first default todo leaves behind, written out here. */
const FIRST_DONE: Snapshot = [
  {
    todos: {
      '1': {text: 'Learn TinyBase', completed: true},
      '2': {text: 'Build an app', completed: false},
    },
  },
  {},
];

// ---------------------------------------------------------------- (c) [M3]

// The one persistence exam of this file, spelled as the task's Context gives it: the page
// opened unseeded on the driver's own loopback origin, the checkbox called `Learn TinyBase`
// clicked, the save waited for, the page reloaded, and the store and the rows read back
// against the expected file.
persistenceExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  assets: {'/sqlite3.wasm': 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm'},
  action: {click: {role: 'checkbox', name: 'Learn TinyBase'}},
  expected: 'state-exams/expected/default-todos-first-done.json',
  table: 'todos',
  view: [
    {selector: '#todo-1', checked: true},
    {selector: '#todo-2', unchecked: true},
    {selector: '#todoList li', count: 2},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'completed', value: false}],
});

test('leg (c) [M3]: the expected file is exactly the state the ticked todo leaves', () => {
  // The literal M3 names, against the file the persistence exam above reaches for.
  expect(parse('state-exams/expected/default-todos-first-done.json')).toEqual(FIRST_DONE);
});

// ---------------------------------------------------------------- (d) [M4]

test("leg (d) [M4]: the expected file is the seed plus the app's own setTodoCompleted, nothing else", () => {
  const store = createTodosStore(parse('state-exams/seeds/default-todos.json') as TodosContent);

  // The app's own move, on the state the seed documents: row `1` ticked, and nothing else.
  setTodoCompleted(store, '1', true);

  expect(serialised(store.getContent())).toEqual(FIRST_DONE);
});

test('leg (d) [M4]: state-exams/expected/default-todos-first-done.json loads through createTodosStore to itself', () => {
  const content = parse('state-exams/expected/default-todos-first-done.json');
  expect(serialised(createTodosStore(content as TodosContent).getContent())).toEqual(content);
});
