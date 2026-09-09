/**
 * The mutant perturbation: an examiner names the change their exam must notice
 * — a flipped cell, a missing cell, a missing row — and this produces exactly
 * that perturbed state to test the exam against.
 *
 * A mutant perturbs the *expected* state, never the implementation, so the
 * snapshot handed in is left untouched. The empty-row and empty-table rules
 * mirror TinyBase, where a row with no cells and a table with no rows do not
 * exist: a perturbed expected state stays a state `setContent` would round-trip.
 */

import type {Cell, MutantEdit, Snapshot, Tables} from './types';

/** The two edits that name a cell; the third names only a row. */
type CellEdit = Extract<MutantEdit, {cell: string}>;

/** The one edit that carries a new cell. */
type SetEdit = Extract<MutantEdit, {value: Cell}>;

const isCellEdit = (edit: MutantEdit): edit is CellEdit => 'cell' in edit;

/** Drops one row, and the table with it when that row was its last. */
const dropRow = (tables: Tables, table: string, row: string): void => {
  const rows = tables[table];
  if (rows === undefined) return;
  delete rows[row];
  if (Object.keys(rows).length === 0) delete tables[table];
};

/** Drops one cell, then the row and the table each in turn if left empty. */
const dropCell = (tables: Tables, {table, row, cell}: CellEdit): void => {
  const cells = tables[table]?.[row];
  if (cells === undefined) return;
  delete cells[cell];
  if (Object.keys(cells).length === 0) dropRow(tables, table, row);
};

/** Sets one cell, creating the table and the row when they are absent. */
const setCell = (tables: Tables, {table, row, cell, value}: SetEdit): void => {
  const rows = (tables[table] ??= {});
  const cells = (rows[row] ??= {});
  cells[cell] = value;
};

const applyEdit = (tables: Tables, edit: MutantEdit): void => {
  if (!isCellEdit(edit)) {
    dropRow(tables, edit.table, edit.row);
  } else if ('absent' in edit) {
    dropCell(tables, edit);
  } else {
    setCell(tables, edit);
  }
};

/**
 * The snapshot `edits` describe, as one perturbation applied in list order — so
 * a later edit to the same cell wins. Returns a new snapshot; `snapshot` itself
 * is never read after the copy and never written. Store values are not edited
 * by a mutant, so they are carried across unchanged.
 */
export const applyMutant = (
  snapshot: Snapshot,
  edits: MutantEdit[],
): Snapshot => {
  const mutated = structuredClone(snapshot);
  for (const edit of edits) applyEdit(mutated[0], edit);
  return mutated;
};

/** One edit's segment: `<table>/<row>/<cell>` for a cell, `<table>/<row>` for a row. */
const segment = (edit: MutantEdit): string =>
  isCellEdit(edit)
    ? `${edit.table}/${edit.row}/${edit.cell}`
    : `${edit.table}/${edit.row}`;

/** The mutant's name: one segment per edit in list order, joined by `,`. */
export const mutantPath = (edits: MutantEdit[]): string =>
  edits.map(segment).join(',');
