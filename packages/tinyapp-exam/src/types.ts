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

/**
 * One thing an exam does to a page: click what a selector names, type text into
 * it, or press a key on it.
 *
 * It lives here rather than beside the driver so the store move can name the
 * form of an action without importing the browser; `browser.ts` re-exports it,
 * so `Action` reads the same from either module.
 */
export type Action =
  | {click: string}
  | {type: [string, string]}
  | {key: [string, string]};

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

/**
 * One state exam: a seed, an action and the state the examiner expects.
 *
 * The action is either a callback over a store this process makes — the form
 * the exam was born with — or one interaction, or a list of interactions
 * performed in order on the page the entry builds. An interaction needs an
 * `entry` (there is otherwise no page to reach) and no `store`; a callback needs
 * a `store` and no page.
 */
export type StateExamSpec<S extends ExamStore = ExamStore> = {
  clock: string;
  entry?: string;
  seed: string;
  action: ((store: S) => void | Promise<void>) | Action | Action[];
  expected: string;
  view?: View | View[];
  mutant: MutantEdit[];
  store?: () => S;
};

/**
 * What one exam run records.
 *
 * `walls.action_ms` is the interaction's own wall, `null` when the action was a
 * callback and there was no interaction to time; `walls.browser` says whether a
 * page was opened at all. `contract.pinned_in_page` says which contract held the
 * action: `true` when it ran in a page whose clock the driver pinned and whose
 * every request the driver blocked, `false` when `withContract` held it here.
 */
export type ExamRecord = {
  walls: {
    store_ms: number;
    render_ms: number | null;
    action_ms: number | null;
    mutant_ms: number;
    render: 'ran' | 'skipped';
    browser: 'ran' | 'skipped';
  };
  mutant: {killed: boolean; path: string; edits: MutantEdit[]};
  contract: {clock: string; breach: string | null; pinned_in_page: boolean};
  storeDiff: Difference[];
  dom?: string;
  screenshot?: Uint8Array;
};

/**
 * True when `action` is the callback form.
 *
 * The two forms are told apart by `typeof`: an `Action` is a plain object and a
 * list of them an array, so a function is the callback and nothing else is.
 */
export const isCallbackAction = <S extends ExamStore>(
  action: StateExamSpec<S>['action'],
): action is (store: S) => void | Promise<void> => typeof action === 'function';

/** The actions of a spec in the order they are performed, `[]` for a callback. */
export const actionsOf = <S extends ExamStore>(
  action: StateExamSpec<S>['action'],
): Action[] =>
  isCallbackAction(action) ? [] : Array.isArray(action) ? action : [action];

/** The table id under which store values are reported in a `Difference`. */
export const VALUES_TABLE = '$values';
