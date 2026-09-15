/**
 * The exam for Task 4 — "A date typed into a row shows it overdue".
 *
 * Machine, restated:
 *
 *   M1. Typing `2025-12-31` into `input#due-0` on the page seeded from
 *       `state-exams/seeds/two-open-todos.json` reaches exactly
 *       `state-exams/expected/two-todos-first-due.json`, which parses to
 *       `[{"todos": {"0": {"text": "buy milk", "completed": false, "due":
 *       "2025-12-31"}, "1": {"text": "walk the dog", "completed": false}}}, {}]`,
 *       and the page then shows exactly one `.todoItem[data-overdue="true"]`,
 *       holding `buy milk`, exactly one `.todoItem.overdue`, exactly one
 *       `.todoItem[data-overdue="false"]`, holding `walk the dog`, and
 *       `input#due-0` with `value="2025-12-31"`.
 *   M2. `client/src/todoItem.css` holds a rule whose selector is
 *       `.todoItem.overdue label` and whose block sets `color`, so an overdue
 *       row's text is visibly marked.
 *
 * Proof legs, and the tests that carry them:
 *
 *   (a) [M1] the state exam — clock, entry, seed, store, the typing action,
 *            expected, the five view entries and the mutant exactly as the leg
 *            spells them — and the expected file parsing to exactly the M1
 *            literal.
 *   (b) [M2] the Proof's `Run:` line exits 0: the css rule's block, from its
 *            selector line to its closing brace, contains `color`.
 *
 * Three readings this file makes, written down because they are choices:
 *
 *   - `createTodosStore` is imported statically from `client/src/storeData`
 *     and named as `store: () => createTodosStore()` beside `entry`, as the
 *     Global Constraints' last bullet requires: measured 2026-09-15, an
 *     interaction exam importing nothing from `client/src` fails under
 *     `bun test` with `Bundle failed` before it opens a page.
 *   - Leg (b) is graded twice, because the `Run:` line and the clause it stands
 *     for are not quite the same sentence. The line is run verbatim through
 *     `bash -c` from the repository root and asserted to exit 0, which is the
 *     leg's own words; beside it the file is read structurally for a rule whose
 *     selector is exactly `.todoItem.overdue label` and whose block holds a
 *     declaration whose property is exactly `color` — the line's
 *     `grep -q 'color'` would also be satisfied by the `border-color` of the
 *     optional second rule the Context mentions, and M2's words are "whose
 *     block sets `color`". Neither check pins the value, so
 *     `color: var(--accent)` and any other colour both hold.
 *   - Nothing here grades `DueInput`, `isOverdue` or `setTodoDue` as such: they
 *     are this task's Consumes, and the whole of M1 is measured through the
 *     page — the state the typing reaches and the markup it leaves behind.
 *     Row `1` reads `data-overdue="false"` because it has no date at all,
 *     never because of a future one (Global Constraints), and `2025-12-31` is
 *     past under the pinned clock and under the wall clock alike.
 */

import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import {createTodosStore, type TodosContent} from '../../client/src/storeData';

/** This file sits two directories below the repository root, `bun test`'s cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/** The seed the typing happens on, and the state it must reach. */
const SEED_FILE = 'state-exams/seeds/two-open-todos.json';
const EXPECTED_FILE = 'state-exams/expected/two-todos-first-due.json';

/** The stylesheet M2 speaks about, and the rule it requires of it. */
const CSS_FILE = 'client/src/todoItem.css';
const CSS_SELECTOR = '.todoItem.overdue label';

/** The Proof's `Run:` line, verbatim. */
const RUN_LINE = `sed -n '/^\\.todoItem\\.overdue label/,/}/p' client/src/todoItem.css | grep -q 'color'`;

/** The expected state, exactly as M1 spells it — row `1` has no `due` key. */
const EXPECTED_LITERAL = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false, due: '2025-12-31'},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
];

/**
 * One repository file's text.
 *
 * A file this task has not created yet fails with a message naming it, rather
 * than with an `ENOENT` that reads like a mistake in this exam's own paths.
 */
const readRepoFile = (relative: string): string => {
  const path = join(ROOT, relative);
  if (!existsSync(path)) {
    throw new Error(
      `${relative} does not exist — this task must create it before its exam can grade it`,
    );
  }
  return readFileSync(path, 'utf8');
};

/** One `Run:` line, run from the repository root: its status and its output. */
const statusOf = (line: string): number => {
  const spawned = Bun.spawnSync({
    cmd: ['bash', '-c', line],
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (spawned.exitCode !== 0) {
    console.log(
      `$ ${line}\n${spawned.stdout.toString()}${spawned.stderr.toString()}`,
    );
  }
  return spawned.exitCode;
};

/** The declaration blocks of every rule in `css` whose selector is `selector`. */
const blocksOf = (css: string, selector: string): string[] => {
  const blocks: string[] = [];
  for (const match of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((match[1] ?? '').trim() === selector) {
      blocks.push(match[2] ?? '');
    }
  }
  return blocks;
};

/** Whether a declaration block sets the `color` property itself. */
const setsColor = (block: string): boolean =>
  block
    .split(';')
    .some((declaration) => (declaration.split(':')[0] ?? '').trim() === 'color');

// --- (a) [M1]: the expected state, exactly as the clause spells it -----------

test(`leg (a) [M1] ${EXPECTED_FILE} parses to exactly the M1 literal`, () => {
  const content = JSON.parse(readRepoFile(EXPECTED_FILE)) as TodosContent;

  expect(content).toEqual(EXPECTED_LITERAL as unknown as TodosContent);

  // Spelled out as well as deep-equalled: the clause is precisely that row `0`
  // gained a `due` and row `1` carries no `due` key at all, which `toEqual`
  // alone would let `undefined` stand in for.
  const todos = (
    content as unknown as [Record<string, Record<string, unknown>>, unknown]
  )[0].todos;
  expect(Object.keys(todos).sort()).toEqual(['0', '1']);
  expect(Object.keys(todos['0']!).sort()).toEqual(['completed', 'due', 'text']);
  expect(Object.keys(todos['1']!).sort()).toEqual(['completed', 'text']);
});

// --- (b) [M2]: the overdue row's text is visibly marked ----------------------

test('leg (b) [M2] the Proof Run line exits 0 — the .todoItem.overdue label block contains `color`', () => {
  expect(statusOf(RUN_LINE)).toBe(0);
});

test(`leg (b) [M2] ${CSS_FILE} holds a rule whose selector is exactly \`${CSS_SELECTOR}\` and whose block sets \`color\``, () => {
  const blocks = blocksOf(readRepoFile(CSS_FILE), CSS_SELECTOR);

  expect(blocks.length).toBeGreaterThan(0);
  expect(blocks.some(setsColor)).toBe(true);
});

// --- (a) [M1]: the state exam itself -----------------------------------------

// Typing `2025-12-31` into the first row's date box stores that date on row `0`
// and nothing else, and the mark follows it in the same page: row `0` is the
// one open, past-due todo, so it alone is `data-overdue="true"` and `.overdue`,
// row `1` reads `"false"` for want of a date, and the box the date was typed
// into still shows it. The mutant drops the `due` cell the typing put there —
// an exam that did not actually store it would not tell the two apart.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: SEED_FILE,
  store: () => createTodosStore(),
  action: {type: ['input#due-0', '2025-12-31']},
  expected: EXPECTED_FILE,
  view: [
    {selector: '.todoItem[data-overdue="true"]', count: 1, text: 'buy milk'},
    {selector: '.todoItem.overdue', count: 1, text: 'buy milk'},
    {
      selector: '.todoItem[data-overdue="false"]',
      count: 1,
      text: 'walk the dog',
    },
    {selector: 'input#due-0', attr: {name: 'value', value: '2025-12-31'}},
    {selector: '.todoItem', count: 2},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'due', absent: true}],
});
