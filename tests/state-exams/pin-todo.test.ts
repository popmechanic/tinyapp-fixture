/**
 * The exam for Task 1 — "The pinned cell and the Pin button — a click reaches
 * the pinned state, and that state is what this task posts".
 *
 * A file's whole state exam is the single `stateExam({…})` in it, as the
 * delete-to-trash exam shows, so leg (a) is that one call and every other leg
 * is an ordinary `bun:test` block beside it: the expected file's own content
 * (a), the schema of the new cell (b), the two directions of `pinTodo` (c), its
 * two no-op edges (d), the round trip of every checked-in state (e), the static
 * render of the pinned row and of its two buttons (f), and the ignore rule the
 * posted states depend on (g), read here out of `.gitignore` itself.
 *
 * Legs (h) and (i) ran two other exam files and the linter's four test files as
 * children. Both are gone: one claim, one prover — those files prove their own
 * claims, and the fold's suite runs them once.
 *
 * Three readings this file makes, written down because they are choices:
 *
 *   - The store module is reached through one namespace import, the form
 *     `delete-to-trash.test.ts` already uses. A named import of `pinTodo` would
 *     be a load error before the implementation exports it, and a load error is
 *     one red for the whole file; this way each leg is its own red and says
 *     which part of the contract is missing.
 *   - Every fixture read happens inside a test body, never at module level: the
 *     state linter's capture child imports this file with `stateExam` and
 *     `bun:test` stubbed out, so a module-level `readFileSync` of the expected
 *     file this task has yet to create would make `lint:state` fail as `capture
 *     failed` rather than as the finding it is. The one module-level read is
 *     `readdirSync` of the two snapshot directories, which both exist at BASE,
 *     and it is there so that leg (e)'s failing file is the failing test's name.
 *   - Nothing here lists the cells of a todos row or the tables of
 *     `TABLES_SCHEMA` beyond the `pinned` cell M2 names: a list of either would
 *     be a second, weaker copy of the schema. The exact equalities this exam
 *     does carry are the two states M1 and M3 spell out as literals, each
 *     pinned both on the implementer's expected file and on the clause's own
 *     words.
 *
 * At BASE `renderStatic` over the M1 literal does not throw — the schema drops
 * the `pinned` cell it does not yet hold — so leg (f) goes red on the absent
 * `data-pinned` attribute and the absent Pin buttons rather than on an
 * exception.
 */

import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {assertView, stateExam} from 'tinyapp-exam';

import {renderStatic} from '../../client/src/StaticPage';
import * as sd from '../../client/src/storeData';
import type {TodosContent} from '../../client/src/storeData';

// This file sits two directories below the repository root, which is also the
// test runner's cwd — the fixture reads are anchored there.
const ROOT = join(import.meta.dir, '..', '..');

const readJson = (...parts: string[]): TodosContent =>
  JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8')) as TodosContent;

/** A store's content as plain JSON, the shape a checked-in file parses to. */
const snapshot = (store: {getContent: () => unknown}): TodosContent =>
  JSON.parse(JSON.stringify(store.getContent())) as TodosContent;

/** The sorted cell ids row `id` of `todos` holds in `content`. */
const cellsOf = (content: TodosContent, id: string): string[] =>
  Object.keys(
    (content[0] as Record<string, Record<string, Record<string, unknown>>>)
      .todos[id] ?? {},
  ).sort();

/** The seed of M1, M3, M4 and M5, as `state-exams/seeds/two-open-todos.json`. */
const TWO_OPEN_TODOS: TodosContent = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
] as TodosContent;

/** The state M1 names: row `1` carrying `pinned: true`, and nothing else moved. */
const TWO_TODOS_SECOND_PINNED: TodosContent = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false, pinned: true},
    },
  },
  {},
] as TodosContent;

/** The expected file leg (a)'s exam compares against, and M1 pins the content of. */
const EXPECTED_PATH = 'state-exams/expected/two-todos-second-pinned.json';

// --- Leg (a) [M1]: the one state exam of the file ----------------------------

// Clicking the button named `Pin walk the dog` — row `1`'s Pin, named after
// the row it pins so that two rows are never two buttons called `Pin` — marks
// the second todo pinned and moves nothing else: the store reaches exactly the
// expected state, the page then shows the one pinned row and the one unpinned
// row, `#pin-1` reading Unpin and `#pin-0` still there, and the mutant that drops the `pinned` cell from the expected state is
// killed — so an exam that never looked at that cell could not have passed. The
// view's `text` is a contains-match, which is why the whole button text is left
// to leg (f).
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => sd.createTodosStore(),
  action: {click: {role: 'button', name: 'Pin walk the dog'}},
  expected: EXPECTED_PATH,
  view: [
    {
      selector: '#todoList li[data-pinned="true"]',
      count: 1,
      text: 'walk the dog',
    },
    {
      selector: '#todoList li[data-pinned="false"]',
      count: 1,
      text: 'buy milk',
    },
    {selector: '#pin-1', count: 1, text: 'Unpin'},
    {selector: '#pin-0', count: 1},
    {selector: '#todoList li', count: 2},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'pinned', absent: true}],
});

// Leg (a) [M1]: the expected file the exam above names parses to exactly the
// literal M1 spells, so a file differing in any cell, id or table fails naming
// it.
test('leg (a) [M1] two-todos-second-pinned.json holds exactly the state of M1', () => {
  expect(readJson(EXPECTED_PATH)).toEqual(TWO_TODOS_SECOND_PINNED);
});

// --- Leg (b) [M2]: the schema of the new cell, on todos and on trash ---------

test('leg (b) [M2] TABLES_SCHEMA.todos.pinned is exactly {type: boolean} with no default, and trash.pinned equals it', () => {
  const schema = sd.TABLES_SCHEMA as unknown as Record<
    string,
    Record<string, Record<string, unknown>>
  >;
  const pinned = schema.todos?.pinned;

  expect(pinned).toEqual({type: 'boolean'});
  expect(Object.keys(pinned ?? {}).sort()).toEqual(['type']);
  // Spelled as its own assertion because it is the whole reason the cell has
  // this shape: a `default` is materialised into every row's `getContent()`.
  expect(Object.hasOwn(pinned ?? {}, 'default')).toBe(false);
  expect(schema.trash?.pinned).toEqual(pinned);
});

// --- Leg (c) [M3]: pinning reaches M1, unpinning goes back exactly -----------

test('leg (c) [M3] pinTodo true reaches the M1 literal and pinTodo false removes the cell again', () => {
  expect(typeof sd.pinTodo).toBe('function');

  const store = sd.createTodosStore(TWO_OPEN_TODOS);

  sd.pinTodo(store, '1', true);
  expect(snapshot(store)).toEqual(TWO_TODOS_SECOND_PINNED);

  sd.pinTodo(store, '1', false);
  const back = snapshot(store);

  expect(back).toEqual(TWO_OPEN_TODOS);
  // Unpinning removes the cell rather than writing `false` into it.
  expect(cellsOf(back, '1')).toEqual(['completed', 'text']);
});

// --- Leg (d) [M4]: the two edges that move nothing ---------------------------

test('leg (d) [M4] pinTodo of an id todos does not hold leaves the content deep-equal to before', () => {
  expect(typeof sd.pinTodo).toBe('function');

  const store = sd.createTodosStore(TWO_OPEN_TODOS);

  const before = snapshot(store);
  sd.pinTodo(store, '9', true);
  const after = snapshot(store);

  expect(after).toEqual(before);
});

test('leg (d) [M4] pinTodo false on a row with no pinned cell leaves the content deep-equal to before', () => {
  expect(typeof sd.pinTodo).toBe('function');

  const store = sd.createTodosStore(TWO_OPEN_TODOS);

  const before = snapshot(store);
  sd.pinTodo(store, '0', false);
  const after = snapshot(store);

  expect(after).toEqual(before);
});

// --- Leg (e) [M5]: every checked-in state still loads to itself --------------

// One test per `.json` file found on the tree, so the name of a file that stops
// round-tripping is the name of the failing test. The list is read rather than
// pinned: the count of expected states moves with this change and with the run
// beside it.
for (const kind of ['seeds', 'expected'] as const) {
  for (const name of readdirSync(join(ROOT, 'state-exams', kind)).sort()) {
    if (!name.endsWith('.json')) {
      continue;
    }
    test(`leg (e) [M5] state-exams/${kind}/${name} loads through createTodosStore to its own content`, () => {
      const content = readJson('state-exams', kind, name);

      expect(snapshot(sd.createTodosStore(content))).toEqual(content);
    });
  }
}

// --- Leg (f) [M6]: the static render of the pinned state ---------------------

test('leg (f) [M6] renderStatic over the M1 literal paints one pinned row and one unpinned row', () => {
  expect(
    assertView(renderStatic(TWO_TODOS_SECOND_PINNED), [
      {
        selector: '#todoList li[data-pinned="true"]',
        count: 1,
        text: 'walk the dog',
      },
      {
        selector: '#todoList li[data-pinned="false"]',
        count: 1,
        text: 'buy milk',
      },
    ]),
  ).toEqual([]);
});

test('leg (f) [M6] that markup carries the button `#pin-1` reading Unpin once and the Pin button of row 0 once', () => {
  const html = renderStatic(TWO_TODOS_SECOND_PINNED);

  // Counted through `?? []` so a missing button reads as `0` rather than as a
  // null dereference, and each regex spans the whole element so `Unpin` on an
  // unpinned row's button matches nothing. The button carries the design
  // system's own attributes between its tag name and its id now — a class, a
  // `data-slot`, its accessible name — so the attributes are matched as
  // whatever the component puts there rather than pinned word for word.
  expect(
    (html.match(/<button[^>]*id="pin-1"[^>]*>Unpin<\/button>/g) ?? []).length,
  ).toBe(1);
  expect(
    (html.match(/<button[^>]*id="pin-0"[^>]*>Pin<\/button>/g) ?? []).length,
  ).toBe(1);
});

test('leg (f) [M6] the Pin button follows Delete inside a row', () => {
  const html = renderStatic(TWO_TODOS_SECOND_PINNED);
  const firstPin = html.indexOf('id="pin-');
  const rowStart = html.indexOf('<li ');

  // Asserted before the ordering so that markup with no Pin button at all says
  // so, rather than reading as `1590 < -1`.
  expect(rowStart).toBeGreaterThanOrEqual(0);
  expect(firstPin).toBeGreaterThan(rowStart);

  expect(html.indexOf('>Delete<')).toBeLessThan(firstPin);
  // And within the row itself, not merely earlier in the page: the slice of the
  // first row that precedes the first Pin button holds that row's Delete,
  // which is the click the exams already on the tree depend on.
  expect(html.slice(rowStart, firstPin)).toContain('>Delete<');
});

// --- Leg (g) [M7]: the ignore rule the posted states depend on ---------------

// The `Run:` line was `grep -qx 'state-exams/posted/' .gitignore`; `-x` is a
// whole-line match, so the predicate here is one line equal to that string.
test("leg (g) [M7] .gitignore carries the whole line `state-exams/posted/`", () => {
  const lines = readFileSync(join(ROOT, '.gitignore'), 'utf8').split('\n');

  expect(lines.includes('state-exams/posted/')).toBe(true);
});
