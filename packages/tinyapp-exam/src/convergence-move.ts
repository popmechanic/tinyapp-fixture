/**
 * The convergence move: two pages onto one real module object, an action in the
 * first, and the question of whether everything else arrives where it went.
 *
 * The persistence move asks whether a page's own storage kept what it was
 * given. This one asks the question a synced app is actually judged by, which no
 * single page can answer: three replicas and the object between them agree, or
 * the app is not a synced app. So the exam starts a `celld dev` on a copy of the
 * repository's server, opens page A and page B onto the module it names, acts in
 * A, and waits for B to say what A says. Then it reads the module object itself
 * — its `getContent()` and the rows its persister wrote — because a pair of
 * pages agreeing with each other could both be wrong, and the object is the one
 * reading no page could have faked. Then a third page, opened after the fact,
 * which has to reach the same state from nothing at all.
 *
 * Two things the persistence move does are not done here. The page is unflagged
 * and unseeded, told only `window.__TINYAPP_SYNC__` — the handle that makes an
 * ordinary page dial an origin the exam names instead of its built-in one — so
 * nothing about it is in exam mode except where it syncs to. And its
 * `WebSocket` is left alone: a synced page dials a socket on purpose, and a
 * constructor that threw would be an exam refusing the thing it came to watch.
 * The wall around it is a list instead: the page's own loopback origin and the
 * runtime's, both on 127.0.0.1, and every other request failed in the browser.
 *
 * Every transition the module object reported during the session is kept, from
 * a socket opened before the first page. That is the session on the record: the
 * seed, the first sync, the action and each replica's catch-up, in the object's
 * own numbering, so a reader of a red run can see where the state stopped
 * moving.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {test} from 'bun:test';

import {launchBrowser, type Browser, type Page} from './browser';
import {startCelld, type Celld} from './celld';
import {evidenceDir, examStem, writeEvidence} from './evidence';
import {applyMutant, mutantPath} from './mutant';
import {assertView, bundleOf, renderHtml} from './render-move';
import {
  STATE_EXAM_TIMEOUT_MS,
  type ExamOptions,
  type ExamOutcome,
} from './state-exam';
import {diffContent, renderDiff, READ_CONTENT} from './store-move';
import {examSurface, type ExamSurface} from './surface';
import {
  actionsOf,
  isCallbackAction,
  type ConvergenceExamSpec,
  type ExamRecord,
  type SessionTransition,
  type Snapshot,
} from './types';

export type {ConvergenceExamSpec} from './types';

/** How long B has to agree with A after the action, by default. */
export const SYNC_TIMEOUT_MS = 10_000;

/** How long a page opened afterwards has to catch up with A, by default. */
export const CONVERGE_TIMEOUT_MS = 10_000;

/** How long a page has to hand its store out before it is called unopened. */
const STORE_TIMEOUT_MS = 30_000;

/** How often either of the three waits looks again. */
const POLL_MS = 50;

/** The prefix every failure of this move carries. */
const CONVERGENCE = 'convergence: ';

/**
 * The six sentences a failed convergence exam is reported in.
 *
 * Written once and read by every branch below, so that the wording a peer's
 * exam pins by prefix has exactly one place it can drift from.
 */
const FAILED = {
  sync: (ms: number): string => `${CONVERGENCE}B never matched A within ${ms} ms`,
  converge: (ms: number): string =>
    `${CONVERGENCE}C never converged within ${ms} ms`,
  pageA: `${CONVERGENCE}page A differs from expected`,
  object: `${CONVERGENCE}module object differs from expected`,
  view: `${CONVERGENCE}view not satisfied`,
  mutant: `${CONVERGENCE}mutant survived`,
} as const;

/** The one expression the store wait reads a page's readiness through. */
const READY_PROBE = 'JSON.stringify(window.__TINYAPP_STORE__ !== undefined)';

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

/** The page store's content. The page answers a string; a stand-in may answer the pair. */
const readContent = async (page: Page): Promise<Snapshot> => {
  const read = await page.evaluate(READ_CONTENT);
  return (typeof read === 'string' ? JSON.parse(read) : read) as Snapshot;
};

/**
 * The loopback origin this exam's page is served from — the persistence move's
 * rule, for the same two reasons.
 *
 * Every path answers the page, because an app that sends `/` to a room of its
 * own has to find the page at that room's path too; a path `assets` names
 * answers that file's own bytes, because a module fetching a sibling of its own
 * document asks the origin root for it.
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
            'content-type': path.endsWith('.wasm')
              ? 'application/wasm'
              : file.type,
          },
        });
      }
      return new Response(html, {
        headers: {'content-type': 'text/html; charset=utf-8'},
      });
    },
  });

/** Waits until the page has handed its store out; false when it never does. */
const waitStore = async (page: Page, timeoutMs: number): Promise<boolean> => {
  const started = performance.now();
  for (;;) {
    // An evaluate that throws is a document mid-navigation: not ready, and the
    // next look lands on the new one.
    const ready = await page
      .evaluate(READY_PROBE)
      .then((read) => String(read) === 'true')
      .catch(() => false);
    if (ready) {
      return true;
    }
    if (performance.now() - started >= timeoutMs) {
      return false;
    }
    await after(POLL_MS);
  }
};

/**
 * Waits until `page`'s store says exactly what `wanted` says.
 *
 * The first look happens before the deadline is consulted, so a timeout of one
 * millisecond over a page that already agrees is a pass rather than a race: the
 * claim is that the replicas agree, and a replica that agreed immediately has
 * not failed to.
 */
const waitContent = async (
  page: Page,
  wanted: Snapshot,
  timeoutMs: number,
): Promise<boolean> => {
  const started = performance.now();
  for (;;) {
    const agreed = await readContent(page)
      .then((content) => diffContent(content, wanted).length === 0)
      .catch(() => false);
    if (agreed) {
      return true;
    }
    if (performance.now() - started >= timeoutMs) {
      return false;
    }
    await after(POLL_MS);
  }
};

/** The record a run starts from: every wall zero, nothing read, nothing reached. */
const freshRecord = (spec: ConvergenceExamSpec): ExamRecord => ({
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

/** What the walk of one session is handed, once the runtime and the pages exist. */
type Walk = {
  spec: ConvergenceExamSpec;
  record: ExamRecord;
  surface: ExamSurface;
  transitions: SessionTransition[];
  runtime: Celld;
  open: () => Promise<Page>;
  pages: Page[];
};

/**
 * Opens the three pages, acts, waits twice, reads the object, and reports the
 * first failure of the session — `null` when the exam holds.
 *
 * Every step runs before any of them is judged, so a red run's evidence is as
 * complete as a green one's: a session whose B never caught up still records
 * the object's rows, page C's reading and the whole list of transitions, which
 * is exactly what a reader needs to see where it stopped. The judgment then
 * walks the steps in the order they ran.
 */
const walk = async ({
  spec,
  record,
  surface,
  transitions,
  runtime,
  open,
  pages,
}: Walk): Promise<string | null> => {
  const syncTimeoutMs = spec.syncTimeoutMs ?? SYNC_TIMEOUT_MS;
  const convergeTimeoutMs = spec.convergeTimeoutMs ?? CONVERGE_TIMEOUT_MS;
  const expected = readSnapshot(spec.expected);

  const navigatedAt = performance.now();
  const a = await open();
  pages.push(a);
  if (!(await waitStore(a, STORE_TIMEOUT_MS))) {
    throw new Error(
      `${CONVERGENCE}page A never handed its store out within ${STORE_TIMEOUT_MS} ms`,
    );
  }
  record.walls.store_ms = since(navigatedAt);

  const b = await open();
  pages.push(b);
  if (!(await waitStore(b, STORE_TIMEOUT_MS))) {
    throw new Error(
      `${CONVERGENCE}page B never handed its store out within ${STORE_TIMEOUT_MS} ms`,
    );
  }

  const actedAt = performance.now();
  for (const action of actionsOf(spec.action)) {
    await a.act(action);
  }
  record.walls.action_ms = since(actedAt);

  // A's post-action content, and not a snapshot taken before it: the wait is
  // for B to agree with what A has become, and B already agreed with what A was.
  const aContent = await readContent(a);

  const syncedAt = performance.now();
  const synced = await waitContent(b, aContent, syncTimeoutMs);
  const sync_ms = since(syncedAt);
  const bContent = await readContent(b);

  // The object's own two readings, taken between the two waits so that page C
  // is opened onto a module that has already been asked what it holds.
  const objectContent = await surface.content(spec.module);
  const rows = await surface.rows(spec.module);

  const c = await open();
  pages.push(c);
  if (!(await waitStore(c, STORE_TIMEOUT_MS))) {
    throw new Error(
      `${CONVERGENCE}page C never handed its store out within ${STORE_TIMEOUT_MS} ms`,
    );
  }
  const convergedAt = performance.now();
  const converged = await waitContent(c, aContent, convergeTimeoutMs);
  const converge_ms = since(convergedAt);
  const cContent = await readContent(c);

  record.convergence = {
    module: spec.module,
    stores: {a: aContent, b: bContent, c: cContent, object: objectContent},
    rows,
    transitions: transitions
      .filter((transition) => transition.module === spec.module)
      .sort((one, other) => one.seq - other.seq),
    walls: {sync_ms, converge_ms},
    runtime: {port: runtime.port, dir: runtime.dir},
  };

  // The picture is B's: A is the page that acted, and what the exam claims is
  // that a page which only watched shows the same thing.
  const renderedAt = performance.now();
  const shot = await b.snapshot();
  record.walls.render_ms = since(renderedAt);
  record.walls.render = 'ran';
  record.dom = shot.dom;
  record.screenshot = shot.screenshot;
  const viewFailures = assertView(shot.dom, spec.view);

  record.storeDiff = diffContent(aContent, expected);
  const objectDiff = diffContent(objectContent, expected);
  const cDiff = diffContent(cContent, expected);

  const mutatedAt = performance.now();
  record.mutant.killed =
    diffContent(aContent, applyMutant(expected, spec.mutant)).length > 0;
  record.walls.mutant_ms = since(mutatedAt);

  if (!synced) {
    return FAILED.sync(syncTimeoutMs);
  }
  if (!converged) {
    return FAILED.converge(convergeTimeoutMs);
  }
  if (record.storeDiff.length > 0) {
    return `${FAILED.pageA}\n${renderDiff(record.storeDiff)}`;
  }
  if (objectDiff.length > 0) {
    return `${FAILED.object}\n${renderDiff(objectDiff)}`;
  }
  // Unreachable while the two above hold — a C equal to A equal to `expected`
  // is equal to `expected` — and kept all the same, so that the third diff the
  // verdict is made of has a sentence of its own rather than a silent pass.
  if (cDiff.length > 0) {
    return `${FAILED.converge(convergeTimeoutMs)}\n${renderDiff(cDiff)}`;
  }
  if (viewFailures.length > 0) {
    return `${FAILED.view}\n${viewFailures.join('\n')}`;
  }
  return record.mutant.killed
    ? null
    : `${FAILED.mutant} — the perturbation ${record.mutant.path} is not told apart from the expected state`;
};

/**
 * Starts the runtime, builds and serves the page, opens the browser, and walks
 * the session.
 *
 * The runtime, the page server and any browser this call launched are let go in
 * a `finally` whatever the verdict: a `celld dev` left running holds its port
 * and its copy, a browser left running is a child of the test process, and the
 * next exam gets neither.
 */
const measure = async (
  spec: ConvergenceExamSpec,
  opts: ExamOptions,
  record: ExamRecord,
): Promise<string | null> => {
  if (isCallbackAction(spec.action)) {
    throw new Error(`${CONVERGENCE}the action must be an interaction`);
  }

  const entryPath = resolve(process.cwd(), spec.entry);
  const entryHtml = readFileSync(entryPath, 'utf8');
  const minify = opts.minify ?? (opts.unminified === true ? false : undefined);
  const {js, css} = await bundleOf(entryPath, entryHtml, {minify});
  const html = renderHtml(entryHtml, {js, css});

  const runtime = await startCelld({serverDir: spec.server, exam: true});
  const server = serveExam(html, spec.assets ?? {});
  const origin = `http://127.0.0.1:${server.port}`;
  // Held in objects rather than `let`s: each is the one thing this call may
  // have made, and the `finally` below lets it go whether or not it got there.
  const ours: {browser?: Browser} = {};
  const pages: Page[] = [];
  const transitions: SessionTransition[] = [];
  const surface = examSurface(runtime.url);
  // Opened before the first page, so the seed and the first sync are on the
  // record and the pre-action state is among the transitions.
  const events = surface.events((transition) => {
    transitions.push(transition);
  });

  try {
    const browser =
      opts.browser ??
      (ours.browser = await launchBrowser({env: opts.env ?? process.env}));
    record.walls.browser = 'ran';

    const openUrl = browser.openUrl;
    if (openUrl === undefined) {
      throw new Error(`${CONVERGENCE}this browser cannot open a served page`);
    }

    // The handle, and nothing else: no seed, no exam flag, no `WebSocket` stub.
    // Both spellings of the runtime are allowed through — the page fetches
    // `http://…` and upgrades `ws://…`, and the `Fetch` domain pauses each under
    // the scheme it was asked for.
    const prelude = `window.__TINYAPP_SYNC__ = ${JSON.stringify(runtime.ws)};`;
    const open = (): Promise<Page> =>
      openUrl.call(browser, {
        url: `${origin}/`,
        origin,
        clock: spec.clock,
        prelude,
        allow: [runtime.url, runtime.ws],
      });

    return await walk({spec, record, surface, transitions, runtime, open, pages});
  } finally {
    for (const page of pages) {
      await page.close().catch(() => {});
    }
    await ours.browser?.close().catch(() => {});
    await events.close().catch(() => {});
    server.stop(true);
    await runtime.stop().catch(() => {});
  }
};

/**
 * Runs one whole convergence exam and writes its record.
 *
 * Resolves `{ok, failure, record, dir}` — never rejects. A step that throws
 * becomes `failure`, and the record is still written, so a red exam leaves
 * evidence exactly as a green one does. `opts.env` defaults to `process.env`
 * and `opts.main` to `Bun.main`.
 */
export const runConvergenceExam = async (
  spec: ConvergenceExamSpec,
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
  }

  writeEvidence(dir, record);
  return {ok: failure === null, failure, record, dir};
};

/**
 * Registers one convergence exam as one bun test, named for the file that
 * declares it — the same rule `stateExam` and `persistenceExam` follow, and the
 * same wall.
 */
export const convergenceExam = (spec: ConvergenceExamSpec): void => {
  test(
    `convergence exam: ${examStem(Bun.main)}`,
    async () => {
      const outcome = await runConvergenceExam(spec);
      if (!outcome.ok) {
        throw new Error(outcome.failure ?? 'convergence exam failed');
      }
    },
    {timeout: STATE_EXAM_TIMEOUT_MS},
  );
};
