/**
 * The persistence move: open the app with nothing behind it, do something, wait
 * for the save, reload the page, and ask whether what was done is still there.
 *
 * Every other move reads a state the exam put into the page. This one reads a
 * state the *page* put into its own storage, which is why almost none of the
 * other move's scaffolding fits. There is no seed, because a seeded page is a
 * page told what to be; there is no second fresh page, because the reload is
 * itself a second document reading the same storage, and that is the whole
 * question. And there is an origin: `localStorage` and a SQLite persister are
 * partitioned by origin, and a `data:` page has none — so the page is served
 * from a loopback server this move starts and stops, on a port the OS picks, so
 * that two exams in one `bun test` never share a storage.
 *
 * Nothing leaves the machine all the same. The browser pauses every request and
 * refuses the ones that are not to that origin, and a page that constructs a
 * `WebSocket` finds a constructor that records the url and throws — a breach the
 * exam reports rather than a socket it opens.
 *
 * The state is read back twice over, because the two readings can disagree and
 * the disagreement is the finding: `window.__TINYAPP_STORE__` is what the page
 * believes, and the persister's own row is what it wrote down. An app that
 * renders from memory and saves nothing passes the first and fails the second.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {test} from 'bun:test';

import {launchBrowser, type Browser, type Page} from './browser';
import {evidenceDir, examStem, writeEvidence} from './evidence';
import {applyMutant, mutantPath} from './mutant';
import {assertView, bundleOf, renderHtml} from './render-move';
import {
  STATE_EXAM_TIMEOUT_MS,
  type ExamOptions,
  type ExamOutcome,
} from './state-exam';
import {diffContent, renderDiff, READ_CONTENT} from './store-move';
import {
  actionsOf,
  isCallbackAction,
  type Cell,
  type ExamRecord,
  type PersistenceExamSpec,
  type Snapshot,
  type Tables,
  type Values,
} from './types';

export type {PersistenceExamSpec} from './types';

/** How long the page has to report its persister loaded, by default. */
export const READY_TIMEOUT_MS = 30_000;

/** How long the persister's rows have to catch up with the store, by default. */
export const PERSIST_TIMEOUT_MS = 10_000;

/** How often either of those two waits looks again. */
const POLL_MS = 50;

/** The prefix a contract breach's message carries. */
const BREACH = 'contract breach: ';

/**
 * What runs in the page before a line of the app does, after the clock pin.
 *
 * The flag is how the app knows it is under examination and must hand its store,
 * its database and its persister out rather than keep them to itself. The
 * `WebSocket` replacement is how a breach is caught rather than merely
 * forbidden: the constructor records the first url it was given and throws, so
 * the exam can name the url a page tried to dial, and a page that only ever
 * meant to sync quietly cannot.
 */
export const EXAM_PRELUDE =
  'window.__TINYAPP_EXAM__ = true;\n' +
  'window.__TINYAPP_BREACH__ = null; globalThis.WebSocket = class ' +
  "{ constructor(u) { if (window.__TINYAPP_BREACH__ === null) " +
  "{ window.__TINYAPP_BREACH__ = String(u); } " +
  "throw new Error('contract breach: ' + String(u)); } };";

/** The one expression the readiness wait reads the page's two signals through. */
const READY_PROBE =
  'JSON.stringify([window.__TINYAPP_PERSISTER__ !== undefined, ' +
  'window.__TINYAPP_BREACH__ ?? null])';

/** TinyBase's spelling, in JSON, of a cell or a value that was deleted: U+FFFC. */
const TOMBSTONE = '\uFFFC';

/** A promise that settles after `ms`, its timer unref'd so it holds nothing open. */
const after = (ms: number): Promise<void> =>
  new Promise((done) => {
    const timer = setTimeout(done, ms);
    (timer as unknown as {unref?: () => void}).unref?.();
  });

/** Milliseconds since `started`, never negative. */
const since = (started: number): number =>
  Math.max(0, performance.now() - started);

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Reads a snapshot from a path relative to `process.cwd()`. */
const readSnapshot = (path: string): Snapshot =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as Snapshot;

/** The body of a `[value, hlc, hash]` triple, or `undefined` when it is not one. */
const bodyOf = (stamped: unknown): unknown =>
  Array.isArray(stamped) ? (stamped as unknown[])[0] : undefined;

/** The entries of the object a triple carries, `[]` when it carries none. */
const entriesOf = (stamped: unknown): [string, unknown][] => {
  const body = bodyOf(stamped);
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? Object.entries(body as Record<string, unknown>)
    : [];
};

/** True of a cell or value that is still there — neither deleted nor absent. */
const isLive = (value: unknown): value is Cell =>
  value !== TOMBSTONE &&
  (typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean');

/**
 * The plain `[tables, values]` snapshot of a stamped one.
 *
 * The persister keeps its JSON as TinyBase's *mergeable* content — every table,
 * row, cell and value wrapped in a `[value, hlc, hash]` triple, so that two
 * replicas can be merged without either losing — and a deleted cell is kept
 * there rather than removed, spelled as the one character `\uFFFC`, because a
 * tombstone is what tells a later merge that the cell went away on purpose.
 * Neither is anything an examiner wrote in an expected file, so both come off
 * here.
 *
 * It is hand-written rather than a TinyBase load, and measured:
 * `createMergeableStore().setMergeableContent(<content carrying tombstones>)
 * .getContent()` is `[{}, {}]` — the load rejects the shape outright rather than
 * stripping it — so there is nothing to delegate to. A row or a table left with
 * nothing goes too: an examiner who deleted the last cell of a row deleted the
 * row, and an expected file says so by not mentioning it.
 */
export const contentOf = (stamped: unknown): Snapshot => {
  const pair = Array.isArray(stamped) ? (stamped as unknown[]) : [];

  const tables: Tables = {};
  for (const [tableId, stampedRows] of entriesOf(pair[0])) {
    const rows: Record<string, Record<string, Cell>> = {};
    for (const [rowId, stampedCells] of entriesOf(stampedRows)) {
      const cells: Record<string, Cell> = {};
      for (const [cellId, stampedCell] of entriesOf(stampedCells)) {
        const cell = bodyOf(stampedCell);
        if (isLive(cell)) {
          cells[cellId] = cell;
        }
      }
      if (Object.keys(cells).length > 0) {
        rows[rowId] = cells;
      }
    }
    if (Object.keys(rows).length > 0) {
      tables[tableId] = rows;
    }
  }

  const values: Values = {};
  for (const [valueId, stampedValue] of entriesOf(pair[1])) {
    const value = bodyOf(stampedValue);
    if (isLive(value)) {
      values[valueId] = value;
    }
  }

  return [tables, values];
};

/**
 * The persister's one row read as a snapshot.
 *
 * Rows that are not exactly one `_id` `'_'` row carrying a string read as
 * `[{}, {}]` — the empty state — rather than as an error: a table the app never
 * wrote to and a table it emptied are the same reading, and both are a state the
 * diff against `expected` can speak about.
 */
const contentOfRows = (rows: unknown[]): Snapshot => {
  if (rows.length !== 1) {
    return [{}, {}];
  }
  const {_id, store} = (rows[0] ?? {}) as {_id?: unknown; store?: unknown};
  if (_id !== '_' || typeof store !== 'string') {
    return [{}, {}];
  }
  try {
    return contentOf(JSON.parse(store));
  } catch {
    return [{}, {}];
  }
};

/** The one statement the exam reads the persister's table through. */
const sqlFor = (table: string): string => `SELECT _id, store FROM "${table}"`;

/** That statement as the `oo1.DB` call the page answers it with. */
const rowsQuery = (sql: string): string =>
  `JSON.stringify(window.__TINYAPP_DB__.exec(${JSON.stringify({
    sql,
    returnValue: 'resultRows',
    rowMode: 'object',
  })}))`;

/** The page store's content. The page answers a string; a stand-in may answer the pair. */
const readContent = async (page: Page): Promise<Snapshot> => {
  const read = await page.evaluate(READ_CONTENT);
  return (typeof read === 'string' ? JSON.parse(read) : read) as Snapshot;
};

/** The rows the page's own database answers, `[]` when it answers no list. */
const readRows = async (page: Page, sql: string): Promise<unknown[]> => {
  const read = await page.evaluate(rowsQuery(sql));
  const parsed = typeof read === 'string' ? JSON.parse(read) : read;
  return Array.isArray(parsed) ? (parsed as unknown[]) : [];
};

/** What one look at a loading page found. */
type Readiness = {ready: boolean; breach: string | null};

/**
 * Waits for the page to report its persister loaded.
 *
 * The breach is read on every look rather than after the wait, and that is the
 * load-bearing half of it: a page whose `WebSocket` constructor throws throws
 * out of the module that was going to set the persister handle, so a wait that
 * only asked about readiness would sit out its whole timeout and then report the
 * wrong thing — a page that never loaded, rather than the page that tried to
 * dial.
 */
const waitReady = async (page: Page, timeoutMs: number): Promise<Readiness> => {
  const started = performance.now();
  for (;;) {
    // An evaluate that throws is a document mid-navigation, which is not ready
    // and has breached nothing: the next look lands on the new one.
    const look = await page
      .evaluate(READY_PROBE)
      .then((read) => JSON.parse(String(read)) as [boolean, string | null])
      .catch((): [boolean, string | null] => [false, null]);

    if (look[1] !== null) {
      return {ready: false, breach: look[1]};
    }
    if (look[0]) {
      return {ready: true, breach: null};
    }
    if (performance.now() - started >= timeoutMs) {
      return {ready: false, breach: null};
    }
    await after(POLL_MS);
  }
};

/**
 * Waits until the persister's rows say what the page's store says.
 *
 * That is the save, observed rather than assumed: a persister writes on its own
 * schedule, and the only honest signal that it has written is the row coming
 * back equal to the store it was written from.
 */
const waitPersisted = async (
  page: Page,
  sql: string,
  timeoutMs: number,
): Promise<boolean> => {
  // A look that throws is the page between documents, or a database it has not
  // handed out yet: not a match, and the next look asks again.
  const look = async (): Promise<boolean> =>
    diffContent(
      contentOfRows(await readRows(page, sql)),
      await readContent(page),
    ).length === 0;

  const started = performance.now();
  for (;;) {
    if (await look().catch(() => false)) {
      return true;
    }
    if (performance.now() - started >= timeoutMs) {
      return false;
    }
    await after(POLL_MS);
  }
};

/**
 * The loopback origin this exam is served from: the page for every path, and a
 * named asset's own bytes for the paths `assets` names.
 *
 * Every path, because an app that sends `/` to a room of its own lands the
 * reload on that room's path and the page has to be there too. And an asset map
 * at all, because a module fetching a sibling of its own document — a
 * `sqlite3.wasm` beside an `import.meta.url` — asks the origin root for it.
 */
const serveExam = (
  html: string,
  assets: Record<string, string>,
): ReturnType<typeof Bun.serve> =>
  Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request: Request): Response {
      const path = new URL(request.url).pathname;
      const asset = assets[path];
      if (asset !== undefined) {
        const file = Bun.file(resolve(process.cwd(), asset));
        return new Response(file, {
          headers: {
            'content-type': path.endsWith('.wasm') ? 'application/wasm' : file.type,
          },
        });
      }
      return new Response(html, {
        headers: {'content-type': 'text/html; charset=utf-8'},
      });
    },
  });

/** The record a run starts from: every wall zero, nothing read, nothing reached. */
const freshRecord = (spec: PersistenceExamSpec): ExamRecord => ({
  walls: {
    store_ms: 0,
    render_ms: null,
    action_ms: null,
    mutant_ms: 0,
    render: 'skipped',
    browser: 'skipped',
  },
  mutant: {killed: false, path: mutantPath(spec.mutant), edits: spec.mutant},
  contract: {clock: spec.clock, breach: null, pinned_in_page: true},
  storeDiff: [],
});

/** What the walk of one page is handed. */
type Walk = {
  spec: PersistenceExamSpec;
  opts: ExamOptions;
  record: ExamRecord;
  page: Page;
  /** When `Page.navigate` was sent, which is where `store_ms` is measured from. */
  navigatedAt: number;
};

/**
 * Acts on the page, reloads it, and reports the first failure of the walk —
 * `null` when the exam holds.
 *
 * The order of the failures is the order of the walk, and every step that
 * resolved is on the record before any of them is judged, so a red exam's
 * evidence is as complete as a green one's.
 */
const walk = async ({
  spec,
  opts,
  record,
  page,
  navigatedAt,
}: Walk): Promise<string | null> => {
  const readyTimeoutMs = opts.readyTimeoutMs ?? READY_TIMEOUT_MS;
  const persistTimeoutMs = opts.persistTimeoutMs ?? PERSIST_TIMEOUT_MS;
  const notReady = `persistence: page never reported its persister loaded within ${readyTimeoutMs} ms`;

  const reload = page.reload;
  if (reload === undefined) {
    throw new Error('persistence: this page cannot be reloaded');
  }

  const expected = readSnapshot(spec.expected);
  const sql = sqlFor(spec.table);

  const first = await waitReady(page, readyTimeoutMs);
  record.walls.store_ms = since(navigatedAt);
  if (first.breach !== null) {
    record.contract.breach = `${BREACH}${first.breach}`;
    return record.contract.breach;
  }
  if (!first.ready) {
    return notReady;
  }

  const actedAt = performance.now();
  for (const action of actionsOf(spec.action)) {
    await page.act(action);
  }
  record.walls.action_ms = since(actedAt);

  const savedAt = performance.now();
  const persisted = await waitPersisted(page, sql, persistTimeoutMs);
  record.walls.persist_ms = since(savedAt);
  if (!persisted) {
    return `persistence: rows never matched the store within ${persistTimeoutMs} ms`;
  }

  record.domBefore = (await page.snapshot()).dom;

  const reloadedAt = performance.now();
  await reload.call(page);
  const second = await waitReady(page, readyTimeoutMs);
  record.walls.reload_ms = since(reloadedAt);
  if (second.breach !== null) {
    record.contract.breach = `${BREACH}${second.breach}`;
    return record.contract.breach;
  }
  if (!second.ready) {
    return notReady;
  }

  // What the page believes, and what its persister wrote down. Both are read
  // after the reload, so both are readings of a state that survived it.
  const content = await readContent(page);
  const rows = await readRows(page, sql);
  const rowsContent = contentOfRows(rows);
  record.storeDiff = diffContent(content, expected);
  record.rows = {
    sql,
    rows,
    content: rowsContent,
    diff: diffContent(rowsContent, expected),
  };

  const renderedAt = performance.now();
  const shot = await page.snapshot();
  record.walls.render_ms = since(renderedAt);
  record.walls.render = 'ran';
  record.dom = shot.dom;
  record.screenshot = shot.screenshot;
  const viewFailures = assertView(shot.dom, spec.view);

  // The mutant is judged against the state that survived, not the one that was
  // saved: an exam the perturbation would not have failed is hollow, and it is
  // the reloaded reading the exam is actually making its claim about.
  const mutatedAt = performance.now();
  const perturbed = applyMutant(expected, spec.mutant);
  record.mutant.killed = diffContent(content, perturbed).length > 0;
  record.walls.mutant_ms = since(mutatedAt);

  if (record.storeDiff.length > 0) {
    return `persistence: expected state not reached after reload\n${renderDiff(
      record.storeDiff,
    )}`;
  }
  if (record.rows.diff.length > 0) {
    return `persistence: rows differ from expected\n${renderDiff(record.rows.diff)}`;
  }
  if (viewFailures.length > 0) {
    return `render: view not satisfied\n${viewFailures.join('\n')}`;
  }
  return record.mutant.killed
    ? null
    : `hollow exam: mutant ${record.mutant.path} not distinguished`;
};

/**
 * Builds the unseeded page, serves it, opens it, and walks it.
 *
 * The server and any browser this call launched are closed in a `finally`
 * whatever the verdict — a browser left running is a child of the test process
 * and a server left listening is a port the next exam may not get.
 */
const measure = async (
  spec: PersistenceExamSpec,
  opts: ExamOptions,
  record: ExamRecord,
): Promise<string | null> => {
  if (isCallbackAction(spec.action)) {
    throw new Error('persistence: the action must be an interaction');
  }

  const entryPath = resolve(process.cwd(), spec.entry);
  const entryHtml = readFileSync(entryPath, 'utf8');
  const minify = opts.minify ?? (opts.unminified === true ? false : undefined);
  const {js, css} = await bundleOf(entryPath, entryHtml, {minify});
  const html = renderHtml(entryHtml, {js, css});

  const server = serveExam(html, spec.assets ?? {});
  const origin = `http://127.0.0.1:${server.port}`;
  // Held in an object rather than a `let`: this is the one browser the exam may
  // launch, and the `finally` below closes it whether or not it got that far.
  const ours: {browser?: Browser} = {};
  try {
    const browser =
      opts.browser ??
      (ours.browser = await launchBrowser({env: opts.env ?? process.env}));
    record.walls.browser = 'ran';

    const openUrl = browser.openUrl;
    if (openUrl === undefined) {
      throw new Error('persistence: this browser cannot open a served page');
    }

    const navigatedAt = performance.now();
    const page = await openUrl.call(browser, {
      url: `${origin}/`,
      origin,
      clock: spec.clock,
      prelude: EXAM_PRELUDE,
    });
    try {
      return await walk({spec, opts, record, page, navigatedAt});
    } finally {
      await page.close().catch(() => {});
    }
  } finally {
    await ours.browser?.close().catch(() => {});
    server.stop(true);
  }
};

/**
 * Runs one whole persistence exam and writes its record.
 *
 * Resolves `{ok, failure, record, dir}` — never rejects. A step that throws
 * becomes `failure`, and the record is still written, so a red exam leaves
 * evidence exactly as a green one does. `opts.env` defaults to `process.env` and
 * `opts.main` to `Bun.main`.
 */
export const runPersistenceExam = async (
  spec: PersistenceExamSpec,
  opts: ExamOptions = {},
): Promise<ExamOutcome> => {
  const env = opts.env ?? process.env;
  const dir = evidenceDir(examStem(opts.main ?? Bun.main), env);
  const record = freshRecord(spec);

  let failure: string | null = null;
  try {
    failure = await measure(spec, opts, record);
  } catch (error) {
    failure = messageOf(error);
    if (failure.startsWith(BREACH)) {
      record.contract.breach = failure;
    }
  }

  writeEvidence(dir, record);
  return {ok: failure === null, failure, record, dir};
};

/**
 * Registers one persistence exam as one bun test, named for the file that
 * declares it — the same rule `stateExam` follows, and the same wall.
 */
export const persistenceExam = (spec: PersistenceExamSpec): void => {
  test(
    `persistence exam: ${examStem(Bun.main)}`,
    async () => {
      const outcome = await runPersistenceExam(spec);
      if (!outcome.ok) {
        throw new Error(outcome.failure ?? 'persistence exam failed');
      }
    },
    {timeout: STATE_EXAM_TIMEOUT_MS},
  );
};
