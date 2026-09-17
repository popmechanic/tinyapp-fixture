// Exam for task 3, legs (a)-(f): the convergence species — two pages that sync through a
// real module object, the object's own reading beside theirs, a third page that converges,
// and every transition of the session on the evidence.
//
// M1. `tinyapp-exam` exports `ConvergenceExamSpec = {clock, server, entry, assets?, module,
//     action, expected, view?, mutant, syncTimeoutMs?, convergeTimeoutMs?}` and
//     `runConvergenceExam(spec, opts?) -> Promise<ExamOutcome>` whose `record` carries a
//     `convergence` field `{module, stores: {a, b, c, object}, rows, transitions,
//     walls: {sync_ms, converge_ms}, runtime: {port, dir}}`.
// M2. The run: `startCelld({serverDir: spec.server, exam: true})`; the events socket opened
//     before the action, so the pre-action state is among the transitions; the entry served
//     on a loopback origin of its own; pages A and B opened with a prelude that sets
//     `window.__TINYAPP_SYNC__` and an `allow` carrying the runtime's origin; the action
//     performed in A; B waited on until its content equals A's post-action content within
//     `syncTimeoutMs` (default 10000), that wall `sync_ms`; the module's `content` and `rows`
//     read through the surface; page C opened and waited on within `convergeTimeoutMs`
//     (default 10000), that wall `converge_ms`; and the runtime stopped and the browser
//     closed in a `finally` whatever the verdict.
// M3. `ok` is true exactly when `diffContent(A, expected)`, `diffContent(object, expected)`
//     and `diffContent(C, expected)` are all empty, the view (when given) holds on B, and the
//     mutant is killed; a false `ok` carries a `failure` beginning `convergence: ` naming the
//     first failed step in run order, with these spellings pinned: `B never matched A within
//     <n> ms`, `page A differs from expected`, `view not satisfied`, `mutant survived`,
//     `module object differs from expected`, `C never converged within <n> ms`.
// M4. `writeEvidence` writes, beside the files it writes at BASE, `stores.json`, `rows.json`,
//     `transitions.json` and a `walls.json` carrying `sync_ms`, `converge_ms` and
//     `transitions`; `dom.html` and `screenshot.png` are page B's.
// M5. `browser.openUrl` accepts `allow?: string[]`: a paused request whose URL begins with
//     the page origin or with any listed origin (each followed by `/`) is continued and
//     every other is failed, as at BASE for the page origin alone.
// M6. `convergenceExam(spec)` registers one bun test named
//     `convergence exam: <examStem(Bun.main)>` with timeout `STATE_EXAM_TIMEOUT_MS` that
//     throws the `failure` when `ok` is false.
//
// The legs, and where each is answered below:
//   (a) [M1] [M2] [M3] one honest run over the stand-in fixture, read for its verdict, its
//       three-way equality, its walls, its transitions, its runtime and its markup.
//   (b) [M3] four variants of that spec, each a whole run, each pinned by the prefix of the
//       failure M3 spells for it.
//   (c) [M2] after each of those runs, the runtime's port is bindable again and its copy is
//       gone — the `finally` of M2, observed from outside.
//   (d) [M4] `writeEvidence` over (a)'s record into a fresh directory.
//   (e) [M5] the `allow` list measured against a second loopback origin a page fetches.
//   (f) [M6] the registration this file makes, and a red one run as a child `bun test`.
//
// This file runs the species for real: a `celld dev` on a copy of the repository's own
// `server/`, and a headless Chromium. It never skips. A machine with no celld binary
// (`CELLD_BIN`, else `celld` on `PATH`) or no browser (`TINYAPP_BROWSER`, else
// `/headless-shell/headless-shell`) is this exam's red, as the task's Context asks — an exam
// that quietly passes where it could not look proves nothing.
//
// Every socket any leg is party to is a loopback one: the driver's CDP socket to the
// Chromium it spawned, the pages' requests to the two `127.0.0.1` origins this file and the
// helper serve, the harness's own events socket to the runtime, and — in leg (e) — a second
// `127.0.0.1` server run only to be reached once and refused once.
//
// The package is imported as a namespace and the two new names are read through `helperOf`,
// so a missing export is this leg's own red — `tinyapp-exam exports no `runConvergenceExam`
// yet` — rather than a link error that takes every other leg down with it.

import {afterAll, expect, test} from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join, resolve} from 'node:path';

import * as exam from 'tinyapp-exam';

// ---------------------------------------------------------------- fixtures

/** The repository root: this file sits three directories below it. */
const ROOT = resolve(import.meta.dir, '../../..');

/** The stand-in the task creates, as the specs below name it — from `process.cwd()`. */
const FIXTURE_DIR = 'packages/tinyapp-exam/test/fixtures/convergence';
const ENTRY = `${FIXTURE_DIR}/entry.html`;
const EXPECTED = `${FIXTURE_DIR}/expected-one-row.json`;

/** The server the runtime is a copy of, as `spec.server` names it. */
const SERVER = 'server';

/** The module every page of this exam syncs through. */
const MODULE = 'todos';

/** The clock every page here is pinned to. */
const CLOCK = '2026-01-01T00:00:00Z';

/** The content one click of `Add` leaves, and what all three readings are graded against. */
const ONE_ROW = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}];

/** The state no page of the stand-in ever reaches, for leg (b) and leg (f). */
const BUY_BREAD = [{todos: {'0': {text: 'buy bread', completed: false}}}, {}];

/** The wall one leg that starts a runtime and a browser is given. */
const LEG_TIMEOUT_MS = 300_000;

/** The wall the child `bun test` of leg (f) is given — a whole run inside a whole process. */
const CHILD_TIMEOUT_MS = 420_000;

/** How long a probe page has to report what its `fetch` did. */
const PROBE_TIMEOUT_MS = 20_000;

/** How often either wait looks again. */
const POLL_MS = 50;

/** The four bytes any PNG begins with. */
const PNG_SIGNATURE = [137, 80, 78, 71];

// ---------------------------------------------------------------- M3's spellings

/** The prefix every failure of this species carries. */
const CONVERGENCE = 'convergence: ';

const B_NEVER = (ms: number): string => `${CONVERGENCE}B never matched A within ${ms} ms`;
const A_DIFFERS = `${CONVERGENCE}page A differs from expected`;
const OBJECT_DIFFERS = `${CONVERGENCE}module object differs from expected`;
const C_NEVER = `${CONVERGENCE}C never converged within`;
const VIEW_UNSATISFIED = `${CONVERGENCE}view not satisfied`;
const MUTANT_SURVIVED = `${CONVERGENCE}mutant survived`;

// ---------------------------------------------------------------- shapes

/** The spec literal M1 spells, as the legs below build it. */
type ConvergenceSpec = {
  clock: string;
  server: string;
  entry: string;
  assets?: Record<string, string>;
  module: string;
  action: unknown;
  expected: string;
  view?: unknown;
  mutant: unknown[];
  syncTimeoutMs?: number;
  convergeTimeoutMs?: number;
};

/** One transition the events socket delivered, as the surface spells it at BASE. */
type Transition = {
  module: string;
  seq: number;
  content: [Record<string, Record<string, Record<string, unknown>>>, Record<string, unknown>];
  at: number;
};

/** M1's `convergence` field. */
type Convergence = {
  module: string;
  stores: {a: unknown; b: unknown; c: unknown; object: unknown};
  rows: unknown;
  transitions: Transition[];
  walls: {sync_ms: number; converge_ms: number};
  runtime: {port: number; dir: string};
};

/** The record the outcome carries, read only through the keys the clauses name. */
type Recorded = {
  walls: Record<string, unknown>;
  mutant: {killed: boolean; path: string; edits: unknown[]};
  contract: {clock: string; breach: string | null; pinned_in_page: boolean};
  storeDiff: unknown[];
  convergence?: Convergence;
  dom?: string;
  screenshot?: Uint8Array;
};

type Outcome = {ok: boolean; failure: string | null; record: Recorded; dir: string};

/** `openUrl` with M5's list, which the signature at BASE does not carry. */
type OpenUrl = (opts: {
  url: string;
  origin: string;
  clock: string;
  prelude?: string;
  allow?: string[];
}) => Promise<exam.Page>;

// ---------------------------------------------------------------- helpers

/** Everything this file made, swept once the suite is done. */
const temps: string[] = [];

afterAll(() => {
  for (const dir of temps) {
    rmSync(dir, {recursive: true, force: true});
  }
});

/**
 * One exported helper, or a failure that reads as the absent implementation rather than as a
 * typo here.
 */
const helperOf = <T>(name: string): T => {
  const value = (exam as unknown as Record<string, unknown>)[name];
  if (typeof value !== 'function') {
    throw new Error(
      `tinyapp-exam exports no \`${name}\` yet — the convergence move is unbuilt`,
    );
  }
  return value as T;
};

const runConvergence = (
  spec: ConvergenceSpec,
  opts?: Record<string, unknown>,
): Promise<Outcome> =>
  helperOf<(spec: ConvergenceSpec, opts?: Record<string, unknown>) => Promise<Outcome>>(
    'runConvergenceExam',
  )(spec, opts);

/** M1's `convergence` field, or a failure naming the field that is not there. */
const convergenceOf = (record: Recorded): Convergence => {
  const field = record.convergence;
  if (field === undefined || field === null) {
    throw new Error('the record carries no `convergence` field — M1 is unbuilt');
  }
  return field;
};

/**
 * The text of a fixture file the task must create, or a failure naming the file that is
 * missing rather than one that reads like a bad path here.
 */
const fixtureText = (name: string): string => {
  const path = resolve(ROOT, FIXTURE_DIR, name);
  if (!existsSync(path)) {
    throw new Error(`the task must create ${FIXTURE_DIR}/${name}`);
  }
  return readFileSync(path, 'utf8');
};

/** A file of `content` in a fresh directory, named by its absolute path. */
const scratchFile = (label: string, name: string, content: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `convergence-${label}-`));
  temps.push(dir);
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
};

/** A fresh directory of its own, swept with the rest. */
const scratchDir = (label: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `convergence-${label}-`));
  temps.push(dir);
  return dir;
};

/**
 * Leg (c) [M2]: the runtime this run started is gone — its port bindable by anyone again,
 * and the disposable copy it ran on removed.
 *
 * `Bun.listen` is the whole assertion: a port a draining node still holds throws here.
 */
const assertRuntimeReleased = (outcome: Outcome): void => {
  const {port, dir} = convergenceOf(outcome.record).runtime;
  expect(`port: ${typeof port}`).toBe('port: number');
  expect(`dir: ${typeof dir}`).toBe('dir: string');

  const bound = Bun.listen({hostname: '127.0.0.1', port, socket: {data() {}}});
  bound.stop(true);

  expect(existsSync(dir)).toBe(false);
};

/** A promise that settles after `ms`. */
const after = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------- the specs

/** Leg (a)'s spec, the one the honest stand-in is graded by. */
const HONEST_SPEC: ConvergenceSpec = {
  clock: CLOCK,
  server: SERVER,
  entry: ENTRY,
  module: MODULE,
  action: {click: {role: 'button', name: 'Add'}},
  expected: EXPECTED,
  view: {selector: '#rows li', count: 1, text: 'buy milk'},
  mutant: [{table: 'todos', row: '0', cell: 'text', value: ''}],
};

/**
 * The honest run, made once and read by legs (a), (c) and (d).
 *
 * `main` is this run's own, so its evidence lands under a stem no other run shares.
 */
let honestRun: Promise<Outcome> | null = null;
const honest = (): Promise<Outcome> =>
  (honestRun ??= runConvergence(HONEST_SPEC, {main: '/x/honest.test.ts'}));

// ---------------------------------------------------------------- (a) [M1] [M2] [M3]

test(
  'leg (a) [M1] [M2] [M3]: A acts, B agrees, the object and C agree, and the session is on the record',
  async () => {
    // Every path in this file is a path from the repository root, so a `bun test` run from
    // anywhere else is a failure that says so rather than a pile of missing fixtures.
    expect(resolve(process.cwd())).toBe(ROOT);

    const outcome = await honest();

    // The state the three readings are graded against, as the task pins the file.
    expect(JSON.parse(fixtureText('expected-one-row.json'))).toEqual(ONE_ROW);

    // [M3] the verdict: three empty diffs, the view held, the mutant killed.
    expect(outcome.failure).toBeNull();
    expect(outcome.ok).toBe(true);

    const convergence = convergenceOf(outcome.record);

    // [M1] the field's own shape: the module it is about and its four stores.
    expect(convergence.module).toBe(MODULE);
    expect(Object.keys(convergence.stores).sort()).toEqual(['a', 'b', 'c', 'object']);

    // [M3] the three-way equality, each read as the whole expected content.
    expect(convergence.stores.a).toEqual(ONE_ROW);
    expect(convergence.stores.object).toEqual(ONE_ROW);
    expect(convergence.stores.c).toEqual(ONE_ROW);
    // …and B, which the run waited on until it equalled A.
    expect(convergence.stores.b).toEqual(ONE_ROW);

    // [M1] the object's own rows, read through the surface beside its content.
    expect(`rows: ${typeof convergence.rows}`).toBe('rows: object');
    expect(convergence.rows).not.toBeNull();

    // [M2] the two walls, each a number of at least 0.
    for (const name of ['sync_ms', 'converge_ms'] as const) {
      const wall = convergence.walls[name];
      expect(`${name}: ${typeof wall}`).toBe(`${name}: number`);
      expect(Number.isFinite(wall)).toBe(true);
      expect(wall).toBeGreaterThanOrEqual(0);
    }

    // [M2] the transitions: this module's, in order, and spanning the action.
    const transitions = convergence.transitions;
    expect(Array.isArray(transitions)).toBe(true);
    expect(transitions.length).toBeGreaterThanOrEqual(2);
    for (const transition of transitions) {
      expect(transition.module).toBe(MODULE);
      expect(`seq: ${typeof transition.seq}`).toBe('seq: number');
    }
    for (let i = 1; i < transitions.length; i++) {
      // Strictly increasing, said as the pair so a failure prints both numbers.
      const previous = transitions[i - 1]!.seq;
      const current = transitions[i]!.seq;
      expect(`seq ${previous} then ${current}: increasing ${current > previous}`).toBe(
        `seq ${previous} then ${current}: increasing true`,
      );
    }

    // The socket was open before the action: the lowest-`seq` transition carries no row `0`,
    // and the highest-`seq` one carries it.
    const bySeq = [...transitions].sort((one, two) => one.seq - two.seq);
    const first = bySeq[0]!;
    const last = bySeq[bySeq.length - 1]!;
    expect(first.content[0]?.todos?.['0']).toBeUndefined();
    expect(last.content[0]?.todos?.['0']).toEqual({text: 'buy milk', completed: false});

    // [M1] the runtime this run owned.
    expect(`port: ${typeof convergence.runtime.port}`).toBe('port: number');
    expect(`dir: ${typeof convergence.runtime.dir}`).toBe('dir: string');

    // [M3] the mutant, judged against A's reading and dead.
    expect(outcome.record.mutant.killed).toBe(true);
    expect(outcome.record.mutant.path).toBe('todos/0/text');

    // [M4] the markup on the record is a page that painted the row.
    expect(outcome.record.dom ?? '').toContain('buy milk');
  },
  LEG_TIMEOUT_MS,
);

// ---------------------------------------------------------------- (c) [M2]

test(
  'leg (c) [M2]: after the honest run the runtime is stopped — its port bindable, its copy gone',
  async () => {
    assertRuntimeReleased(await honest());
  },
  LEG_TIMEOUT_MS,
);

// ---------------------------------------------------------------- (b) [M3]

test(
  'leg (b) [M3]: an expected state page A never reaches is `page A differs from expected`',
  async () => {
    const expectedPath = scratchFile(
      'buy-bread',
      'buy-bread.json',
      `${JSON.stringify(BUY_BREAD)}\n`,
    );

    const outcome = await runConvergence(
      {...HONEST_SPEC, expected: expectedPath},
      {main: '/x/buy-bread.test.ts'},
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.failure ?? '').toStartWith(A_DIFFERS);

    // Leg (c) [M2] over this run.
    assertRuntimeReleased(outcome);
  },
  LEG_TIMEOUT_MS,
);

test(
  'leg (b) [M3]: a mutant that leaves the expected unchanged is `mutant survived`',
  async () => {
    const outcome = await runConvergence(
      {
        ...HONEST_SPEC,
        // The edit sets row `0`'s `text` to what it already is, so the perturbed state is the
        // expected state and A cannot tell them apart.
        mutant: [{table: 'todos', row: '0', cell: 'text', value: 'buy milk'}],
      },
      {main: '/x/hollow.test.ts'},
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.failure ?? '').toStartWith(MUTANT_SURVIVED);
    expect(outcome.record.mutant.killed).toBe(false);

    // Leg (c) [M2] over this run.
    assertRuntimeReleased(outcome);
  },
  LEG_TIMEOUT_MS,
);

test(
  'leg (b) [M3]: a view page B does not satisfy is `view not satisfied`',
  async () => {
    const outcome = await runConvergence(
      {...HONEST_SPEC, view: {selector: '#rows li', count: 2}},
      {main: '/x/view.test.ts'},
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.failure ?? '').toStartWith(VIEW_UNSATISFIED);

    // Leg (c) [M2] over this run.
    assertRuntimeReleased(outcome);
  },
  LEG_TIMEOUT_MS,
);

test(
  'leg (b) [M3]: `syncTimeoutMs: 1` is either already equal or `B never matched A within 1 ms`, and nothing else',
  async () => {
    const outcome = await runConvergence(
      {...HONEST_SPEC, syncTimeoutMs: 1},
      {main: '/x/sync-1ms.test.ts'},
    );

    if (outcome.ok) {
      // B was equal to A the first time it was read, inside the one millisecond.
      expect(outcome.failure).toBeNull();
    } else {
      const failure = outcome.failure ?? '';
      expect(failure).toStartWith(B_NEVER(1));
      // And no other failure of the species is what this run reported.
      for (const other of [A_DIFFERS, OBJECT_DIFFERS, C_NEVER, VIEW_UNSATISFIED, MUTANT_SURVIVED]) {
        expect(`${other}: ${failure.startsWith(other)}`).toBe(`${other}: false`);
      }
    }

    // Leg (c) [M2] over this run.
    assertRuntimeReleased(outcome);
  },
  LEG_TIMEOUT_MS,
);

// ---------------------------------------------------------------- (d) [M4]

test(
  'leg (d) [M4]: the honest record leaves the six files, and the walls count the transitions it wrote',
  async () => {
    const outcome = await honest();
    const convergence = convergenceOf(outcome.record);

    const writeEvidence = helperOf<(dir: string, record: unknown) => string[]>('writeEvidence');
    const dir = scratchDir('evidence');
    const names = writeEvidence(dir, outcome.record);

    const six = [
      'stores.json',
      'rows.json',
      'transitions.json',
      'walls.json',
      'dom.html',
      'screenshot.png',
    ];
    const written = readdirSync(dir).sort();
    for (const name of six) {
      expect(`${name}: returned ${names.includes(name)}`).toBe(`${name}: returned true`);
      expect(`${name}: on disk ${written.includes(name)}`).toBe(`${name}: on disk true`);
    }

    const read = (name: string): string => readFileSync(join(dir, name), 'utf8');

    // The four stores, the object's rows and every transition, as the record carries them.
    expect(JSON.parse(read('stores.json'))).toEqual(convergence.stores);
    expect(JSON.parse(read('rows.json'))).toEqual(convergence.rows);

    const walls = JSON.parse(read('walls.json')) as Record<string, unknown>;
    for (const name of ['sync_ms', 'converge_ms', 'transitions']) {
      expect(`${name}: ${typeof walls[name]}`).toBe(`${name}: number`);
    }
    expect(walls.sync_ms).toBe(convergence.walls.sync_ms);
    expect(walls.converge_ms).toBe(convergence.walls.converge_ms);

    const writtenTransitions = JSON.parse(read('transitions.json')) as unknown;
    expect(Array.isArray(writtenTransitions)).toBe(true);
    expect((writtenTransitions as unknown[]).length).toBe(walls.transitions as number);
    expect(writtenTransitions).toEqual(convergence.transitions);

    // The document and the picture, both page B's.
    expect(read('dom.html')).toBe(outcome.record.dom);
    const shot = readFileSync(join(dir, 'screenshot.png'));
    expect(Array.from(shot.subarray(0, 4))).toEqual(PNG_SIGNATURE);
  },
  LEG_TIMEOUT_MS,
);

// ---------------------------------------------------------------- (e) [M5]

/** The probe page: it fetches `origin` and says on `window` what came of it. */
const probeHtml = (origin: string): string =>
  '<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>allow probe</title>' +
  '</head><body data-marker="allow-probe"><script>\n' +
  'window.__PROBE__ = null;\n' +
  `fetch(${JSON.stringify(`${origin}/x`)})\n` +
  '  .then((r) => r.text())\n' +
  "  .then((t) => { window.__PROBE__ = 'reached:' + t; },\n" +
  "        () => { window.__PROBE__ = 'failed'; });\n" +
  '</script></body></html>';

/** What the probe page reported, waited for — an evaluate mid-navigation is not a report. */
const probeOf = async (page: exam.Page): Promise<string> => {
  const started = performance.now();
  for (;;) {
    const read = await page.evaluate('window.__PROBE__ ?? null').catch(() => null);
    if (typeof read === 'string') {
      return read;
    }
    if (performance.now() - started >= PROBE_TIMEOUT_MS) {
      throw new Error(
        `the probe page never reported within ${PROBE_TIMEOUT_MS} ms — window.__PROBE__ stayed null`,
      );
    }
    await after(POLL_MS);
  }
};

test(
  'leg (e) [M5]: a listed origin is continued and the same request unlisted is failed in the browser',
  async () => {
    // The second loopback origin. It answers, unlike an `.invalid` name, so a driver that
    // refused nothing would reach it — and it counts every time one does.
    let hits = 0;
    const other = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(): Response {
        hits += 1;
        // The page is on another origin: without this header a continued request would still
        // reject in the page, and the leg would read the block where there was none.
        return new Response('reached', {
          headers: {'access-control-allow-origin': '*'},
        });
      },
    });
    const otherOrigin = `http://127.0.0.1:${other.port}`;

    const html = probeHtml(otherOrigin);
    const site = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(): Response {
        return new Response(html, {headers: {'content-type': 'text/html; charset=utf-8'}});
      },
    });
    const origin = `http://127.0.0.1:${site.port}`;

    const browser = await exam.launchBrowser({env: process.env});
    try {
      const openUrl = browser.openUrl;
      if (openUrl === undefined) {
        throw new Error('browser: this browser cannot open a served page');
      }
      const open = openUrl as unknown as OpenUrl;

      // Listed: the request is continued, the second server answers it, the page says so.
      const listed = await open.call(browser, {
        url: `${origin}/`,
        origin,
        clock: CLOCK,
        allow: [otherOrigin],
      });
      try {
        expect(await probeOf(listed)).toBe('reached:reached');
      } finally {
        await listed.close().catch(() => {});
      }
      expect(hits).toBe(1);

      // Unlisted: the same page, the same request, failed in the browser — and the second
      // server hears nothing, which is the half a page's own report cannot prove.
      const unlisted = await open.call(browser, {url: `${origin}/`, origin, clock: CLOCK});
      try {
        expect(await probeOf(unlisted)).toBe('failed');
      } finally {
        await unlisted.close().catch(() => {});
      }
      expect(hits).toBe(1);
    } finally {
      await browser.close().catch(() => {});
      other.stop(true);
      site.stop(true);
    }
  },
  LEG_TIMEOUT_MS,
);

// ---------------------------------------------------------------- (f) [M6]

/**
 * The registration this file makes: one convergence exam over the honest spec, named
 * `convergence exam: convergence-move` by `examStem(Bun.main)`.
 *
 * It is guarded so that a package without the export leaves leg (f) red on its own assertion
 * rather than throwing out of module evaluation and taking every other leg with it.
 */
const registered = ((): boolean => {
  const register = (exam as unknown as Record<string, unknown>).convergenceExam;
  if (typeof register !== 'function') {
    return false;
  }
  (register as (spec: ConvergenceSpec) => void)(HONEST_SPEC);
  return true;
})();

test('leg (f) [M6]: this file registers `convergence exam: convergence-move`', () => {
  expect(typeof (exam as unknown as Record<string, unknown>).convergenceExam).toBe('function');
  expect(registered).toBe(true);
  // So the test registered above carries this file's own stem.
  expect(exam.examStem(Bun.main)).toBe('convergence-move');
  // The registration's own wall is not readable through bun's API from here; it is measured
  // instead by the registered exam beside this test, which runs a whole runtime and a whole
  // browser — far past bun's 5000 ms default, so a registration that named no timeout is a
  // red `convergence exam: convergence-move` in this very run.
});

test(
  'leg (f) [M6]: a red registration run as a child `bun test` exits non-zero with the failure on its output',
  async () => {
    // Inside the workspace, and named `red.test.ts` so `examStem` reads the stem the
    // registration takes its name from.
    const dir = join(
      ROOT,
      'packages/tinyapp-exam/test',
      `tmp-${Math.random().toString(36).slice(2)}`,
    );
    const here = `packages/tinyapp-exam/test/${basename(dir)}`;

    try {
      mkdirSync(dir, {recursive: true});
      writeFileSync(join(dir, 'buy-bread.json'), `${JSON.stringify(BUY_BREAD)}\n`);

      // The honest spec with one thing wrong: an expected state the stand-in never reaches.
      const redSpec: ConvergenceSpec = {...HONEST_SPEC, expected: `${here}/buy-bread.json`};
      writeFileSync(
        join(dir, 'red.test.ts'),
        "import {convergenceExam} from 'tinyapp-exam';\n\n" +
          `convergenceExam(${JSON.stringify(redSpec, null, 2)});\n`,
      );

      const child = Bun.spawnSync(['bun', 'test', `${here}/red.test.ts`], {
        cwd: ROOT,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const decoder = new TextDecoder();
      const output = `${decoder.decode(child.stdout)}${decoder.decode(child.stderr)}`;

      if (child.exitCode === 0) {
        console.log(`the red registration exited 0:\n${output}`);
      }
      expect(child.exitCode).not.toBe(0);
      // The name the registration took from its own file…
      expect(output).toContain('convergence exam: red');
      // …and the failure its body threw.
      expect(output).toContain(A_DIFFERS);
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  },
  CHILD_TIMEOUT_MS,
);

// ---------------------------------------------------------------- the `Run:` lines [M1]

test('[M1]: the package names `convergenceExam` and `ConvergenceExamSpec` where the Proof asks', () => {
  // `ConvergenceExamSpec` is a type: the source is the only place a runtime can read it.
  expect(readFileSync(resolve(ROOT, 'packages/tinyapp-exam/src/index.ts'), 'utf8')).toContain(
    'convergenceExam',
  );
  expect(readFileSync(resolve(ROOT, 'packages/tinyapp-exam/src/types.ts'), 'utf8')).toContain(
    'ConvergenceExamSpec',
  );
});
