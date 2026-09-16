/**
 * The exam for Task 2 — "Pinned todos first — the exam seeded from what Task 1
 * posted".
 *
 * A file's whole state exam is the single `stateExam({…})` in it, as
 * `tests/state-exams/delete-to-trash.test.ts` shows, so leg (a) is that one
 * call and every other leg is an ordinary `bun:test` block beside it: the
 * expected file's own content and the one seed path the file names (a), the
 * handshake's equality of post and expected file (b), the four orderings of
 * the static render (c)–(f), and the absent-post case of the harness (g).
 *
 * This file is unguarded, so it lands four directories below the repository
 * root: `ROOT` is `join(import.meta.dir, '..', '..', '..', '..')` and every
 * import of the app is `../../../../client/src/…`, while `seed` and `expected`
 * stay paths from the root, which is `bun test`'s cwd.
 *
 * Three readings this file makes, written down because they are choices:
 *
 *   - The seed is the constant `POSTED`, the file the driver writes from Task
 *     1's `state.reached` post, and it is the only seed path this file names.
 *     There is deliberately no fallback to a checked-in fixture: an absent post
 *     is the handshake's own `absent` case and must stay visible as a red
 *     naming that path, which is what leg (g) pins on the harness itself.
 *   - Everything sits inside `describe.skipIf(!seeded)`, where `seeded` is the
 *     posted file being on the tree or `ULTRA_TASK` being set. The driver's
 *     exam pass sets `ULTRA_TASK`, so where the driver runs this exam an absent
 *     file is red naming the path; the folded tree's suite and a laptop set no
 *     `ULTRA_TASK` and hold no post, so there every test of the file is
 *     reported skipped rather than red on a file nobody was going to write.
 *   - The store module is reached through one namespace import, the form
 *     `tests/state-exams/delete-to-trash.test.ts` already uses, and every
 *     fixture read happens inside a test body rather than at module level.
 *
 * At BASE the list renders ascending by row id and
 * `state-exams/expected/two-todos-second-pinned-done.json` does not exist yet,
 * so leg (a) and leg (c) are red on the absent ordering and on the absent
 * expected file — the implementation of this task — and legs (b), (d), (e),
 * (f) and (g) are green there and stay green.
 */

import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, test} from 'bun:test';
import {runStateExam, stateExam, type StateExamSpec} from 'tinyapp-exam';

import {renderStatic} from '../../../../client/src/StaticPage';
import * as sd from '../../../../client/src/storeData';
import type {TodosContent, TodosStore} from '../../../../client/src/storeData';

// This file sits four directories below the repository root, which is also
// `bun test`'s cwd — every fixture read is anchored there, and the `seed` and
// `expected` of a spec are paths from there.
const ROOT = join(import.meta.dir, '..', '..', '..', '..');

/**
 * The state Task 1 posted, as the driver wrote it into this clone. The only
 * seed path this file names: there is no fixture to fall back to.
 */
const POSTED = 'state-exams/posted/1.json';

/** The expected file Task 1's exam named, which the post must match. */
const TASK_1_EXPECTED = 'state-exams/expected/two-todos-second-pinned.json';

/** The state this exam reaches, the expected file this task creates. */
const EXPECTED = 'state-exams/expected/two-todos-second-pinned-done.json';

/**
 * Whether there is a post to read.
 *
 * The driver's exam pass sets `ULTRA_TASK`, so under the driver an absent
 * posted file is red naming the path rather than quietly skipped.
 */
const seeded =
  existsSync(join(ROOT, POSTED)) || process.env.ULTRA_TASK !== undefined;

const readJson = (path: string): TodosContent =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as TodosContent;

/** A store's content as plain JSON, the shape a checked-in file parses to. */
const snapshot = (store: {getContent: () => unknown}): TodosContent =>
  JSON.parse(JSON.stringify(store.getContent())) as TodosContent;

/** Task 1's M1 literal: row `1`, the second by id, is the pinned one. */
const SECOND_PINNED: TodosContent = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false, pinned: true},
    },
  },
  {},
] as TodosContent;

/** This task's M1 literal: the pinned row `1` is the row the first box ticks. */
const SECOND_PINNED_DONE: TodosContent = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: true, pinned: true},
    },
  },
  {},
] as TodosContent;

/** The unpinned pair, the content the pinned-first order must leave alone. */
const TWO_OPEN_TODOS: TodosContent = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
] as TodosContent;

/** The same pair with both rows pinned — one group, in the ids' own order. */
const BOTH_PINNED: TodosContent = [
  {
    todos: {
      '0': {text: 'buy milk', completed: false, pinned: true},
      '1': {text: 'walk the dog', completed: false, pinned: true},
    },
  },
  {},
] as TodosContent;

/**
 * The spec of the file's one state exam, named so that leg (a) can assert its
 * `seed` is the posted path and nothing else.
 */
const SPEC: StateExamSpec<TodosStore> = {
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: POSTED,
  store: () => sd.createTodosStore(),
  action: {click: '.todoItem input[type=checkbox]'},
  expected: EXPECTED,
  view: [
    {selector: '#todo-1', checked: true},
    {selector: '#todo-0', unchecked: true},
    {selector: '.todoItem', count: 2},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'completed', value: false}],
};

/** The index of `id="todo-<id>"` in some markup, `-1` when it is not there. */
const todoAt = (html: string, id: string): number =>
  html.indexOf(`id="todo-${id}"`);

describe.skipIf(!seeded)('the handshake pair', () => {
  // --- Leg (a) [M1]: the one state exam of the file --------------------------

  // Seeded from exactly the state Task 1 reached, clicking the first
  // `.todoItem`'s checkbox ticks row `1` — the pinned one, which the list puts
  // on top — and the mutant that unticks it in the expected state is killed,
  // so an exam that never looked at which row completed could not have passed.
  // Over a list that is still ascending by id it is row `0` that completes, and
  // the store move says so, naming the first differing cell.
  stateExam(SPEC);

  test('leg (a) [M1] two-todos-second-pinned-done.json holds exactly the state of M1', () => {
    expect(readJson(EXPECTED)).toEqual(SECOND_PINNED_DONE);
  });

  test('leg (a) [M1] the exam’s seed is the posted file, and this file names no other seed', () => {
    expect(SPEC.seed).toBe(POSTED);
    expect(POSTED).toBe('state-exams/posted/1.json');

    // Assembled from parts rather than spelled, so that the needle does not
    // match the line that looks for it: the clause is that this file names no
    // path under the checked-in seeds directory, and a literal here would be
    // one such name.
    const seedsDir = `${['state-exams', 'seeds'].join('/')}/`;

    expect(readFileSync(import.meta.path, 'utf8')).not.toContain(seedsDir);
  });

  // --- Leg (b) [M2]: what Task 1 posted is what Task 1 expected --------------

  test('leg (b) [M2] the posted state is deep-equal to Task 1’s expected file', () => {
    expect(readJson(POSTED)).toEqual(readJson(TASK_1_EXPECTED));
  });

  // --- Legs (c)-(f) [M3]: the order the static render paints ----------------

  test('leg (c) [M3] over the pinned state, todo-1 is painted before todo-0', () => {
    const html = renderStatic(SECOND_PINNED);

    // Asserted before the ordering so that markup carrying neither row says so,
    // rather than reading as `-1 < -1`.
    expect(todoAt(html, '1')).toBeGreaterThanOrEqual(0);
    expect(todoAt(html, '0')).toBeGreaterThanOrEqual(0);

    expect(todoAt(html, '1')).toBeLessThan(todoAt(html, '0'));
  });

  test('leg (d) [M3] over the two-open content, todo-0 is painted before todo-1', () => {
    const html = renderStatic(TWO_OPEN_TODOS);

    expect(todoAt(html, '0')).toBeGreaterThanOrEqual(0);
    expect(todoAt(html, '1')).toBeGreaterThanOrEqual(0);

    expect(todoAt(html, '0')).toBeLessThan(todoAt(html, '1'));
  });

  test('leg (e) [M3] with both rows pinned, todo-0 is painted before todo-1', () => {
    const html = renderStatic(BOTH_PINNED);

    expect(todoAt(html, '0')).toBeGreaterThanOrEqual(0);
    expect(todoAt(html, '1')).toBeGreaterThanOrEqual(0);

    // Within the pinned group the order is the order the ids had.
    expect(todoAt(html, '0')).toBeLessThan(todoAt(html, '1'));
  });

  test('leg (f) [M3] after pinTodo of row 0, todo-0 is still painted before todo-1', () => {
    const store = sd.createTodosStore(TWO_OPEN_TODOS);

    sd.pinTodo(store, '0', true);
    const html = renderStatic(snapshot(store));

    expect(todoAt(html, '0')).toBeGreaterThanOrEqual(0);
    expect(todoAt(html, '1')).toBeGreaterThanOrEqual(0);

    // Pinning the row already on top moves nothing.
    expect(todoAt(html, '0')).toBeLessThan(todoAt(html, '1'));
  });

  // --- Leg (g) [M4]: an absent post is a red naming the path ----------------

  test('leg (g) [M4] a state exam seeded from an absent posted file is red naming it, with no page opened', async () => {
    // A callback action, so nothing would open a page before the seed is read,
    // and its own `main` so this probe's evidence lands under its own stem.
    const outcome = await runStateExam(
      {
        clock: '2026-01-01T00:00:00Z',
        seed: 'state-exams/posted/absent-probe.json',
        store: () => sd.createTodosStore(),
        action: () => {},
        expected: EXPECTED,
        mutant: [{table: 'todos', row: '1', cell: 'completed', value: false}],
      },
      {main: '/x/absent-probe.test.ts'},
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.failure ?? '').toContain(
      'state-exams/posted/absent-probe.json',
    );
    // No page was opened for a state that was never read.
    expect(outcome.record.walls.browser).toBe('skipped');
  });
});
