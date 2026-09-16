/**
 * The exam for Task 3 — "The mutant from a diff — every changed cell put back
 * the way the seed had it".
 *
 * A file's whole state exam is the single `stateExam({…})` in it, so leg (a) is
 * that one call — its `mutant` computed by `mutantOf` from the one-row literal
 * the clause names, a top-level call into `packages/tinyapp-history` — and
 * every other leg is an ordinary `bun:test` block beside it.
 *
 * Three readings this file makes, written down because the Proof leaves them to
 * the reader:
 *
 *   - The rows are declared as `DolthDiffRow`, this file's own spelling of the
 *     full `dolt_diff_cells(from, to)` row — the eight columns M1 reads plus
 *     `to_value` — and handed to `editOf`/`mutantOf` as variables rather than
 *     as fresh object literals. That is the Context's claim under test: a full
 *     row is assignable to the narrower structural `DiffRow` the module spells
 *     for itself, so the exam pins no row shape narrower than the one
 *     `history.ts` will hand it.
 *   - `'$values'` is written as a literal in leg (g) rather than imported as
 *     `VALUES_TABLE`: the leg's words are the literal, and the linter's capture
 *     child stubs every `tinyapp-exam` export out of an exam file's own
 *     imports, so a literal reads the same in that process as in this one.
 *   - Leg (i) spawns the Proof's `Run:` line verbatim. It is the module alone
 *     under the package's flags, which is what M1 asks of it.
 *
 * Red at BASE for one reason: `packages/tinyapp-history/src/mutant.ts` does not
 * exist, so the import below fails and the file does not load.
 */

import {describe, expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import {createTodosStore, setTodoCompleted} from '../../client/src/storeData';
import {
  editOf,
  mutantOf,
} from '../../packages/tinyapp-history/src/mutant';

/**
 * One row of `dolt_diff_cells(from, to)`, as this exam hands it over: the eight
 * columns M1 reads, plus the `to_value` a real row also carries and the module
 * never looks at.
 */
type DolthDiffRow = {
  to_tbl: string | null;
  to_row: string | null;
  to_cell: string | null;
  to_value: string | null;
  from_tbl: string | null;
  from_row: string | null;
  from_cell: string | null;
  from_value: string | null;
  diff_type: 'added' | 'modified' | 'removed';
};

/**
 * M2's one-row diff: the single cell the action of leg (a) moved, reported as
 * `modified todos/0/completed` with the seed's `false` on the `from_` side.
 */
const ROWS: DolthDiffRow[] = [
  {
    to_tbl: 'todos',
    to_row: '0',
    to_cell: 'completed',
    to_value: 'true',
    from_tbl: 'todos',
    from_row: '0',
    from_cell: 'completed',
    from_value: 'false',
    diff_type: 'modified',
  },
];

/** M2's two-row diff: both cells of a row that the transition added. */
const ADDED_ROWS: DolthDiffRow[] = [
  {
    to_tbl: 'todos',
    to_row: '1',
    to_cell: 'completed',
    to_value: 'false',
    from_tbl: null,
    from_row: null,
    from_cell: null,
    from_value: null,
    diff_type: 'added',
  },
  {
    to_tbl: 'todos',
    to_row: '1',
    to_cell: 'text',
    to_value: '"walk the dog"',
    from_tbl: null,
    from_row: null,
    from_cell: null,
    from_value: null,
    diff_type: 'added',
  },
];

/**
 * M2's values-only diff: one `added` row of the table `diffContent` reports
 * store values under. A mutant edit naming it would perturb nothing, so the
 * row is skipped and the list it alone makes is empty.
 */
const VALUES_ROWS: DolthDiffRow[] = [
  {
    to_tbl: '$values',
    to_row: '',
    to_cell: 'filter',
    to_value: '"done"',
    from_tbl: null,
    from_row: null,
    from_cell: null,
    from_value: null,
    diff_type: 'added',
  },
];

/** M1's `removed` row: a cell the transition dropped, with the seed's text. */
const REMOVED_ROW: DolthDiffRow = {
  to_tbl: null,
  to_row: null,
  to_cell: null,
  to_value: null,
  from_tbl: 'todos',
  from_row: '0',
  from_cell: 'text',
  from_value: '"buy milk"',
  diff_type: 'removed',
};

/**
 * Leg (a) [M3] — the derived mutant is one the exam notices.
 *
 * The seed's first todo is completed by the store move; the state that reaches
 * `state-exams/expected/two-todos-first-done.json` is the one the page is
 * rendered from. The `mutant` is not typed here: it is `mutantOf` of M2's
 * one-row diff, so the perturbation is read off the diff and nothing else.
 * `stateExam` fails with `store move: expected state not reached` if the move
 * lands elsewhere, and with `hollow exam: mutant … not distinguished` if the
 * derived mutant leaves the expected state indistinguishable from what the
 * store actually reached.
 */
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: (store) => {
    setTodoCompleted(store, '0', true);
  },
  expected: 'state-exams/expected/two-todos-first-done.json',
  view: [
    {selector: '.todoItem.completed input[type=checkbox]', checked: true},
    {selector: '.todoItem', count: 2},
  ],
  mutant: mutantOf(ROWS),
});

describe('editOf — one diff row to one mutant edit [M1]', () => {
  test('(b) a `modified` row becomes the cell put back the way the seed had it', () => {
    // M1: a `modified` row maps to `{table: from_tbl, row: from_row,
    // cell: from_cell, value: JSON.parse(from_value)}` — and `from_value` is
    // JSON text, so `'false'` is the boolean `false` and not the string.
    expect(editOf(ROWS[0]!)).toEqual({
      table: 'todos',
      row: '0',
      cell: 'completed',
      value: false,
    });
  });

  test('(c) an `added` row becomes the cell dropped', () => {
    // M1: an `added` row maps to `{table: to_tbl, row: to_row, cell: to_cell,
    // absent: true}` — read off the `to_` side, every `from_` column being
    // null, and carrying no value at all.
    expect(editOf(ADDED_ROWS[1]!)).toEqual({
      table: 'todos',
      row: '1',
      cell: 'text',
      absent: true,
    });
  });

  test('(d) a `removed` row becomes the cell put back the way the seed had it', () => {
    // M1: a `removed` row maps to `{table: from_tbl, row: from_row,
    // cell: from_cell, value: JSON.parse(from_value)}` — the `from_` side
    // again, and `'"buy milk"'` parses to the bare string.
    expect(editOf(REMOVED_ROW)).toEqual({
      table: 'todos',
      row: '0',
      cell: 'text',
      value: 'buy milk',
    });
  });
});

describe('mutantOf — editOf over the rows in list order [M2]', () => {
  test('(e) over M2’s one-row diff it is exactly the one reversed cell', () => {
    // M2, first list: over the one row `modified todos/0/completed` with
    // `from_value` `'false'`.
    expect(mutantOf(ROWS)).toEqual([
      {table: 'todos', row: '0', cell: 'completed', value: false},
    ]);
  });

  test('(f) over the two `added` rows of `todos/1` it is the two edits in that order', () => {
    // M2, second list: `completed` before `text`, the order the rows came in.
    expect(mutantOf(ADDED_ROWS)).toEqual([
      {table: 'todos', row: '1', cell: 'completed', absent: true},
      {table: 'todos', row: '1', cell: 'text', absent: true},
    ]);
  });

  test('(g) a row of the `$values` table is skipped, so a values-only diff is []', () => {
    // M2: every row whose table (`to_tbl`, else `from_tbl`) is `$values` is
    // skipped — a caller reads the empty list as "no exam can be built on this
    // transition" rather than as a mutant of nothing.
    expect(mutantOf(VALUES_ROWS)).toEqual([]);
  });

  test('(h) over no rows at all it is []', () => {
    // M2, last list.
    expect(mutantOf([])).toEqual([]);
  });
});

/**
 * Leg (i) [M1] — the `Run:` line of the Proof, verbatim: the module typechecks
 * alone under the package's flags, in a clone whose
 * `packages/tinyapp-history/tsconfig.json` a sibling task owns.
 */
test(
  '(i) the module typechecks alone under the package’s flags [M1]',
  async () => {
    const run = Bun.spawn(
      [
        'bunx',
        'tsc',
        '--noEmit',
        '--strict',
        '--skipLibCheck',
        '--types',
        'bun',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--target',
        'es2022',
        'packages/tinyapp-history/src/mutant.ts',
      ],
      {cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe'},
    );
    const [out, err, code] = await Promise.all([
      new Response(run.stdout).text(),
      new Response(run.stderr).text(),
      run.exited,
    ]);
    expect(`${code}\n${out}${err}`.trim()).toBe('0');
  },
  120_000,
);
