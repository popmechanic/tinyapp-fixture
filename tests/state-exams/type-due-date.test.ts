/**
 * Exam for Task 2 — "The date field on each row".
 *
 * Two legs, and one test per thing a leg asserts so that a red run names the
 * case rather than the file:
 *
 *   (a) [M1] the static markup `renderStatic` paints over
 *            `state-exams/expected/two-todos-second-due.json`: exactly two
 *            `input.dueInput`, each `type="text"` with
 *            `placeholder="YYYY-MM-DD"`, `#due-0` carrying `value=""` and
 *            `#due-1` carrying `value="2025-06-30"`, and each sitting inside a
 *            `.todoItem` after that row's `label`, one to a row;
 *   (b) [M2] the state exam: typing `2025-06-30` into `input#due-1` on the page
 *            seeded from `state-exams/seeds/two-open-todos.json` reaches
 *            `state-exams/expected/two-todos-second-due.json`, and the page
 *            then shows the two values and the two rows.
 *
 * Three readings this file makes, written down because they are choices:
 *
 *   - Nothing here imports `client/src/DueInput.tsx`. It does not exist at
 *     BASE, and a static import of a missing module fails the whole file at
 *     load — every leg would then report that one import instead of the thing
 *     it is itself about. `renderStatic` and `createTodosStore` do exist at
 *     BASE and are imported statically; the second of those is also what makes
 *     this an interaction exam that bundles at all (Global Constraints, last
 *     bullet: an interaction exam importing nothing from `client/src` fails
 *     under `bun test` with `Bundle failed` before it opens a page).
 *   - A `.todoItem` is tied to its row id through the checkbox `id="todo-N"`
 *     the component already renders, and the date box is then required to be
 *     `id="due-N"` for that same N. Reading the id off the markup rather than
 *     assuming the row order is what makes the `#due-0`/`#due-1` pins below
 *     pins on *those rows* and not on whichever box happens to come first.
 *   - Ordering is graded as leg (a) words it — the date box sits **after** that
 *     row's `label` in document order. The task's Context is tighter ("the line
 *     directly after"), but that is a spelling of the JSX rather than the
 *     clause, and this exam grades the clause.
 *
 * Measured at BASE (2026-09-15): `renderToStaticMarkup` emits `value=""` as a
 * real attribute for a controlled input whose value is the empty string, so
 * `#due-0`'s empty value is read as an attribute and not as an absence — the
 * same reading `{attr: {name: 'value', value: ''}}` makes of the live page in
 * leg (b).
 */

import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

import {expect, test} from 'bun:test';
import {parse, type HTMLElement} from 'node-html-parser';

import {stateExam} from 'tinyapp-exam';

import {renderStatic} from '../../client/src/StaticPage';
import {
  createTodosStore,
  type TodosContent,
} from '../../client/src/storeData';

// This file sits two directories below the repository root, which is also
// `bun test`'s cwd — the fixture reads are anchored there, and so are the
// repository-relative paths the state exam below names.
const ROOT = resolve(import.meta.dir, '..', '..');

/** The expected state M1 paints over, as the checked-in file parses. */
const EXPECTED = 'state-exams/expected/two-todos-second-due.json';

/** The value each row's date box carries in that state, by row id. */
const DUE_BY_ROW: Record<string, string> = {'0': '', '1': '2025-06-30'};

/**
 * The markup of the app over `EXPECTED`, rendered once.
 *
 * Lazily, and not at module load: a render that throws belongs inside the test
 * that asked for it, where the failure is reported beside its leg.
 */
let cached: HTMLElement | undefined;
const markup = (): HTMLElement =>
  (cached ??= parse(
    renderStatic(
      JSON.parse(readFileSync(join(ROOT, EXPECTED), 'utf8')) as TodosContent,
    ),
  ));

/** Every `.todoItem` of that markup, in document order. */
const rows = (): HTMLElement[] => markup().querySelectorAll('.todoItem');

/** The row id a `.todoItem` carries, read off its checkbox's `id`. */
const rowIdOf = (row: HTMLElement): string => {
  const checkbox = row.querySelector('input[type=checkbox]');
  const id = checkbox?.getAttribute('id') ?? '';
  return id.startsWith('todo-') ? id.slice('todo-'.length) : id;
};

// --- (a) [M1]: the date box in the static markup -----------------------------

test('leg (a) [M1] the markup over the expected state holds exactly two input.dueInput', () => {
  expect(markup().querySelectorAll('input.dueInput').length).toBe(2);
});

test('leg (a) [M1] the two rows of the markup are rows 0 and 1', () => {
  // The pins below are per row id; this is what says which ids there are.
  expect(rows().map(rowIdOf)).toEqual(['0', '1']);
});

/** The `.todoItem` of the markup whose checkbox names `rowId`. */
const rowOf = (rowId: string): HTMLElement => {
  const row = rows().find((candidate) => rowIdOf(candidate) === rowId);
  if (row === undefined) {
    throw new Error(`no .todoItem for row ${rowId}`);
  }
  return row;
};

for (const [rowId, due] of Object.entries(DUE_BY_ROW)) {
  test(`leg (a) [M1] row ${rowId} holds exactly one text input, and it is input#due-${rowId}.dueInput`, () => {
    const texts = rowOf(rowId).querySelectorAll('input[type=text]');

    expect(texts.length).toBe(1);
    expect(texts[0]!.getAttribute('id')).toBe(`due-${rowId}`);
    expect(texts[0]!.classList.contains('dueInput')).toBe(true);
  });

  test(`leg (a) [M1] input#due-${rowId} is type=text placeheld YYYY-MM-DD`, () => {
    const input = rowOf(rowId).querySelector(`input#due-${rowId}`);

    expect(input).not.toBeNull();
    expect(input!.getAttribute('type')).toBe('text');
    expect(input!.getAttribute('placeholder')).toBe('YYYY-MM-DD');
  });

  test(`leg (a) [M1] input#due-${rowId} carries value=${JSON.stringify(due)}`, () => {
    const input = rowOf(rowId).querySelector(`input#due-${rowId}`);

    expect(input).not.toBeNull();
    expect(input!.getAttribute('value')).toBe(due);
  });

  test(`leg (a) [M1] input#due-${rowId} comes after row ${rowId}'s label`, () => {
    const elements = rowOf(rowId).querySelectorAll('*');
    const labelAt = elements.findIndex(
      (element) => element.rawTagName === 'label',
    );
    const dueAt = elements.findIndex((element) =>
      element.classList.contains('dueInput'),
    );

    expect(labelAt).toBeGreaterThanOrEqual(0);
    expect(dueAt).toBeGreaterThanOrEqual(0);
    expect(dueAt).toBeGreaterThan(labelAt);
  });
}

// --- (b) [M2]: typing the date into the second row's box ---------------------

// Typing `2025-06-30` into the second row's date box stores that date on row
// `1` and nothing else: the page still paints two rows, the first row's box is
// still empty, and the state reached is exactly the expected one. The mutant
// drops the `due` cell the typing put there — an exam that did not actually
// store it would not tell the two apart.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: {type: ['input#due-1', '2025-06-30']},
  expected: EXPECTED,
  view: [
    {selector: 'input#due-1', attr: {name: 'value', value: '2025-06-30'}},
    {selector: 'input#due-0', attr: {name: 'value', value: ''}},
    {selector: '.todoItem', count: 2},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'due', absent: true}],
});
