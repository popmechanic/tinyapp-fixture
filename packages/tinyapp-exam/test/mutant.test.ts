// Exam for task 2, legs (a)-(i): the mutant perturbation (M1-M6).
//
// M1. `applyMutant(snapshot, edits)` returns a new snapshot and leaves `snapshot` deep-equal
//     to what it was before the call.
// M2. An edit `{table, row, cell, value}` sets that cell to `value` in the result, creating
//     the table and the row when they are absent.
// M3. An edit `{table, row, cell, absent: true}` removes that cell; when it was the row's
//     last cell the row is removed too, and when that row was the table's last row the table
//     is removed too.
// M4. An edit `{table, row, absent: true}` removes that row, and the table too when it was
//     the table's last row.
// M5. Edits apply in list order as one perturbation, so a later edit to the same cell wins.
// M6. `mutantPath(edits)` returns one segment per edit in list order, joined by `,`: a cell
//     edit's segment is `<table>/<row>/<cell>` and a row edit's segment is `<table>/<row>`.

import {expect, test} from 'bun:test';

import {applyMutant, mutantPath} from '../src/mutant';
import type {MutantEdit, Snapshot} from '../src/types';

// ---------------------------------------------------------------- fixtures

/** The one-open-todo state every leg that says `base` starts from. */
const makeBase = (): Snapshot => [
  {todos: {'0': {text: 'buy milk', completed: false}}},
  {},
];

/** The row ids of `table` in `snapshot`, so a removal leg can name what is left. */
const rowIds = (snapshot: Snapshot, table: string): string[] =>
  Object.keys(snapshot[0][table] ?? {}).sort();

/** The cell ids of one row, so a removal leg can name what is left. */
const cellIds = (snapshot: Snapshot, table: string, row: string): string[] =>
  Object.keys(snapshot[0][table]?.[row] ?? {}).sort();

// -------------------------------------------------------------------- M1

test('leg (a) [M1]: applyMutant returns a new snapshot and leaves the input untouched', () => {
  const base = makeBase();
  const before = structuredClone(base);
  const edits: MutantEdit[] = [
    {table: 'todos', row: '0', cell: 'completed', value: true},
  ];

  const result = applyMutant(base, edits);

  expect(result).not.toBe(base);
  expect(base).toEqual(before);
  expect(base).toEqual([{todos: {'0': {text: 'buy milk', completed: false}}}, {}]);
});

// -------------------------------------------------------------------- M2

test('leg (b) [M2]: a cell edit sets exactly that cell in the result', () => {
  const result = applyMutant(makeBase(), [
    {table: 'todos', row: '0', cell: 'completed', value: true},
  ]);

  expect(result).toEqual([
    {todos: {'0': {text: 'buy milk', completed: true}}},
    {},
  ]);
  expect(cellIds(result, 'todos', '0')).toEqual(['completed', 'text']);
  expect(rowIds(result, 'todos')).toEqual(['0']);
  expect(Object.keys(result[0]).sort()).toEqual(['todos']);
});

test('leg (c) [M2]: a cell edit creates the table and the row when they are absent', () => {
  const result = applyMutant([{}, {}], [
    {table: 'todos', row: '0', cell: 'text', value: ''},
  ]);

  expect(result).toEqual([{todos: {'0': {text: ''}}}, {}]);
  expect(Object.keys(result[0]).sort()).toEqual(['todos']);
  expect(rowIds(result, 'todos')).toEqual(['0']);
  expect(cellIds(result, 'todos', '0')).toEqual(['text']);
  expect(result[0].todos['0'].text).toBe('');
  expect(result[1]).toEqual({});
});

// -------------------------------------------------------------------- M3

test('leg (d) [M3]: an absent cell edit removes that cell and leaves the rest of the row', () => {
  const result = applyMutant(makeBase(), [
    {table: 'todos', row: '0', cell: 'completed', absent: true},
  ]);

  expect(result).toEqual([{todos: {'0': {text: 'buy milk'}}}, {}]);
  expect(cellIds(result, 'todos', '0')).toEqual(['text']);
  expect('completed' in result[0].todos['0']).toBe(false);
});

test("leg (d) [M3]: removing a row's last cell removes the row, and the table with it", () => {
  const result = applyMutant([{todos: {'0': {text: 'x'}}}, {}], [
    {table: 'todos', row: '0', cell: 'text', absent: true},
  ]);

  expect(result).toEqual([{}, {}]);
  expect(Object.keys(result[0])).toEqual([]);
  expect(Object.keys(result[1])).toEqual([]);
});

// -------------------------------------------------------------------- M4

test('leg (e) [M4]: an absent row edit removes that row and leaves exactly the other row', () => {
  const twoRows: Snapshot = [
    {
      todos: {
        '0': {text: 'buy milk', completed: false},
        '1': {text: 'walk the dog', completed: true},
      },
    },
    {},
  ];

  const result = applyMutant(twoRows, [{table: 'todos', row: '0', absent: true}]);

  expect(result).toEqual([
    {todos: {'1': {text: 'walk the dog', completed: true}}},
    {},
  ]);
  expect(rowIds(result, 'todos')).toEqual(['1']);
});

test("leg (e) [M4]: removing a table's last row removes the table too", () => {
  const result = applyMutant(makeBase(), [
    {table: 'todos', row: '0', absent: true},
  ]);

  expect(result).toEqual([{}, {}]);
  expect(Object.keys(result[0])).toEqual([]);
  expect(Object.keys(result[1])).toEqual([]);
});

// -------------------------------------------------------------------- M5

test('leg (f) [M5]: edits apply in list order, so a later edit to the same cell wins', () => {
  const result = applyMutant(makeBase(), [
    {table: 'todos', row: '0', cell: 'text', value: 'a'},
    {table: 'todos', row: '0', cell: 'text', value: 'b'},
  ]);

  expect(result[0].todos['0'].text).toBe('b');
  expect(result).toEqual([
    {todos: {'0': {text: 'b', completed: false}}},
    {},
  ]);
});

// -------------------------------------------------------------------- M6

test("leg (g) [M6]: a cell edit's segment is <table>/<row>/<cell>, for a set and for a removal", () => {
  expect(
    mutantPath([{table: 'todos', row: '0', cell: 'completed', value: true}]),
  ).toBe('todos/0/completed');
  expect(
    mutantPath([{table: 'todos', row: '0', cell: 'completed', absent: true}]),
  ).toBe('todos/0/completed');
});

test("leg (h) [M6]: a row edit's segment is <table>/<row>", () => {
  expect(mutantPath([{table: 'todos', row: '1', absent: true}])).toBe('todos/1');
});

test('leg (i) [M6]: segments come in list order joined by a comma, and no edits is the empty string', () => {
  expect(
    mutantPath([
      {table: 'todos', row: '0', cell: 'completed', value: true},
      {table: 'todos', row: '1', absent: true},
    ]),
  ).toBe('todos/0/completed,todos/1');
  expect(mutantPath([])).toBe('');
});
