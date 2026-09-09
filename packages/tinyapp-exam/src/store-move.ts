/**
 * The store move: load a seed, run one action under the determinism contract,
 * and report every cell that differs from the state the examiner expected.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {withContract} from './contract';
import {
  VALUES_TABLE,
  type Cell,
  type Difference,
  type ExamStore,
  type Snapshot,
  type StateExamSpec,
} from './types';

export {withContract} from './contract';
export type {
  Cell,
  Difference,
  ExamRecord,
  ExamStore,
  MutantEdit,
  Snapshot,
  StateExamSpec,
  Tables,
  Values,
  View,
} from './types';

/** The union of two objects' keys, in string order. */
const idsOf = (
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined,
): string[] =>
  [...new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})])].sort();

const cellOf = (
  cells: Record<string, Cell> | undefined,
  cell: string,
): Cell | null => (cells != null && cell in cells ? cells[cell]! : null);

/**
 * Every cell that differs between two snapshots, ordered by table, then row,
 * then cell in string order, with store values — `table` `$values`, `row` the
 * empty string — after every table row. `[]` means the two are deep-equal.
 */
export const diffContent = (got: Snapshot, wanted: Snapshot): Difference[] => {
  const [gotTables, gotValues] = got;
  const [wantedTables, wantedValues] = wanted;
  const differences: Difference[] = [];

  for (const table of idsOf(gotTables, wantedTables)) {
    const gotRows = gotTables?.[table];
    const wantedRows = wantedTables?.[table];
    for (const row of idsOf(gotRows, wantedRows)) {
      const gotCells = gotRows?.[row];
      const wantedCells = wantedRows?.[row];
      for (const cell of idsOf(gotCells, wantedCells)) {
        const gotCell = cellOf(gotCells, cell);
        const wantedCell = cellOf(wantedCells, cell);
        if (gotCell !== wantedCell) {
          differences.push({table, row, cell, got: gotCell, wanted: wantedCell});
        }
      }
    }
  }

  for (const value of idsOf(gotValues, wantedValues)) {
    const gotValue = cellOf(gotValues, value);
    const wantedValue = cellOf(wantedValues, value);
    if (gotValue !== wantedValue) {
      differences.push({
        table: VALUES_TABLE,
        row: '',
        cell: value,
        got: gotValue,
        wanted: wantedValue,
      });
    }
  }

  return differences;
};

const spell = (cell: Cell | null): string =>
  cell === null ? 'absent' : JSON.stringify(cell);

/** The diff table: a header line, then one line per difference, in order. */
export const renderDiff = (differences: Difference[]): string =>
  [
    'table / row / cell / got / wanted',
    ...differences.map(
      ({table, row, cell, got, wanted}) =>
        `${table} / ${row} / ${cell} / ${spell(got)} / ${spell(wanted)}`,
    ),
  ].join('\n');

/** Reads a snapshot from a path relative to `process.cwd()`. */
const readSnapshot = (path: string): Snapshot =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as Snapshot;

const at = ({table, row, cell}: Difference): string => `${table}/${row}/${cell}`;

/**
 * Loads `seed` into a fresh store and runs `spec.action` under the contract.
 *
 * TinyBase drops cells the schema does not know and fills in the ones it
 * defaults, silently — so the seed is checked by comparing the loaded content
 * against the file rather than by watching for an error.
 */
const runOnce = async <S extends ExamStore>(
  spec: StateExamSpec<S>,
  seed: Snapshot,
): Promise<S> => {
  const store = spec.store();
  store.setContent(seed);

  const violations = diffContent(store.getContent(), seed);
  if (violations.length > 0) {
    throw new Error(
      `snapshot violates schema: ${spec.seed} at ${at(violations[0]!)}`,
    );
  }

  await withContract(spec.clock, () => spec.action(store));
  return store;
};

/**
 * Runs one state exam's store move.
 *
 * Resolves `{content, diff, ms}` — the store's content after the action, its
 * difference from `spec.expected`, and how long the first run took. Rejects
 * when the seed does not survive the schema (before the action ever runs), when
 * the action breaches the contract, or when two runs on fresh stores disagree.
 */
export const storeMove = async <S extends ExamStore>(
  spec: StateExamSpec<S>,
): Promise<{content: Snapshot; diff: Difference[]; ms: number}> => {
  const seed = readSnapshot(spec.seed);

  const started = performance.now();
  const first = (await runOnce(spec, seed)).getContent();
  const ms = performance.now() - started;

  // A second run on a fresh store catches what the contract could not pin — a
  // `Math.random`, an id drawn from anywhere but the store.
  const second = (await runOnce(spec, seed)).getContent();
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error(
      `nondeterministic store: ${spec.seed}\n${renderDiff(
        diffContent(first, second),
      )}`,
    );
  }

  return {content: first, diff: diffContent(first, readSnapshot(spec.expected)), ms};
};
