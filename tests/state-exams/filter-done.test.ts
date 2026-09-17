/**
 * The exam for Task 4 — "Pressing Done — the click that leaves only the done
 * todos, and the pressed look".
 *
 * One `stateExam` call, carrying legs (a)–(d), because a file's whole state
 * exam is the single `stateExam` in it: a second `Bun.build` of the entry in one
 * test process fails with `Bundle failed` (measured on Bun 1.3.0,
 * recorded in `tests/state-exams/interaction-evidence.test.ts`'s header). That
 * is why the Done press lives in this file at all —
 * `tests/state-exams/filter-bar.test.ts` already bundles `client/index.html`
 * once for the Open click, and the exam command runs this file as its own
 * process.
 *
 * Everything the state exam cannot express is an ordinary `bun:test` block
 * beside it: the three source predicates of M5, legs (e)–(g), each asserted as
 * an in-process read of the file it is about, from the repository root.
 *
 * M6's leg (h) ran the linter's own exams in a child process. One claim, one
 * prover: the linter is graded by its own tests and by the driver's lint check,
 * so that leg is gone from here.
 *
 * Three readings this file makes, written down because the Proof leaves them to
 * the reader:
 *
 *   - No filesystem read happens at module level — this file reads no fixture
 *     outside a test body at all. The linter's capture child imports this file
 *     with `stateExam` and `bun:test` stubbed out, so a module-level read of a
 *     file the tree may not carry would make the state linter fail as `capture
 *     failed` rather than as the M5 leg it belongs to.
 *   - Legs (e), (f) and (g) pin text verbatim rather than paraphrasing it,
 *     because M5 pins text. They were three lines about
 *     `client/src/filterBar.css` — its import, its
 *     `#filterBar button[data-active="true"] {` rule and that rule's
 *     `background: var(--accent)` — and the stylesheet is gone: the re-platform
 *     deleted every hand-written sheet, so the same three sentences are now
 *     asked of what replaced it. The bar imports the design system's `Button`
 *     instead of a sheet; the pressed look is that component's `default`
 *     variant against `outline`, chosen in `FilterBar.tsx` and nowhere else;
 *     and that variant paints `bg-primary`, whose colour is the `--primary`
 *     token declared in `client/src/index.css`, the one place this project
 *     writes a colour. Read end to end the three legs still say "the pressed
 *     button is painted, and the paint is named in one place".
 *   - M1–M4 describe the page the bar already paints, and M5 is now the
 *     component and the token behind it. The bar, `todoFilter`, `TodoList`'s
 *     single mount of the bar and
 *     `state-exams/expected/two-todos-one-done-filter-done.json` are an earlier
 *     task's, so legs (a)–(d) speak of what this task must not disturb.
 *     Nothing here is loosened on that account: the click, the seven views and
 *     the mutant are asserted in full, so a change to the bar that broke the
 *     Done press would be caught here as well.
 *
 * Nothing in this file pins the key set of `TABLES_SCHEMA`, of a `todos` row or
 * of the store's tables: the expected state is named by path and compared by
 * `stateExam` against the store the page reached, never against a row written
 * out here, so a sibling run adding a cell to `todos` or a `trash` table leaves
 * this exam green.
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import {createTodosStore} from '../../client/src/storeData';

/** This file sits two directories below the repository root, the runner's cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/** The seed of M1 — row `0` `buy milk` open, row `1` `walk the dog` done. */
const SEED_PATH = 'state-exams/seeds/two-todos-one-done.json';

/** The expected state of M1: the seed's tables beside `{filter: 'done'}`. */
const DONE_PATH = 'state-exams/expected/two-todos-one-done-filter-done.json';

/** One repository file's text, read from the repository root in this process. */
const readSource = (relative: string): string =>
  readFileSync(join(ROOT, relative), 'utf8');

// --- M5: the component, the variant, and the token that paints the pressed look

// Leg (e) [M5], the first predicate: `FilterBar.tsx` takes its button from the
// design system, the way every component of this app reaches a control now that
// no component imports a stylesheet of its own.
test("leg (e) [M5] client/src/FilterBar.tsx carries `import {Button} from '@/components/ui/button';`", () => {
  expect(readSource('client/src/FilterBar.tsx')).toContain(
    `import {Button} from '@/components/ui/button';`,
  );
});

// Leg (f) [M5], the second predicate: the pressed look is the component's own
// variant, chosen from the filter the store holds and written out in full —
// read as a fixed string, so a computed class string or a comment naming the
// variant does not carry it.
test(`leg (f) [M5] client/src/FilterBar.tsx carries \`variant={filter === name ? 'default' : 'outline'}\``, () => {
  expect(readSource('client/src/FilterBar.tsx')).toContain(
    `variant={filter === name ? 'default' : 'outline'}`,
  );
});

// Leg (g) [M5], the third predicate: that variant is not an empty one. The
// `default` variant of the button paints `bg-primary`, and `--primary` is
// declared in `client/src/index.css` — the project's one stylesheet and the one
// place a colour is written. Both halves must hold, so the leg asserts both.
test('leg (g) [M5] client/src/components/ui/button.tsx carries `default: "bg-primary` and client/src/index.css declares `--primary:`', () => {
  expect(readSource('client/src/components/ui/button.tsx')).toContain(
    'default: "bg-primary',
  );
  expect(readSource('client/src/index.css')).toContain('--primary:');
});

// --- M1–M4: the one state exam of this file ----------------------------------

// Legs (a)–(d).
//
// (a) [M1] clicking the button named `Done` on the page over the seed — row `0`
// `buy milk` open, row `1` `walk the dog` done — leaves the page store's
// `getContent()` exactly the seed's tables beside `{filter: 'done'}`, the
// content of `two-todos-one-done-filter-done.json`: a store move that reached
// anything else fails naming the first differing cell. The mutant that ticks
// row `0` of that expected state must be told apart from what the store
// actually reached, or the exam is hollow. It is a table edit, because
// `applyMutant` carries the values half across unchanged and a mutant naming
// the filter value would never be killed.
//
// (b) [M2] that page shows exactly one `#todoList li`, whose text is
// `walk the dog`, and exactly one `#todoList li[data-completed="true"]`.
//
// (c) [M3] its `#doneCount` reads `1 of 2 done` — the seed's own count, derived
// from every row of `todos` and unmoved by the filter.
//
// (d) [M4] the pressed button sits inside the bar: `#filterBar #filter-done`
// matches exactly one element carrying `data-active="true"`, `#filterBar button`
// matches exactly three, and `#filter-all` and `#filter-open` each match exactly
// one element carrying `data-active="false"`. The descendant selector is what
// ties the pressed attribute to the one bar.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: SEED_PATH,
  store: () => createTodosStore(),
  action: {click: {role: 'button', name: 'Done'}},
  expected: DONE_PATH,
  view: [
    {selector: '#todoList li', count: 1, text: 'walk the dog'},
    {selector: '#todoList li[data-completed="true"]', count: 1},
    {selector: '#doneCount', count: 1, text: '1 of 2 done'},
    {selector: '#filterBar #filter-done', count: 1, attr: {name: 'data-active', value: 'true'}},
    {selector: '#filterBar button', count: 3},
    {selector: '#filter-all', count: 1, attr: {name: 'data-active', value: 'false'}},
    {selector: '#filter-open', count: 1, attr: {name: 'data-active', value: 'false'}},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: true}],
});
