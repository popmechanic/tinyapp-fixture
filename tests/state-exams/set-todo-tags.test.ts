/**
 * The exam for Task 1 — "The tags cell, the tag value and their readings —
 * `todoTags.ts` is the one spelling, and the count line says how many are
 * tagged".
 *
 * A file's whole state exam is the single `stateExam({…})` in it, as
 * `tests/state-exams/set-filter.test.ts` shows, so leg (a) is that one call and
 * every other leg is an ordinary `bun:test` block beside it. One test per Proof
 * leg, named for its leg and for the Machine clause it comes from — and, where
 * a leg says "one test per row" or "one assertion per value", one test per row
 * and per value, so that a red run names the case rather than the group:
 *
 *   (a) [M1] the one `stateExam` of the file — the seeded page reaches the
 *            expected state under `setTodoTags(store, '1', 'home, urgent')`,
 *            paints `#taggedCount` once reading `1 tagged`, `#doneCount` once
 *            reading `0 of 2 done` and two `#todoList li`, and kills the mutant
 *            that drops the `tags` cell — plus the expected file's own content,
 *            pinned against the M1 literal written out here;
 *   (b) [M2] the `tags` cell schema on `todos` and on `trash`, the `tag` value
 *            schema, and the store's own values schema read back whole;
 *   (c) [M3] `parseTags` over its five inputs, `normalizeTags`, and
 *            `isNormalizedTags` over its four values;
 *   (d) [M4] `setTodoTags` setting, clearing, and leaving a missing id alone;
 *   (e) [M5] `setTagFilter` writing one normalized tag, refusing the three that
 *            are not one, clearing on `''`, and writing a tag no row holds;
 *   (f) [M6] `tagsInUse`, `countTagged`, `activeTag` and `hasTag` over the
 *            tables and rows M6 pins;
 *   (g) [M7] the appended `INVARIANTS` entry, found by its message, and
 *            `INVARIANTS[0]` still the entry the linter's exam reads;
 *   (h) [M8] the static render of the tagged state and of the two-open state,
 *            and `#doneCount`'s own span unchanged in both;
 *   (i) [M9] every checked-in seed and expected state still loading to itself;
 *   (j) [M10] the first `Run:` line — the linter's four test files;
 *   (k) [M10] the second `Run:` line — the three `#doneCount`/`#filterBar`
 *            exams.
 *
 * Four readings this file makes, written down because they are choices:
 *
 *   - `client/src/storeData.ts` is reached through one namespace import, the
 *     form `tests/state-exams/pin-todo.test.ts` already uses. A named import of
 *     `setTodoTags`, `setTagFilter` or `VALUES_SCHEMA.tag` would be a load
 *     error before the implementation exports it, and a load error is one red
 *     for the whole file; this way each leg is its own red and says which part
 *     of the contract is missing.
 *   - `client/src/todoTags.ts` does not exist at BASE at all, so it is reached
 *     with a computed-specifier `await import(resolve(ROOT, …))` inside each
 *     test body — the precedent `tests/state-exams/set-todo-due.test.ts` set
 *     for `client/src/overdue.ts`, and load-bearing for the same reason: a
 *     static import of an absent module fails the file at load.
 *   - Every fixture read happens inside a test body, never at module level: the
 *     linter's capture child imports this file with `stateExam` and `bun:test`
 *     stubbed out, so a module-level `readFileSync` of the expected file this
 *     task has yet to create would make `bun run lint:state` fail as `capture
 *     failed` rather than as the finding it is. The one module-level read is
 *     `readdirSync` of the two snapshot directories, which both exist at BASE,
 *     and it is there so that leg (i)'s failing file is the failing test's name.
 *   - Leg (i) reads those two directories rather than pinning how many files
 *     they hold. The count moves with this task and with the two running beside
 *     it, and a count is exactly the kind of pin this plan loosens rather than
 *     re-pins. For the same reason nothing here pins the number of callbacks,
 *     of snapshots, of exams or of `INVARIANTS` entries: M7's entry is found by
 *     its message and never by its index, and `INVARIANTS[0]` is asserted by
 *     the message it carries rather than by the length of the list around it.
 *
 * At BASE `renderStatic` over the M1 literal does not throw — the schema drops
 * the `tags` cell it does not yet hold — so leg (h) goes red on the absent
 * `#taggedCount` rather than on an exception, and the `#doneCount` span it also
 * pins is the span that is already there, asserted so that a later change to it
 * is this exam's red too.
 */

import {readdirSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

import {expect, test} from 'bun:test';
import {assertView, stateExam} from 'tinyapp-exam';

import {renderStatic} from '../../client/src/StaticPage';
import * as sd from '../../client/src/storeData';
import type {TodosContent} from '../../client/src/storeData';

// This file sits two directories below the repository root, which is also
// `bun test`'s cwd — the `Run:` lines and the fixture reads are anchored there.
const ROOT = join(import.meta.dir, '..', '..');

/** A child `bun test` over a whole suite needs far more than Bun's 5 s. */
const RUN_LINE_TIMEOUT_MS = 600_000;

/** The seven readings `client/src/todoTags.ts` produces. */
type TagsModule = {
  parseTags: (text: string) => string[];
  normalizeTags: (text: string) => string;
  isNormalizedTags: (tags: string) => boolean;
  tagsInUse: (table: Record<string, {tags?: string}>) => string[];
  countTagged: (table: Record<string, {tags?: string}>) => number;
  activeTag: (value: unknown, inUse: readonly string[]) => string;
  hasTag: (tags: string | undefined, tag: string) => boolean;
};

/** The module M3 and M6 declare. See this file's header on the specifier. */
const tagsModule = async (): Promise<TagsModule> =>
  (await import(resolve(ROOT, 'client/src/todoTags.ts'))) as TagsModule;

const readJson = (...parts: string[]): TodosContent =>
  JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8')) as TodosContent;

/** A store's content as plain JSON, the shape a checked-in file parses to. */
const snapshot = (store: {getContent: () => unknown}): TodosContent =>
  JSON.parse(JSON.stringify(store.getContent())) as TodosContent;

/** A structural copy, so a later mutation of the store cannot reach it. */
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** The sorted cell ids row `id` of `todos` holds in `content`. */
const cellsOf = (content: TodosContent, id: string): string[] =>
  Object.keys(
    (content[0] as Record<string, Record<string, Record<string, unknown>>>)
      .todos?.[id] ?? {},
  ).sort();

/** The seed of M1, M4 and M5, as `state-exams/seeds/two-open-todos.json`. */
const TWO_OPEN_TODOS = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
] as unknown as TodosContent;

/** The state M1 names: row `1` carrying `tags: 'home,urgent'`, nothing else moved. */
const TWO_TODOS_SECOND_TAGGED = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false, tags: 'home,urgent'},
    },
  },
  {},
] as unknown as TodosContent;

/** The expected file leg (a)'s exam compares against, and M1 pins the content of. */
const EXPECTED_PATH = 'state-exams/expected/two-todos-second-tagged.json';

// --- Leg (a) [M1]: the one state exam of the file ----------------------------

// Tagging the second of two open todos reaches exactly the expected state, and
// the page over that state says so out loud: one `#taggedCount` reading
// `1 tagged`, one `#doneCount` still reading `0 of 2 done` — tagging ticks
// nothing — and the two rows still there. The mutant that drops the `tags` cell
// from the expected state is killed, so an exam that never looked at that cell
// could not have passed.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => sd.createTodosStore(),
  action: (store) => sd.setTodoTags(store, '1', 'home, urgent'),
  expected: EXPECTED_PATH,
  view: [
    {selector: '#taggedCount', count: 1, text: '1 tagged'},
    {selector: '#doneCount', count: 1, text: '0 of 2 done'},
    {selector: '#todoList li', count: 2},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'tags', absent: true}],
});

// Leg (a) [M1]: the expected file the exam above names parses to exactly the
// literal M1 spells, so a file differing in any cell, id, order or table fails
// naming it.
test('leg (a) [M1] two-todos-second-tagged.json holds exactly the state of M1', () => {
  expect(readJson(EXPECTED_PATH)).toEqual(TWO_TODOS_SECOND_TAGGED);
});

// --- Leg (b) [M2]: the tags cell, the tag value, and the schema read back ----

test('leg (b) [M2] TABLES_SCHEMA.todos.tags is exactly {type: "string"} with no default, and trash.tags equals it', () => {
  const schema = sd.TABLES_SCHEMA as unknown as Record<
    string,
    Record<string, Record<string, unknown>>
  >;
  const tags = schema.todos?.tags;

  expect(tags).toEqual({type: 'string'});
  expect(Object.keys(tags ?? {}).sort()).toEqual(['type']);
  // Spelled as its own assertion because it is the whole reason the cell has
  // this shape: a `default` is materialised into every row's `getContent()`,
  // and `toEqual` above would sit still for a `default: undefined`.
  expect(Object.hasOwn(tags ?? {}, 'default')).toBe(false);
  expect(schema.trash?.tags).toEqual(tags);
});

test('leg (b) [M2] VALUES_SCHEMA.tag is exactly {type: "string"} with no default key', () => {
  const values = sd.VALUES_SCHEMA as unknown as Record<
    string,
    Record<string, unknown>
  >;
  const tag = values.tag;

  expect(tag).toEqual({type: 'string'});
  expect(Object.keys(tag ?? {}).sort()).toEqual(['type']);
  expect(Object.hasOwn(tag ?? {}, 'default')).toBe(false);
});

test('leg (b) [M2] a fresh store reads its values schema back as exactly {filter, tag}', () => {
  expect(JSON.parse(sd.createTodosStore().getValuesSchemaJson())).toEqual({
    filter: {type: 'string'},
    tag: {type: 'string'},
  });
});

// --- Leg (c) [M3]: parseTags, normalizeTags, isNormalizedTags ----------------

const PARSE_CASES: [string, string[]][] = [
  ['home, urgent', ['home', 'urgent']],
  [' home, urgent ,,home, ', ['home', 'urgent']],
  ['', []],
  [' , ', []],
  ['a,b,a,b', ['a', 'b']],
];

for (const [input, want] of PARSE_CASES) {
  test(`leg (c) [M3] parseTags(${JSON.stringify(input)}) is ${JSON.stringify(want)}`, async () => {
    const {parseTags} = await tagsModule();

    expect(parseTags(input)).toEqual(want);
  });
}

test("leg (c) [M3] normalizeTags('home, urgent') is 'home,urgent'", async () => {
  const {normalizeTags} = await tagsModule();

  expect(normalizeTags('home, urgent')).toBe('home,urgent');
});

const NORMALIZED_CASES: [string, boolean][] = [
  ['home,urgent', true],
  ['home, urgent', false],
  ['', false],
  ['home,home', false],
];

for (const [input, want] of NORMALIZED_CASES) {
  test(`leg (c) [M3] isNormalizedTags(${JSON.stringify(input)}) is ${want}`, async () => {
    const {isNormalizedTags} = await tagsModule();

    expect(isNormalizedTags(input)).toBe(want);
  });
}

// --- Leg (d) [M4]: setTodoTags sets, clears, and leaves a missing id alone ---

test('leg (d) [M4] setTodoTags(store, "1", "home, urgent") reaches exactly the M1 literal', () => {
  expect(typeof sd.setTodoTags).toBe('function');

  const store = sd.createTodosStore(copy(TWO_OPEN_TODOS));
  sd.setTodoTags(store, '1', 'home, urgent');

  expect(snapshot(store)).toEqual(TWO_TODOS_SECOND_TAGGED);
});

test('leg (d) [M4] setTodoTags(store, "1", " , ") clears the cell rather than writing an empty string', () => {
  expect(typeof sd.setTodoTags).toBe('function');

  const store = sd.createTodosStore(copy(TWO_OPEN_TODOS));
  sd.setTodoTags(store, '1', 'home, urgent');
  sd.setTodoTags(store, '1', ' , ');
  const back = snapshot(store);

  expect(back).toEqual(TWO_OPEN_TODOS);
  // The cell is gone, not `''`: the row is byte for byte the row it was.
  expect(cellsOf(back, '1')).toEqual(['completed', 'text']);
});

test('leg (d) [M4] setTodoTags of an id todos does not hold leaves the content deep-equal to before', () => {
  expect(typeof sd.setTodoTags).toBe('function');

  const store = sd.createTodosStore(copy(TWO_OPEN_TODOS));

  const before = snapshot(store);
  sd.setTodoTags(store, '9', 'home');
  const after = snapshot(store);

  expect(after).toEqual(before);
});

// --- Leg (e) [M5]: setTagFilter writes one normalized tag, and only that -----

/** A store over the M1 literal, the state M5 measures every call from. */
const taggedStore = () => sd.createTodosStore(copy(TWO_TODOS_SECOND_TAGGED));

test("leg (e) [M5] setTagFilter(store, 'home') writes exactly {tag: 'home'} and moves no table", () => {
  expect(typeof sd.setTagFilter).toBe('function');

  const store = taggedStore();
  const tablesBefore = copy(store.getContent()[0]);

  sd.setTagFilter(store, 'home');

  expect(store.getContent()[1]).toEqual({tag: 'home'} as never);
  expect(store.getContent()[0]).toEqual(tablesBefore);
});

for (const refused of ['home,urgent', ' home', 'Home ']) {
  test(`leg (e) [M5] setTagFilter(store, ${JSON.stringify(refused)}) leaves the content deep-equal to before`, () => {
    expect(typeof sd.setTagFilter).toBe('function');

    const store = taggedStore();
    sd.setTagFilter(store, 'home');

    const before = snapshot(store);
    sd.setTagFilter(store, refused);
    const after = snapshot(store);

    // Only a single already-normalized tag is written, so a chosen filter is
    // neither replaced nor cleared by a string that is not one.
    expect(after).toEqual(before);
  });
}

test("leg (e) [M5] setTagFilter(store, '') leaves the values exactly {}", () => {
  expect(typeof sd.setTagFilter).toBe('function');

  const store = taggedStore();
  sd.setTagFilter(store, 'home');
  sd.setTagFilter(store, '');

  expect(store.getContent()[1]).toEqual({} as never);
});

test("leg (e) [M5] setTagFilter(store, 'gone') writes exactly {tag: 'gone'} — the value is not checked against the table", () => {
  expect(typeof sd.setTagFilter).toBe('function');

  const store = taggedStore();
  sd.setTagFilter(store, 'gone');

  expect(store.getContent()[1]).toEqual({tag: 'gone'} as never);
});

// --- Leg (f) [M6]: the four readings over the tables and rows M6 pins --------

/** The three-row table M6 measures `tagsInUse` and `countTagged` over. */
const M6_TABLE = {
  a: {tags: 'urgent,home'},
  b: {tags: 'home'},
  c: {text: 'x'},
} as unknown as Record<string, {tags?: string}>;

test("leg (f) [M6] tagsInUse over the three-row table is exactly ['home', 'urgent']", async () => {
  const {tagsInUse} = await tagsModule();

  expect(tagsInUse(M6_TABLE)).toEqual(['home', 'urgent']);
});

test('leg (f) [M6] countTagged over the three-row table is 2', async () => {
  const {countTagged} = await tagsModule();

  expect(countTagged(M6_TABLE)).toBe(2);
});

test('leg (f) [M6] tagsInUse over the empty table is exactly [] and countTagged is 0', async () => {
  const {countTagged, tagsInUse} = await tagsModule();

  expect(tagsInUse({})).toEqual([]);
  expect(countTagged({})).toBe(0);
});

const ACTIVE_TAG_CASES: [unknown, readonly string[], string][] = [
  ['home', ['home', 'urgent'], 'home'],
  ['gone', ['home'], ''],
  [undefined, ['home'], ''],
];

for (const [value, inUse, want] of ACTIVE_TAG_CASES) {
  test(`leg (f) [M6] activeTag(${JSON.stringify(value)}, ${JSON.stringify(inUse)}) is ${JSON.stringify(want)}`, async () => {
    const {activeTag} = await tagsModule();

    expect(activeTag(value, inUse)).toBe(want);
  });
}

const HAS_TAG_CASES: [string | undefined, string, boolean][] = [
  ['home,urgent', 'home', true],
  ['home,urgent', 'ho', false],
  [undefined, '', true],
  [undefined, 'home', false],
];

for (const [tags, tag, want] of HAS_TAG_CASES) {
  test(`leg (f) [M6] hasTag(${JSON.stringify(tags)}, ${JSON.stringify(tag)}) is ${want}`, async () => {
    const {hasTag} = await tagsModule();

    expect(hasTag(tags, tag)).toBe(want);
  });
}

// --- Leg (g) [M7]: the appended invariant, found by its message --------------

/** M7's message, character for character. */
const TAGS_MESSAGE =
  'tags are absent or a comma-joined list of distinct non-empty tags';

/** M7's five rows, each against the verdict it pins. */
const INVARIANT_CASES: [Record<string, string | number | boolean>, boolean][] = [
  [{text: 'x', completed: false}, true],
  [{text: 'x', completed: false, tags: 'home,urgent'}, true],
  [{text: 'x', completed: false, tags: ''}, false],
  [{text: 'x', completed: false, tags: 'home, urgent'}, false],
  [{text: 'x', completed: false, tags: 'home,home'}, false],
];

test('leg (g) [M7] INVARIANTS carries a todos entry with the pinned tags message', () => {
  // Found by message and never by index: the entry is appended, and an index
  // here would be a second pin on where in the list it landed.
  const entry = sd.INVARIANTS.find(
    (invariant) => invariant.message === TAGS_MESSAGE,
  );

  expect(entry).toBeDefined();
  expect(entry!.table).toBe('todos');
});

for (const [row, want] of INVARIANT_CASES) {
  test(`leg (g) [M7] the tags invariant over ${JSON.stringify(row)} is ${want}`, () => {
    const entry = sd.INVARIANTS.find(
      (invariant) => invariant.message === TAGS_MESSAGE,
    );

    expect(entry).toBeDefined();
    expect(entry!.predicate(row, '0')).toBe(want);
  });
}

test("leg (g) [M7] INVARIANTS[0].message is still 'a completed todo has non-empty text'", () => {
  // The linter's own exam reads `INVARIANTS[0]`, so the new entry is appended
  // and never inserted.
  expect(sd.INVARIANTS[0].message).toBe('a completed todo has non-empty text');
});

// --- Leg (h) [M8]: the static render, and the counter's own span unchanged ---

test('leg (h) [M8] renderStatic over the M1 literal paints #taggedCount once reading 1 tagged', () => {
  expect(
    assertView(renderStatic(TWO_TODOS_SECOND_TAGGED), [
      {selector: '#taggedCount', count: 1, text: '1 tagged'},
    ]),
  ).toEqual([]);
});

test('leg (h) [M8] renderStatic over the two-open content paints #taggedCount once reading 0 tagged', () => {
  expect(
    assertView(renderStatic(TWO_OPEN_TODOS), [
      {selector: '#taggedCount', count: 1, text: '0 tagged'},
    ]),
  ).toEqual([]);
});

test('leg (h) [M8] both markups still carry the doneCount span byte for byte', () => {
  // The tagged total is its own element beside this span, never a change to it:
  // `packages/tinyapp-lint/test/lint-cli.test.ts` pins this span verbatim.
  const SPAN = '<span id="doneCount">0 of 2 done</span>';

  expect(renderStatic(TWO_TODOS_SECOND_TAGGED)).toContain(SPAN);
  expect(renderStatic(TWO_OPEN_TODOS)).toContain(SPAN);
});

// --- Leg (i) [M9]: every checked-in state still loads to itself --------------

// One test per `.json` file found on the tree, so the name of a file that stops
// round-tripping is the name of the failing test. The list is read rather than
// pinned: the count of seeds and expected states moves with this task and with
// the two running beside it.
for (const kind of ['seeds', 'expected'] as const) {
  for (const name of readdirSync(join(ROOT, 'state-exams', kind)).sort()) {
    if (!name.endsWith('.json')) {
      continue;
    }
    test(`leg (i) [M9] state-exams/${kind}/${name} loads through createTodosStore to its own content`, () => {
      const content = readJson('state-exams', kind, name);

      expect(snapshot(sd.createTodosStore(content))).toEqual(content);
    });
  }
}

// This task's own expected file is asserted by name as well as by the walk
// above, so a run in which it is simply missing from the directory says so here
// rather than quietly listing one file fewer.
test(`leg (i) [M9] ${EXPECTED_PATH} loads through createTodosStore to its own content`, () => {
  const content = readJson(EXPECTED_PATH);

  expect(snapshot(sd.createTodosStore(content))).toEqual(content);
});

// --- Legs (j)–(k) [M10]: the two `Run:` lines, run verbatim ------------------

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

test(
  "leg (j) [M10] the Run line `bun test` over the linter's four test files exits 0",
  () => {
    expectExit0(
      'bun test packages/tinyapp-lint/test/lint-cli.test.ts packages/tinyapp-lint/test/invariants.test.ts packages/tinyapp-lint/test/reachability.test.ts packages/tinyapp-lint/test/views.test.ts',
    );
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);

test(
  'leg (k) [M10] the Run line `bun test` over the done-count, filter-bar and set-filter exams exits 0',
  () => {
    expectExit0(
      'bun test tests/state-exams/done-count.test.ts tests/state-exams/filter-bar.test.ts tests/state-exams/set-filter.test.ts',
    );
  },
  {timeout: RUN_LINE_TIMEOUT_MS},
);
