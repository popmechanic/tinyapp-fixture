/**
 * The history writer: a session's store content, committed to a DoltLite file
 * once per call that moved it.
 *
 * The file is the only thing that holds the history. The store is read through
 * `getContent()` and nothing is ever written back into it — a history is a
 * reading of the app, never a second place the app's state lives.
 *
 * Two tables carry a whole `Snapshot`: `cells` for the tables half, `vals` for
 * the values half, each `value` the cell `JSON.stringify`ed so `JSON.parse`
 * gives it back typed. Every commit replaces both tables outright inside one
 * SQL transaction and then asks DoltLite to commit what changed, so a call that
 * left the store as it was stages nothing and — under `--skip-empty` — makes no
 * commit at all.
 */

import {DatabaseSync} from '@dolthub/doltlite';

import {
  VALUES_TABLE,
  withContract,
  type Cell,
  type ExamStore,
  type Snapshot,
  type Tables,
  type Values,
} from 'tinyapp-exam';

/**
 * The two tables every history file holds, written once.
 *
 * Every module that opens one of these files — this one, and any sibling that
 * reads a history back — spells the schema by importing this literal rather
 * than by repeating it, so the two tables cannot drift apart.
 */
export const SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS cells (tbl TEXT NOT NULL, row TEXT NOT NULL, cell TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (tbl, row, cell));
CREATE TABLE IF NOT EXISTS vals (name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (name));`;

/**
 * One cell that changed between two commits — the columns of
 * `dolt_diff_cells(from, to)`, with the absent side's columns `null`.
 *
 * A changed store value is reported in the same shape: `$values` as the table
 * on whichever side is present, the empty string as its row and the value's
 * name as its cell. That is the spelling `diffContent` already uses for a
 * store value, so a diff read off a history and a diff read off two snapshots
 * name the same thing the same way.
 */
export type DiffRow = {
  to_tbl: string | null;
  to_row: string | null;
  to_cell: string | null;
  to_value: string | null;
  to_commit: string;
  from_tbl: string | null;
  from_row: string | null;
  from_cell: string | null;
  from_value: string | null;
  from_commit: string;
  diff_type: 'added' | 'modified' | 'removed';
};

/** One commit as `log()` reports it. */
export type LogEntry = {commit_hash: string; message: string};

/** An open history file. */
export type History = {
  path: string;
  commit(content: Snapshot, message: string, date: string): string | null;
  at(ref: string): Snapshot;
  log(): LogEntry[];
  diff(from: string, to: string): DiffRow[];
  close(): void;
};

/**
 * The moves a session records, by name.
 *
 * The rest parameter is `any[]` and not `Cell[]` deliberately: the app's own
 * `addTodo(store, text: string)` is not assignable to a `Cell[]` rest, so a
 * tighter type here would refuse the very callbacks this module exists to
 * record.
 */
export type Callbacks = Record<string, (store: any, ...args: any[]) => unknown>;

/** The recorded twin of a `Callbacks`: each move resolves to its commit hash. */
export type Recorded<C extends Callbacks = Callbacks> = {
  [K in keyof C]: (...args: Cell[]) => Promise<string | null>;
};

/** `SELECT dolt_commit(…)`, which returns the hash or the number `0`. */
const COMMIT_SQL = `SELECT dolt_commit('-A', '--skip-empty', '-m', ?, '--date', ?) AS hash`;

/** An object's keys in string order — the order every table is written in. */
const sortedKeys = (of: Record<string, unknown> | undefined): string[] =>
  Object.keys(of ?? {}).sort();

/** The side of a diff row that carries the change, `to` when both do. */
const present = <T>(to: T | null, from: T | null): T | null => to ?? from;

/** Compares two key tuples component by component, in string order. */
const byKey = (a: readonly string[], b: readonly string[]): number => {
  for (let i = 0; i < a.length; i++) {
    if (a[i]! !== b[i]!) {
      return a[i]! < b[i]! ? -1 : 1;
    }
  }
  return 0;
};

/** A diff row's sort key: table, then row, then cell of whichever side is present. */
const diffKey = (row: DiffRow): [string, string, string] => [
  present(row.to_tbl, row.from_tbl) ?? '',
  present(row.to_row, row.from_row) ?? '',
  present(row.to_cell, row.from_cell) ?? '',
];

/** One `dolt_diff_vals` row in `DiffRow` shape. */
const valueRow = (row: Record<string, unknown>): DiffRow => {
  const toName = row.to_name as string | null;
  const fromName = row.from_name as string | null;
  return {
    to_tbl: toName === null ? null : VALUES_TABLE,
    to_row: toName === null ? null : '',
    to_cell: toName,
    to_value: row.to_value as string | null,
    to_commit: row.to_commit as string,
    from_tbl: fromName === null ? null : VALUES_TABLE,
    from_row: fromName === null ? null : '',
    from_cell: fromName,
    from_value: row.from_value as string | null,
    from_commit: row.from_commit as string,
    diff_type: row.diff_type as DiffRow['diff_type'],
  };
};

/**
 * Opens the history file at `path`, creating it when it is not there yet.
 *
 * A file DoltLite has just made carries exactly one commit, its root
 * `Initialize data repository`; the two tables are created in the working set
 * and reach the log with whatever the first `commit()` records.
 */
export const openHistory = (path: string): History => {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA_SQL);

  const commit = (
    content: Snapshot,
    message: string,
    date: string,
  ): string | null => {
    const [tables, values] = content;

    db.exec('BEGIN');
    try {
      db.exec('DELETE FROM cells');
      db.exec('DELETE FROM vals');
      const cell = db.prepare(
        'INSERT INTO cells (tbl, row, cell, value) VALUES (?, ?, ?, ?)',
      );
      const value = db.prepare('INSERT INTO vals (name, value) VALUES (?, ?)');
      for (const tbl of sortedKeys(tables)) {
        const rows = tables[tbl]!;
        for (const row of sortedKeys(rows)) {
          const cells = rows[row]!;
          for (const name of sortedKeys(cells)) {
            cell.run(tbl, row, name, JSON.stringify(cells[name]));
          }
        }
      }
      for (const name of sortedKeys(values)) {
        value.run(name, JSON.stringify(values[name]));
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    // `--skip-empty` hands back the number `0` when nothing was staged, which
    // is how a call that did not move the store leaves the log alone.
    const {hash} = db.prepare(COMMIT_SQL).get(message, date) as {
      hash: string | number;
    };
    return typeof hash === 'string' ? hash : null;
  };

  const at = (ref: string): Snapshot => {
    const tables: Tables = {};
    const cells = db
      .prepare('SELECT tbl, row, cell, value FROM dolt_at_cells(?)')
      .all(ref) as {tbl: string; row: string; cell: string; value: string}[];
    for (const row of [...cells].sort((left, right) =>
      byKey([left.tbl, left.row, left.cell], [right.tbl, right.row, right.cell]),
    )) {
      ((tables[row.tbl] ??= {})[row.row] ??= {})[row.cell] = JSON.parse(
        row.value,
      ) as Cell;
    }

    const values: Values = {};
    const named = db
      .prepare('SELECT name, value FROM dolt_at_vals(?)')
      .all(ref) as {name: string; value: string}[];
    for (const {name, value} of [...named].sort((left, right) =>
      byKey([left.name], [right.name]),
    )) {
      values[name] = JSON.parse(value) as Cell;
    }

    return [tables, values];
  };

  const log = (): LogEntry[] =>
    db
      .prepare('SELECT commit_hash, message FROM dolt_log')
      .all() as LogEntry[];

  const diff = (from: string, to: string): DiffRow[] => {
    const cells = db
      .prepare('SELECT * FROM dolt_diff_cells(?, ?)')
      .all(from, to) as unknown as DiffRow[];
    const values = (
      db.prepare('SELECT * FROM dolt_diff_vals(?, ?)').all(from, to) as Record<
        string,
        unknown
      >[]
    ).map(valueRow);
    return [...cells, ...values].sort((left, right) =>
      byKey(diffKey(left), diffKey(right)),
    );
  };

  return {path, commit, at, log, diff, close: () => db.close()};
};

/**
 * The commit message one recorded call leaves: the callback's name, then its
 * arguments `JSON.stringify`ed and joined by `, `, in parentheses.
 */
export const messageOf = (name: string, args: Cell[]): string =>
  `${name}(${args.map((arg) => JSON.stringify(arg)).join(', ')})`;

/**
 * Records a session over `store`: commits where it starts, then hands back the
 * callbacks as functions that move the store and commit what that did.
 *
 * Each recorded call runs its callback inside `withContract(clock, …)` — the
 * same determinism contract the store move holds, which nests cleanly inside
 * the store move's own — and then commits `store.getContent()` under
 * `messageOf(name, args)`, resolving to the new commit's hash, or to `null`
 * when the call left the content exactly as it was.
 */
export const recordSession = <C extends Callbacks>(
  store: ExamStore,
  history: History,
  callbacks: C,
  clock: string,
): Recorded<C> => {
  history.commit(store.getContent(), 'seed', clock);

  const recorded = {} as Recorded<C>;
  for (const name of Object.keys(callbacks) as (keyof C & string)[]) {
    const callback = callbacks[name]!;
    recorded[name] = (async (...args: Cell[]): Promise<string | null> => {
      await withContract(clock, () => callback(store, ...args));
      return history.commit(store.getContent(), messageOf(name, args), clock);
    }) as Recorded<C>[keyof C & string];
  }
  return recorded;
};
