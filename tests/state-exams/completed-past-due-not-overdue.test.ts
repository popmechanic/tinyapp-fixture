/**
 * The exam for Task 3 — "The overdue mark on a row".
 *
 * Machine, restated:
 *
 *   M1. Every `#todoList li` carries `data-overdue="true"` exactly when
 *       `isOverdue(row, new Date())` is true and `data-overdue="false"`
 *       otherwise — measured by `renderStatic` over the seed and over the
 *       expected state, both inside `withContract('2026-01-01T00:00:00Z', …)`.
 *       The clause read "and the class `overdue`" while the row carried one;
 *       the re-platform took every class of the app's own off the page and left
 *       the mark on the attribute alone, which is what the legs below read.
 *   M2. Clicking the checkbox named `buy milk` on the page seeded from the seed
 *       file reaches exactly the expected file — row `0` completed with its
 *       `due` still `2025-12-31` — and the page then shows no
 *       `#todoList li[data-overdue="true"]`, two
 *       `#todoList li[data-overdue="false"]`, and the completed row's `#todo-0`
 *       checked.
 *
 * Proof legs, and the tests that carry them:
 *
 *   (a) [M1] the static render over the seed: exactly one
 *            `#todoList li[data-overdue="true"]`, its text containing
 *            `buy milk`; exactly one `#todoList li[data-overdue="false"]`, its
 *            text containing `walk the dog`; and neither row carrying an
 *            `overdue` class, because no row carries a class of the app's own
 *            at all.
 *   (b) [M1] the static render over the expected state: no
 *            `#todoList li[data-overdue="true"]` and exactly two
 *            `#todoList li[data-overdue="false"]`.
 *   (c) [M2] the state exam — clock, entry, seed, store, click, expected, the
 *            three view entries and the mutant as the leg spells them — and the
 *            two snapshot files parsing to exactly the two Context literals.
 *
 * Three readings this file makes, written down because they are choices:
 *
 *   - The markup is read with `node-html-parser`'s `parse`, which is the parser
 *     the app's own graders already read markup with:
 *     `packages/tinyapp-exam/src/render-move.ts`'s `assertView` and
 *     `packages/tinyapp-lint/src/context.ts`'s static render both use it. So
 *     legs (a) and (b) resolve a selector exactly as leg (c)'s `view` entries
 *     do, and a selector that holds here holds there.
 *   - `renderStatic`, `createTodosStore` and `isOverdue` all exist at BASE and
 *     are imported statically. `isOverdue` is this task's Consumes, not its
 *     Produces: no leg here grades that function, and the one test that calls
 *     it uses it as M1's own oracle — the clause says "exactly when
 *     `isOverdue(row, new Date())` is true", so the attribute is compared
 *     against that function's answer rather than against a second hand-written
 *     table of rows.
 *   - The two snapshot files are this task's to create. They are read through
 *     `readSnapshot`, which throws a message naming the missing file, so a red
 *     run at BASE reads as the absent implementation and not as a typo here.
 *
 * Nothing here names an `input#due-…` selector or any other part of the date
 * field: that surface belongs to the sibling task in the same wave.
 */

import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {parse, type HTMLElement} from 'node-html-parser';
import {stateExam, withContract} from 'tinyapp-exam';

import {isOverdue} from '../../client/src/overdue';
import {renderStatic} from '../../client/src/StaticPage';
import {createTodosStore, type TodosContent} from '../../client/src/storeData';

/** This file sits two directories below the repository root. */
const ROOT = join(import.meta.dir, '..', '..');

/** The clock every leg here is measured under, as the Machine pins it. */
const CLOCK = '2026-01-01T00:00:00Z';

/** The instant that clock names, for M1's `isOverdue` oracle. */
const NOW = new Date(CLOCK);

/** The two snapshot files this task creates, as the Proof legs name them. */
const SEED_FILE = 'state-exams/seeds/two-open-todos-first-past-due.json';
const EXPECTED_FILE = 'state-exams/expected/two-todos-first-past-due-done.json';

/** The seed, exactly as Context spells it. */
const SEED_LITERAL = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false, due: '2025-12-31'},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
];

/** The expected state, exactly as Context spells it — row `1` has no `due`. */
const EXPECTED_LITERAL = [
  {
    todos: {
      '0': {text: 'buy milk', completed: true, due: '2025-12-31'},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
];

/**
 * One snapshot file's parsed content.
 *
 * A file this task has not created yet fails with a message naming it, rather
 * than with an `ENOENT` that reads like a mistake in this exam's own paths.
 */
const readSnapshot = (relative: string): TodosContent => {
  const path = join(ROOT, relative);
  if (!existsSync(path)) {
    throw new Error(
      `${relative} does not exist — this task must create it before its exam can grade it`,
    );
  }
  return JSON.parse(readFileSync(path, 'utf8')) as TodosContent;
};

/** The class tokens of an element, in the order the attribute writes them. */
const classesOf = (element: HTMLElement): string[] =>
  (element.getAttribute('class') ?? '').split(/\s+/).filter((token) => token !== '');

/**
 * `renderStatic` over `content`, run inside the contract the legs name, with
 * the markup handed back parsed.
 *
 * The render is what reads `new Date()`, so it happens inside `withContract`;
 * the assertions are the caller's and happen outside it, where a failure is
 * reported as itself rather than as something the contract caught.
 */
const renderUnderContract = async (content: TodosContent): Promise<HTMLElement> => {
  let html: string | undefined;
  await withContract(CLOCK, () => {
    html = renderStatic(content);
  });
  return parse(html as string);
};

/** The row elements of a render, in the order the list paints them. */
const itemsOf = (root: HTMLElement): HTMLElement[] =>
  root.querySelectorAll('#todoList li');

/** The todo rows of a snapshot, ordered by row id the way `TodoList` sorts them. */
const rowsOf = (content: TodosContent): {completed?: boolean; due?: string}[] => {
  const todos = (content as unknown as [Record<string, Record<string, any>>, unknown])[0]
    .todos;
  return Object.keys(todos)
    .sort()
    .map((id) => todos[id] as {completed?: boolean; due?: string});
};

// --- (a) [M1]: the static render over the seed -------------------------------

test('leg (a) [M1] renderStatic over the seed paints exactly one #todoList li[data-overdue="true"], `buy milk`, marked by the attribute and not by a class', async () => {
  const root = await renderUnderContract(readSnapshot(SEED_FILE));

  const overdue = root.querySelectorAll('#todoList li[data-overdue="true"]');
  expect(overdue.length).toBe(1);
  expect(overdue[0].textContent).toContain('buy milk');
  // The clause pinned the whole `class` attribute while the row carried
  // `todoItem overdue`. Both words are gone with the stylesheets, and what
  // stands in their place is that the mark is the attribute: no class of the
  // app's own names this state on any row.
  expect(classesOf(overdue[0])).not.toContain('overdue');
  expect(classesOf(overdue[0])).not.toContain('todoItem');
});

test('leg (a) [M1] renderStatic over the seed paints exactly one #todoList li[data-overdue="false"], `walk the dog`, with no `overdue` class', async () => {
  const root = await renderUnderContract(readSnapshot(SEED_FILE));

  const notOverdue = root.querySelectorAll('#todoList li[data-overdue="false"]');
  expect(notOverdue.length).toBe(1);
  expect(notOverdue[0].textContent).toContain('walk the dog');
  expect(classesOf(notOverdue[0])).not.toContain('overdue');
});

// --- (b) [M1]: the static render over the expected state ---------------------

test('leg (b) [M1] renderStatic over the expected state paints no #todoList li[data-overdue="true"] and exactly two #todoList li[data-overdue="false"]', async () => {
  const root = await renderUnderContract(readSnapshot(EXPECTED_FILE));

  expect(
    root.querySelectorAll('#todoList li[data-overdue="true"]').length,
  ).toBe(0);
  expect(
    root.querySelectorAll('#todoList li[data-overdue="false"]').length,
  ).toBe(2);
  // "without that class": the completed, dated row is not marked either, and
  // no row is marked by a class in the first place.
  expect(
    itemsOf(root).filter((item) => classesOf(item).includes('overdue')).length,
  ).toBe(0);
});

// --- (a) and (b) [M1]: the clause's own "exactly when" ----------------------

for (const [label, file] of [
  ['the seed', SEED_FILE],
  ['the expected state', EXPECTED_FILE],
] as const) {
  test(`legs (a), (b) [M1] every row of ${label} carries data-overdue exactly when isOverdue(row, new Date()) is true, and no \`overdue\` class either way`, async () => {
    const content = readSnapshot(file);
    const root = await renderUnderContract(content);

    const rows = rowsOf(content);
    const items = itemsOf(root);
    expect(items.length).toBe(rows.length);

    for (const [index, row] of rows.entries()) {
      const want = isOverdue(row, NOW);
      expect(items[index].getAttribute('data-overdue')).toBe(want ? 'true' : 'false');
      expect(classesOf(items[index]).includes('overdue')).toBe(false);
    }
  });
}

// --- (c) [M2]: the two snapshot files, exactly as Context spells them --------

test(`leg (c) [M2] ${SEED_FILE} parses to exactly the seed literal`, () => {
  expect(readSnapshot(SEED_FILE)).toEqual(SEED_LITERAL as unknown as TodosContent);
});

test(`leg (c) [M2] ${EXPECTED_FILE} parses to exactly the expected literal — row 0 completed with its due still 2025-12-31, row 1 with no due key`, () => {
  const content = readSnapshot(EXPECTED_FILE);
  expect(content).toEqual(EXPECTED_LITERAL as unknown as TodosContent);

  // Spelled out as well as deep-equalled: the clause is precisely that row `1`
  // carries no `due` key at all, which `toEqual` alone would let `undefined`
  // stand in for.
  const todos = (content as unknown as [Record<string, Record<string, unknown>>, unknown])[0]
    .todos;
  expect(Object.keys(todos['0']).sort()).toEqual(['completed', 'due', 'text']);
  expect(Object.keys(todos['1']).sort()).toEqual(['completed', 'text']);
});

// --- (c) [M2]: the state exam itself -----------------------------------------

// Clicking the checkbox named `buy milk` on the seeded page completes row `0`
// without touching its date, and the mark goes with it. The box is named rather
// than selected: `buy milk` is row `0`'s text and so its checkbox's accessible
// name, which lands on that row whatever order the list paints in. The mutant
// is that same row left open — an exam that could not tell the tick from no
// tick is hollow.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos-first-past-due.json',
  store: () => createTodosStore(),
  action: {click: {role: 'checkbox', name: 'buy milk'}},
  expected: 'state-exams/expected/two-todos-first-past-due-done.json',
  view: [
    {selector: '#todoList li[data-overdue="true"]', absent: true},
    {selector: '#todoList li[data-overdue="false"]', count: 2},
    {selector: '#todoList li[data-completed="true"] #todo-0', checked: true},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: false}],
});
