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
 * How an exam names the one control it acts on.
 *
 * A string is a CSS selector, read by `DOM.querySelector` exactly as it always
 * was. The object is the way a person names a control — "the checkbox called
 * buy milk" — a role and the *accessible name* the browser computes for it, so
 * the locator survives a restyling that rewrites every class on the page and
 * reaches a control no selector can express: a `<span role="checkbox">` named
 * only by its `aria-label` carries nothing a selector could match on.
 */
export type Locator = string | {role: string, name: string};

/**
 * One thing an exam does to a page: click what a locator names, type text into
 * it, or press a key on it.
 *
 * It lives here rather than beside the driver so the store move can name the
 * form of an action without importing the browser; `browser.ts` re-exports it,
 * so `Action` reads the same from either module.
 */
export type Action =
  | {click: Locator}
  | {type: [Locator, string]}
  | {key: [Locator, string]};

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
 * One persistence exam: a page opened unseeded from a loopback origin, an
 * interaction, and the state the examiner expects to find still there once the
 * page has been reloaded.
 *
 * There is no `seed` and no `store`, because neither has anywhere to go: the
 * page starts from whatever its own storage holds, which is nothing, and the
 * state is read back out of the page's store and out of the rows its persister
 * wrote. The action is an interaction for the same reason — a callback runs in
 * this process, and nothing this process does to a store of its own is saved by
 * the page's persister.
 *
 * `assets` maps a url path to a file path, resolved against `process.cwd()` the
 * way `expected` is; every other path at the origin answers the page itself.
 * `table` is the persister's JSON-mode table, the one row of which carries the
 * stamped content.
 */
export type PersistenceExamSpec = {
  clock: string;
  entry: string;
  assets?: Record<string, string>;
  action: Action | Action[];
  expected: string;
  table: string;
  view?: View | View[];
  mutant: MutantEdit[];
};

/**
 * One convergence exam: a server, a page, the module the page syncs through,
 * an interaction, and the state the examiner expects every replica to reach.
 *
 * There is no `seed` and no `table`. The state comes from nowhere but the
 * action: three pages and one module object all start empty, one page acts, and
 * the question is whether the other two and the object arrive at the same
 * place. `server` is the server directory `startCelld` copies — the runtime is
 * the exam's, started and stopped by it — and `module` is the facet the pages
 * dial at `/sync/<module>` and the one whose transitions are kept.
 *
 * `assets` is the persistence move's map of url path to file path, and
 * `syncTimeoutMs`/`convergeTimeoutMs` bound the two waits that make the claim:
 * how long B has to agree with A, and how long a page opened afterwards has to
 * catch up with both.
 */
export type ConvergenceExamSpec = {
  clock: string;
  server: string;
  entry: string;
  assets?: Record<string, string>;
  module: string;
  action: Action | Action[];
  expected: string;
  view?: View | View[];
  mutant: MutantEdit[];
  syncTimeoutMs?: number;
  convergeTimeoutMs?: number;
};

/**
 * What a convergence run leaves on the record: the four readings it judges, the
 * object's own rows, every transition of the session and the two walls.
 *
 * `stores.a` is page A's content read straight after the action — the reading
 * the other three are compared against — and `stores.object` is what the module
 * object itself answers, which is the one reading no page could have faked.
 * `runtime` names the port and the copy the exam ran on, both gone by the time
 * a reader sees them, which is how a reader checks they were let go.
 */
export type ConvergenceRecord = {
  module: string;
  stores: {a: Snapshot; b: Snapshot; c: Snapshot; object: Snapshot};
  rows: Record<string, unknown[]>;
  transitions: SessionTransition[];
  walls: {sync_ms: number; converge_ms: number};
  runtime: {port: number; dir: string};
};

/**
 * One finished transaction of a module object, as the root reports it.
 *
 * Spelled here rather than imported from `./surface` so that a record's type
 * costs nothing at runtime; `surface.ts` owns the socket that delivers them.
 */
export type SessionTransition = {
  module: string;
  seq: number;
  content: Snapshot;
  at: number;
};

/**
 * What one exam run records.
 *
 * `walls.action_ms` is the interaction's own wall, `null` when the action was a
 * callback and there was no interaction to time; `walls.browser` says whether a
 * page was opened at all. `contract.pinned_in_page` says which contract held the
 * action: `true` when it ran in a page whose clock the driver pinned and whose
 * every request the driver blocked, `false` when `withContract` held it here.
 *
 * The four persistence keys — `walls.persist_ms`, `walls.reload_ms`, `rows` and
 * `domBefore` — are optional, so a record from any other move still is one:
 * only a page that was saved and reloaded has a save to time, rows of its own
 * to read, or a document from before the reload to show.
 *
 * `convergence` is the same rule once more: only a run that opened three pages
 * onto one module object has three stores to compare or a session of
 * transitions to show.
 */
export type ExamRecord = {
  walls: {
    store_ms: number;
    render_ms: number | null;
    action_ms: number | null;
    mutant_ms: number;
    persist_ms?: number;
    reload_ms?: number;
    render: 'ran' | 'skipped';
    browser: 'ran' | 'skipped';
  };
  mutant: {killed: boolean; path: string; edits: MutantEdit[]};
  contract: {clock: string; breach: string | null; pinned_in_page: boolean};
  storeDiff: Difference[];
  rows?: {sql: string; rows: unknown[]; content: Snapshot; diff: Difference[]};
  convergence?: ConvergenceRecord;
  domBefore?: string;
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
