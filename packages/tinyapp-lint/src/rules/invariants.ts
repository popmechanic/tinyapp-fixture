/**
 * The invariants rule — every row of every snapshot against the store module's
 * own `INVARIANTS`.
 *
 * The app already says what a completed todo is; this rule is what makes it say
 * so about a state nobody rendered. A snapshot is only a `[tables, values]`
 * pair on disk, so nothing stops a hand-written one — or one captured from a
 * run that went wrong — from holding a row the app itself would never have
 * built. Each such row is named the way the app names it, `<table>/<rowId>`,
 * beside the invariant's own message.
 *
 * Two readings of "breaks the invariant":
 *
 *   - a predicate that returns anything but `true` breaks it. A predicate that
 *     forgot its `return` says `undefined`, not "this row is fine";
 *   - a predicate that throws breaks it too, on the row it threw over. The
 *     alternative is one bad invariant hiding every row of its table, which is
 *     the opposite of what a linter is for.
 *
 * A snapshot without the invariant's table has no rows and so yields nothing:
 * an empty state is not a violated one.
 */

import type {Finding, Invariant, LintContext, Row, Rule} from '../types';

/** Whether `row` satisfies `invariant` — `false` for a throw, and for a non-`true`. */
const holds = (invariant: Invariant, row: Row, rowId: string): boolean => {
  try {
    return invariant.predicate(row, rowId) === true;
  } catch {
    return false;
  }
};

/**
 * Every row that breaks an invariant, in snapshot order, then invariant order,
 * then row-id order — the order the loops are written in.
 */
const run = (ctx: LintContext): Finding[] => {
  const findings: Finding[] = [];

  for (const snapshot of ctx.snapshots) {
    const [tables] = snapshot.content;
    for (const invariant of ctx.invariants) {
      const rows: Record<string, Row> = tables[invariant.table] ?? {};
      for (const rowId of Object.keys(rows).sort()) {
        const row = rows[rowId] as Row;
        if (!holds(invariant, row, rowId)) {
          const subject = `${invariant.table}/${rowId}`;
          findings.push({
            file: snapshot.path,
            subject,
            problem: `breaks the invariant "${invariant.message}"`,
            fix: `change ${subject} so the invariant holds, or change INVARIANTS in ${ctx.storePath}`,
          });
        }
      }
    }
  }

  return findings;
};

const rule: Rule = {name: 'invariants', run};

export default rule;
