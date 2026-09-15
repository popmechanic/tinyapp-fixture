/**
 * The exam for Task 3 — "The filter bar above the list — three buttons, the
 * list shows what the filter admits, the counter counts everything".
 *
 * One `stateExam` call, legs (a)–(d), because a file's whole state exam is the
 * single `stateExam` in it: a second page bundle in one `bun test` process fails
 * with `Bundle failed` (measured on Bun 1.3.0, recorded in
 * `tests/state-exams/interaction-evidence.test.ts`'s header). Everything that
 * exam cannot express is an ordinary `bun:test` block beside it — the Done view
 * of M5 (e) and the unfiltered view of M6 (f), each a `renderStatic` of a state
 * rather than a second page; the two new expected files of M7 (g); and each of
 * the three `Run:` lines of M8 (h)–(j), spawned as the Proof spells them.
 *
 * `renderStatic` is `react-dom/server` and calls no `Bun.build`, so legs (e) and
 * (f) cost no second bundle. M5 and M6 are also why the bar is mounted in
 * `TodoList`: the static page the linter paints and the live page the click exam
 * opens both render it, so both legs read the same markup for the same state.
 *
 * Three readings this file makes, written down because the Proof leaves them to
 * the reader:
 *
 *   - Every fixture read happens inside a test body, never at module level. The
 *     linter's capture child imports this file with `stateExam` and `bun:test`
 *     stubbed out, so a module-level `readFileSync` of a file this task has yet
 *     to create would make `bun run lint:state` — and so leg (j) — fail as
 *     `capture failed` rather than as the finding it is.
 *   - Leg (g) compares each new expected file's tables half against the *parsed
 *     seed file's* tables half, exactly as M7 words it, and never against a row
 *     written out here: a sibling run adding a cell to a `todos` row must not
 *     turn this exam red. Only the values half is pinned as a literal, because
 *     M7 pins it: exactly `{filter: 'open'}` and exactly `{filter: 'done'}`.
 *   - Legs (h) and (i) hold already in the tree this task builds on — that is
 *     the precondition M8 states of `lint-cli.test.ts` — so they are asserted as
 *     the `Run:` lines they are, and it is legs (a)–(g) and (j) that go red
 *     until the bar exists.
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {assertView, stateExam} from 'tinyapp-exam';

import {renderStatic} from '../../client/src/StaticPage';
import {createTodosStore, type TodosContent} from '../../client/src/storeData';

/** This file sits two directories below the repository root, which is `bun test`'s cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/** A child `bun test` over the linter's four exams needs far more than bun's 5 s. */
const LINT_TIMEOUT_MS = 600_000;

/** The seed of M1 — row `0` `buy milk` open, row `1` `walk the dog` done. */
const SEED_PATH = 'state-exams/seeds/two-todos-one-done.json';

/** The two expected states of M1 and M5: the seed's tables beside one filter. */
const OPEN_PATH = 'state-exams/expected/two-todos-one-done-filter-open.json';
const DONE_PATH = 'state-exams/expected/two-todos-one-done-filter-done.json';

/** One snapshot file, parsed as the `[tables, values]` pair it holds. */
const pairOf = (path: string): [unknown, unknown] =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as [unknown, unknown];

/** The same file as the content `renderStatic` paints. */
const contentOf = (path: string): TodosContent =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as TodosContent;

/** Runs one Proof `Run:` line from the repository root and returns its status. */
const runLine = (line: string): number => {
  const child = Bun.spawnSync({
    cmd: ['bash', '-c', line],
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (child.exitCode !== 0) {
    console.error(child.stdout.toString());
    console.error(child.stderr.toString());
  }
  return child.exitCode;
};

// --- M5: the Done page, painted statically -----------------------------------

// Leg (e) [M5]: `renderStatic` over the content of the done-filtered expected
// state paints one row, `walk the dog`, the one ticked row, the seed's own count
// and `Done` as the pressed button.
test('leg (e) [M5] renderStatic over two-todos-one-done-filter-done.json paints one done row, `1 of 2 done`, and Done active', () => {
  expect(
    assertView(renderStatic(contentOf(DONE_PATH)), [
      {selector: '.todoItem', count: 1, text: 'walk the dog'},
      {selector: '.todoItem.completed', count: 1},
      {selector: '#doneCount', count: 1, text: '1 of 2 done'},
      {selector: '#filter-done', count: 1, attr: {name: 'data-active', value: 'true'}},
      {selector: '#filter-all', count: 1, attr: {name: 'data-active', value: 'false'}},
      {selector: '#filter-open', count: 1, attr: {name: 'data-active', value: 'false'}},
    ]),
  ).toEqual([]);
});

// --- M6: the seed's own state — no filter value at all -----------------------

// Leg (f) [M6]: `renderStatic` over the seed's own content shows both rows, the
// same count, `All` as the pressed button, and exactly three buttons in the bar.
test('leg (f) [M6] renderStatic over the seed paints both rows, `1 of 2 done`, All active, and three buttons in #filterBar', () => {
  expect(
    assertView(renderStatic(contentOf(SEED_PATH)), [
      {selector: '.todoItem', count: 2},
      {selector: '#doneCount', count: 1, text: '1 of 2 done'},
      {selector: '#filter-all', count: 1, attr: {name: 'data-active', value: 'true'}},
      {selector: '#filterBar button', count: 3},
    ]),
  ).toEqual([]);
});

// --- M7: each new expected file is the seed's tables beside one value ---------

// Leg (g) [M7]: for each of the two new expected files, the parsed pair's `[0]`
// is deep-equal to the parsed seed file's `[0]` and its `[1]` is exactly the one
// filter value.
for (const [path, values] of [
  [OPEN_PATH, {filter: 'open'}],
  [DONE_PATH, {filter: 'done'}],
] as const) {
  test(`leg (g) [M7] ${path} is the seed's tables half beside exactly ${JSON.stringify(values)}`, () => {
    const parsed = pairOf(path);

    expect(parsed[0]).toEqual(pairOf(SEED_PATH)[0]);
    expect(parsed[1]).toEqual(values);
  });
}

// --- M8: the linter's own exams read the tree, and pass over this one ---------

// Leg (h) [M8], the first `Run:` line: `lint-cli.test.ts` computes the exam list
// rather than pinning it, which BASE's literal list does not.
test("leg (h) [M8] the Run line `grep -q 'const EXAM_FILES' packages/tinyapp-lint/test/lint-cli.test.ts` exits 0", () => {
  expect(
    runLine(
      `grep -q 'const EXAM_FILES' packages/tinyapp-lint/test/lint-cli.test.ts`,
    ),
  ).toBe(0);
});

// Leg (i) [M8], the second `Run:` line: its summary regex reads the counts off
// the run, which BASE's `7 snapshots and 6 exams` does not.
test("leg (i) [M8] the Run line `grep -qF '[0-9]+ snapshots and [0-9]+ exams' packages/tinyapp-lint/test/lint-cli.test.ts` exits 0", () => {
  expect(
    runLine(
      `grep -qF '[0-9]+ snapshots and [0-9]+ exams' packages/tinyapp-lint/test/lint-cli.test.ts`,
    ),
  ).toBe(0);
});

// Leg (j) [M8], the third `Run:` line: the linter's four exams exit 0 over this
// task's tree, so the two new expected states and this exam file land in the
// lists those exams compute from the tree.
test(
  'leg (j) [M8] `bun test` over the linter`s four exams exits 0 over this tree',
  () => {
    expect(
      runLine(
        'bun test packages/tinyapp-lint/test/lint-cli.test.ts packages/tinyapp-lint/test/views.test.ts packages/tinyapp-lint/test/invariants.test.ts packages/tinyapp-lint/test/reachability.test.ts',
      ),
    ).toBe(0);
  },
  LINT_TIMEOUT_MS,
);

// --- M1–M4: the one state exam of this file ----------------------------------

// Legs (a)–(d). (a) [M1] clicking `#filter-open` on the page over the seed
// leaves the page store's `getContent()` exactly the seed's tables beside
// `{filter: 'open'}` — the content of the open-filtered expected file — and
// unticking row `1` of that expected state would have been noticed.
// (b) [M2] that page shows exactly one `.todoItem`, `buy milk`, and no
// `.todoItem.completed`. (c) [M3] its `#doneCount` reads `1 of 2 done`, the
// seed's own count, unmoved by the filter. (d) [M4] `#filter-open` carries
// `data-active="true"` and the other two `"false"`, each matching one element.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: SEED_PATH,
  store: () => createTodosStore(),
  action: {click: '#filter-open'},
  expected: OPEN_PATH,
  view: [
    {selector: '.todoItem', count: 1, text: 'buy milk'},
    {selector: '.todoItem.completed', absent: true},
    {selector: '#doneCount', count: 1, text: '1 of 2 done'},
    {selector: '#filter-open', count: 1, attr: {name: 'data-active', value: 'true'}},
    {selector: '#filter-all', count: 1, attr: {name: 'data-active', value: 'false'}},
    {selector: '#filter-done', count: 1, attr: {name: 'data-active', value: 'false'}},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'completed', value: false}],
});
