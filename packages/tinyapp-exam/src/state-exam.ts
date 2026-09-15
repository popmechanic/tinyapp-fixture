/**
 * The whole exam: the three moves in the spec's order, the record they leave
 * behind, and the single `bun test` that carries them.
 *
 * The order is the spec's and it is load-bearing. The store move goes first,
 * because a state that was never reached needs no picture — and because an exam
 * probed before its implementation exists must never open a page for nothing.
 * The mutant goes last, because it judges the exam rather than the app: an exam
 * a named perturbation would not have failed is hollow however green it looks.
 *
 * An action that is an interaction folds the first two moves into one: the page
 * the store move opened is the page the render move reports, because a picture
 * of a second page would be a picture of something else.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {test} from 'bun:test';

import {launchBrowser, type Browser} from './browser';
import {evidenceDir, examStem, writeEvidence} from './evidence';
import {applyMutant, mutantPath} from './mutant';
import {assertView, renderMove} from './render-move';
import {browserStoreMove, diffContent, renderDiff, storeMove} from './store-move';
import {
  isCallbackAction,
  type Difference,
  type ExamRecord,
  type ExamStore,
  type Snapshot,
  type StateExamSpec,
} from './types';

export type {ExamRecord, ExamStore, Snapshot, StateExamSpec} from './types';

/** What a caller may hand `runStateExam` instead of the ambient defaults. */
export type ExamOptions = {
  env?: Record<string, string | undefined>;
  main?: string;
  /**
   * The browser every page of this exam is opened in. One is launched — and
   * closed again — when none is given; a caller that passes one keeps it.
   */
  browser?: Browser;
  /**
   * Whether the page's bundle is minified, `true` by default. `false` is the
   * unminified build, which for this fixture is a `data:` URL over the
   * browser's ceiling — a test asks for it to see that refused.
   */
  minify?: boolean;
  /** The same thing the other way round, for a test that reads better so. */
  unminified?: boolean;
};

/** One exam run's verdict, its record, and where that record was written. */
export type ExamOutcome = {
  ok: boolean;
  failure: string | null;
  record: ExamRecord;
  dir: string;
};

/** The prefix a contract breach's message carries. */
const BREACH = 'contract breach: ';

/**
 * The wall one registered exam is given, in milliseconds.
 *
 * bun's per-test default is 5000 ms, and a healthy render move — bundling the
 * app and opening a page of a megabyte in a freshly spawned browser — costs
 * seconds, so the default kills the exam on the machines that actually render.
 * Two minutes is the wall the driver's own timeouts sit well inside.
 */
export const STATE_EXAM_TIMEOUT_MS = 120_000;

/** Reads a snapshot from a path relative to `process.cwd()`. */
const readSnapshot = (path: string): Snapshot =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as Snapshot;

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Fills in the two evidence keys a page would have supplied.
 *
 * A browser that never opened leaves no markup and no picture, and a red exam's
 * evidence is meant to be as complete as a green one's — so the exam that asked
 * for a page files the six files either way, the two of them empty.
 */
const emptyEvidence = (record: ExamRecord): void => {
  record.dom ??= '';
  record.screenshot ??= new Uint8Array();
};

/**
 * Runs the three moves, filling `record` as it goes, and returns the first
 * failure they found — `null` when the exam holds.
 *
 * Every move that resolves is recorded before any of them is judged, so the
 * evidence of a red exam is as complete as the evidence of a green one.
 */
const runMoves = async <S extends ExamStore>(
  spec: StateExamSpec<S>,
  opts: ExamOptions,
  record: ExamRecord,
  browserFor: () => Promise<Browser>,
): Promise<string | null> => {
  const minify = opts.minify ?? (opts.unminified === true ? false : undefined);
  let content: Snapshot;
  let diff: Difference[];
  let viewFailures: string[] = [];

  if (isCallbackAction(spec.action)) {
    const moved = await storeMove(spec);
    record.walls.store_ms = moved.ms;
    record.storeDiff = moved.diff;
    ({content, diff} = moved);

    // Move two, only over a state the examiner actually expected — and only for
    // a spec that names an entry, since there is otherwise no page to build.
    if (diff.length === 0 && spec.entry !== undefined && spec.entry !== '') {
      try {
        const browser = await browserFor();
        record.walls.browser = 'ran';
        const rendered = await renderMove({
          entry: spec.entry,
          content,
          view: spec.view,
          clock: spec.clock,
          browser,
          minify,
        });
        record.walls.render = rendered.render;
        record.walls.render_ms = rendered.ms;
        record.dom = rendered.dom;
        record.screenshot = rendered.screenshot;
        viewFailures = rendered.failures;
      } catch (error) {
        emptyEvidence(record);
        throw error;
      }
    }
  } else {
    // One page, two moves: the interaction happened in it and the picture is of
    // it. Nothing here opens a second page to photograph.
    try {
      const browser = await browserFor();
      record.walls.browser = 'ran';
      const moved = await browserStoreMove(spec, browser, {minify});
      record.walls.store_ms = moved.ms;
      record.walls.action_ms = moved.actionMs;
      record.walls.render = 'ran';
      record.walls.render_ms = moved.renderMs;
      record.storeDiff = moved.diff;
      record.dom = moved.dom;
      record.screenshot = moved.screenshot;
      ({content, diff} = moved);
      viewFailures = assertView(moved.dom, spec.view);
    } catch (error) {
      emptyEvidence(record);
      throw error;
    }
  }

  // Move three: would the named perturbation of the expected state have shown
  // up as a difference from what the store actually reached?
  const started = performance.now();
  const perturbed = applyMutant(readSnapshot(spec.expected), spec.mutant);
  record.mutant.killed = diffContent(content, perturbed).length > 0;
  record.walls.mutant_ms = Math.max(0, performance.now() - started);

  if (diff.length > 0) {
    return `store move: expected state not reached\n${renderDiff(diff)}`;
  }
  if (viewFailures.length > 0) {
    return `render: view not satisfied\n${viewFailures.join('\n')}`;
  }
  return record.mutant.killed
    ? null
    : `hollow exam: mutant ${record.mutant.path} not distinguished`;
};

/**
 * Runs one whole state exam and writes its record.
 *
 * Resolves `{ok, failure, record, dir}` — never rejects. A move that throws
 * becomes `failure`, and the record is still written, so a red exam leaves
 * evidence exactly as a green one does. `opts.env` defaults to `process.env`
 * and `opts.main` to `Bun.main`.
 *
 * At most one browser is launched, and only once a move actually needs a page:
 * a red store move never opens one, and neither does a callback action with no
 * entry. A browser launched here is closed in a `finally`, whatever the verdict.
 */
export const runStateExam = async <S extends ExamStore>(
  spec: StateExamSpec<S>,
  opts: ExamOptions = {},
): Promise<ExamOutcome> => {
  const env = opts.env ?? process.env;
  const dir = evidenceDir(examStem(opts.main ?? Bun.main), env);

  const record: ExamRecord = {
    walls: {
      store_ms: 0,
      render_ms: null,
      action_ms: null,
      mutant_ms: 0,
      render: 'skipped',
      browser: 'skipped',
    },
    mutant: {killed: false, path: mutantPath(spec.mutant), edits: spec.mutant},
    contract: {
      clock: spec.clock,
      breach: null,
      // A callback's contract is `withContract`, here in this process; an
      // interaction's is the page's own — the clock the driver pinned before a
      // line of the app ran, and the requests it blocked at the browser.
      pinned_in_page: !isCallbackAction(spec.action),
    },
    storeDiff: [],
  };

  // Held in an object rather than a `let`: this is the one browser the exam may
  // launch, and the `finally` below closes it whichever move asked for it.
  const ours: {browser?: Browser} = {};
  const browserFor = async (): Promise<Browser> =>
    opts.browser ?? (ours.browser ??= await launchBrowser({env}));

  let failure: string | null = null;
  try {
    failure = await runMoves(spec, opts, record, browserFor);
  } catch (error) {
    failure = messageOf(error);
    if (failure.startsWith(BREACH)) {
      record.contract.breach = failure;
    }
  } finally {
    await ours.browser?.close().catch(() => {});
  }

  writeEvidence(dir, record);
  return {ok: failure === null, failure, record, dir};
};

/**
 * Registers one exam as one bun test, named for the file that declares it.
 *
 * `Bun.main` is the running test file's path even when this module is the one
 * calling for it, so a file's whole exam is the single `stateExam({…})` in it.
 *
 * The registration carries `STATE_EXAM_TIMEOUT_MS` explicitly: the per-test
 * option beats both bun's 5000 ms default and any `--timeout` on the command
 * line, so an exam that renders is never cut off by a wall meant for unit tests.
 */
export const stateExam = <S extends ExamStore>(spec: StateExamSpec<S>): void => {
  test(
    `state exam: ${examStem(Bun.main)}`,
    async () => {
      const outcome = await runStateExam(spec);
      if (!outcome.ok) {
        throw new Error(outcome.failure ?? 'state exam failed');
      }
    },
    {timeout: STATE_EXAM_TIMEOUT_MS},
  );
};
