/**
 * The shared literals every tinyapp-exam helper writes against.
 *
 * `Snapshot` is exactly TinyBase's `getContent()` shape — the shape of every
 * seed file, every expected file and of `window.__TINYAPP_SEED__`. Nothing here
 * is imported at runtime, so this module stays free of the workspace's
 * dependencies.
 */

/** A single TinyBase cell or value. */
export type Cell = string | number | boolean;

/** table id -> row id -> cell id -> cell. */
export type Tables = Record<string, Record<string, Record<string, Cell>>>;

/** value id -> value. */
export type Values = Record<string, Cell>;

/** The `[tables, values]` pair returned by `getContent()`. */
export type Snapshot = [Tables, Values];

/**
 * One cell that differs between two snapshots. The side that lacks the cell
 * carries `null`. Store values are reported with `table` `$values` and `row`
 * the empty string.
 */
export type Difference = {
  table: string;
  row: string;
  cell: string;
  got: Cell | null;
  wanted: Cell | null;
};

/** One edit a mutant applies to a snapshot: set a cell, drop a cell, drop a row. */
export type MutantEdit =
  | {table: string; row: string; cell: string; value: Cell}
  | {table: string; row: string; cell: string; absent: true}
  | {table: string; row: string; absent: true};

/** One assertion about the rendered DOM. */
export type View = {
  selector: string;
  count?: number;
  text?: string;
  attr?: {name: string; value: string};
  checked?: true;
  unchecked?: true;
  absent?: true;
};

/** The slice of a TinyBase store a state exam actually touches. */
export interface ExamStore {
  setContent(content: Snapshot): unknown;
  getContent(): Snapshot;
}

/** One state exam: a seed, an action and the state the examiner expects. */
export type StateExamSpec<S extends ExamStore = ExamStore> = {
  clock: string;
  entry?: string;
  seed: string;
  action: (store: S) => void | Promise<void>;
  expected: string;
  view?: View | View[];
  mutant: MutantEdit[];
  store: () => S;
};

/** What one exam run records. */
export type ExamRecord = {
  walls: {
    store_ms: number;
    render_ms: number | null;
    mutant_ms: number;
    render: 'ran' | 'skipped';
  };
  mutant: {killed: boolean; path: string; edits: MutantEdit[]};
  contract: {clock: string; breach: string | null};
  storeDiff: Difference[];
  dom?: string;
  screenshot?: Uint8Array;
};

/** The table id under which store values are reported in a `Difference`. */
export const VALUES_TABLE = '$values';
