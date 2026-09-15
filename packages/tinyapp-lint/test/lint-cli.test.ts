/**
 * The exam for Task 1 — "The package, its loaders, the static page and the
 * `lint:state` script".
 *
 * One `test` per Proof leg, named for its leg and for the Machine clause it
 * comes from:
 *
 *   (a) [M1] `bun run lint:state`, spawned from the root, exits 0 and its
 *            stdout carries exactly one line matching the summary pattern;
 *   (b) [M2] `loadContext()` with its defaults — callbacks, the seven
 *            snapshots, the schema, the invariants, the clock, the store path;
 *   (c) [M3] that context's six exam specs, and the pinned `click-completes-todo`
 *            entry;
 *   (d) [M4] `ctx.render` over `two-todos-first-done.json`'s content;
 *   (e) [M5] `runLint` over a directory of two rule modules, the CLI's
 *            `--rules` run, and `runLint` over a directory that is not there;
 *   (f) [M6] `captureExams` imports the exam files in a child, never here.
 *
 * Two readings this file makes, written down because the task leaves them open:
 *
 *   - M2 pins `loadContext` to `packages/tinyapp-lint/src/context.ts`, and
 *     nothing pins where `captureExams` lives. `captureExamsOf` therefore takes
 *     it from `../src/context` when that module exports it and from
 *     `../src/capture` otherwise: either home passes, and this exam pins
 *     neither.
 *   - `TABLES_SCHEMA` is read with a computed-specifier `import()` rather than a
 *     static one. A static import would pull `client/src` into this package's
 *     own tsconfig project (`include: ["src", "test"]`), where
 *     `window.__TINYAPP_SEED__` has no declaration — the same module at
 *     runtime, and no new work for the `typecheck` script this task extends.
 *
 * The three spawning tests, and the two that load a context (which spawns the
 * capture child), carry a 60 s timeout: Bun's default per-test 5 s is not
 * enough for a child `bun` process.
 */

import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

import {afterAll, expect, test} from 'bun:test';
import {parse} from 'node-html-parser';

import {loadContext} from '../src/context';
import {formatFinding, runLint} from '../src/lint';
import type {ExamSpec, Finding, LintContext} from '../src/types';

/** This file sits three directories below the repository root. */
const ROOT = resolve(import.meta.dir, '..', '..', '..');

/** A child `bun` process needs more than Bun's default per-test 5 s. */
const SPAWN_TIMEOUT_MS = 60_000;

/** The `[tables, values]` pair a snapshot file parses to. */
type SnapshotContent = LintContext['snapshots'][number]['content'];

/** The parsed content of one of the fixture's own snapshot files. */
const snapshotFile = (path: string): SnapshotContent =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as SnapshotContent;

/**
 * `bun run lint:state <args>` from the repository root.
 *
 * A non-zero exit puts the child's stderr on this process's, so a red leg reads
 * as whatever the CLI said rather than as a bare exit code.
 */
const runCli = (args: string[]): {code: number; lines: string[]} => {
  const child = Bun.spawnSync(['bun', 'run', 'lint:state', ...args], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const code = child.exitCode;
  if (code !== 0) {
    console.error(child.stderr.toString());
  }
  return {
    code,
    lines: child.stdout
      .toString()
      .split('\n')
      .map((line) => line.replace(/\r$/, '')),
  };
};

/** The context of M2, loaded once and shared by legs (b)–(e). */
let contextPromise: Promise<LintContext> | undefined;
const contextOnce = (): Promise<LintContext> =>
  (contextPromise ??= loadContext());

/**
 * `captureExams`, from whichever of the package's two capture modules exports
 * it. See this file's header: the task pins its behaviour, not its home.
 */
const captureExamsOf = async (): Promise<(dir: string) => Promise<ExamSpec[]>> => {
  const context = (await import('../src/context')) as unknown as Record<
    string,
    unknown
  >;
  if (typeof context.captureExams === 'function') {
    return context.captureExams as (dir: string) => Promise<ExamSpec[]>;
  }
  const capture = (await import('../src/capture')) as unknown as Record<
    string,
    unknown
  >;
  return capture.captureExams as (dir: string) => Promise<ExamSpec[]>;
};

/** The rule directory of M5, removed once the legs that read it are done. */
const rulesDir = mkdtempSync(join(tmpdir(), 'tinyapp-lint-rules-'));

afterAll(() => {
  rmSync(rulesDir, {recursive: true, force: true});
});

/** The one finding M5's second rule module reports. */
const FINDING: Finding = {
  file: 'a.json',
  subject: 'todos/1',
  problem: 'p',
  fix: 'f',
};

/** That finding as one line: `<file>: <subject>: <problem> — <fix>`. */
const FINDING_LINE = 'a.json: todos/1: p — f';

writeFileSync(
  join(rulesDir, 'a-quiet.ts'),
  "export default {name: 'a-quiet', run: () => []};\n",
);
writeFileSync(
  join(rulesDir, 'b-loud.ts'),
  "export default {name: 'b-loud', run: () => [" +
    JSON.stringify(FINDING) +
    ']};\n',
);

// (a) [M1] ---------------------------------------------------------------

test(
  '(a) [M1] `bun run lint:state` exits 0 with one zero-findings summary line',
  () => {
    const run = runCli([]);

    expect(run.code).toBe(0);

    const summary =
      /^lint:state: 0 findings over 7 snapshots and 6 exams in [0-9]+ ms$/;
    expect(run.lines.filter((line) => summary.test(line))).toHaveLength(1);
  },
  SPAWN_TIMEOUT_MS,
);

// (b) [M2] ---------------------------------------------------------------

test(
  '(b) [M2] `loadContext()` resolves to the pinned context',
  async () => {
    // M2's defaults are relative to `process.cwd()`, and the Proof runs this
    // exam from the repository root.
    expect(resolve(process.cwd())).toBe(ROOT);

    const ctx = await contextOnce();

    // Every store export that is a function of arity >= 1 whose name does not
    // start with `create` or `read` — exactly these four.
    expect(Object.keys(ctx.callbacks).sort()).toEqual([
      'addTodo',
      'clearCompleted',
      'deleteTodo',
      'setTodoCompleted',
    ]);

    const snapshots: {path: string; kind: 'seed' | 'expected'}[] = [
      {path: 'state-exams/expected/one-open-todo.json', kind: 'expected'},
      {path: 'state-exams/expected/still-empty.json', kind: 'expected'},
      {path: 'state-exams/expected/two-todos-first-done.json', kind: 'expected'},
      {path: 'state-exams/expected/two-todos-one-done.json', kind: 'expected'},
      {path: 'state-exams/seeds/empty.json', kind: 'seed'},
      {path: 'state-exams/seeds/two-open-todos.json', kind: 'seed'},
      {path: 'state-exams/seeds/two-todos-one-done.json', kind: 'seed'},
    ];
    expect(
      ctx.snapshots.map(({path, kind}) => ({path, kind})),
    ).toEqual(snapshots);

    // Each `content` is the file's own parsed JSON, loaded through the schema.
    snapshots.forEach(({path}, index) => {
      expect(ctx.snapshots[index]!.content).toEqual(snapshotFile(path));
    });

    const {TABLES_SCHEMA} = (await import(
      resolve(ROOT, 'client/src/storeData.ts')
    )) as {TABLES_SCHEMA: LintContext['schema']};
    expect(ctx.schema).toEqual(TABLES_SCHEMA);

    expect(Array.isArray(ctx.invariants)).toBe(true);
    expect(ctx.clock).toBe('2026-01-01T00:00:00Z');
    expect(ctx.storePath).toBe('client/src/storeData.ts');
  },
  SPAWN_TIMEOUT_MS,
);

// (c) [M3] ---------------------------------------------------------------

test(
  '(c) [M3] the six exam specs, in path order, and the pinned click entry',
  async () => {
    const ctx = await contextOnce();

    // One per file under `tests/state-exams/` except `interaction-evidence`,
    // which registers only stubbed tests and calls no `stateExam`.
    expect(ctx.exams.map(({path}) => path)).toEqual([
      'tests/state-exams/buy-milk.test.ts',
      'tests/state-exams/clear-completed.test.ts',
      'tests/state-exams/click-completes-todo.test.ts',
      'tests/state-exams/done-count.test.ts',
      'tests/state-exams/empty-todo-refused.test.ts',
      'tests/state-exams/enter-submits-todo.test.ts',
    ]);
    expect(ctx.exams).toHaveLength(6);

    const click = ctx.exams.find(
      ({path}) => path === 'tests/state-exams/click-completes-todo.test.ts',
    );
    expect(click).toBeDefined();
    expect(click!.seed).toBe('state-exams/seeds/two-open-todos.json');
    expect(click!.expected).toBe(
      'state-exams/expected/two-todos-first-done.json',
    );
    expect(click!.view).toEqual([
      {selector: '.todoItem.completed input[type=checkbox]', checked: true},
      {selector: '.todoItem', count: 2},
    ]);
  },
  SPAWN_TIMEOUT_MS,
);

// (d) [M4] ---------------------------------------------------------------

test(
  '(d) [M4] `ctx.render` reflects `checked` and paints the two rows',
  async () => {
    const ctx = await contextOnce();
    const content = snapshotFile(
      'state-exams/expected/two-todos-first-done.json',
    );

    const html = ctx.render(content);
    const doc = parse(html);

    const todo0 = doc.querySelector('#todo-0');
    expect(todo0).not.toBeNull();
    expect(todo0!.getAttribute('data-checked')).toBe('true');

    const todo1 = doc.querySelector('#todo-1');
    expect(todo1).not.toBeNull();
    expect(todo1!.getAttribute('data-checked')).toBe('false');

    // Every `input`, not merely the two checkboxes — that is what makes this
    // markup read to `assertView` the way a rendered page's does.
    const inputs = doc.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
    expect(
      inputs
        .filter((input) => input.getAttribute('data-checked') === undefined)
        .map((input) => input.outerHTML),
    ).toEqual([]);

    expect(doc.querySelectorAll('.todoItem')).toHaveLength(2);

    // Verbatim: `renderToStaticMarkup` writes no comment nodes, so the
    // counter's text is contiguous.
    expect(html).toContain('<span id="doneCount">1 of 2 done</span>');
  },
  SPAWN_TIMEOUT_MS,
);

// (e) [M5] ---------------------------------------------------------------

test(
  '(e) [M5] `runLint` over two rule modules, the CLI `--rules` run, and an absent directory',
  async () => {
    const ctx = await contextOnce();

    expect(await runLint(ctx, {rulesDir})).toEqual({
      lines: [FINDING_LINE],
      count: 1,
    });

    // The same line, built by the formatter the rules are graded through.
    expect(formatFinding(FINDING)).toBe(FINDING_LINE);

    const run = runCli(['--', '--rules', rulesDir]);
    expect(run.code).toBe(1);
    expect(run.lines).toContain(FINDING_LINE);

    // An absent rules directory is an empty list, not an error.
    expect(
      await runLint(ctx, {rulesDir: join(rulesDir, 'no-such-directory')}),
    ).toEqual({lines: [], count: 0});
  },
  SPAWN_TIMEOUT_MS,
);

// (f) [M6] ---------------------------------------------------------------

test(
  '(f) [M6] `captureExams` leaves no exam file in the caller`s `require.cache`',
  async () => {
    const captureExams = await captureExamsOf();

    // What `captureExams` adds, not what the process already holds: under a
    // whole-suite `bun test` the runner loads `tests/state-exams/*` itself, so
    // the registry carries them before this leg runs. The claim is that the
    // call below leaves it exactly as it found it.
    const examsOfCache = (): string[] =>
      Object.keys(require.cache)
        .filter((key) => key.includes('tests/state-exams/'))
        .sort();
    const before = examsOfCache();

    const specs = await captureExams('tests/state-exams');

    // The child did the importing, so the specs came back all the same.
    expect(specs).toHaveLength(6);

    expect(examsOfCache()).toEqual(before);
  },
  SPAWN_TIMEOUT_MS,
);
