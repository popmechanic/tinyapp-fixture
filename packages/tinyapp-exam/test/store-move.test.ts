// Exam for task 1, legs (a)-(g) and (m): the diff table (M1, M2) and the store move
// (M3, M4, M7).
//
// M1. `diffContent(got, wanted)` returns `[]` when the two snapshots are deep-equal, and
//     otherwise one `Difference` `{table, row, cell, got, wanted}` per cell present in either
//     side with a different value, the side lacking the cell carrying `null`, ordered by
//     table, then row, then cell in string order; a store value that differs is one
//     `Difference` with `table` `$values`, `row` the empty string and `cell` the value's id,
//     after every table row.
// M2. `renderDiff(differences)` returns a string whose first line is exactly
//     `table / row / cell / got / wanted`, followed by one line per difference in order
//     spelled `<table> / <row> / <cell> / <got> / <wanted>`, where `<got>` and `<wanted>` are
//     `JSON.stringify` of the value and the bare word `absent` for `null`.
// M3. `storeMove(spec)` builds a store with `spec.store()`, calls `setContent` with the JSON
//     parsed from the file at `spec.seed`, awaits `spec.action(store)` under the contract, and
//     resolves `{content, diff, ms}`.
// M4. When the store's `getContent()` after `setContent(seed)` is not deep-equal to the parsed
//     seed, `storeMove` rejects with `snapshot violates schema: <spec.seed>` naming
//     `<table>/<row>/<cell>` of the first difference, and `spec.action` is never called.
// M7. `storeMove` runs the seed-load-action sequence twice on fresh stores and rejects with a
//     message beginning `nondeterministic store:` when the two post-action `getContent()`
//     results differ; when equal, `content` is the first and `spec.store` was called twice.

import {afterAll, expect, test} from 'bun:test';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';

import {createTodosStore} from '../../../client/src/storeData';
import {diffContent, renderDiff, storeMove} from '../src/store-move';
import type {Difference, Snapshot, StateExamSpec} from '../src/types';

// ---------------------------------------------------------------- fixtures

const fixtureDir = mkdtempSync(join(tmpdir(), 'tinyapp-exam-store-move-'));
afterAll(() => rmSync(fixtureDir, {recursive: true, force: true}));

/** Write `snapshot` as JSON and hand back the path spelled relative to `process.cwd()`. */
const fixture = (name: string, snapshot: unknown): string => {
  const absolute = join(fixtureDir, name);
  writeFileSync(absolute, JSON.stringify(snapshot));
  return relative(process.cwd(), absolute);
};

const EXPECTED_SNAPSHOT: Snapshot = [
  {todos: {'0': {text: 'buy milk', completed: false}}},
  {},
];

const SEED_EMPTY = fixture('seed-empty.json', [{}, {}]);
const EXPECTED_ONE_TODO = fixture('expected-one-todo.json', EXPECTED_SNAPSHOT);
const SEED_UNKNOWN_CELL = fixture('seed-unknown-cell.json', [
  {todos: {'1': {text: 'a', completed: false, done: true}}},
  {},
]);
const SEED_ROUND_TRIP = fixture('seed-round-trip.json', [
  {todos: {'1': {text: 'a', completed: false}}},
  {},
]);

const CLOCK = '2026-01-01T00:00:00Z';

const addBuyMilk = (store: any) => {
  store.addRow('todos', {text: 'buy milk', completed: false});
};

/** The spec of leg (e); `over` supplies whichever fields a leg varies. */
const makeSpec = (over: Record<string, unknown> = {}): StateExamSpec =>
  ({
    clock: CLOCK,
    seed: SEED_EMPTY,
    expected: EXPECTED_ONE_TODO,
    action: addBuyMilk,
    mutant: [],
    store: createTodosStore,
    ...over,
  }) as unknown as StateExamSpec;

const settle = async (thunk: () => unknown): Promise<unknown> => {
  try {
    await thunk();
    return null;
  } catch (error) {
    return error;
  }
};

const messageOf = (error: unknown): string => {
  expect(error).toBeInstanceOf(Error);
  return (error as Error).message;
};

// ------------------------------------------------------------------- M1, M2

test('leg (a) [M1]: two deep-equal snapshots diff to exactly []', () => {
  const got: Snapshot = [
    {
      todos: {
        '0': {text: 'buy milk', completed: false},
        '1': {text: 'walk the dog', completed: true},
      },
    },
    {n: 1},
  ];
  const wanted: Snapshot = [
    {
      todos: {
        '0': {text: 'buy milk', completed: false},
        '1': {text: 'walk the dog', completed: true},
      },
    },
    {n: 1},
  ];

  expect(diffContent(got, wanted)).toEqual([]);
});

test('leg (b) [M1]: one cell differing is exactly one Difference', () => {
  const differences = diffContent(
    [{todos: {'0': {text: 'a', completed: true}}}, {}],
    [{todos: {'0': {text: 'a', completed: false}}}, {}],
  );

  expect(differences).toEqual([
    {table: 'todos', row: '0', cell: 'completed', got: true, wanted: false},
  ]);
});

test('leg (c) [M1]: a row present only in got carries wanted null on every cell', () => {
  const differences = diffContent(
    [{todos: {'0': {text: 'a', completed: true}}}, {}],
    [{}, {}],
  );

  expect(differences).toEqual([
    {table: 'todos', row: '0', cell: 'completed', got: true, wanted: null},
    {table: 'todos', row: '0', cell: 'text', got: 'a', wanted: null},
  ]);
});

test('leg (c) [M1]: a row present only in wanted carries got null on every cell', () => {
  const differences = diffContent(
    [{}, {}],
    [{todos: {'0': {text: 'a', completed: true}}}, {}],
  );

  expect(differences).toEqual([
    {table: 'todos', row: '0', cell: 'completed', got: null, wanted: true},
    {table: 'todos', row: '0', cell: 'text', got: null, wanted: 'a'},
  ]);
});

test('leg (c) [M1]: a differing store value is a $values difference after every table row', () => {
  const differences = diffContent(
    [{todos: {'0': {text: 'a', completed: false}}}, {n: 1}],
    [{todos: {'0': {text: 'b', completed: false}}}, {n: 2}],
  );

  expect(differences).toEqual([
    {table: 'todos', row: '0', cell: 'text', got: 'a', wanted: 'b'},
    {table: '$values', row: '', cell: 'n', got: 1, wanted: 2},
  ]);
  expect(differences[differences.length - 1]).toEqual({
    table: '$values',
    row: '',
    cell: 'n',
    got: 1,
    wanted: 2,
  });
});

test('leg (c) [M1]: differences sort by table, then row, then cell in string order', () => {
  const differences = diffContent(
    [
      {
        todos: {
          b: {text: 'bt', completed: true},
          a: {text: 'at', completed: true},
        },
      },
      {},
    ],
    [
      {
        todos: {
          b: {text: 'bt2', completed: false},
          a: {text: 'at2', completed: false},
        },
      },
      {},
    ],
  );

  expect(differences.map((d) => `${d.table}/${d.row}/${d.cell}`)).toEqual([
    'todos/a/completed',
    'todos/a/text',
    'todos/b/completed',
    'todos/b/text',
  ]);
  expect(differences).toEqual([
    {table: 'todos', row: 'a', cell: 'completed', got: true, wanted: false},
    {table: 'todos', row: 'a', cell: 'text', got: 'at', wanted: 'at2'},
    {table: 'todos', row: 'b', cell: 'completed', got: true, wanted: false},
    {table: 'todos', row: 'b', cell: 'text', got: 'bt', wanted: 'bt2'},
  ]);
});

/** The rendered table, split into lines; a single trailing newline is not a line. */
const renderLines = (differences: Difference[]): string[] =>
  renderDiff(differences).replace(/\n$/, '').split('\n');

test('leg (d) [M2]: renderDiff writes the header and one line per difference', () => {
  const differences = diffContent(
    [{todos: {'0': {text: 'a', completed: true}}}, {}],
    [{todos: {'0': {text: 'a', completed: false}}}, {}],
  );

  const lines = renderLines(differences);
  expect(lines[0]).toBe('table / row / cell / got / wanted');
  expect(lines).toEqual([
    'table / row / cell / got / wanted',
    'todos / 0 / completed / true / false',
  ]);
});

test('leg (d) [M2]: a null side renders the bare word absent, a value renders JSON.stringify', () => {
  const lines = renderLines([
    {table: 'todos', row: '0', cell: 'text', got: null, wanted: 'x'},
  ]);

  expect(lines).toEqual([
    'table / row / cell / got / wanted',
    'todos / 0 / text / absent / "x"',
  ]);
});

// ----------------------------------------------------------------- M3, M4, M7

test('leg (e) [M3]: a move that reaches the expected state resolves with an empty diff', async () => {
  const result = await storeMove(makeSpec());

  expect(result.diff).toEqual([]);
  expect(result.content).toEqual(EXPECTED_SNAPSHOT);
  expect(Number.isFinite(result.ms)).toBe(true);
  expect(result.ms).toBeGreaterThanOrEqual(0);
});

test('leg (f) [M3]: a move that lands on the wrong cell resolves with that one difference', async () => {
  const result = await storeMove(
    makeSpec({
      action: (store: any) => {
        store.addRow('todos', {text: 'buy milk', completed: true});
      },
    }),
  );

  expect(result.diff).toEqual([
    {table: 'todos', row: '0', cell: 'completed', got: true, wanted: false},
  ]);
});

test('leg (g) [M4]: a seed the schema does not round-trip is refused before the action runs', async () => {
  let actionCalls = 0;
  const error = await settle(() =>
    storeMove(
      makeSpec({
        seed: SEED_UNKNOWN_CELL,
        action: (store: any) => {
          actionCalls += 1;
          addBuyMilk(store);
        },
      }),
    ),
  );

  const message = messageOf(error);
  expect(
    message.startsWith(`snapshot violates schema: ${SEED_UNKNOWN_CELL}`),
  ).toBe(true);
  expect(message).toContain('todos/1/done');
  expect(message).not.toContain('todos/1/text');
  expect(actionCalls).toBe(0);
});

test('leg (g) [M4]: a seed the schema does round-trip is not refused', async () => {
  const error = await settle(() => storeMove(makeSpec({seed: SEED_ROUND_TRIP})));

  expect(error).toBe(null);
});

test('leg (m) [M7]: an action that reads Math.random is refused as nondeterministic', async () => {
  const error = await settle(() =>
    storeMove(
      makeSpec({
        action: (store: any) => {
          store.addRow('todos', {text: String(Math.random()), completed: false});
        },
      }),
    ),
  );

  const message = messageOf(error);
  expect(message.startsWith('nondeterministic store:')).toBe(true);
});

test('leg (m) [M7]: a deterministic action is run twice, on a fresh store each time', async () => {
  let storeCalls = 0;
  const result = await storeMove(
    makeSpec({
      store: () => {
        storeCalls += 1;
        return createTodosStore();
      },
    }),
  );

  expect(result.content).toEqual(EXPECTED_SNAPSHOT);
  expect(storeCalls).toBe(2);
});
