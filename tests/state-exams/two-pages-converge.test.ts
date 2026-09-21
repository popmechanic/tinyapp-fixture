/**
 * The exam for Task 4 — "The fixture's convergence exam, registered — two pages
 * add a todo and agree, the module's rows say so, a third page converges".
 *
 * The Claim: type `buy milk` into one page of the app and press Enter while a
 * second page is open on the same module; the second page shows it, the module
 * object's own rows hold it, a third page opened afterwards shows it too, and an
 * expected state that says otherwise fails the exam.
 *
 * What each clause asserts, and where it is answered below:
 *
 * M1. This file registers, through `convergenceExam`, one test named
 *     `convergence exam: two-pages-converge` with `server: 'server'`,
 *     `entry: 'client/index.html'`, `module: 'todos'`, the action
 *     `[{type: [{role: 'textbox', name: 'New todo'}, 'buy milk']},
 *       {key: [{role: 'textbox', name: 'New todo'}, 'Enter']}]`,
 *     `expected: 'state-exams/expected/default-todos-plus-buy-milk.json'`, the
 *     view `{selector: '#todoList li', count: 3}` and
 *     `{selector: '#todo-0', attr: {name: 'aria-label', value: 'buy milk'}}`,
 *     and the mutant `[{table: 'todos', row: '0', cell: 'completed', value:
 *     true}]`; and that view is the one `#todo-0` can satisfy, because
 *     `client/src/TodoItem.tsx` puts the row id and the accessible name on the
 *     same element.  → leg (a)
 * M2. The expected state is the file already on the tree, which parses to the
 *     persistence exam's own snapshot, reached from
 *     `state-exams/seeds/default-todos.json` by one `addTodo`; no file under
 *     `state-exams/` is created or changed; `bun run lint:state` exits 0.
 *     → leg (b)
 * M3. The exam is green under `bun test tests/state-exams/two-pages-converge.test.ts`
 *     on a machine with celld and a browser, and its evidence directory carries
 *     `walls.json` with `sync_ms` and `converge_ms` and `transitions.json` with
 *     at least two entries.  → leg (c)
 * M4. `README.md`'s `## State exams` section says a convergence exam starts
 *     celld itself and names `CELLD_BIN` beside `TINYAPP_BROWSER`; `AGENTS.md`'s
 *     `## Verification` section names the convergence exam as the way the
 *     two-client sync is checked, and its `Open the same room URL in two
 *     clients` sentence is gone.  → leg (d)
 *
 * Four readings this file makes, written down because a later session would
 * otherwise have to reconstruct them:
 *
 *   - The spec is a module-level `const` handed to `convergenceExam`, rather
 *     than an object literal written inside the call. Leg (a) asks for the
 *     registration "read back in-process", and the const is the only way a
 *     `bun:test` block in this file can read the very object the registration
 *     was made from; a literal inside the call could only be re-checked by
 *     reading this file's own source text, which proves nothing about what was
 *     registered. It is still one top-level `convergenceExam(…)` and nothing
 *     else done at module level, which is what the lint capture child needs.
 *   - The spec names two keys M1's list does not: `clock`, because
 *     `ConvergenceExamSpec` requires it and every other exam on the tree pins
 *     the same instant, and `assets`, because without it there is no action to
 *     perform. `client/index.html` opened unseeded and unflagged mounts its
 *     SQLite persister, and `App` shows `#loading` until that persister has
 *     loaded; with `/sqlite3.wasm` unserved the origin answers the page's own
 *     HTML for it, `getDb()` never resolves, and the document stays the
 *     spinner — measured here on 2026-09-17, where the action failed as `act:
 *     no element matches role=textbox name="New todo"`. The map is the one
 *     `tests/state-exams/added-todo-survives-reload.test.ts` already uses on
 *     this same entry.
 *   - M2's last sentence — `bun run lint:state` exits 0 — is the Proof's own
 *     second `Run:` line and is left to the driver that runs it. A verification
 *     proves its claim through imports and calls and does not re-run the
 *     linter; everything else M2 names is asserted in this process.
 *
 * The exam never skips. A machine with no celld binary (`CELLD_BIN`, else
 * `celld` on `PATH`) or no browser (`TINYAPP_BROWSER`, else
 * `/headless-shell/headless-shell`) is this exam's red, which is the rule every
 * state exam on the tree follows.
 */

import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {
  convergenceExam,
  examStem,
  runConvergenceExam,
  type ConvergenceExamSpec,
  type Snapshot,
} from 'tinyapp-exam';

// ---------------------------------------------------------------- the registration

/**
 * [M1] The spec, exactly as M1 spells it — the one thing this file registers.
 *
 * `server` is the repository's own `server/`, which `startCelld` copies; the
 * pages dial the module `todos` at `/sync/todos` on the runtime it starts.
 */
const SPEC: ConvergenceExamSpec = {
  clock: '2026-01-01T00:00:00Z',
  server: 'server',
  entry: 'client/index.html',
  assets: {
    '/sqlite3.wasm': 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm',
  },
  module: 'todos',
  action: [
    {type: [{role: 'textbox', name: 'New todo'}, 'buy milk']},
    {key: [{role: 'textbox', name: 'New todo'}, 'Enter']},
  ],
  expected: 'state-exams/expected/default-todos-plus-buy-milk.json',
  view: [
    {selector: '#todoList li', count: 3},
    {selector: '#todo-0', attr: {name: 'aria-label', value: 'buy milk'}},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: true}],
};

// [M1] [M3] The one top-level call of this file: two pages onto one real module
// object, `buy milk` typed into the box named `New todo` in the first and Enter
// pressed there, the second waited on until it agrees, the object's own content
// and rows read, and a third page opened afterwards that has to catch up from
// nothing at all.
convergenceExam(SPEC);

// ---------------------------------------------------------------- shared fixtures

/** This file sits two directories below the repository root. */
const ROOT = join(import.meta.dir, '..', '..');

/** How long one whole convergence run — a `celld dev`, a browser, three pages — is given. */
const RUN_TIMEOUT_MS = 300_000;

/** [M2] The snapshot the expected file must parse to, written out here. */
const PLUS_BUY_MILK: Snapshot = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'Learn TinyBase', completed: false},
      '2': {text: 'Build an app', completed: false},
    },
  },
  {},
];

/** The snapshot a path below the root parses to. */
const parse = (path: string): Snapshot =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as Snapshot;

/** What a JSON file under the evidence directory parses to. */
const parseEvidence = (dir: string, name: string): unknown =>
  JSON.parse(readFileSync(join(dir, name), 'utf8')) as unknown;

// ---------------------------------------------------------------- (a) [M1]

test('leg (a) [M1]: the registration is the one M1 spells, read back in this process', () => {
  // The name the registration above took: `convergence exam: ` and this file's
  // own stem, which is how a reader finds this exam's evidence directory.
  expect(examStem(Bun.main)).toBe('two-pages-converge');
  expect(`convergence exam: ${examStem(Bun.main)}`).toBe(
    'convergence exam: two-pages-converge',
  );

  // The server, the entry and the module.
  expect(SPEC.server).toBe('server');
  expect(SPEC.entry).toBe('client/index.html');
  expect(SPEC.module).toBe('todos');

  // And the one asset that entry needs before it renders anything but its
  // spinner — the map the persistence exam on this entry already carries.
  expect(SPEC.assets).toEqual({
    '/sqlite3.wasm': 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm',
  });

  // The two actions, in the order they are performed: the words typed into the
  // box named `New todo`, then Enter pressed in that same box.
  expect(SPEC.action).toEqual([
    {type: [{role: 'textbox', name: 'New todo'}, 'buy milk']},
    {key: [{role: 'textbox', name: 'New todo'}, 'Enter']},
  ]);

  // The expected path, and the mutant that must be told apart from it.
  expect(SPEC.expected).toBe(
    'state-exams/expected/default-todos-plus-buy-milk.json',
  );
  expect(SPEC.mutant).toEqual([
    {table: 'todos', row: '0', cell: 'completed', value: true},
  ]);

  // The two views, exactly: three list items, and `#todo-0` carrying `buy milk`
  // as its `aria-label`.
  expect(SPEC.view).toEqual([
    {selector: '#todoList li', count: 3},
    {selector: '#todo-0', attr: {name: 'aria-label', value: 'buy milk'}},
  ]);

  // And the second view reads what that element carries, never its text:
  // `assertView`'s `text` is `textContent.includes(...)`, and `#todo-0` is the
  // checkbox span, whose `textContent` is empty. A `text` assertion there could
  // not pass for any implementation, so its absence is part of the clause.
  const views = SPEC.view as unknown as Array<Record<string, unknown>>;
  expect(views).toHaveLength(2);
  expect(views[1]?.selector).toBe('#todo-0');
  expect('text' in (views[1] ?? {})).toBe(false);
  expect(views[1]?.attr).toEqual({name: 'aria-label', value: 'buy milk'});
});

// ---------------------------------------------------------------- (b) [M2]

test('leg (b) [M2]: the expected file is the persistence exam\'s own snapshot, and the seed is inside it', () => {
  // The file on the tree parses to exactly M2's literal — full equality, not
  // containment.
  expect(parse('state-exams/expected/default-todos-plus-buy-milk.json')).toEqual(
    PLUS_BUY_MILK,
  );

  // And rows `1` and `2` of it are the seed's rows `1` and `2`, read from the
  // seed rather than restated: the expected state is that seed plus one
  // `addTodo`, and nothing else.
  const seed = parse('state-exams/seeds/default-todos.json');
  const expectedRows = PLUS_BUY_MILK[0]?.todos ?? {};
  const seedRows = seed[0]?.todos ?? {};
  expect(expectedRows['1']).toEqual(seedRows['1']);
  expect(expectedRows['2']).toEqual(seedRows['2']);
  expect(seedRows['1']).toEqual({text: 'Learn TinyBase', completed: false});
  expect(seedRows['2']).toEqual({text: 'Build an app', completed: false});

  // The row `addTodo` gives the new todo is `0`, and it is the only row the
  // expected state adds to the seed.
  expect(Object.keys(expectedRows).sort()).toEqual(['0', '1', '2']);
  expect(Object.keys(seedRows).sort()).toEqual(['1', '2']);
  expect(expectedRows['0']).toEqual({text: 'buy milk', completed: false});
});

// ---------------------------------------------------------------- (c) [M3]

test(
  'leg (c) [M3]: the same spec run in-process is ok, and leaves the walls and the transitions of the session',
  async () => {
    // `ULTRA_RUN_DIR` for the call alone, so this run's evidence lands somewhere
    // this test can read and sweep rather than beside the driver's.
    const runDir = mkdtempSync(join(tmpdir(), 'two-pages-converge-green-'));
    try {
      const outcome = await runConvergenceExam(SPEC, {
        env: {...process.env, ULTRA_RUN_DIR: runDir},
      });

      // The verdict: three pages and the module object all at the expected
      // state, the view holding on the page that only watched, the mutant
      // killed. A red run's own sentence is what a reader needs to see here.
      if (!outcome.ok) {
        throw new Error(outcome.failure ?? 'convergence exam failed');
      }
      expect(outcome.ok).toBe(true);

      // The evidence went under the directory the call was given.
      expect(outcome.dir.startsWith(runDir)).toBe(true);

      // `walls.json` carries the two walls this species adds, both numbers.
      const walls = parseEvidence(outcome.dir, 'walls.json') as Record<
        string,
        unknown
      >;
      expect(typeof walls.sync_ms).toBe('number');
      expect(typeof walls.converge_ms).toBe('number');

      // And the session is on the record: at least the seed and the action.
      const transitions = parseEvidence(outcome.dir, 'transitions.json');
      expect(Array.isArray(transitions)).toBe(true);
      expect((transitions as unknown[]).length).toBeGreaterThanOrEqual(2);
    } finally {
      rmSync(runDir, {recursive: true, force: true});
    }
  },
  RUN_TIMEOUT_MS,
);

test(
  'leg (c) [M3]: an expected state that says otherwise fails the exam, naming the species',
  async () => {
    // One thing changed: the expected state is the one-row state the app never
    // reaches from its own default content.
    const runDir = mkdtempSync(join(tmpdir(), 'two-pages-converge-red-'));
    try {
      const outcome = await runConvergenceExam(
        {...SPEC, expected: 'state-exams/expected/one-open-todo.json'},
        {env: {...process.env, ULTRA_RUN_DIR: runDir}},
      );

      expect(outcome.ok).toBe(false);
      expect((outcome.failure ?? '').startsWith('convergence: ')).toBe(true);
    } finally {
      rmSync(runDir, {recursive: true, force: true});
    }
  },
  RUN_TIMEOUT_MS,
);
