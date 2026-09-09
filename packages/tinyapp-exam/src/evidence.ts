/**
 * The evidence writer: where one exam run's record lands, and what it leaves
 * there.
 *
 * Under the engine, `ULTRA_RUN_DIR` names the run's own directory and the
 * record goes to a path the operator can guess from the task, the exam and the
 * pass. Off the engine — a suite run on a laptop — there is no run directory,
 * so each call takes its own temp directory instead and the same files land
 * there. Env is read from the argument, never from `process.env`, so a test can
 * exercise both halves of that rule.
 */

import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, extname, join} from 'node:path';

import type {ExamRecord} from './types';

/** What an unset or empty `ULTRA_TASK`/`ULTRA_EXAM_PASS` is spelled as. */
const NONE = 'none';

/** `value` when it is a non-empty string, `NONE` otherwise. */
const slotOf = (value: string | undefined): string =>
  typeof value === 'string' && value.length > 0 ? value : NONE;

/**
 * Returns the directory this exam's evidence belongs in, created.
 *
 * With `env.ULTRA_RUN_DIR` set that is
 * `<ULTRA_RUN_DIR>/state-exams/task-<ULTRA_TASK>/<stem>-<ULTRA_EXAM_PASS>`,
 * with `ULTRA_TASK` and `ULTRA_EXAM_PASS` each `none` when unset or empty.
 * Without it, a fresh directory under `os.tmpdir()` named
 * `tinyapp-exam-<stem>-<random>`, different on every call.
 */
export const evidenceDir = (
  stem: string,
  env: Record<string, string | undefined>,
): string => {
  const runDir = env.ULTRA_RUN_DIR;
  if (typeof runDir === 'string' && runDir.length > 0) {
    const dir = join(
      runDir,
      'state-exams',
      `task-${slotOf(env.ULTRA_TASK)}`,
      `${stem}-${slotOf(env.ULTRA_EXAM_PASS)}`,
    );
    mkdirSync(dir, {recursive: true});
    return dir;
  }
  return mkdtempSync(join(tmpdir(), `tinyapp-exam-${stem}-`));
};

/** One JSON file of the record, pretty-printed and newline-terminated. */
const writeJson = (dir: string, name: string, value: unknown): string => {
  writeFileSync(join(dir, name), `${JSON.stringify(value, null, 2)}\n`);
  return name;
};

/**
 * Writes `record` into `dir` and returns the sorted names of the files written.
 *
 * `store-diff.json`, `mutant.json`, `contract.json` and `walls.json` are always
 * written; `dom.html` and `screenshot.png` only when the record carries them,
 * so a record from a run whose render was skipped leaves exactly four files.
 */
export const writeEvidence = (dir: string, record: ExamRecord): string[] => {
  mkdirSync(dir, {recursive: true});

  const names = [
    writeJson(dir, 'store-diff.json', record.storeDiff),
    writeJson(dir, 'mutant.json', record.mutant),
    writeJson(dir, 'contract.json', record.contract),
    writeJson(dir, 'walls.json', record.walls),
  ];

  if (record.dom !== undefined) {
    writeFileSync(join(dir, 'dom.html'), record.dom, 'utf-8');
    names.push('dom.html');
  }
  if (record.screenshot !== undefined) {
    writeFileSync(join(dir, 'screenshot.png'), record.screenshot);
    names.push('screenshot.png');
  }

  return names.sort();
};

/**
 * The stem an exam is named by: the basename of `mainPath` without its
 * `.test.ts`/`.test.tsx` suffix, or without its last extension when it has
 * neither. `/x/tests/state-exams/buy-milk.test.ts` is `buy-milk`, `/x/probe.ts`
 * is `probe`.
 */
export const examStem = (mainPath: string): string => {
  const name = basename(mainPath);
  for (const suffix of ['.test.ts', '.test.tsx']) {
    if (name.endsWith(suffix)) {
      return name.slice(0, -suffix.length);
    }
  }
  return name.slice(0, name.length - extname(name).length);
};
