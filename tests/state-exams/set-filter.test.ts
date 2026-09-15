/**
 * The exam for Task 1 — "The filter lives in the store's values — a values
 * schema and `setFilter`".
 *
 * One `stateExam` call (leg f), because a file's whole state exam is the single
 * `stateExam` in it and a second `Bun.build` in one `bun test` process fails.
 * Everything a state exam cannot express is an ordinary `bun:test` block beside
 * it: the three accepted names (a), the two edges of the guard (b, c), the
 * values schema itself (d), the snapshot files this task must leave alone (e),
 * and each of the six `Run:` lines that read the linter's own four exams
 * (g)–(l), executed as the Proof spells them.
 *
 * Two readings this file makes, written down because the Proof leaves them to
 * the reader:
 *
 *   - Legs (a)–(c) seed from the *parsed* seed file and compare the tables half
 *     against the store's own snapshot taken immediately before the call, never
 *     against a hand-written row. A sibling run adding a cell to a `todos` row
 *     must not turn this exam red.
 *   - Leg (e) is the first `Run:` line, `git diff --quiet $ULTRA_BASE -- …`.
 *     `ULTRA_BASE` is not in this process's environment — the driver sets it
 *     for the Run lines — and `git diff --quiet -- <paths>` with the sha
 *     expanded to nothing compares the worktree to the index, which would pass
 *     over an edit that had been committed. So the leg is encoded as the claim
 *     itself, with no git in it: each of the seven snapshot files that exist at
 *     BASE is byte-identical to its BASE bytes, and each loads back to itself
 *     through `createTodosStore` — which is exactly what a `default` on the
 *     values entry would break.
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import {
  createTodosStore,
  setFilter,
  VALUES_SCHEMA,
  type TodosContent,
  type TodosStore,
} from '../../client/src/storeData';

/** This file sits two directories below the repository root, which is `bun test`'s cwd. */
const ROOT = join(import.meta.dir, '..', '..');

/** A child `bun test` needs more than bun's default per-test 5 s. */
const SPAWN_TIMEOUT_MS = 120_000;

/** The seed of M1, as the file itself parses — never a hand-written row. */
const SEED_PATH = 'state-exams/seeds/two-todos-one-done.json';
const SEED = JSON.parse(
  readFileSync(join(ROOT, SEED_PATH), 'utf8'),
) as TodosContent;

/** The three names the guard accepts, spelled as the plan spells them. */
const FILTER_NAMES = ['all', 'open', 'done'] as const;

/** A fresh copy of the seed, so no test hands its store to another. */
const seeded = (): TodosStore =>
  createTodosStore(JSON.parse(JSON.stringify(SEED)) as TodosContent);

/** A store's content, detached from the store that holds it. */
const snapshot = (store: TodosStore): [Record<string, unknown>, Record<string, unknown>] =>
  JSON.parse(JSON.stringify(store.getContent()));

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

// --- M1: each of the three names is kept, and only the values half moves -----

// Leg (a) [M1]: on a store seeded with the content of the seed file,
// `setFilter(store, name)` leaves `getContent()[1]` exactly `{filter: name}`
// and `getContent()[0]` deep-equal to the tables snapshotted immediately
// before the call.
for (const name of FILTER_NAMES) {
  test(`leg (a) [M1] setFilter(store, '${name}') leaves the values half exactly {filter: '${name}'} and the tables half untouched`, () => {
    const store = seeded();
    const before = snapshot(store);

    setFilter(store, name);

    const after = store.getContent();
    expect(after[1]).toEqual({filter: name});
    expect(after[0]).toEqual(before[0]);
    expect(store.getValue('filter')).toBe(name);
  });
}

// --- M2: a name the app does not know changes nothing at all -----------------

// Leg (b) [M2]: on the fresh seed, `'bogus'` and then `'Open'` each leave
// `getContent()` deep-equal to the snapshot taken immediately before the call,
// `getValue('filter')` `undefined` and the values half `{}`.
test("leg (b) [M2] on the fresh seed, 'bogus' and 'Open' each leave the content deep-equal to the snapshot before the call", () => {
  const store = seeded();

  const beforeBogus = snapshot(store);
  setFilter(store, 'bogus');
  expect(store.getContent()).toEqual(beforeBogus);
  expect(store.getValue('filter')).toBe(undefined);
  expect(store.getContent()[1]).toEqual({});

  const beforeOpen = snapshot(store);
  setFilter(store, 'Open');
  expect(store.getContent()).toEqual(beforeOpen);
  expect(store.getValue('filter')).toBe(undefined);
  expect(store.getContent()[1]).toEqual({});
});

// Leg (c) [M2]: after `setFilter(store, 'open')`, a string that is not one of
// the three leaves the content deep-equal to the snapshot taken just before it
// and the chosen filter still `'open'` — a refused name never clears a choice.
test("leg (c) [M2] after setFilter(store, 'open'), 'bogus' leaves the content deep-equal and the filter still 'open'", () => {
  const store = seeded();
  setFilter(store, 'open');

  const before = snapshot(store);
  setFilter(store, 'bogus');

  expect(store.getContent()).toEqual(before);
  expect(store.getValue('filter')).toBe('open');
  expect(store.getContent()[1]).toEqual({filter: 'open'});
});

// --- M3: the values schema, and the snapshot files it must not disturb -------

// Leg (d) [M3]: `VALUES_SCHEMA.filter` is exactly `{type: 'string'}` with no
// `default` key, the store's own values schema reads back as exactly
// `{filter: {type: 'string'}}`, and a fresh store carries no filter.
test('leg (d) [M3] VALUES_SCHEMA.filter is exactly {type: "string"} with no default, and a fresh store has no filter', () => {
  expect(VALUES_SCHEMA.filter).toEqual({type: 'string'});
  expect('default' in VALUES_SCHEMA.filter).toBe(false);

  expect(JSON.parse(createTodosStore().getValuesSchemaJson())).toEqual({
    filter: {type: 'string'},
  });
  expect(createTodosStore().getValue('filter')).toBe(undefined);
});

/**
 * The seven snapshot files that exist at BASE, with their BASE bytes.
 *
 * Byte-identity is what the first `Run:` line asserts of them; see this file's
 * header for why it is asserted here without git.
 */
const SNAPSHOTS_AT_BASE: Record<string, string> = {
  'state-exams/seeds/empty.json': '[{}, {}]\n',
  'state-exams/seeds/two-open-todos.json':
    '[{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": false}}}, {}]\n',
  'state-exams/seeds/two-todos-one-done.json':
    '[{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": true}}}, {}]\n',
  'state-exams/expected/one-open-todo.json':
    '[{"todos": {"0": {"text": "buy milk", "completed": false}}}, {}]\n',
  'state-exams/expected/still-empty.json': '[{}, {}]\n',
  'state-exams/expected/two-todos-first-done.json':
    '[{"todos": {"0": {"text": "buy milk", "completed": true}, "1": {"text": "walk the dog", "completed": false}}}, {}]\n',
  'state-exams/expected/two-todos-one-done.json':
    '[{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": true}}}, {}]\n',
};

// Leg (e) [M3], the first `Run:` line: the seven snapshot files that exist at
// BASE are byte-identical to BASE — and each still loads to itself through the
// store, which is what a `default` on the values entry would break.
test('leg (e) [M3] the seven snapshot files that exist at BASE are byte-identical to BASE and load to themselves', () => {
  for (const [path, bytes] of Object.entries(SNAPSHOTS_AT_BASE)) {
    expect(readFileSync(join(ROOT, path), 'utf8')).toBe(bytes);

    const content = JSON.parse(bytes) as TodosContent;
    expect(createTodosStore(content).getContent()).toEqual(content);
  }
});

// --- M5: the linter walks `setFilter`, and its own exams read the tree -------

// Leg (g) [M5], the second `Run:` line.
test("leg (g) [M5] the Run line `grep -q \"toContain('setFilter')\" packages/tinyapp-lint/test/lint-cli.test.ts` exits 0", () => {
  expect(
    runLine(
      `grep -q "toContain('setFilter')" packages/tinyapp-lint/test/lint-cli.test.ts`,
    ),
  ).toBe(0);
});

// Leg (h) [M5], the third `Run:` line.
test("leg (h) [M5] the Run line `grep -q \"toContain('setFilter')\" packages/tinyapp-lint/test/reachability.test.ts` exits 0", () => {
  expect(
    runLine(
      `grep -q "toContain('setFilter')" packages/tinyapp-lint/test/reachability.test.ts`,
    ),
  ).toBe(0);
});

// Leg (i) [M5], the fourth `Run:` line: the frozen callback list occurs in none
// of the four files — this is what fails when a pinned list survives.
test('leg (i) [M5] the frozen list text occurs zero times across the linter`s four exams', () => {
  expect(
    runLine(
      `test "$(cat packages/tinyapp-lint/test/lint-cli.test.ts packages/tinyapp-lint/test/views.test.ts packages/tinyapp-lint/test/invariants.test.ts packages/tinyapp-lint/test/reachability.test.ts | grep -c 'deleteTodo or setTodoCompleted')" -eq 0`,
    ),
  ).toBe(0);
});

// Leg (j) [M5], the fifth `Run:` line: the summary regex reads the counts.
test("leg (j) [M5] the Run line `grep -qF '[0-9]+ snapshots and [0-9]+ exams' packages/tinyapp-lint/test/lint-cli.test.ts` exits 0", () => {
  expect(
    runLine(
      `grep -qF '[0-9]+ snapshots and [0-9]+ exams' packages/tinyapp-lint/test/lint-cli.test.ts`,
    ),
  ).toBe(0);
});

// Leg (k) [M5], the sixth `Run:` line: none of BASE's four exact count pins
// survives in any of the four files.
test('leg (k) [M5] toHaveLength(7), (6), (4) and (3) occur zero times across the linter`s four exams', () => {
  expect(
    runLine(
      String.raw`test "$(cat packages/tinyapp-lint/test/lint-cli.test.ts packages/tinyapp-lint/test/views.test.ts packages/tinyapp-lint/test/invariants.test.ts packages/tinyapp-lint/test/reachability.test.ts | grep -cE 'toHaveLength\((7|6|4|3)\)')" -eq 0`,
    ),
  ).toBe(0);
});

// Leg (l) [M5], the seventh `Run:` line: the four linter exams exit 0 over this
// task's tree, so the lists they compute agree with the lists the linter builds.
test(
  'leg (l) [M5] `bun test` over the linter`s four exams exits 0',
  () => {
    expect(
      runLine(
        'bun test packages/tinyapp-lint/test/lint-cli.test.ts packages/tinyapp-lint/test/views.test.ts packages/tinyapp-lint/test/invariants.test.ts packages/tinyapp-lint/test/reachability.test.ts',
      ),
    ).toBe(0);
  },
  SPAWN_TIMEOUT_MS,
);

// --- M4: the one state exam of this file -------------------------------------

// Leg (f) [M4]: over the seed of M1, a refused name reaches exactly the content
// of `state-exams/expected/two-todos-one-done.json`, the page on that state
// shows exactly two rows and reads `1 of 2 done`, and unticking row 1 of the
// expected state would have been noticed.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-todos-one-done.json',
  store: () => createTodosStore(),
  action: (store) => {
    setFilter(store, 'bogus');
  },
  expected: 'state-exams/expected/two-todos-one-done.json',
  view: [
    {selector: '.todoItem', count: 2},
    {selector: '#doneCount', count: 1, text: '1 of 2 done'},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'completed', value: false}],
});
