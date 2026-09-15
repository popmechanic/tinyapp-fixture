/**
 * The exam for Task 4 — "The reachability rule: every expected state is some
 * seed plus a few of the app's own moves".
 *
 * One `test` per Proof leg, named for its leg and for the Machine clause it
 * comes from:
 *
 *   (a) [M1] the module's default export is a `Rule` named `reachability`;
 *            `await loadContext()` carries exactly four `expected` and exactly
 *            three `seed` snapshots; and `run` over that context returns `[]`;
 *   (b) [M2] over the three seeds plus the `[{}, {theme: 'dark'}]` expected,
 *            `run` returns exactly one finding whose formatted line is the
 *            pinned string character for character, in under 3,000 ms;
 *   (c) [M3] over the `empty.json` seed and an expected `[{}, {}]`, `run`
 *            returns `[]` — a state equal to a seed is reached in zero moves;
 *   (d) [M4] with the `stamp` callback the walk runs under the context's clock,
 *            and with the `dial` callback `run` rejects with the breach;
 *   (e) [M5] the CLI, spawned from the root over a temporary `expected/` and an
 *            empty `exams/`, exits 1 and prints the pinned line.
 *
 * Four readings this file makes, written down because the task leaves them
 * open:
 *
 *   - The rule is taken by a static import and bound to `Rule` from
 *     `../src/types`, so the default export's shape is pinned at typecheck as
 *     well as at run time.
 *   - `loadContext()` is awaited once at module top level rather than inside a
 *     test. M2's leg carries the task's own 10 s per-test timeout, and that
 *     budget is for the `run` call: loading a context spawns a child `bun` for
 *     the exam capture, which does not belong inside it. Module evaluation sits
 *     outside every test's timeout, so the legs are also order-independent.
 *   - M3 and M4 pin their snapshots' `kind` and `content` but not the synthetic
 *     `expected` entry's `path`, so this exam names one under `state-exams/`
 *     and asserts nothing about it. M2's `state-exams/expected/bad.json` is
 *     pinned because the finding's own line quotes it.
 *   - M2 pins the formatted line, so the line is what is asserted — how the
 *     finding splits across `problem` and `fix` is `formatFinding`'s business,
 *     and it is the formatter the rules are graded through.
 *
 * Every test that loads a context or spawns a child carries a 60 s timeout:
 * Bun's default per-test 5 s is not enough for a child `bun` process. Leg (b)
 * carries 10 s, which is the 3,000 ms the clause pins with room around it.
 */

import {existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

import {expect, test} from 'bun:test';

import {loadContext} from '../src/context';
import {formatFinding} from '../src/lint';
import rule from '../src/rules/reachability';
import type {
  Callback,
  Finding,
  LintContext,
  Rule,
  Snapshot,
  SnapshotFile,
} from '../src/types';

/** The default export, held at the type the Machine clause names it. */
const reachability: Rule = rule;

/** This file sits three directories below the repository root. */
const ROOT = resolve(import.meta.dir, '..', '..', '..');

/** A child `bun` process needs more than Bun's default per-test 5 s. */
const SPAWN_TIMEOUT_MS = 60_000;

/** M2 pins 3,000 ms for the call; the test around it gets the task's 10 s. */
const WALK_TIMEOUT_MS = 10_000;

/** The context every leg builds on, loaded once and outside any test's clock. */
const CTX: LintContext = await loadContext();

/** One synthetic snapshot entry, at the `SnapshotFile` shape the loader builds. */
const snapshot = (
  path: string,
  kind: 'seed' | 'expected',
  content: Snapshot,
): SnapshotFile => ({path, kind, content});

/** `reachability.run` over `ctx`, as a promise whatever `run` does with it. */
const runOver = (ctx: LintContext): Promise<Finding[]> =>
  Promise.resolve().then(() => reachability.run(ctx));

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

// (a) [M1] ---------------------------------------------------------------

test(
  '(a) [M1] the rule is named `reachability`, and the fixture`s four expected states are each reached',
  async () => {
    expect(reachability.name).toBe('reachability');
    expect(typeof reachability.run).toBe('function');

    // The fixture's own snapshots, as floors: four expected and three seeds are
    // what BASE carries, and sibling work adds more of both.
    expect(
      CTX.snapshots.filter(({kind}) => kind === 'expected').length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      CTX.snapshots.filter(({kind}) => kind === 'seed').length,
    ).toBeGreaterThanOrEqual(3);

    // A rule that fires on a file the fixture already carries is a plan defect,
    // not a finding.
    expect(await runOver(CTX)).toEqual([]);
  },
  SPAWN_TIMEOUT_MS,
);

// (b) [M2] ---------------------------------------------------------------

/**
 * The tail every reachability line ends in, with the two things sibling work
 * moves — the seed count and the callback list — left as capture groups.
 *
 * `theme` is a `values` entry no callback of the fixture writes (`setFilter`
 * writes `filter`, and only the three names it knows), so this state is out of
 * reach of the seeds whatever the bound.
 */
const FINDING_TAIL =
  'reached by none of the (\\d+) seeds within 3 moves of (.+) — write the ' +
  'state a callback reaches from a seed, or add the seed it is reached from$';

/** The line M2 pins, over the file the finding quotes. */
const BAD_LINE = new RegExp(
  '^state-exams/expected/bad\\.json: state: ' + FINDING_TAIL,
);

/** `a, b, c or d` read back as the list it was written from. */
const listOf = (text: string): string[] => text.replace(' or ', ', ').split(', ');

/**
 * One finding line against `pattern`: the two counts it quotes are the
 * context's own, and the callbacks it names are the context's own, sorted.
 */
const expectFindingLine = (
  line: string,
  pattern: RegExp,
  ctx: LintContext,
): void => {
  const match = pattern.exec(line);
  expect(match).not.toBeNull();

  expect(Number(match![1])).toBe(
    ctx.snapshots.filter(({kind}) => kind === 'seed').length,
  );

  const named = listOf(match![2]!);
  expect(named).toEqual([...named].sort());
  expect(named).toEqual(Object.keys(ctx.callbacks).sort());
  expect(named).toEqual(
    expect.arrayContaining([
      'addTodo',
      'clearCompleted',
      'deleteTodo',
      'setTodoCompleted',
    ]),
  );
  expect(named).toContain('setFilter');
};

test(
  '(b) [M2] an unreachable expected state is one finding, on the pinned line, in under 3,000 ms',
  async () => {
    const ctx: LintContext = {
      ...CTX,
      snapshots: [
        ...CTX.snapshots.filter(({kind}) => kind === 'seed'),
        snapshot('state-exams/expected/bad.json', 'expected', [
          {},
          {theme: 'dark'},
        ]),
      ],
    };

    const started = performance.now();
    const findings = await runOver(ctx);
    const elapsed = performance.now() - started;

    expect(findings).toHaveLength(1);
    expectFindingLine(formatFinding(findings[0]!), BAD_LINE, ctx);

    // The full exploration of an unreachable target over the three seeds, at
    // depth 3 and a 2,000-state cap, is what this budget is for.
    expect(elapsed).toBeLessThan(3_000);
  },
  WALK_TIMEOUT_MS,
);

// (c) [M3] ---------------------------------------------------------------

test(
  '(c) [M3] a state equal to a seed is reached in zero moves',
  async () => {
    const ctx: LintContext = {
      ...CTX,
      snapshots: [
        snapshot('state-exams/seeds/empty.json', 'seed', [{}, {}]),
        snapshot('state-exams/expected/still-empty.json', 'expected', [{}, {}]),
      ],
    };

    expect(await runOver(ctx)).toEqual([]);
  },
  SPAWN_TIMEOUT_MS,
);

// (d) [M4] ---------------------------------------------------------------

/** `Date.parse('2026-01-01T00:00:00Z')` — the instant the context's clock names. */
const CLOCK_INSTANT = 1_767_225_600_000;

/** The prefix M4 pins on the error the breach propagates. */
const BREACH_PREFIX = 'contract breach: https://example.invalid/';

test(
  '(d) [M4] the walk runs under the context`s clock, and a callback that dials breaches the contract',
  async () => {
    // The stamped value is the clock instant, not a bare number.
    expect(Date.parse(CTX.clock)).toBe(CLOCK_INSTANT);

    const seed = snapshot('state-exams/seeds/empty.json', 'seed', [{}, {}]);

    // `setValue` on the walked store is legal: the store carries a tables
    // schema only.
    const stamp: Callback = (store) => {
      store.setValue('t', Date.now());
    };
    const stamped: LintContext = {
      ...CTX,
      callbacks: {stamp},
      snapshots: [
        seed,
        snapshot('state-exams/expected/stamped.json', 'expected', [
          {},
          {t: CLOCK_INSTANT},
        ]),
      ],
    };

    expect(await runOver(stamped)).toEqual([]);

    // A callback that dials is not a lint finding but a breach of the exam's
    // contract, and `run` lets it propagate.
    const dial: Callback = () => {
      fetch('https://example.invalid/');
    };
    const dialling: LintContext = {...stamped, callbacks: {dial}};

    const outcome = await runOver(dialling).then(
      (findings) => ({rejected: false, message: '', findings}),
      (error: unknown) => ({
        rejected: true,
        message: String((error as {message?: unknown})?.message ?? error),
        findings: [] as Finding[],
      }),
    );

    expect(outcome).toMatchObject({rejected: true});
    expect(outcome.message.slice(0, BREACH_PREFIX.length)).toBe(BREACH_PREFIX);
  },
  SPAWN_TIMEOUT_MS,
);

// (e) [M5] ---------------------------------------------------------------

/**
 * The line M5 pins, over a directory whose name the exam does not know in
 * advance — the CLI's `file` is the path relative to the root, which is why it
 * starts `state-exams/lint-tmp-`.
 */
const CLI_LINE = new RegExp(
  '^state-exams/lint-tmp-[^/]+/expected/bad\\.json: state: ' + FINDING_TAIL,
);

test(
  '(e) [M5] `lint:state` over a seeded unreachable state exits 1 and prints the pinned line',
  () => {
    // Beside the seeds, which the loader reads only when pointed at them: the
    // fixture's own three seeds stay the seeds of this run.
    const dir = mkdtempSync(join(ROOT, 'state-exams', 'lint-tmp-'));
    try {
      const expectedDir = join(dir, 'expected');
      const examsDir = join(dir, 'exams');
      mkdirSync(expectedDir);
      mkdirSync(examsDir);
      writeFileSync(join(expectedDir, 'bad.json'), '[{}, {"theme": "dark"}]\n');

      const run = runCli([
        '--',
        '--expected',
        expectedDir,
        '--exams',
        examsDir,
      ]);

      expect(run.code).toBe(1);

      // Contains, never "exactly these lines": the other rules share this
      // stdout, and `[{}, {"theme": "dark"}]` has no `todos` row for them to
      // speak about.
      const matched = run.lines.filter((line) => CLI_LINE.test(line));
      expect(matched).toHaveLength(1);
      expectFindingLine(matched[0]!, CLI_LINE, CTX);
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }

    expect(existsSync(dir)).toBe(false);
  },
  SPAWN_TIMEOUT_MS,
);
