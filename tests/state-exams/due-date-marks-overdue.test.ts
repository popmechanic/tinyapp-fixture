/**
 * The exam for Task 4 — "A date typed into a row shows it overdue".
 *
 * Machine, restated:
 *
 *   M1. Typing `2025-12-31` into the box named `Due date for buy milk` on the
 *       page seeded from
 *       `state-exams/seeds/two-open-todos.json` reaches exactly
 *       `state-exams/expected/two-todos-first-due.json`, which parses to
 *       `[{"todos": {"0": {"text": "buy milk", "completed": false, "due":
 *       "2025-12-31"}, "1": {"text": "walk the dog", "completed": false}}}, {}]`,
 *       and the page then shows exactly one `#todoList li[data-overdue="true"]`,
 *       holding `buy milk`, exactly one `#todoList li[data-overdue="false"]`,
 *       holding `walk the dog`, and `#due-0` with `value="2025-12-31"`.
 *   M2. The overdue row's text is visibly marked — once by
 *       `client/src/todoItem.css`'s `.todoItem.overdue label { color: … }`, now
 *       by the utility variant that replaced it: the row's text carries
 *       `group-data-[overdue=true]:text-primary`, and `--primary` is a token
 *       declared in `client/src/index.css`.
 *
 * Proof legs, and the tests that carry them:
 *
 *   (a) [M1] the state exam — clock, entry, seed, store, the typing action,
 *            expected, the four view entries and the mutant exactly as the leg
 *            spells them — and the expected file parsing to exactly the M1
 *            literal.
 *   (b) [M2] the source predicate holds: the row's text carries the overdue
 *            variant that paints it.
 *
 * Three readings this file makes, written down because they are choices:
 *
 *   - `createTodosStore` is imported statically from `client/src/storeData`
 *     and named as `store: () => createTodosStore()` beside `entry`, as the
 *     Global Constraints' last bullet requires: measured 2026-09-15, an
 *     interaction exam importing nothing from `client/src` fails under the test
 *     runner with `Bundle failed` before it opens a page.
 *   - Leg (b) is graded twice, because the flat predicate and the clause it
 *     stands for are not quite the same sentence. The predicate is asserted
 *     over the whole file read in this process, which is the leg's own words;
 *     beside it the source is read structurally for the
 *     variant sitting on the element that renders the row's text — a `grep` of
 *     the whole file would also be satisfied by the class appearing in a
 *     comment or on some other element — and for the token that variant names
 *     being declared in the project's one stylesheet. Neither check pins the
 *     colour, so `--primary: #d81b60` and any other value both hold. This is
 *     the same sentence the deleted `.todoItem.overdue label { color: … }` rule
 *     made, asked of the design system instead of a hand-written sheet.
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

/** This file sits two directories below the repository root, the runner's cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/** The seed the typing happens on, and the state it must reach. */
const SEED_FILE = 'state-exams/seeds/two-open-todos.json';
const EXPECTED_FILE = 'state-exams/expected/two-todos-first-due.json';

/** The source M2 speaks about, and the variant it requires of it. */
const ROW_FILE = 'client/src/TodoItem.tsx';
const OVERDUE_VARIANT = 'group-data-[overdue=true]:text-primary';

/** The one stylesheet, where the colour that variant names is declared. */
const CSS_FILE = 'client/src/index.css';

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

/**
 * The `className` of the element in `source` whose *child* is `{todo.text}`.
 *
 * `{todo.text}` occurs in the row as an attribute value too — it is the
 * checkbox's accessible name — so the occurrence wanted is the one preceded,
 * whitespace aside, by the `>` that closes an opening tag. The element is then
 * the nearest `<` behind that `>`, and its `className="…"` is read out of the
 * slice between the two.
 */
const classesOfTextElement = (source: string): string => {
  const at = /> *\n? *\{todo\.text\}/.exec(source)?.index ?? -1;
  if (at < 0) {
    throw new Error(`${ROW_FILE} renders no element whose child is {todo.text}`);
  }
  const open = source.lastIndexOf('<', at);
  const match = /className="([^"]*)"/.exec(source.slice(open, at + 1));
  if (match === null) {
    throw new Error(`the element rendering {todo.text} carries no className`);
  }
  return match[1] ?? '';
};

/** Whether `css` declares the custom property `name` at all. */
const declares = (css: string, name: string): boolean =>
  new RegExp(`^\\s*${name}\\s*:`, 'm').test(css);

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

test(`leg (b) [M2] ${ROW_FILE} carries \`${OVERDUE_VARIANT}\``, () => {
  expect(readRepoFile(ROW_FILE)).toContain(OVERDUE_VARIANT);
});

test(`leg (b) [M2] the element rendering the row's text carries \`${OVERDUE_VARIANT}\`, and ${CSS_FILE} declares \`--primary\``, () => {
  expect(classesOfTextElement(readRepoFile(ROW_FILE)).split(/\s+/)).toContain(
    OVERDUE_VARIANT,
  );
  expect(declares(readRepoFile(CSS_FILE), '--primary')).toBe(true);
});

// --- (a) [M1]: the state exam itself -----------------------------------------

// Typing `2025-12-31` into the first row's date box stores that date on row `0`
// and nothing else, and the mark follows it in the same page: row `0` is the
// one open, past-due todo, so it alone is `data-overdue="true"`,
// row `1` reads `"false"` for want of a date, and the box the date was typed
// into still shows it. The mutant drops the `due` cell the typing put there —
// an exam that did not actually store it would not tell the two apart.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: SEED_FILE,
  store: () => createTodosStore(),
  action: {
    type: [{role: 'textbox', name: 'Due date for buy milk'}, '2025-12-31'],
  },
  expected: EXPECTED_FILE,
  view: [
    {selector: '#todoList li[data-overdue="true"]', count: 1, text: 'buy milk'},
    {
      selector: '#todoList li[data-overdue="false"]',
      count: 1,
      text: 'walk the dog',
    },
    {selector: '#due-0', attr: {name: 'value', value: '2025-12-31'}},
    {selector: '#todoList li', count: 2},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'due', absent: true}],
});
