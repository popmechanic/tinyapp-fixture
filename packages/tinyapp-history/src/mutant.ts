/**
 * The mutant read off a diff — every changed cell put back the way the seed had
 * it.
 *
 * A derived exam takes its expected state from a recorded commit; its mutant is
 * the same transition read backwards. `dolt_diff_cells(from, to)` reports one
 * row per cell the action touched, and each row becomes the one edit that undoes
 * it: a cell the action changed goes back to the value the seed held, a cell the
 * action added goes away again. Applied to the expected state by `applyMutant`,
 * that is exactly the state the action did *not* produce — so an exam that
 * compares honestly kills it, and nobody has to write one by hand.
 *
 * Store values are the one thing a mutant cannot perturb: `applyMutant` carries
 * them across unchanged, so an edit naming the `$values` table would leave the
 * state untouched and the exam would report `hollow exam: mutant … not
 * distinguished`. A values row is therefore skipped, and a transition that moved
 * store values alone derives `[]` — which a caller reads as "no exam can be
 * built on this transition" rather than as a mutant that happens to be empty.
 */

import type {Cell, MutantEdit} from 'tinyapp-exam';

/**
 * The columns of one `dolt_diff_cells(from, to)` row this module reads.
 *
 * It is a subset of the shared row literal, spelled here so the file imports
 * nothing from a sibling module: a full row is assignable to it. The side of the
 * diff that lacks a cell carries `null` in every one of its columns.
 */
export type DiffRow = {
  to_tbl: string | null;
  to_row: string | null;
  to_cell: string | null;
  from_tbl: string | null;
  from_row: string | null;
  from_cell: string | null;
  from_value: string | null;
  diff_type: 'added' | 'modified' | 'removed';
};

/** The table id under which store values are reported; `diffContent`'s spelling. */
const VALUES_TABLE = '$values';

/** A diff column as a string; an absent side reads as the empty string. */
const text = (column: string | null): string => column ?? '';

/**
 * A diff row's `from_value` as the cell it spells.
 *
 * The column is JSON text — `'false'`, `'"buy milk"'` — so the seed's value is
 * what `JSON.parse` reads back out of it.
 */
const seedValue = (row: DiffRow): Cell => JSON.parse(text(row.from_value)) as Cell;

/** The table a row belongs to: the side it reached, else the side it left. */
const tableOf = (row: DiffRow): string => text(row.to_tbl ?? row.from_tbl);

/**
 * The one edit that undoes a row.
 *
 * A `modified` or a `removed` row names a cell the seed held, so its edit puts
 * that value back; an `added` row names a cell the seed did not have, so its
 * edit takes the cell away again.
 */
export const editOf = (row: DiffRow): MutantEdit =>
  row.diff_type === 'added'
    ? {
        table: text(row.to_tbl),
        row: text(row.to_row),
        cell: text(row.to_cell),
        absent: true,
      }
    : {
        table: text(row.from_tbl),
        row: text(row.from_row),
        cell: text(row.from_cell),
        value: seedValue(row),
      };

/**
 * The mutant a diff derives: `editOf` over the rows in list order, with every
 * row of the `$values` table skipped.
 *
 * A diff of store values alone therefore derives `[]`, and so does an empty
 * diff.
 */
export const mutantOf = (rows: DiffRow[]): MutantEdit[] =>
  rows.filter((row) => tableOf(row) !== VALUES_TABLE).map(editOf);
