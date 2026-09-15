/**
 * `references` — a cell the schema marks `ref` names a row that exists.
 *
 * `ref` is the app's own convention and not TinyBase's: a cell entry carrying
 * `ref: '<table>'` says that the cell's value, wherever the cell is present in a
 * row, is a row id of that table *in the same snapshot*. TinyBase drops the key
 * from the schema a store keeps, which is why this rule reads the loader's raw
 * `schema` and plain snapshot JSON, and never builds a store.
 *
 * Two readings the convention fixes:
 *
 *   - a row that does not carry the cell at all is not a reference, and says
 *     nothing — only a present cell is a claim about another row;
 *   - a snapshot without the referenced table has no row of it, so a reference
 *     into a missing table is a dangling one like any other.
 *
 * The fixture declares no reference today, so a default run is silent.
 */

import type {Finding, LintContext, Row, Rule} from '../types';

/** The rows of `table` in `tables`, or none when the snapshot omits it. */
const rowsOf = (
  tables: Record<string, Record<string, Row>>,
  table: string,
): Record<string, Row> => tables[table] ?? {};

/** Whether `rowId` is a row of `table` in this snapshot's tables. */
const hasRow = (
  tables: Record<string, Record<string, Row>>,
  table: string,
  rowId: string,
): boolean => Object.hasOwn(rowsOf(tables, table), rowId);

/**
 * Every dangling reference in one snapshot, in table, then row, then cell order.
 *
 * The tables are walked in the schema's order rather than the snapshot's: the
 * schema is what says which cells are references at all, and a snapshot's key
 * order is an accident of how it was written.
 */
const danglingIn = (
  {path, content: [tables]}: LintContext['snapshots'][number],
  schema: LintContext['schema'],
): Finding[] => {
  const findings: Finding[] = [];

  for (const [table, cells] of Object.entries(schema)) {
    const refCells = Object.entries(cells).filter(
      ([, cell]) => cell.ref !== undefined,
    );
    if (refCells.length === 0) {
      continue;
    }

    for (const [rowId, row] of Object.entries(rowsOf(tables, table))) {
      for (const [cell, {ref}] of refCells) {
        if (!Object.hasOwn(row, cell)) {
          continue;
        }
        const value = String(row[cell]);
        if (hasRow(tables, ref!, value)) {
          continue;
        }
        findings.push({
          file: path,
          subject: `${table}/${rowId}/${cell}`,
          problem: `refers to ${ref}/${value}, which is not a row of ${ref} in this snapshot`,
          fix: `add ${ref}/${value} to the snapshot, or point ${cell} at an existing ${ref} row`,
        });
      }
    }
  }

  return findings;
};

const rule: Rule = {
  name: 'references',
  run: (ctx: LintContext): Finding[] =>
    ctx.snapshots.flatMap((snapshot) => danglingIn(snapshot, ctx.schema)),
};

export default rule;
