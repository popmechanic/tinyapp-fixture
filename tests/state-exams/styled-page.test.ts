/**
 * The exam for Task 5 — "The re-platform — every stylesheet gone, every view
 * and interaction on the system, `lint:ui` green".
 *
 * One test per Proof leg, named for its leg and for the Machine clause it comes
 * from:
 *
 *   (a) [M1] walking `client/src` recursively the `.css` files are exactly
 *            `['client/src/index.css']`; `client/index.html` does not contain
 *            `<style`; and the `css` of `bundleOf('client/index.html',
 *            readFileSync('client/index.html'))` contains none of `.todoItem`,
 *            `.infoTechIcon`, `.dueInput`, `button.primary`, `.overdue` — one
 *            assertion per text;
 *   (d) [M4] the single `stateExam({…})` in this file, spelled as the leg
 *            spells it: the second row is clicked by its accessible name, the
 *            page reaches `two-todos-one-done.json`, the seven views hold and
 *            the mutant of row `1`'s `completed` is killed;
 *   (e) [M5] `renderStatic` over `state-exams/expected/two-todos-one-done.json`
 *            parsed with `node-html-parser`: one test per id in M5's list, then
 *            the `data-active`, `data-completed`/`data-overdue`,
 *            `role="checkbox"`/`aria-label`, `Due date for ` and `Delete `
 *            tests the leg lists;
 *   (f) [M6] no exam file that existed at BASE is gone from
 *            `tests/state-exams`.
 *
 * What this file no longer does, and why — one claim, one prover. Its claim is
 * the re-platformed page, and every leg above measures that page, in this
 * process, through the helper's own API:
 *
 *   - Legs (b) and (g) [M2, M7] ran the UI linter as a child, once over the tree
 *     and once over a stray class planted for the occasion. The linter is its
 *     own prover with its own tests, and the run's own `lint:ui` check grades
 *     the tree; nothing here needs to grade it a second time.
 *   - Leg (c) [M3] reached every exam on the tree through the linter's
 *     `loadContext()`, whose capture child is another process, and asserted a
 *     property of *other* exams' specs. That is the linter's invariant, checked
 *     where the linter checks it.
 *   - Leg (f)'s five `Run:` lines ran the UI linter, listed `client/src/*.css`
 *     through a shell, ran the whole `tests/state-exams` directory and the two
 *     packages' test suites as children, and read a `git diff` against
 *     `$ULTRA_BASE`. The directory run re-entered this very file, which is why
 *     it needed a nesting marker at all. Every one of them is regression, and
 *     regression is the fold's suite, run once. The `ls` line's substance — that
 *     `client/src/index.css` is the one stylesheet — is leg (a)'s first test,
 *     which walks `client/src` recursively and is the stronger reading; and M6's
 *     substance — that no exam that existed at BASE is gone — is the list of the
 *     24 exam files at BASE, checked below against the directory itself.
 *
 * Readings this file makes, written down because they are choices:
 *
 *   - Every file read happens inside a test body, never at module level: the
 *     state linter's capture child imports this file with `stateExam` and
 *     `bun:test` stubbed out, so a module-level read of a file this task
 *     rewrites would make `lint:state` fail as `capture failed` rather than
 *     leave the leg red as the finding it is.
 *   - Leg (e) renders inside `withContract(CLOCK, …)`: a row reads `new Date()`
 *     through `isOverdue`, so `data-overdue` is only determinate under the
 *     exam's own clock.
 *
 * Legs (a), (d) and (e) are red at BASE, and each for the absent re-platform:
 * the ten stylesheets and the `<style>` block are still on the tree, the page
 * carries no `[data-slot=checkbox]`, and `#todoList` is a `<div>` of
 * `<div class="todoItem">` so `#todoList li` matches nothing. The fifteen ids of
 * leg (e) all resolve at BASE already — that half of M5 is the regression
 * clause, and it is meant to hold on both trees.
 */

import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {parse, type HTMLElement} from 'node-html-parser';
import {bundleOf, stateExam, withContract} from 'tinyapp-exam';

import {renderStatic} from '../../client/src/StaticPage';
import {createTodosStore, type TodosContent} from '../../client/src/storeData';

/** This file sits two directories below the repository root. */
const ROOT = join(import.meta.dir, '..', '..');

/** The clock every leg here is measured under, as the Machine pins it. */
const CLOCK = '2026-01-01T00:00:00Z';

/** The entry the render move builds, as legs (a) and (d) spell it. */
const ENTRY = 'client/index.html';

/** The state legs (d) and (e) both read. */
const EXPECTED_FILE = 'state-exams/expected/two-todos-one-done.json';

/** The wall a leg that bundles the client is given, in milliseconds. */
const BUNDLE_TIMEOUT_MS = 180_000;

/** The exam files under `tests/state-exams` at BASE, which M6 says all survive. */
const EXAMS_AT_BASE = [
  'buy-milk.test.ts',
  'clear-completed.test.ts',
  'click-by-name-completes-todo.test.ts',
  'click-completes-todo.test.ts',
  'completed-past-due-not-overdue.test.ts',
  'delete-to-trash.test.ts',
  'derived-complete-first-todo.test.ts',
  'derived-exam.test.ts',
  'design-system-installed.test.ts',
  'done-count.test.ts',
  'due-date-marks-overdue.test.ts',
  'empty-todo-refused.test.ts',
  'enter-submits-todo.test.ts',
  'filter-bar.test.ts',
  'filter-done.test.ts',
  'interaction-evidence.test.ts',
  'mutant-from-diff.test.ts',
  'pin-todo.test.ts',
  'session-transitions.test.ts',
  'set-filter.test.ts',
  'set-todo-due.test.ts',
  'store-history.test.ts',
  'type-due-date.test.ts',
  'undo-delete.test.ts',
];

/** The ids M5 says the page still paints exactly once each. */
const IDS = [
  'topBar',
  'topBarTitle',
  'doneCount',
  'info',
  'todoInput',
  'filterBar',
  'filter-all',
  'filter-open',
  'filter-done',
  'todoList',
  'clearCompleted',
  'todo-0',
  'todo-1',
  'due-0',
  'due-1',
];

/** The five texts M1 says the bundled stylesheet carries none of. */
const GONE_FROM_CSS = ['.todoItem', '.infoTechIcon', '.dueInput', 'button.primary', '.overdue'];

/**
 * The text of a file on the tree, or a failure that names the missing file
 * rather than one that reads like a typo here.
 */
const readTree = (relative: string): string => {
  const path = join(ROOT, relative);
  if (!existsSync(path)) {
    throw new Error(`${relative} does not exist on the tree — this exam grades it`);
  }
  return readFileSync(path, 'utf8');
};

/** Every file under `dir`, recursively, as a path relative to `ROOT`. */
const filesUnder = (relative: string): string[] => {
  const found: string[] = [];
  const walk = (here: string): void => {
    for (const entry of readdirSync(join(ROOT, here), {withFileTypes: true})) {
      const path = `${here}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(path);
      } else {
        found.push(path);
      }
    }
  };
  walk(relative);
  return found.sort();
};

/**
 * `renderStatic` over the expected state, under the clock the exam pins,
 * parsed. The render reads `new Date()`, so it happens inside the contract; the
 * assertions are the caller's and happen outside it.
 */
const renderedOnce = async (): Promise<HTMLElement> => {
  const content = JSON.parse(readTree(EXPECTED_FILE)) as TodosContent;
  let html: string | undefined;
  await withContract(CLOCK, () => {
    html = renderStatic(content);
  });
  return parse(html as string);
};

/** The `#todoList li` rows of a render, in the order the list paints them. */
const rowsOf = (root: HTMLElement): HTMLElement[] => root.querySelectorAll('#todoList li');

// --- Leg (a) [M1]: no hand-written stylesheet remains ------------------------

test('leg (a) [M1]: the .css files under client/src, recursively, are exactly client/src/index.css', () => {
  expect(filesUnder('client/src').filter((path) => path.endsWith('.css'))).toEqual([
    'client/src/index.css',
  ]);
});

test('leg (a) [M1]: client/index.html contains no `<style` text', () => {
  expect(readTree(ENTRY)).not.toContain('<style');
});

test(
  "leg (a) [M1]: the css of bundleOf('client/index.html', …) carries none of the five texts",
  async () => {
    if (!existsSync(ENTRY)) {
      throw new Error(
        `${ENTRY} is not there relative to ${process.cwd()} — this exam is run from the repository root, by its path tests/state-exams/styled-page.test.ts`,
      );
    }

    const {css} = await bundleOf(ENTRY, readFileSync(ENTRY, 'utf8'));

    // One assertion per text, as the leg asks.
    expect(css).not.toContain(GONE_FROM_CSS[0]);
    expect(css).not.toContain(GONE_FROM_CSS[1]);
    expect(css).not.toContain(GONE_FROM_CSS[2]);
    expect(css).not.toContain(GONE_FROM_CSS[3]);
    expect(css).not.toContain(GONE_FROM_CSS[4]);
  },
  BUNDLE_TIMEOUT_MS,
);

// --- Leg (d) [M4]: the second row, clicked by its name ----------------------

// A file's whole state exam is the single `stateExam({…})` in it. `walk the dog`
// is row `1` — the list paints ascending by row id — so this click lands where
// no first-match CSS selector could have taken it.
stateExam({
  clock: CLOCK,
  entry: ENTRY,
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: {click: {role: 'checkbox', name: 'walk the dog'}},
  expected: EXPECTED_FILE,
  view: [
    {selector: '#todoList li', count: 2},
    {selector: '[data-slot=checkbox]', count: 2},
    {selector: '#todo-1', checked: true},
    {selector: '#todo-0', unchecked: true},
    {selector: '#todoList li[data-completed="true"]', count: 1, text: 'walk the dog'},
    {selector: '#todoInput [data-slot=input]', count: 1},
    {selector: '#todoInput [data-slot=button]', count: 1, text: 'Add'},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'completed', value: false}],
});

// --- Leg (e) [M5]: the ids and data attributes an exam holds onto -----------

for (const id of IDS) {
  test(`leg (e) [M5]: renderStatic over ${EXPECTED_FILE} paints exactly one #${id}`, async () => {
    expect((await renderedOnce()).querySelectorAll(`#${id}`).length).toBe(1);
  });
}

test("leg (e) [M5]: each #filter-* carries data-active \"true\" or \"false\", exactly one of them \"true\"", async () => {
  const root = await renderedOnce();

  const actives = ['filter-all', 'filter-open', 'filter-done'].map((id) =>
    root.querySelector(`#${id}`)?.getAttribute('data-active'),
  );

  for (const active of actives) {
    expect(['true', 'false']).toContain(active);
  }
  expect(actives.filter((active) => active === 'true').length).toBe(1);
});

test('leg (e) [M5]: each #todoList li carries data-completed and data-overdue, each "true" or "false"', async () => {
  const rows = rowsOf(await renderedOnce());

  // The state has two todos, so an empty list here would be the finding rather
  // than a vacuous pass.
  expect(rows.length).toBe(2);
  for (const row of rows) {
    expect(['true', 'false']).toContain(row.getAttribute('data-completed'));
    expect(['true', 'false']).toContain(row.getAttribute('data-overdue'));
  }
});

test('leg (e) [M5]: #todo-0 and #todo-1 carry role="checkbox" and an aria-label equal to the row\'s text', async () => {
  const root = await renderedOnce();

  for (const [id, text] of [
    ['todo-0', 'buy milk'],
    ['todo-1', 'walk the dog'],
  ] as const) {
    const element = root.querySelector(`#${id}`);
    expect(element?.getAttribute('role')).toBe('checkbox');
    expect(element?.getAttribute('aria-label')).toBe(text);
  }
});

test('leg (e) [M5]: #due-0 and #due-1 carry an aria-label starting `Due date for `', async () => {
  const root = await renderedOnce();

  for (const id of ['due-0', 'due-1']) {
    const label = root.querySelector(`#${id}`)?.getAttribute('aria-label') ?? '';
    expect(label.startsWith('Due date for ')).toBe(true);
  }
});

test('leg (e) [M5]: every #todoList li has a button whose aria-label starts `Delete `', async () => {
  const rows = rowsOf(await renderedOnce());

  expect(rows.length).toBe(2);
  for (const row of rows) {
    const labels = row
      .querySelectorAll('button, [role=button]')
      .map((element) => element.getAttribute('aria-label') ?? '');
    expect(labels.some((label) => label.startsWith('Delete '))).toBe(true);
  }
});

// --- Leg (f) [M6]: no exam that existed at BASE is gone ---------------------

test('leg (f) [M6]: every exam file that exists at BASE is still under tests/state-exams', () => {
  const here = readdirSync(join(ROOT, 'tests', 'state-exams'))
    .filter((name) => name.endsWith('.test.ts'))
    .sort();

  for (const name of EXAMS_AT_BASE) {
    expect(here).toContain(name);
  }
});
