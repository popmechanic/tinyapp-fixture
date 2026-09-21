/**
 * The exam for Task "Rename a todo — a Rename button on every row, a box that
 * is typed over, and Enter writes the new words".
 *
 * A file's whole state exam is the single top-level `stateExam({…})` in it, so
 * leg (a) is that one call plus a `bun:test` block beside it, and every other
 * leg is an ordinary `bun:test` block. One test per Proof leg, named for its
 * leg and for the Machine clause it comes from — and, where a leg names more
 * than one case, one test per case, so a red run names the case rather than
 * the group:
 *
 *   (a) [M1] the one `stateExam` of the file, exactly as the Proof spells it —
 *            Rename, type, Enter reaches the expected state, paints the list
 *            and the row's own button the way M1 pins them, and shows no open
 *            rename box — plus a `bun:test` block pinning the expected file's
 *            own content against the M1 literal written out here;
 *   (b) [M2] `renameTodo(store, '0', '  buy oat milk  ')` over the two-open
 *            seed reaches exactly the M1 literal — the text lands trimmed;
 *   (c) [M3] `renameTodo(store, '0', '   ')` (spaces only) and
 *            `renameTodo(store, '9', 'x')` (an id `todos` does not hold) each
 *            leave the content deep-equal to the snapshot taken immediately
 *            before that one call.
 *
 * Two readings this file makes, written down because they are choices:
 *
 *   - `client/src/storeData.ts` is reached through one namespace import,
 *     `import * as sd from '../../client/src/storeData'`, exactly as the
 *     task's own "For the examiner" note asks: a named import of `renameTodo`
 *     is a load error at BASE, and a load error reds this whole file at once
 *     instead of leaving each leg to report what it is actually missing.
 *   - Every fixture read — the expected JSON file — happens inside a test
 *     body, never at module level: the state linter imports this file with
 *     `stateExam` and `bun:test` stubbed out, so a module-level read of a file
 *     this task has yet to create would surface as the linter's own capture
 *     failure rather than as the leg's own red.
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import * as sd from '../../client/src/storeData';
import type {TodosContent} from '../../client/src/storeData';

// This file sits two directories below the repository root, which is also the
// test runner's cwd — the fixture read below is anchored there.
const ROOT = join(import.meta.dir, '..', '..');

const readJson = (...parts: string[]): unknown =>
  JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8'));

/** A store's content as plain JSON, the shape a checked-in file parses to. */
const snapshot = (store: {getContent: () => unknown}): unknown =>
  JSON.parse(JSON.stringify(store.getContent()));

/** A structural copy, so a later mutation of the store cannot reach it. */
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** `state-exams/seeds/two-open-todos.json`'s content, M2 and M3 both start from. */
const TWO_OPEN_TODOS = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
] as unknown as TodosContent;

/** The state M1 and M2 both name — row `0` renamed, nothing else moved. */
const TWO_TODOS_FIRST_RENAMED = [
  {
    todos: {
      '0': {text: 'buy oat milk', completed: false},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
] as unknown as TodosContent;

const EXPECTED_PATH = 'state-exams/expected/two-todos-first-renamed.json';

// --- Leg (a) [M1]: the one state exam of the file ----------------------------

stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => sd.createTodosStore(),
  action: [
    {click: {role: 'button', name: 'Rename buy milk'}},
    {type: [{role: 'textbox', name: 'New text for buy milk'}, 'buy oat milk']},
    {key: [{role: 'textbox', name: 'New text for buy milk'}, 'Enter']},
  ],
  expected: EXPECTED_PATH,
  view: [
    {selector: '#todoList li', count: 2},
    {selector: '#todoList li:nth-child(1)', count: 1, text: 'buy oat milk'},
    {
      selector: '#rename-0',
      count: 1,
      attr: {name: 'aria-label', value: 'Rename buy oat milk'},
    },
    {selector: '#rename-box-0', absent: true},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'text', value: 'buy milk'}],
});

// Leg (a) [M1]: the expected file the exam above names parses to exactly the
// literal M1 spells, so a file differing in any cell, id, order or table fails
// naming it.
test('leg (a) [M1] two-todos-first-renamed.json holds exactly the state of M1', () => {
  expect(readJson(EXPECTED_PATH)).toEqual(TWO_TODOS_FIRST_RENAMED);
});

// --- Leg (b) [M2]: renameTodo trims the text it writes -----------------------

test('leg (b) [M2] renameTodo(store, "0", "  buy oat milk  ") reaches exactly the M1 literal, trimmed', () => {
  expect(typeof sd.renameTodo).toBe('function');

  const store = sd.createTodosStore(copy(TWO_OPEN_TODOS));
  const result = sd.renameTodo(store, '0', '  buy oat milk  ');

  expect(snapshot(store)).toEqual(TWO_TODOS_FIRST_RENAMED);
  // The row is byte for byte the M1 row: no stray cell, no untrimmed text.
  expect(
    (store as unknown as {getRow: (t: string, id: string) => unknown}).getRow(
      'todos',
      '0',
    ),
  ).toEqual({text: 'buy oat milk', completed: false});
  expect(result).toBeUndefined();
});

// --- Leg (c) [M3]: spaces-only text, and an id todos does not hold ----------

test('leg (c) [M3] renameTodo(store, "0", "   ") on the renamed store leaves the content deep-equal to before', () => {
  expect(typeof sd.renameTodo).toBe('function');

  const store = sd.createTodosStore(copy(TWO_OPEN_TODOS));
  sd.renameTodo(store, '0', '  buy oat milk  ');

  const before = snapshot(store);
  const result = sd.renameTodo(store, '0', '   ');
  const after = snapshot(store);

  expect(after).toEqual(before);
  expect(result).toBeUndefined();
});

test('leg (c) [M3] renameTodo(store, "9", "x") on the renamed store leaves the content deep-equal to before — no row "9" appears', () => {
  expect(typeof sd.renameTodo).toBe('function');

  const store = sd.createTodosStore(copy(TWO_OPEN_TODOS));
  sd.renameTodo(store, '0', '  buy oat milk  ');
  sd.renameTodo(store, '0', '   ');

  const before = snapshot(store);
  const result = sd.renameTodo(store, '9', 'x');
  const after = snapshot(store);

  expect(after).toEqual(before);
  expect(
    (store as unknown as {hasRow: (t: string, id: string) => boolean}).hasRow(
      'todos',
      '9',
    ),
  ).toBe(false);
  expect(result).toBeUndefined();
});
