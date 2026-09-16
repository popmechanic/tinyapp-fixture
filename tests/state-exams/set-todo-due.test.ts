/**
 * Exam for Task 1 — "The due cell — schema, callback, invariant, and the pins
 * they move".
 *
 * One test per Proof leg, named for its leg and for the Machine clause it comes
 * from — and, where a leg says "one assertion per value" or "one assertion per
 * row", one test per value and per row so that a red run names the case:
 *
 *   (a) [M1] `TABLES_SCHEMA.todos.due` is exactly `{type: 'string'}` with no
 *            `default`, and a seed that carries no `due` round-trips through
 *            `createTodosStore(seed).getContent()` unchanged;
 *   (b) [M2] `setTodoDue` sets a valid date, clears the cell on `''`, refuses
 *            `'2025-13-45'` and `'soon'`, and returns `undefined` every time;
 *   (c) [M3] `isIsoDate` over the seven pinned values;
 *   (d) [M4] `isOverdue` over the six pinned rows at `2026-01-01T00:00:00Z`;
 *   (e) [M5] the `INVARIANTS` entry carrying the pinned message, and the
 *            Proof's lint `Run:` line run verbatim;
 *   (f) [M6] `state-exams/expected/two-todos-second-due.json` parses to exactly
 *            the M6 literal, and the state exam itself;
 *   (g) [M7] the two `bun test` `Run:` lines, and `done-count.test.ts`'s own
 *            source pinning the sorted cells `['completed', 'due', 'text']`.
 *
 * Three readings this file makes, written down because they are choices:
 *
 *   - `setTodoDue` and the whole `client/src/overdue.ts` module are reached
 *     with a computed-specifier `import()` inside each test body rather than a
 *     static import or a top-level `await`. That is the precedent
 *     `packages/tinyapp-lint/test/invariants.test.ts` set in this repository,
 *     and it is load-bearing: a static import of a module — or of a named
 *     export — that does not exist yet fails the whole file at load, so every
 *     leg would then report that one missing import instead of the thing it is
 *     itself about. `createTodosStore`, `TABLES_SCHEMA` and `INVARIANTS` do
 *     exist at BASE and are imported statically, which is also what keeps this
 *     file importing from `client/src` at all.
 *   - Leg (e)'s lint line and leg (g)'s two `bun test` lines are run verbatim
 *     through `bash -c` from the repository root, so the ordering leg (e)
 *     spells out — capture the status, require it to be exactly 1, and only
 *     then grep — is the line's own rather than something this exam re-states.
 *   - Nothing here pins a sibling plan's surface: no count of exams or
 *     snapshots, no callback list, no invariant count, no key set of
 *     `TABLES_SCHEMA` itself. The only key sets pinned are this plan's own
 *     `todos` cells and the shape of the `due` cell schema.
 *
 * `dateOf` is named under Produces but by no leg; it gets one small test
 * labelled `[Produces]` against the definition the task's Context gives it, so
 * a later task importing it is not resting on an unexamined name.
 */

import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

import {expect, test} from 'bun:test';

import {stateExam} from 'tinyapp-exam';

import {
  createTodosStore,
  INVARIANTS,
  TABLES_SCHEMA,
  type TodosContent,
  type TodosStore,
} from '../../client/src/storeData';

// This file sits two directories below the repository root, which is also
// `bun test`'s cwd — the `Run:` lines and the fixture reads are anchored there.
const ROOT = resolve(import.meta.dir, '..', '..');

/** A child `bun` process needs more than Bun's default per-test 5 s. */
const SPAWN_TIMEOUT_MS = 300_000;

/** `setTodoDue` as the task's Produces spells it. */
type SetTodoDue = (store: TodosStore, id: string, due: string) => void;

/** The pure functions `client/src/overdue.ts` produces. */
type OverdueModule = {
  isIsoDate: (value: string) => boolean;
  isOverdue: (row: {completed?: boolean; due?: string}, now: Date) => boolean;
  dateOf: (now: Date) => string;
};

/** The store module, for the export M2 adds to it. See this file's header. */
const storeModule = async (): Promise<{setTodoDue: SetTodoDue}> =>
  (await import(resolve(ROOT, 'client/src/storeData.ts'))) as {
    setTodoDue: SetTodoDue;
  };

/** The sibling module M3 and M4 declare. See this file's header. */
const overdueModule = async (): Promise<OverdueModule> =>
  (await import(resolve(ROOT, 'client/src/overdue.ts'))) as OverdueModule;

/** One `Run:` line, run from the repository root: its status and its output. */
const run = (line: string): {code: number; out: string} => {
  const spawned = Bun.spawnSync({
    cmd: ['bash', '-c', line],
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return {
    code: spawned.exitCode,
    out: `${spawned.stdout.toString()}${spawned.stderr.toString()}`,
  };
};

/** `run`, with the output printed when the line did not exit 0. */
const statusOf = (line: string): number => {
  const {code, out} = run(line);
  if (code !== 0) {
    console.log(`$ ${line}\n${out}`);
  }
  return code;
};

const readJson = (...parts: string[]): unknown =>
  JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8'));

/** A fresh copy of `state-exams/seeds/two-open-todos.json`'s content. */
const seedContent = (): TodosContent =>
  readJson('state-exams', 'seeds', 'two-open-todos.json') as TodosContent;

/** Anything, read back as a plain record. */
const keysOf = (value: unknown): string[] =>
  Object.keys(value as Record<string, unknown>).sort();

/** A structural copy, so a later mutation of the store cannot reach it. */
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// --- (a) [M1]: the cell with no default, and a seed that keeps its shape -----

test('leg (a) [M1] TABLES_SCHEMA.todos.due is exactly {type: `string`} with no default key', () => {
  const due = (TABLES_SCHEMA.todos as Record<string, unknown>).due;

  expect(due).toEqual({type: 'string'} as unknown as typeof due);
  // Spelled out as well as deep-equalled: a `default: undefined` would satisfy
  // `toEqual` above, and M1 is precisely about the absent default.
  expect(keysOf(due)).toEqual(['type']);
  expect(Object.hasOwn(due as object, 'default')).toBe(false);
});

test('leg (a) [M1] createTodosStore over a seed with no due cell round-trips to exactly that seed', () => {
  const content = createTodosStore([
    {todos: {'0': {text: 'buy milk', completed: false}}},
    {},
  ] as TodosContent).getContent();

  expect(content).toEqual([
    {todos: {'0': {text: 'buy milk', completed: false}}},
    {},
  ] as unknown as typeof content);
  // No `due` cell appears: the schema materialises nothing into a seeded row.
  expect(keysOf((content[0] as Record<string, any>).todos['0'])).toEqual([
    'completed',
    'text',
  ]);
});

// --- (b) [M2]: set, clear, refuse — and `undefined` every time ---------------

test('leg (b) [M2] setTodoDue sets a valid date on the row it names, returning undefined', async () => {
  const {setTodoDue} = await storeModule();
  expect(typeof setTodoDue).toBe('function');

  const store = createTodosStore(seedContent());

  expect(setTodoDue(store, '0', '2025-12-31')).toBeUndefined();
  expect((store as any).getCell('todos', '0', 'due')).toBe('2025-12-31');
  expect((store as any).getRow('todos', '0')).toEqual({
    text: 'buy milk',
    completed: false,
    due: '2025-12-31',
  });
  // The other row was not touched.
  expect((store as any).getRow('todos', '1')).toEqual({
    text: 'walk the dog',
    completed: false,
  });
});

test('leg (b) [M2] setTodoDue with the empty string removes the cell, so the row has no due key', async () => {
  const {setTodoDue} = await storeModule();
  const store = createTodosStore(seedContent());

  setTodoDue(store, '0', '2025-12-31');
  expect(setTodoDue(store, '0', '')).toBeUndefined();

  const row = (store as any).getRow('todos', '0') as Record<string, unknown>;
  expect(Object.hasOwn(row, 'due')).toBe(false);
  expect(keysOf(row)).toEqual(['completed', 'text']);
  expect(row).toEqual({text: 'buy milk', completed: false});
});

for (const bad of ['2025-13-45', 'soon']) {
  test(`leg (b) [M2] setTodoDue with ${JSON.stringify(bad)} leaves the content deep-equal to what it was, returning undefined`, async () => {
    const {setTodoDue} = await storeModule();
    const store = createTodosStore(seedContent());

    const before = copy(store.getContent());
    expect(setTodoDue(store, '0', bad)).toBeUndefined();
    expect(store.getContent()).toEqual(before);
  });
}

// --- (c) [M3]: `isIsoDate`, one assertion per value --------------------------

const ISO_DATE_CASES: [string, boolean][] = [
  ['2025-12-31', true],
  ['2024-02-29', true],
  ['', false],
  ['2025-13-45', false],
  ['2025-02-30', false],
  ['2025-1-5', false],
  ['soon', false],
];

for (const [value, want] of ISO_DATE_CASES) {
  test(`leg (c) [M3] isIsoDate(${JSON.stringify(value)}) is ${want}`, async () => {
    const {isIsoDate} = await overdueModule();
    expect(isIsoDate(value)).toBe(want);
  });
}

// --- (d) [M4]: `isOverdue` at the pinned instant, one assertion per row ------

/** The instant M4 measures every row at — the clock every exam here pins. */
const NOW = new Date('2026-01-01T00:00:00Z');

const OVERDUE_CASES: [{completed?: boolean; due?: string}, boolean][] = [
  [{completed: false, due: '2025-12-31'}, true],
  [{completed: true, due: '2025-12-31'}, false],
  [{completed: false, due: ''}, false],
  [{completed: false}, false],
  [{completed: false, due: '2026-01-01'}, false],
  [{completed: false, due: '2026-06-01'}, false],
];

for (const [row, want] of OVERDUE_CASES) {
  test(`leg (d) [M4] isOverdue(${JSON.stringify(row)}, 2026-01-01T00:00:00Z) is ${want}`, async () => {
    const {isOverdue} = await overdueModule();
    expect(isOverdue(row, NOW)).toBe(want);
  });
}

test('[Produces] dateOf(now) is the instant`s UTC calendar date', async () => {
  const {dateOf} = await overdueModule();
  expect(dateOf(NOW)).toBe('2026-01-01');
  expect(dateOf(new Date('2025-06-30T23:59:59Z'))).toBe('2025-06-30');
});

// --- (e) [M5]: the invariant, and the linter that rejects a bad seed ---------

/** M5's message, character for character. */
const DUE_MESSAGE = 'a due date is absent or a valid YYYY-MM-DD';

test('leg (e) [M5] INVARIANTS holds a todos entry with the pinned message and predicate', () => {
  const entry = INVARIANTS.find((invariant) => invariant.message === DUE_MESSAGE);

  expect(entry).toBeDefined();
  expect(entry!.table).toBe('todos');

  // A row with no `due` at all, and a row with a real date, both hold.
  expect(entry!.predicate({text: 'a', completed: false}, '0')).toBe(true);
  expect(
    entry!.predicate({text: 'a', completed: false, due: '2025-12-31'}, '0'),
  ).toBe(true);

  // Each of M5's three bad cells breaks it.
  expect(entry!.predicate({text: 'a', completed: false, due: ''}, '0')).toBe(
    false,
  );
  expect(
    entry!.predicate({text: 'a', completed: false, due: '2025-13-45'}, '0'),
  ).toBe(false);
  expect(entry!.predicate({text: 'a', completed: false, due: 'soon'}, '0')).toBe(
    false,
  );
});

/**
 * The Proof's lint `Run:` line, character for character.
 *
 * `String.raw` because the line spells `printf '%s\n'`: in an ordinary template
 * literal that `\n` would reach `bash` as a real newline.
 */
const LINT_RUN = String.raw`d=$(mktemp -d state-exams/lint-tmp-XXXXXX); mkdir "$d/seeds"; printf '%s' '[{"todos":{"0":{"text":"a","completed":false,"due":"2025-13-45"}}},{}]' > "$d/seeds/bad.json"; out=$(bun run lint:state --seeds "$d/seeds" --expected "$d/none" --exams "$d/none" 2>&1); code=$?; rm -rf "$d"; test "$code" -eq 1 && printf '%s\n' "$out" | grep -q 'todos/0: breaks the invariant "a due date is absent or a valid YYYY-MM-DD"'`;

test(
  'leg (e) [M5] the lint Run line — one seed with a bad due date exits 1 and prints the pinned finding',
  () => {
    expect(statusOf(LINT_RUN)).toBe(0);
  },
  SPAWN_TIMEOUT_MS,
);

// --- (f) [M6]: the expected state, and the exam that reaches it --------------

test('leg (f) [M6] state-exams/expected/two-todos-second-due.json parses to exactly the M6 literal', () => {
  expect(
    readJson('state-exams', 'expected', 'two-todos-second-due.json'),
  ).toEqual([
    {
      todos: {
        '0': {text: 'buy milk', completed: false},
        '1': {text: 'walk the dog', completed: false, due: '2025-06-30'},
      },
    },
    {},
  ]);
});

// --- (g) [M7]: the pins the new cell, callback and snapshot move -------------

test(
  'leg (g) [M7] the Run line `bun test tests/state-exams/done-count.test.ts` exits 0',
  () => {
    expect(statusOf('bun test tests/state-exams/done-count.test.ts')).toBe(0);
  },
  SPAWN_TIMEOUT_MS,
);

test(
  'leg (g) [M7] the Run line `bun test packages/tinyapp-lint` exits 0',
  () => {
    expect(statusOf('bun test packages/tinyapp-lint')).toBe(0);
  },
  SPAWN_TIMEOUT_MS,
);

test('leg (g) [M7] done-count.test.ts reads the todos cells of TABLES_SCHEMA and pins no exact list of them', () => {
  // Read with every run of whitespace removed, so the pin is graded on the
  // cells it names and not on how the file happens to be wrapped or quoted.
  const packed = readFileSync(
    join(ROOT, 'tests', 'state-exams', 'done-count.test.ts'),
    'utf8',
  ).replace(/\s+/g, '');

  expect(packed).toContain('Object.keys(TABLES_SCHEMA.todos)');
  // What this leg meant: the two-cell list this task's `due` outgrew is gone,
  // so the pin moved rather than grew. It no longer asks for the three-cell
  // list that replaced it — the trash task loosened the pin again, to a
  // `toContain` per cell, because a cell added concurrently makes any exact
  // list wrong at publish. `completed` and `text` are still named either way.
  expect(/\[['"]completed['"],['"]text['"],?\]/.test(packed)).toBe(false);
  expect(packed).toContain("toContain('completed')");
  expect(packed).toContain("toContain('text')");
});

// --- (f) [M6] again: the state exam itself -----------------------------------

// Giving the second of two open todos a due date reaches the expected state,
// and the page on that state still paints two open rows: the date is stored on
// row `1` without ticking it or adding a row.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: async (store) => {
    // The one deviation from M6's spelling, and only in how the callback is
    // reached: see this file's header on the computed-specifier import.
    const {setTodoDue} = await storeModule();
    setTodoDue(store, '1', '2025-06-30');
  },
  expected: 'state-exams/expected/two-todos-second-due.json',
  view: [
    {selector: '.todoItem', count: 2, text: 'walk the dog'},
    {selector: 'input#todo-1', unchecked: true},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'due', absent: true}],
});
