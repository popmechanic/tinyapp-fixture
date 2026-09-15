/**
 * The exam for Task 4 — "Pressing Done — the click that leaves only the done
 * todos, and the pressed look".
 *
 * One `stateExam` call, carrying legs (a)–(d), because a file's whole state
 * exam is the single `stateExam` in it: a second `Bun.build` of the entry in one
 * `bun test` process fails with `Bundle failed` (measured on Bun 1.3.0,
 * recorded in `tests/state-exams/interaction-evidence.test.ts`'s header). That
 * is why the Done press lives in this file at all —
 * `tests/state-exams/filter-bar.test.ts` already bundles `client/index.html`
 * once for the Open click, and the exam command runs this file as its own
 * process.
 *
 * Everything the state exam cannot express is an ordinary `bun:test` block
 * beside it: the four `Run:` lines of M5 and M6, legs (e)–(h), each spawned
 * through bash from the repository root exactly as the Proof spells it.
 *
 * Three readings this file makes, written down because the Proof leaves them to
 * the reader:
 *
 *   - No filesystem read happens at module level — this file reads no fixture
 *     outside a test body at all. The linter's capture child imports this file
 *     with `stateExam` and `bun:test` stubbed out, so a module-level read of the
 *     not-yet-created `client/src/filterBar.css` would make `bun run lint:state`
 *     — and so leg (h) — fail as `capture failed` rather than as the M5 leg it
 *     belongs to.
 *   - Legs (e), (f) and (g) are asserted as the `Run:` lines themselves rather
 *     than as a paraphrase of them, because M5 pins text: `grep -qF` reads its
 *     pattern as a fixed string, so the whole selector followed by its opening
 *     brace must occur verbatim — an unscoped `button[data-active="true"]` rule
 *     or a comment naming the selector does not carry it — and the `sed` range
 *     reads only the lines from that brace to the next closing one, so an empty
 *     rule body does not pass leg (g).
 *   - M1–M4 describe the page the bar already paints, and M5 is the stylesheet
 *     and its import. The bar, `todoFilter`, `TodoList`'s single mount of the
 *     bar and `state-exams/expected/two-todos-one-done-filter-done.json` are the
 *     previous task's, so legs (a)–(d) and (h) speak of what this task must not
 *     disturb and legs (e)–(g) of what it must add. Nothing here is loosened on
 *     that account: the click, the seven views and the mutant are asserted in
 *     full, so a change to the bar that broke the Done press would be caught
 *     here as well.
 *
 * Nothing in this file pins the key set of `TABLES_SCHEMA`, of a `todos` row or
 * of the store's tables: the expected state is named by path and compared by
 * `stateExam` against the store the page reached, never against a row written
 * out here, so a sibling run adding a cell to `todos` or a `trash` table leaves
 * this exam green.
 */

import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import {createTodosStore} from '../../client/src/storeData';

/** This file sits two directories below the repository root, which is `bun test`'s cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/** A child `bun test` over the linter's two exams needs far more than bun's 5 s. */
const LINT_TIMEOUT_MS = 600_000;

/** The seed of M1 — row `0` `buy milk` open, row `1` `walk the dog` done. */
const SEED_PATH = 'state-exams/seeds/two-todos-one-done.json';

/** The expected state of M1: the seed's tables beside `{filter: 'done'}`. */
const DONE_PATH = 'state-exams/expected/two-todos-one-done-filter-done.json';

/**
 * Runs one Proof `Run:` line from the repository root and returns its status.
 *
 * A non-zero exit puts the child's own output on this process's, so a red leg
 * reads as whatever the line said rather than as a bare exit code.
 */
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

// --- M5: the stylesheet, its import, and the rule that binds the pressed look -

// Leg (e) [M5], the first `Run:` line: `FilterBar.tsx` carries the import line
// `import './filterBar.css';`, the way the fixture's sibling sheets are
// imported by their component.
test("leg (e) [M5] the Run line `grep -q \"import './filterBar.css';\" client/src/FilterBar.tsx` exits 0", () => {
  expect(
    runLine(`grep -q "import './filterBar.css';" client/src/FilterBar.tsx`),
  ).toBe(0);
});

// Leg (f) [M5], the second `Run:` line: `filterBar.css` carries the whole
// selector followed by its opening brace, read as a fixed string.
test('leg (f) [M5] the Run line `grep -qF \'#filterBar button[data-active="true"] {\' client/src/filterBar.css` exits 0', () => {
  expect(
    runLine(
      `grep -qF '#filterBar button[data-active="true"] {' client/src/filterBar.css`,
    ),
  ).toBe(0);
});

// Leg (g) [M5], the third `Run:` line: the lines from that selector's opening
// brace to the next closing brace, and only those, carry
// `background: var(--accent)` — so the rule has the declaration and its body is
// not empty.
test("leg (g) [M5] the Run line `sed -n '/#filterBar button\\[data-active=\"true\"\\] {/,/}/p' client/src/filterBar.css | grep -q 'background: var(--accent)'` exits 0", () => {
  expect(
    runLine(
      String.raw`sed -n '/#filterBar button\[data-active="true"\] {/,/}/p' client/src/filterBar.css | grep -q 'background: var(--accent)'`,
    ),
  ).toBe(0);
});

// --- M6: the linter's own exams read the tree, and pass over this one --------

// Leg (h) [M6], the fourth `Run:` line: the two linter exams exit 0 over this
// task's tree, so the exam list they compute — this file in it by construction,
// since it calls `stateExam(` at a line start — is the list the linter reads.
test(
  'leg (h) [M6] `bun test` over the linter`s two exams exits 0 over this tree',
  () => {
    expect(
      runLine(
        'bun test packages/tinyapp-lint/test/lint-cli.test.ts packages/tinyapp-lint/test/views.test.ts',
      ),
    ).toBe(0);
  },
  LINT_TIMEOUT_MS,
);

// --- M1–M4: the one state exam of this file ----------------------------------

// Legs (a)–(d).
//
// (a) [M1] clicking `#filter-done` on the page over the seed — row `0`
// `buy milk` open, row `1` `walk the dog` done — leaves the page store's
// `getContent()` exactly the seed's tables beside `{filter: 'done'}`, the
// content of `two-todos-one-done-filter-done.json`: a store move that reached
// anything else fails naming the first differing cell. The mutant that ticks
// row `0` of that expected state must be told apart from what the store
// actually reached, or the exam is hollow. It is a table edit, because
// `applyMutant` carries the values half across unchanged and a mutant naming
// the filter value would never be killed.
//
// (b) [M2] that page shows exactly one `.todoItem`, whose text is
// `walk the dog`, and exactly one `.todoItem.completed`.
//
// (c) [M3] its `#doneCount` reads `1 of 2 done` — the seed's own count, derived
// from every row of `todos` and unmoved by the filter.
//
// (d) [M4] the pressed button sits inside the bar: `#filterBar #filter-done`
// matches exactly one element carrying `data-active="true"`, `#filterBar button`
// matches exactly three, and `#filter-all` and `#filter-open` each match exactly
// one element carrying `data-active="false"`. The descendant selector is what
// ties the pressed attribute M5's stylesheet rule reads to the one bar.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: SEED_PATH,
  store: () => createTodosStore(),
  action: {click: '#filter-done'},
  expected: DONE_PATH,
  view: [
    {selector: '.todoItem', count: 1, text: 'walk the dog'},
    {selector: '.todoItem.completed', count: 1},
    {selector: '#doneCount', count: 1, text: '1 of 2 done'},
    {selector: '#filterBar #filter-done', count: 1, attr: {name: 'data-active', value: 'true'}},
    {selector: '#filterBar button', count: 3},
    {selector: '#filter-all', count: 1, attr: {name: 'data-active', value: 'false'}},
    {selector: '#filter-open', count: 1, attr: {name: 'data-active', value: 'false'}},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: true}],
});
