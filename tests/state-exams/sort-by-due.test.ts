/**
 * The exam for the task "Sort by due date — one button, a setting in the
 * synced store, and the soonest deadline on top".
 *
 * A file's whole state exam is the single `stateExam({…})` in it, as
 * `tests/state-exams/set-filter.test.ts` shows, so leg (a) is that one call —
 * written out exactly as the Proof spells it — plus a `bun:test` block beside
 * it for the two snapshot files a `stateExam` cannot itself pin the *source*
 * of. Every other leg is an ordinary `bun:test` block:
 *
 *   (a) [M1] the one `stateExam` of the file, and the seed/expected files it
 *            reads, pinned against the literals written out here;
 *   (b) [M2] `setSort` writing `'due'`, refusing `'bogus'`, and clearing on
 *            `''`; `VALUES_SCHEMA.sort` exactly `{type: 'string'}`, no default;
 *   (c) [M3] `orderTodos` over the pinned table, with `'due'` and `undefined`;
 *   (d) [M4] the static render of the M1 seed with no `sort` value: the button
 *            inactive, the filter bar untouched, the list in row order.
 *
 * `setSort` and `VALUES_SCHEMA.sort` are reached through a namespace import of
 * `storeData` — a named import of `setSort` is a load error at BASE, which
 * would red the whole file instead of the leg. `orderTodos` lives in a module
 * that does not exist at all at BASE, so it is reached with a
 * computed-specifier `import()` inside its own test body, the way
 * `tests/state-exams/set-todo-due.test.ts` reaches `overdue.ts`.
 *
 * Every fixture read and every render happens inside a test body, never at
 * module level: the state linter imports this file with `stateExam` and
 * `bun:test` stubbed out, and a module-level read of a file this task has yet
 * to create would fail the whole file at load rather than report one leg red.
 *
 * What this file assumes of the code under test, beyond what each leg already
 * says: `setSort` and `orderTodos` are synchronous and free of side effects
 * beyond the one store mutation `setSort` names; `createTodosStore` still
 * accepts the `[tables, values]` pair a seed file parses to; and `renderStatic`
 * still takes a `TodosContent` and returns the page's markup as a string, the
 * way every sibling exam in this directory already relies on it doing.
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {assertView, stateExam} from 'tinyapp-exam';

import {renderStatic} from '../../client/src/StaticPage';
import * as sd from '../../client/src/storeData';
import type {TodosContent} from '../../client/src/storeData';

// This file sits two directories below the repository root, which is also the
// test runner's cwd — the module and fixture reads are anchored there.
const ROOT = join(import.meta.dir, '..', '..');

/** `orderTodos`, as the task's Produces spells it. */
type OrderTodos = (
  ids: readonly string[],
  table: Record<string, {pinned?: boolean; due?: string}>,
  sort: unknown,
) => string[];

/** The module M3 declares; it does not exist at BASE. See this file's header. */
const orderTodosModule = async (): Promise<{orderTodos: OrderTodos}> =>
  (await import(
    join(import.meta.dir, '..', '..', 'client/src/todoOrder.ts')
  )) as {orderTodos: OrderTodos};

/** The literal seed of M1, written out here rather than only read off disk. */
const SEED: TodosContent = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false, due: '2026-03-01'},
      '1': {text: 'walk the dog', completed: false},
      '2': {text: 'call mum', completed: false, due: '2026-02-01'},
    },
  },
  {},
] as unknown as TodosContent;

/** The M1 expected state: the seed's tables beside `{sort: 'due'}`. */
const EXPECTED = [SEED[0], {sort: 'due'}];

const readJson = (...parts: string[]): unknown =>
  JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8'));

/** A structural copy, so a later mutation of the store cannot reach it. */
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// --- M1: the one state exam of the file, and its two snapshot files ---------

// Leg (a) [M1]: over the M1 seed, clicking "Sort by due date" leaves the
// store's `getContent()` exactly the seed's tables beside `{sort: 'due'}`,
// shows exactly three rows in due-first-then-undated order, and marks
// `#sort-due` active; the mutant that drops row `2`'s `due` is a state the
// click — which moves only the values half — does not reach, so it must be
// caught.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/three-todos-mixed-due.json',
  store: () => sd.createTodosStore(),
  action: {click: {role: 'button', name: 'Sort by due date'}},
  expected: 'state-exams/expected/three-todos-mixed-due-sorted.json',
  view: [
    {selector: '#todoList li', count: 3},
    {selector: '#todoList li:nth-child(1)', count: 1, text: 'call mum'},
    {selector: '#todoList li:nth-child(2)', count: 1, text: 'buy milk'},
    {selector: '#todoList li:nth-child(3)', count: 1, text: 'walk the dog'},
    {
      selector: '#sort-due',
      count: 1,
      attr: {name: 'data-active', value: 'true'},
    },
  ],
  mutant: [{table: 'todos', row: '2', cell: 'due', absent: true}],
});

// Leg (a) [M1], the snapshot files: the seed file parses to exactly the M1
// seed literal, and the expected file parses to exactly the seed's tables
// beside `{sort: 'due'}`.
test('leg (a) [M1] the seed and expected files parse to the literals this task pins', () => {
  expect(readJson('state-exams', 'seeds', 'three-todos-mixed-due.json')).toEqual(
    SEED,
  );
  expect(
    readJson('state-exams', 'expected', 'three-todos-mixed-due-sorted.json'),
  ).toEqual(EXPECTED);
});

// --- M2: setSort, and the values schema it writes into -----------------------

test("leg (b) [M2] setSort(store, 'due') writes {sort: 'due'}, 'bogus' changes nothing, '' deletes it", () => {
  const store = sd.createTodosStore(copy(SEED));

  sd.setSort(store, 'due');
  expect(store.getContent()[1]).toEqual({sort: 'due'});

  // An unknown name writes nothing: the value stays exactly what it was.
  sd.setSort(store, 'bogus');
  expect(store.getContent()[1]).toEqual({sort: 'due'});

  // '' deletes the value rather than writing '' — the store's whole content
  // goes back to the seed's, not just its values half.
  sd.setSort(store, '');
  expect(store.getContent()).toEqual(SEED);
});

test("leg (b) [M2] VALUES_SCHEMA.sort is exactly {type: 'string'} with no default key", () => {
  const sort = (sd.VALUES_SCHEMA as unknown as Record<string, unknown>).sort;
  expect(sort).toEqual({type: 'string'});
  expect(Object.hasOwn(sort as object, 'default')).toBe(false);
});

// --- M3: orderTodos, pure -----------------------------------------------------

test("leg (c) [M3] orderTodos puts pinned first, then — under 'due' — dated rows ascending, undated after", async () => {
  const {orderTodos} = await orderTodosModule();
  const table = {
    a: {due: '2026-03-01'},
    b: {},
    c: {due: '2026-02-01'},
    d: {pinned: true},
  };
  const ids = ['a', 'b', 'c', 'd'];

  expect(orderTodos(ids, table, 'due')).toEqual(['d', 'c', 'a', 'b']);
  expect(orderTodos(ids, table, undefined)).toEqual(['d', 'a', 'b', 'c']);
});

// --- M4: with the setting gone, the static render is back in row order -------

test('leg (d) [M4] renderStatic over the M1 seed with no sort value: the button inactive, the bar untouched, row order', () => {
  const html = renderStatic(SEED);

  expect(
    assertView(html, [
      {
        selector: '#sort-due',
        count: 1,
        attr: {name: 'data-active', value: 'false'},
      },
      {selector: '#filterBar button', count: 3},
    ]),
  ).toEqual([]);

  const milk = html.indexOf('buy milk');
  const dog = html.indexOf('walk the dog');
  const mum = html.indexOf('call mum');
  expect(milk).toBeGreaterThanOrEqual(0);
  expect(dog).toBeGreaterThanOrEqual(0);
  expect(mum).toBeGreaterThanOrEqual(0);
  expect(milk).toBeLessThan(dog);
  expect(dog).toBeLessThan(mum);
});
