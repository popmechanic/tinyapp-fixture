/**
 * Reading the state exams: both halves of it.
 *
 * `captureExams` is the half the linter calls. It spawns a child `bun` with
 * `capture-plugin.ts` preloaded and this file as its entry, and reads one JSON
 * array off that child's stdout.
 *
 * The rest of this file is the half that runs *in* that child: it imports each
 * exam file in the directory — rewritten by the plugin, so each one hands its
 * spec over instead of registering a test — and prints what it collected.
 *
 * The child is load-bearing and not merely tidy. Importing an exam file marks
 * it loaded in the importing process, and a plugin able to rewrite exam files
 * must never be registered in a process that might also be `bun test`. Doing
 * both in a child leaves the caller's own module registry untouched: after
 * `captureExams` resolves, nothing in the caller has loaded a single exam.
 */

import {existsSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';

import type {Action, ExamSpec} from './types';

/** What a spec looks like before it is trimmed to an `ExamSpec`. */
type CapturedSpec = {
  seed: string;
  expected: string;
  view?: ExamSpec['view'];
  action: unknown;
};

/** A path under `root`, written the way every other path in the linter is. */
const relativeTo = (root: string, path: string): string =>
  resolve(path).slice(resolve(root).length + 1).replaceAll('\\', '/');

/** The `.test.ts` files directly under `dir`, in the order they are read. */
const examFilesOf = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith('.test.ts'))
        .sort()
    : [];

/** A spec's action as an `ExamSpec` carries it. */
const actionOf = (action: unknown): 'callback' | Action[] =>
  typeof action === 'function'
    ? 'callback'
    : Array.isArray(action)
      ? (action as Action[])
      : [action as Action];

/**
 * The specs of every exam under `dir`, read in one child process.
 *
 * `root` is the directory the child runs in and the directory each spec's
 * `path` is written against; it defaults to this process's own. A directory
 * that does not exist — or one holding no exam file — yields `[]` and no error.
 */
export const captureExams = async (
  dir: string,
  opts: {root?: string} = {},
): Promise<ExamSpec[]> => {
  const root = resolve(opts.root ?? process.cwd());
  const absolute = resolve(root, dir);
  if (examFilesOf(absolute).length === 0) {
    return [];
  }

  const child = Bun.spawn({
    cmd: [
      'bun',
      '--preload',
      join(import.meta.dir, 'capture-plugin.ts'),
      join(import.meta.dir, 'capture.ts'),
      absolute,
    ],
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [out, err] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if ((await child.exited) !== 0) {
    throw new Error(`capture failed for ${dir}:\n${err}`);
  }

  return JSON.parse(out) as ExamSpec[];
};

/** The child's own work: import each exam file, print what it handed over. */
const captureHere = async (dir: string, root: string): Promise<ExamSpec[]> => {
  const captured: CapturedSpec[] = [];
  (globalThis as {__captured?: CapturedSpec[]}).__captured = captured;

  const specs: ExamSpec[] = [];
  for (const name of examFilesOf(dir)) {
    const path = join(dir, name);
    const before = captured.length;
    await import(path);
    for (const spec of captured.slice(before)) {
      specs.push({
        path: relativeTo(root, path),
        seed: spec.seed,
        expected: spec.expected,
        view: spec.view,
        action: actionOf(spec.action),
      });
    }
  }

  return specs;
};

if (import.meta.main) {
  console.log(
    JSON.stringify(
      await captureHere(resolve(process.argv[2] ?? '.'), process.cwd()),
    ),
  );
}
