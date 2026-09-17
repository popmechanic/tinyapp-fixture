/**
 * The exam for Task 3 — "One chip per tag in use — clicking a chip shows only
 * the todos wearing that tag".
 *
 * A file's whole state exam is the single `stateExam({…})` in it — a second page
 * bundle in one `bun test` process fails with `Bundle failed`, as
 * `tests/state-exams/interaction-evidence.test.ts`'s header records — so leg (a)
 * is that one call and every other leg is an ordinary `bun:test` block beside
 * it. One test per Proof leg, named for its leg and for the Machine clause it
 * comes from, so a red run names the case rather than the group:
 *
 *   (a) [M1] the one `stateExam` of the file — the seeded page, clicked on the
 *            button named `Tag home`, reaches exactly the expected state, paints
 *            the seven views M1 pins and kills the mutant that rewrites row `1`'s
 *            `tags` to `home`; plus the parsed expected file against the M1
 *            expected literal and the parsed seed file against the M1 seed
 *            literal;
 *   (b) [M2] the static render over four contents — the expected state's chips,
 *            their order, their text and their accessible names; the seed state's
 *            two rows and no pressed chip; the two-row shared-tag state's three
 *            chips in alphabetical order; and the untagged state's empty chip
 *            box beside the three status buttons;
 *   (c) [M3] the tag filter composed with the status filter, and a stale tag
 *            forgiven — one test per values half;
 *   (d) [M4] the first `Run:` line — the linter's four test files;
 *   (e) [M4] the second `Run:` line — the three exams that pin `#filterBar` and
 *            the status filter.
 *
 * Four readings this file makes, written down because the Proof leaves them to
 * the reader:
 *
 *   - Every fixture read, every `renderStatic` and every spawn happens inside a
 *     test body, never at module level. The linter's capture child imports this
 *     file with `stateExam` and `bun:test` stubbed out, so a module-level
 *     `readFileSync` of a snapshot file this task has yet to create would make
 *     `bun run lint:state` fail as `capture failed` rather than leave the leg
 *     red as the finding it is.
 *   - Legs (b) and (c) render the contents M2 and M3 *name*, written out here as
 *     literals rather than read off disk. M2 and M3 word them as contents, and
 *     leg (a) already pins the two checked-in files against those same literals;
 *     writing them out keeps (b) and (c) red on the absent chips rather than on
 *     an absent file, and keeps the four contents M2 names — two of which are
 *     never checked in at all — spelled one way.
 *   - The chip's whole text is read by the two element-spanning regexes of leg
 *     (b), not by a view: a view's `text` is a contains-match, so `home` would
 *     be answered by a chip reading `home,urgent`. The regexes are counted
 *     through `?? []` so a missing chip reads as `0` rather than throwing.
 *   - The alphabetical-order leg parses with `node-html-parser` and maps the
 *     `data-tag` attributes in document order: the encounter order of the two
 *     rows is `urgent, work, home`, and a dedupe that never happened would read
 *     four chips, so both wrong answers fail naming the list they produced.
 *
 * Red at BASE, and each leg for the absent implementation: `client/src/
 * FilterBar.tsx` renders the three status buttons and nothing else, so there is
 * no `#tagChips`, no button named `Tag home` to click and no `data-tag` to
 * order; `client/src/TodoList.tsx`'s predicate reads the status filter alone, so
 * a tag filter hides nothing; and the seed and expected files are not on the
 * tree. Everything this file imports resolves at BASE — `renderStatic`,
 * `createTodosStore`, `TodosContent`, `assertView` and `stateExam` are all
 * there, `VALUES_SCHEMA.tag` already accepts the `tag` value so no render
 * throws, and `#taggedCount` is already painted by `DoneCount` — so no leg goes
 * red as a load error or as an exception.
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {parse} from 'node-html-parser';
import {assertView, stateExam} from 'tinyapp-exam';

import {renderStatic} from '../../client/src/StaticPage';
import {createTodosStore, type TodosContent} from '../../client/src/storeData';

/** This file sits two directories below the repository root, which is `bun test`'s cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/** A child `bun test` over a whole suite needs far more than Bun's 5 s. */
const RUN_LINE_TIMEOUT_MS = 600_000;

/** The two snapshot files M1 names. */
const SEED_PATH = 'state-exams/seeds/two-todos-second-tagged.json';
const EXPECTED_PATH =
  'state-exams/expected/two-todos-second-tagged-filter-home.json';

/** The tables half M1, M2 and M3 all measure from: row `1` wears `home,urgent`. */
const M1_TABLES = {
  todos: {
    '0': {text: 'buy milk', completed: false},
    '1': {text: 'walk the dog', completed: false, tags: 'home,urgent'},
  },
};

/** The seed of M1 — those tables, and no values at all. */
const M1_SEED = [M1_TABLES, {}] as unknown as TodosContent;

/** The expected state of M1 — those tables beside exactly the chosen tag. */
const M1_EXPECTED = [M1_TABLES, {tag: 'home'}] as unknown as TodosContent;

/**
 * M2's third content: two rows sharing `urgent`, the tags typed out of
 * alphabetical order, so the encounter order is `urgent, work, home`.
 */
const SHARED_TAG = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false, tags: 'urgent,work'},
      '1': {text: 'walk the dog', completed: false, tags: 'home,urgent'},
    },
  },
  {},
] as unknown as TodosContent;

/** M2's fourth content: two open todos, neither of them tagged. */
const TWO_OPEN = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
] as unknown as TodosContent;

/** One snapshot file, parsed as the content it holds. */
const readJson = (path: string): TodosContent =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as TodosContent;

/** The M1 tables beside one values half, the shape M3 measures. */
const withValues = (values: Record<string, string>): TodosContent =>
  [M1_TABLES, values] as unknown as TodosContent;

/** How many times `pattern` matches `html`, `0` when it matches at all. */
const countMatches = (html: string, pattern: RegExp): number =>
  (html.match(pattern) ?? []).length;

/** One Proof `Run:` line, run from the repository root as the driver runs it. */
const expectExit0 = (line: string): void => {
  const run = Bun.spawnSync({
    cmd: ['bash', '-c', line],
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const tail = `${run.stdout.toString()}${run.stderr.toString()}`
    .trim()
    .split('\n')
    .slice(-15)
    .join('\n');

  expect(run.exitCode === 0 ? 'exit 0' : `exit ${run.exitCode}\n${tail}`).toBe(
    'exit 0',
  );
};

// --- Leg (a) [M1]: the one state exam of the file ----------------------------

// Clicking the chip named `Tag home` on the page over the seed leaves the store
// exactly the seed's tables beside `{tag: 'home'}` — the click moves the values
// half and nothing else — and the page says so out loud: one row, `walk the
// dog`, the only row wearing `home`; two chips, `home` pressed and `urgent` not;
// `All` still the pressed status button, because the tag filter composes with
// the status filter rather than replacing it; and the two counts above unmoved,
// `0 of 2 done` and `1 tagged`, because filtering hides rows from the list and
// from nothing else. The mutant rewrites row `1`'s `tags` to `home` — a state the
// click does not reach, the cell being `home,urgent` before and after — so an
// exam that never read that cell could not have passed.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: SEED_PATH,
  store: () => createTodosStore(),
  action: {click: {role: 'button', name: 'Tag home'}},
  expected: EXPECTED_PATH,
  view: [
    {selector: '#todoList li', count: 1, text: 'walk the dog'},
    {selector: '#tagChips button', count: 2},
    {
      selector: '#tagChips button[data-tag="home"]',
      count: 1,
      attr: {name: 'data-active', value: 'true'},
    },
    {
      selector: '#tagChips button[data-tag="urgent"]',
      count: 1,
      attr: {name: 'data-active', value: 'false'},
    },
    {selector: '#filter-all', count: 1, attr: {name: 'data-active', value: 'true'}},
    {selector: '#doneCount', count: 1, text: '0 of 2 done'},
    {selector: '#taggedCount', count: 1, text: '1 tagged'},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'tags', value: 'home'}],
});

// Leg (a) [M1]: the expected file the exam above compares against parses to
// exactly the literal M1 spells, so a file differing in any cell, id, order or
// half fails naming it.
test(`leg (a) [M1] ${EXPECTED_PATH} parses to exactly the M1 expected literal`, () => {
  expect(readJson(EXPECTED_PATH)).toEqual(M1_EXPECTED);
});

// Leg (a) [M1]: and the seed file parses to exactly the seed literal — the same
// tables beside no values at all.
test(`leg (a) [M1] ${SEED_PATH} parses to exactly the M1 seed literal`, () => {
  expect(readJson(SEED_PATH)).toEqual(M1_SEED);
});

// --- Leg (b) [M2]: the chips in the static render ----------------------------

// The chip box is inside the filter bar, exactly once: the chips sit in
// `#filterBar` because `filter-bar.test.ts` and `filter-done.test.ts` pin
// `#filterBar button` at 3 over untagged states.
test('leg (b) [M2] renderStatic over the M1 expected content carries #filterBar #tagChips exactly once', () => {
  expect(
    assertView(renderStatic(M1_EXPECTED), [{selector: '#filterBar #tagChips', count: 1}]),
  ).toEqual([]);
});

// Alphabetical, in the markup itself: `home` is painted before `urgent`.
test('leg (b) [M2] in that markup data-tag="home" occurs before data-tag="urgent"', () => {
  const html = renderStatic(M1_EXPECTED);
  const home = html.indexOf('data-tag="home"');
  const urgent = html.indexOf('data-tag="urgent"');

  expect(home).toBeGreaterThanOrEqual(0);
  expect(urgent).toBeGreaterThanOrEqual(0);
  expect(home).toBeLessThan(urgent);
});

// A chip's text is exactly its tag, and nothing else: the element-spanning
// regexes read the whole button, which a view's contains-match cannot.
test('leg (b) [M2] each chip of that markup is a button whose whole text is its own tag, once each', () => {
  const html = renderStatic(M1_EXPECTED);

  expect(
    countMatches(html, /<button[^>]*data-tag="home"[^>]*>home<\/button>/g),
  ).toBe(1);
  expect(
    countMatches(html, /<button[^>]*data-tag="urgent"[^>]*>urgent<\/button>/g),
  ).toBe(1);
});

// And each carries the accessible name the plan gives it, so a tag spelled
// `Open` never shares a name with the Open button.
test('leg (b) [M2] the two chips of that markup carry aria-label exactly `Tag home` and `Tag urgent`', () => {
  expect(
    assertView(renderStatic(M1_EXPECTED), [
      {
        selector: '#tagChips button[data-tag="home"]',
        count: 1,
        attr: {name: 'aria-label', value: 'Tag home'},
      },
      {
        selector: '#tagChips button[data-tag="urgent"]',
        count: 1,
        attr: {name: 'aria-label', value: 'Tag urgent'},
      },
    ]),
  ).toEqual([]);
});

// The seed's own state carries no `tag` value, so both rows show and no chip is
// pressed — the chips are offered, not chosen.
test('leg (b) [M2] renderStatic over the M1 seed content paints both rows and no pressed chip', () => {
  expect(
    assertView(renderStatic(M1_SEED), [
      {selector: '#todoList li', count: 2},
      {selector: '#tagChips button[data-active="true"]', absent: true},
    ]),
  ).toEqual([]);
});

// One chip per tag *in use*, alphabetical: two rows sharing `urgent` offer three
// chips, and their order is `home, urgent, work` rather than the encounter order
// `urgent, work, home`.
test("leg (b) [M2] renderStatic over the two-row shared-tag content paints exactly 3 chips reading ['home', 'urgent', 'work'] in document order", () => {
  const chips = parse(renderStatic(SHARED_TAG)).querySelectorAll(
    '#tagChips button',
  );

  expect(chips.length).toBe(3);
  expect(chips.map((chip) => chip.getAttribute('data-tag'))).toEqual([
    'home',
    'urgent',
    'work',
  ]);
});

// Nothing tagged, no chips: the box is there and empty, and the bar still holds
// exactly the three status buttons the exams already on the tree pin.
test('leg (b) [M2] renderStatic over the two-open content carries #tagChips once, no chip in it, and 3 #filterBar button', () => {
  expect(
    assertView(renderStatic(TWO_OPEN), [
      {selector: '#tagChips', count: 1},
      {selector: '#tagChips button', absent: true},
      {selector: '#filterBar button', count: 3},
    ]),
  ).toEqual([]);
});

// --- Leg (c) [M3]: the two filters compose, and a stale tag is forgiven ------

// Done and `home` together admit nothing — the one `home` row is open — so the
// list is empty and says so, with both choices still showing as pressed.
test("leg (c) [M3] over {filter: 'done', tag: 'home'} the list is empty, #todoListEmpty shows, and both Done and the home chip read data-active=true", () => {
  expect(
    assertView(renderStatic(withValues({filter: 'done', tag: 'home'})), [
      {selector: '#todoList li', absent: true},
      {selector: '#todoListEmpty', count: 1},
      {
        selector: '#filter-done',
        count: 1,
        attr: {name: 'data-active', value: 'true'},
      },
      {
        selector: '#tagChips button[data-tag="home"]',
        count: 1,
        attr: {name: 'data-active', value: 'true'},
      },
    ]),
  ).toEqual([]);
});

// Open and `home` together admit exactly the one row that is both.
test("leg (c) [M3] over {filter: 'open', tag: 'home'} the list is exactly one row, `walk the dog`", () => {
  expect(
    assertView(renderStatic(withValues({filter: 'open', tag: 'home'})), [
      {selector: '#todoList li', count: 1, text: 'walk the dog'},
    ]),
  ).toEqual([]);
});

// A tag no row carries is read as no filter at all: both rows show, the two
// chips actually in use are still offered, and none of them is pressed.
test("leg (c) [M3] over {tag: 'gone'} both rows show, 2 chips are offered and none is pressed", () => {
  expect(
    assertView(renderStatic(withValues({tag: 'gone'})), [
      {selector: '#todoList li', count: 2},
      {selector: '#tagChips button', count: 2},
      {selector: '#tagChips button[data-active="true"]', absent: true},
    ]),
  ).toEqual([]);
});

// --- Legs (d)–(e) [M4]: the two `Run:` lines, run verbatim -------------------

// The linter's four test files read the tree, so the two new snapshot files and
// this exam land in the lists they compute — the reachability walk reaches the
// expected state from the new seed in one `setTagFilter` move.
test(
  "leg (d) [M4] the Run line `bun test` over the linter's four test files exits 0",
  () => {
    expectExit0(
      'bun test packages/tinyapp-lint/test/lint-cli.test.ts packages/tinyapp-lint/test/invariants.test.ts packages/tinyapp-lint/test/reachability.test.ts packages/tinyapp-lint/test/views.test.ts',
    );
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);

// And the three exams that pin `#filterBar` and the status filter still pass:
// an untagged state renders no chip, so `#filterBar button` is still 3 for them.
test(
  'leg (e) [M4] the Run line `bun test` over the filter-bar, filter-done and set-filter exams exits 0',
  () => {
    expectExit0(
      'bun test tests/state-exams/filter-bar.test.ts tests/state-exams/filter-done.test.ts tests/state-exams/set-filter.test.ts',
    );
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);
