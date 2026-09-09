/**
 * The whole exam: the three moves in the spec's order, the record they leave
 * behind, and the single `bun test` that carries them.
 *
 * The order is the spec's and it is load-bearing. The store move goes first,
 * because a state that was never reached needs no picture — and because an exam
 * probed before its implementation exists must never dial the renderer. The
 * mutant goes last, because it judges the exam rather than the app: an exam a
 * named perturbation would not have failed is hollow however green it looks.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {test} from 'bun:test';

import {evidenceDir, examStem, writeEvidence} from './evidence';
import {applyMutant, mutantPath} from './mutant';
import {renderMove} from './render-move';
import {diffContent, renderDiff, storeMove} from './store-move';
import type {ExamRecord, ExamStore, Snapshot, StateExamSpec} from './types';

export type {ExamRecord, ExamStore, Snapshot, StateExamSpec} from './types';

/** What a caller may hand `runStateExam` instead of the ambient defaults. */
export type ExamOptions = {
  env?: Record<string, string | undefined>;
  main?: string;
  fetchImpl?: typeof fetch;
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
 * app and posting a page of a couple of megabytes to the renderer — costs
 * seconds, so the default kills the exam on the machines that actually render.
 * Two minutes is the wall the renderer's own timeouts sit well inside.
 */
export const STATE_EXAM_TIMEOUT_MS = 120_000;

/** Reads a snapshot from a path relative to `process.cwd()`. */
const readSnapshot = (path: string): Snapshot =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as Snapshot;

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
  env: Record<string, string | undefined>,
  record: ExamRecord,
): Promise<string | null> => {
  const {content, diff, ms} = await storeMove(spec);
  record.walls.store_ms = ms;
  record.storeDiff = diff;

  // Move two, only over a state the examiner actually expected — and only for a
  // spec that names an entry, since there is otherwise no page to build.
  const rendered =
    diff.length === 0 && spec.entry !== undefined
      ? await renderMove({
          entry: spec.entry,
          content,
          view: spec.view,
          env,
          fetchImpl: opts.fetchImpl,
        })
      : null;
  if (rendered !== null) {
    record.walls.render = rendered.render;
    record.walls.render_ms = rendered.ms;
    if (rendered.dom !== undefined) {
      record.dom = rendered.dom;
    }
    if (rendered.screenshot !== undefined) {
      record.screenshot = rendered.screenshot;
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
  if (rendered !== null && rendered.failures.length > 0) {
    return `render: view not satisfied\n${rendered.failures.join('\n')}`;
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
 * evidence exactly as a green one does. `opts.env` defaults to `process.env`,
 * `opts.main` to `Bun.main` and `opts.fetchImpl` to the ambient `fetch`.
 */
export const runStateExam = async <S extends ExamStore>(
  spec: StateExamSpec<S>,
  opts: ExamOptions = {},
): Promise<ExamOutcome> => {
  const env = opts.env ?? process.env;
  const dir = evidenceDir(examStem(opts.main ?? Bun.main), env);

  const record: ExamRecord = {
    walls: {store_ms: 0, render_ms: null, mutant_ms: 0, render: 'skipped'},
    mutant: {killed: false, path: mutantPath(spec.mutant), edits: spec.mutant},
    contract: {clock: spec.clock, breach: null},
    storeDiff: [],
  };

  let failure: string | null = null;
  try {
    failure = await runMoves(spec, opts, env, record);
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
