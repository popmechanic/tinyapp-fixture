/**
 * The one shared literal the whole linter writes against.
 *
 * Every rule, the loader and the CLI import their vocabulary from here, so the
 * shapes a rule reads are the shapes the loader built and nothing has to agree
 * by hand. Nothing in this module is imported at runtime: `View` and `Action`
 * come from `tinyapp-exam` as types, so the linter's own types stay free of the
 * exam helper's dependencies.
 */

import type {Action, View} from 'tinyapp-exam';

export type {Action, View};

/** A single TinyBase cell or value. */
export type Cell = string | number | boolean;

/** One TinyBase row: cell id -> cell. */
export type Row = Record<string, Cell>;

/**
 * The `[tables, values]` pair TinyBase's `getContent()` returns — the shape of
 * every seed file and every expected file.
 */
export type Snapshot = [Record<string, Record<string, Row>>, Record<string, Cell>];

/**
 * One cell's schema entry.
 *
 * `ref` is the app's own convention for a cell that names a row of another
 * table; TinyBase does not know it, and drops it from the schema a store keeps,
 * so it survives only in the module's raw `TABLES_SCHEMA` export.
 */
export type CellSchema = {
  type: 'string' | 'number' | 'boolean';
  default?: Cell;
  ref?: string;
};

/** table id -> cell id -> that cell's schema. */
export type TablesSchema = Record<string, Record<string, CellSchema>>;

/** One thing every row of a table must satisfy, and what to say when it does not. */
export type Invariant = {
  table: string;
  predicate: (row: Row, rowId: string) => boolean;
  message: string;
};

/** One seed or expected file, as the loader read it. */
export type SnapshotFile = {
  path: string;
  kind: 'seed' | 'expected';
  content: Snapshot;
};

/**
 * One state exam, as the capture read it out of its file.
 *
 * `action` is `'callback'` when the exam's action is a function this process
 * would have had to run, and the list of interactions otherwise — a single
 * interaction is a list of one.
 */
export type ExamSpec = {
  path: string;
  seed: string;
  expected: string;
  view: View | View[] | undefined;
  action: 'callback' | Action[];
};

/** One of the store module's mutation callbacks: a store, then its arguments. */
export type Callback = (store: any, ...args: Cell[]) => unknown;

/** Everything a rule is handed: the app's state vocabulary, already loaded. */
export type LintContext = {
  storePath: string;
  schema: TablesSchema;
  invariants: Invariant[];
  callbacks: Record<string, Callback>;
  snapshots: SnapshotFile[];
  exams: ExamSpec[];
  createStore: (content: Snapshot) => {
    setContent(c: Snapshot): unknown;
    getContent(): Snapshot;
  };
  render: (content: Snapshot) => string;
  clock: string;
};

/** One thing a rule found wrong, and the concrete fix for it. */
export type Finding = {file: string; subject: string; problem: string; fix: string};

/** One rule module's default export. */
export type Rule = {
  name: string;
  run: (ctx: LintContext) => Finding[] | Promise<Finding[]>;
};
