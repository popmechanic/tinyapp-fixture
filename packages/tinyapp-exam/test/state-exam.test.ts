// Exam for task 6, legs (a)-(h): `stateExam` — the three moves composed, the package
// sealed, the two first-run exams written.
//
// M1. `runStateExam(spec, opts)` — `opts.env` defaulting to `process.env`, `opts.main` to
//     `Bun.main`, `opts.fetchImpl` to `fetch` — resolves `{ok, failure, record, dir}` where
//     `dir` is `evidenceDir(examStem(opts.main), opts.env)`, the six-or-four evidence files
//     of `record` have been written into `dir`, and `record.mutant` is
//     `{killed: diffContent(content, applyMutant(expected, spec.mutant)).length > 0,
//     path: mutantPath(spec.mutant), edits: spec.mutant}`.
// M2. On a green spec with an `env` lacking `ULTRA_RUN_DIR`: `ok` is `true`, `failure` is
//     `null`, `record.storeDiff` is `[]`, `record.mutant.killed` is `true`,
//     `record.walls.render` is `skipped` with `render_ms` `null`, `record.contract` is
//     `{clock: '2026-01-01T00:00:00Z', breach: null}`, and `store_ms` and `mutant_ms` are
//     finite numbers greater than or equal to 0.
// M3. When the store move's diff is non-empty, `ok` is `false`, `failure` begins
//     `store move: expected state not reached` and contains `renderDiff(diff)`,
//     `record.storeDiff` is that diff, and `opts.fetchImpl` is called 0 times even when `env`
//     carries both `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR`.
// M4. When the store move's diff is empty and `env` carries both `TINYAPP_RENDER_URL` and
//     `ULTRA_RUN_DIR`, `opts.fetchImpl` is called exactly once, `record.walls.render` is
//     `ran` with a finite `render_ms`, `dir` is
//     `<ULTRA_RUN_DIR>/state-exams/task-<ULTRA_TASK>/<stem>-<ULTRA_EXAM_PASS>` and holds
//     `dom.html` and `screenshot.png`; a non-empty `failures` from the render move makes
//     `ok` `false` with `failure` beginning `render: view not satisfied` and containing each
//     failure string.
// M5. When the mutant applied to the expected state is not distinguished, `ok` is `false`,
//     `failure` is exactly `hollow exam: mutant <mutantPath(spec.mutant)> not distinguished`,
//     and `record.mutant.killed` is `false`.
// M6. A contract rejection from the store move — `contract breach: <url>`,
//     `contract: clock is required`, `snapshot violates schema: …`, `nondeterministic
//     store: …` — makes `ok` `false` with `failure` that error's message and, for a breach,
//     `record.contract.breach` equal to it.
// M7. `stateExam(spec)` registers one bun test named `state exam: <examStem(Bun.main)>`
//     whose body awaits `runStateExam(spec)` and throws an `Error` with message `failure`
//     when `ok` is false.
// M8. `packages/tinyapp-exam/package.json` names the package `tinyapp-exam` with `main`
//     `src/index.ts` and `dependencies` `tinybase` and `node-html-parser`; the root
//     `package.json` `devDependencies` carries `tinyapp-exam` as `workspace:*` and no
//     `node-html-parser`; `scripts.typecheck` ends with
//     `bunx tsc -p packages/tinyapp-exam --noEmit`; `src/index.ts` exports the thirteen
//     names. (`bun install --frozen-lockfile` and `bunx tsc -p packages/tinyapp-exam
//     --noEmit` are the Proof's own `Run:` lines; this file checks the manifests and the
//     runtime resolution of the workspace link those two lines rest on.)
// M9. `bun test tests/state-exams/buy-milk.test.ts tests/state-exams/empty-todo-refused
//     .test.ts` exits 0, where each file imports `stateExam` from `tinyapp-exam` and
//     `createTodosStore` and `addTodo` from `../../client/src/storeData` and declares
//     `clock`, `entry`, a `seed`, an `expected`, a `view` and a `mutant`.
//
// No leg dials anything: every `fetch` a leg exercises is an injected `fetchImpl` or the
// contract's blocked one, the renderer URL is a placeholder on `.invalid`, and the two
// subprocesses this file spawns run with `ULTRA_RUN_DIR` empty so their render move skips.

import {afterAll, expect, test} from 'bun:test';
import {existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join, relative, resolve} from 'node:path';

import {addTodo, createTodosStore} from '../../../client/src/storeData';
import {renderDiff} from '../src/store-move';
import {runStateExam, stateExam} from '../src/state-exam';
import type {Difference, MutantEdit, StateExamSpec} from '../src/types';

// ---------------------------------------------------------------- fixtures

/** The repository root, so every path reads the same whatever `bun test`'s cwd is. */
const repoRoot = resolve(import.meta.dir, '../../..');

/** A repository path spelled relative to `process.cwd()`, the way a spec names it. */
const atRoot = (path: string): string => relative(process.cwd(), resolve(repoRoot, path));

const CLOCK = '2026-01-01T00:00:00Z';

/** The mutant of the green spec: flip the one todo's `completed`. */
const MUTANT: MutantEdit[] = [{table: 'todos', row: '0', cell: 'completed', value: true}];

/** The same cell set to the value the expected state already has — a hollow mutant. */
const HOLLOW_MUTANT: MutantEdit[] = [
  {table: 'todos', row: '0', cell: 'completed', value: false},
];

/** The mutant's name, spelled out rather than derived. */
const MUTANT_PATH = 'todos/0/completed';

/** The placeholder renderer. Never dialled: every leg that names it injects a `fetchImpl`. */
const RENDER_URL = 'http://renderer.invalid/v4/accounts/x/browser-rendering';

/** The url the breach leg's action reaches for. The contract throws before any socket. */
const BREACH_URL = 'http://127.0.0.1:9/x';

/** The DOM the stubbed renderer hands back: the scaffold's markup, one open todo. */
const FIXTURE_DOM =
  '<div id="todoList"><div class="todoItem"><input type="checkbox" data-checked="false"><label>buy milk</label></div></div>';

/** The four bytes the stub sends as base64 and the helper must land in `screenshot.png`. */
const PNG_BYTES = [137, 80, 78, 71];
const PNG_BASE64 = Buffer.from(PNG_BYTES).toString('base64');

/** The four files every record leaves, and the six a record with a picture leaves. */
const FOUR_FILES = ['contract.json', 'mutant.json', 'store-diff.json', 'walls.json'];
const SIX_FILES = [...FOUR_FILES, 'dom.html', 'screenshot.png'].sort();

/** The thirteen names M8 says `src/index.ts` exports. */
const EXPORTS = [
  'stateExam',
  'runStateExam',
  'storeMove',
  'renderMove',
  'applyMutant',
  'diffContent',
  'renderDiff',
  'assertView',
  'withContract',
  'evidenceDir',
  'writeEvidence',
  'examStem',
  'mutantPath',
];

/** Directories this exam made, or made the helper make, to be swept at the end. */
const madeDirs: string[] = [];

const scratch = (label: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `tinyapp-exam-fixture-${label}-`));
  madeDirs.push(dir);
  return dir;
};

const fixtureDir = scratch('files');

/** Write `snapshot` as JSON and hand back the path spelled relative to `process.cwd()`. */
const fixture = (name: string, snapshot: unknown): string => {
  const absolute = join(fixtureDir, name);
  writeFileSync(absolute, JSON.stringify(snapshot));
  return relative(process.cwd(), absolute);
};

afterAll(() => {
  for (const dir of madeDirs) {
    rmSync(dir, {recursive: true, force: true});
  }
});

/** The green spec of M2; `over` supplies whichever fields a leg varies. */
const greenSpec = (over: Record<string, unknown> = {}): StateExamSpec =>
  ({
    clock: CLOCK,
    entry: atRoot('client/index.html'),
    seed: atRoot('state-exams/seeds/empty.json'),
    store: createTodosStore,
    action: (store: any) => {
      addTodo(store, 'buy milk');
    },
    expected: atRoot('state-exams/expected/one-open-todo.json'),
    mutant: MUTANT,
    ...over,
  }) as unknown as StateExamSpec;

/** The env of legs (b) and (c): a renderer, a run directory, a task and a pass. */
const runEnv = (runDir: string): Record<string, string | undefined> => ({
  TINYAPP_RENDER_URL: RENDER_URL,
  ULTRA_RUN_DIR: runDir,
  ULTRA_TASK: '1',
  ULTRA_EXAM_PASS: '0',
});

/** A `fetchImpl` that counts its calls and answers with a fresh `respond()`. */
const recorder = (respond: () => Response) => {
  const calls: string[] = [];
  const fetchImpl = ((url: unknown) => {
    calls.push(String(url));
    return Promise.resolve(respond());
  }) as unknown as typeof fetch;
  return {calls, fetchImpl};
};

/** The stub of leg (c): a 200 carrying the fixture DOM and the four png bytes. */
const okResponse = (): Response =>
  new Response(
    JSON.stringify({
      success: true,
      result: {content: FIXTURE_DOM, screenshot: PNG_BASE64},
    }),
    {status: 200},
  );

/** The `failure` of a red run, asserted to be a string before it is read. */
const failureOf = (result: {failure: string | null}): string => {
  expect(typeof result.failure).toBe('string');
  return result.failure ?? '';
};

const remember = <T extends {dir: string}>(result: T): T => {
  madeDirs.push(result.dir);
  return result;
};

/** The names in `dir`, sorted — what `writeEvidence` left behind. */
const filesIn = (dir: string): string[] => readdirSync(dir).sort();

// ---------------------------------------------------------- (a) [M1] [M2]

test('leg (a) [M1] [M2]: a green spec with no run directory is ok, its mutant killed, its render skipped', async () => {
  const spec = greenSpec();
  const result = remember(
    await runStateExam(spec, {env: {}, main: '/x/buy-milk.test.ts'}),
  );

  // M2: the whole verdict of a green run.
  expect(result.ok).toBe(true);
  expect(result.failure).toBeNull();
  expect(result.record.storeDiff).toEqual([]);
  expect(result.record.walls.render).toBe('skipped');
  expect(result.record.walls.render_ms).toBeNull();
  expect(result.record.contract).toEqual({clock: CLOCK, breach: null});

  // M1: the mutant block is exactly `{killed, path, edits}` off the spec's own edits.
  expect(result.record.mutant).toEqual({
    killed: true,
    path: MUTANT_PATH,
    edits: MUTANT,
  });
  expect(result.record.mutant.edits).toEqual(spec.mutant);

  // M2: both walls the moves timed are finite and non-negative.
  for (const ms of [result.record.walls.store_ms, result.record.walls.mutant_ms]) {
    expect(typeof ms).toBe('number');
    expect(Number.isFinite(ms)).toBe(true);
    expect(ms).toBeGreaterThanOrEqual(0);
  }

  // M1: `dir` is `evidenceDir(examStem('/x/buy-milk.test.ts'), {})` — a fresh temp
  // directory — holding exactly the four files a skipped render leaves.
  expect(existsSync(result.dir)).toBe(true);
  expect(basename(result.dir).startsWith('tinyapp-exam-buy-milk-')).toBe(true);
  expect(filesIn(result.dir)).toEqual(FOUR_FILES);

  // And those files carry this record, not some other one.
  const read = (name: string) =>
    JSON.parse(readFileSync(join(result.dir, name), 'utf8')) as unknown;
  expect(read('store-diff.json')).toEqual([]);
  expect(read('mutant.json')).toEqual({killed: true, path: MUTANT_PATH, edits: MUTANT});
  expect(read('contract.json')).toEqual({clock: CLOCK, breach: null});
  expect(read('walls.json')).toEqual(result.record.walls);
});

test('leg (a) [M1]: opts.main defaults to Bun.main, so an omitted main stems this file', async () => {
  const result = remember(await runStateExam(greenSpec(), {env: {}}));

  expect(result.ok).toBe(true);
  // `examStem(Bun.main)` inside this file is `state-exam` — the same stem M7 names the
  // registered test with.
  expect(basename(result.dir).startsWith('tinyapp-exam-state-exam-')).toBe(true);
});

// ---------------------------------------------------------------- (b) [M3]

test('leg (b) [M3]: a red store move reports the diff table and never reaches the renderer', async () => {
  const runDir = scratch('red-store');
  const expected = fixture('expected-completed.json', [
    {todos: {'0': {text: 'buy milk', completed: true}}},
    {},
  ]);
  const {calls, fetchImpl} = recorder(okResponse);

  const result = await runStateExam(greenSpec({expected}), {
    env: runEnv(runDir),
    main: '/x/buy-milk.test.ts',
    fetchImpl,
  });

  expect(result.ok).toBe(false);

  const failure = failureOf(result);
  expect(failure.startsWith('store move: expected state not reached')).toBe(true);
  expect(failure).toContain('table / row / cell / got / wanted');
  expect(failure).toContain('todos / 0 / completed / false / true');
  // The failure carries `renderDiff(diff)` itself, header line and all.
  expect(failure).toContain(renderDiff(result.record.storeDiff));

  const differences: Difference[] = result.record.storeDiff;
  expect(differences.length).toBe(1);
  expect(differences).toEqual([
    {table: 'todos', row: '0', cell: 'completed', got: false, wanted: true},
  ]);

  // A red store needs no picture: the renderer is configured and still never dialled.
  expect(calls.length).toBe(0);

  // M1: the record still lands, at the engine's path, with no dom and no screenshot.
  expect(result.dir).toBe(join(runDir, 'state-exams', 'task-1', 'buy-milk-0'));
  expect(filesIn(result.dir)).toEqual(FOUR_FILES);
});

// ---------------------------------------------------------------- (c) [M4]

test(
  'leg (c) [M4]: a green store move with a renderer posts once and files the dom and the picture',
  async () => {
    const runDir = scratch('render-ran');
    const {calls, fetchImpl} = recorder(okResponse);

    const result = await runStateExam(
      greenSpec({view: [{selector: '.todoItem', count: 1, text: 'buy milk'}]}),
      {env: runEnv(runDir), main: '/x/buy-milk.test.ts', fetchImpl},
    );

    expect(result.ok).toBe(true);
    expect(result.failure).toBeNull();
    expect(calls.length).toBe(1);

    expect(result.record.walls.render).toBe('ran');
    expect(typeof result.record.walls.render_ms).toBe('number');
    expect(Number.isFinite(result.record.walls.render_ms as number)).toBe(true);

    expect(result.dir).toBe(join(runDir, 'state-exams', 'task-1', 'buy-milk-0'));
    expect(filesIn(result.dir)).toEqual(SIX_FILES);
    expect(readFileSync(join(result.dir, 'dom.html'), 'utf8')).toBe(FIXTURE_DOM);
    expect(new Uint8Array(readFileSync(join(result.dir, 'screenshot.png')))).toEqual(
      new Uint8Array(PNG_BYTES),
    );
  },
  120000,
);

test(
  'leg (c) [M4]: a view the rendered dom does not satisfy is a render failure naming its selector',
  async () => {
    const runDir = scratch('render-red');
    const {calls, fetchImpl} = recorder(okResponse);

    const result = await runStateExam(greenSpec({view: [{selector: '.todoItem', count: 2}]}), {
      env: runEnv(runDir),
      main: '/x/buy-milk.test.ts',
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    expect(calls.length).toBe(1);

    const failure = failureOf(result);
    expect(failure.startsWith('render: view not satisfied')).toBe(true);
    expect(failure).toContain('.todoItem');

    // The store was right, so the mutant still ran and the picture was still filed.
    expect(result.record.storeDiff).toEqual([]);
    expect(result.record.walls.render).toBe('ran');
    expect(filesIn(result.dir)).toEqual(SIX_FILES);
  },
  120000,
);

// ---------------------------------------------------------------- (d) [M5]

test('leg (d) [M5]: a mutant the expected state already carries is a hollow exam', async () => {
  const result = remember(
    await runStateExam(greenSpec({mutant: HOLLOW_MUTANT}), {
      env: {},
      main: '/x/buy-milk.test.ts',
    }),
  );

  expect(result.ok).toBe(false);
  expect(result.failure).toBe(
    `hollow exam: mutant ${MUTANT_PATH} not distinguished`,
  );
  expect(result.record.mutant.killed).toBe(false);
  expect(result.record.mutant.path).toBe(MUTANT_PATH);
  expect(result.record.mutant.edits).toEqual(HOLLOW_MUTANT);

  // The store move was green all the same.
  expect(result.record.storeDiff).toEqual([]);
});

// ---------------------------------------------------------------- (e) [M6]

test('leg (e) [M6]: an action that reaches for the network fails as that breach line', async () => {
  const result = remember(
    await runStateExam(
      greenSpec({
        action: (store: any) => {
          void fetch(BREACH_URL);
          addTodo(store, 'buy milk');
        },
      }),
      {env: {}, main: '/x/buy-milk.test.ts'},
    ),
  );

  expect(result.ok).toBe(false);
  expect(result.failure).toBe(`contract breach: ${BREACH_URL}`);
  expect(result.record.contract.breach).toBe(`contract breach: ${BREACH_URL}`);
  expect(result.record.contract.clock).toBe(CLOCK);

  // A red exam leaves evidence too: an empty diff, an unkilled mutant, four files.
  expect(result.record.storeDiff).toEqual([]);
  expect(result.record.mutant.killed).toBe(false);
  expect(filesIn(result.dir)).toEqual(FOUR_FILES);
});

test('leg (e) [M6]: an empty clock fails as the contract line, with no breach recorded', async () => {
  const result = remember(
    await runStateExam(greenSpec({clock: ''}), {env: {}, main: '/x/buy-milk.test.ts'}),
  );

  expect(result.ok).toBe(false);
  expect(result.failure).toBe('contract: clock is required');
  expect(result.record.contract.breach).toBeNull();
  expect(result.record.contract.clock).toBe('');
  expect(result.record.storeDiff).toEqual([]);
  expect(result.record.mutant.killed).toBe(false);
  expect(filesIn(result.dir)).toEqual(FOUR_FILES);
});

// ---------------------------------------------------------------- (f) [M7]

// The green half of M7, live: this call registers one bun test named
// `state exam: state-exam` — `examStem(Bun.main)` of this very file — and that test passes
// as part of this file's run. `TINYAPP_RENDER_URL` is cleared first so the registered
// exam's render move skips whatever the ambient environment carries: no test here dials.
delete process.env.TINYAPP_RENDER_URL;
stateExam(greenSpec());

/** The hollow exam file M7's red half runs, importing by absolute path. */
const hollowSource = (): string =>
  [
    `import {stateExam} from ${JSON.stringify(
      join(repoRoot, 'packages/tinyapp-exam/src/index.ts'),
    )};`,
    `import {addTodo, createTodosStore} from ${JSON.stringify(
      join(repoRoot, 'client/src/storeData.ts'),
    )};`,
    '',
    'stateExam({',
    `  clock: ${JSON.stringify(CLOCK)},`,
    "  entry: 'client/index.html',",
    "  seed: 'state-exams/seeds/empty.json',",
    '  store: createTodosStore,',
    "  action: (store) => { addTodo(store, 'buy milk'); },",
    "  expected: 'state-exams/expected/one-open-todo.json',",
    `  mutant: ${JSON.stringify(HOLLOW_MUTANT)},`,
    '} as any);',
    '',
  ].join('\n');

/** Run `bun test <paths>` from the repository root with the renderer switched off. */
const bunTest = (paths: string[]) => {
  const spawned = Bun.spawnSync(['bun', 'test', ...paths], {
    cwd: repoRoot,
    env: {...process.env, ULTRA_RUN_DIR: ''},
  });
  return {
    exitCode: spawned.exitCode,
    output: `${spawned.stderr.toString()}${spawned.stdout.toString()}`,
  };
};

test(
  'leg (f) [M7]: a file calling stateExam with a hollow mutant exits non-zero saying so',
  () => {
    const dir = scratch('hollow');
    const hollowPath = join(dir, 'hollow.test.ts');
    writeFileSync(hollowPath, hollowSource());

    const {exitCode, output} = bunTest([hollowPath]);

    expect(exitCode).not.toBe(0);
    expect(output).toContain(
      `hollow exam: mutant ${MUTANT_PATH} not distinguished`,
    );
    // The registered test is named `state exam: <examStem(Bun.main)>` — `hollow` there.
    expect(output).toContain('state exam: hollow');
  },
  120000,
);

// ---------------------------------------------------------------- (g) [M8]

test('leg (g) [M8]: the two manifests and the thirteen exports of the sealed package', async () => {
  const readJson = (path: string): Record<string, any> =>
    JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8')) as Record<string, any>;

  const pkg = readJson('packages/tinyapp-exam/package.json');
  expect(pkg.name).toBe('tinyapp-exam');
  expect(pkg.main).toBe('src/index.ts');
  for (const dependency of ['tinybase', 'node-html-parser']) {
    const range: unknown = pkg.dependencies?.[dependency];
    expect(typeof range).toBe('string');
    expect((range as string).length).toBeGreaterThan(0);
  }

  const root = readJson('package.json');
  expect(root.devDependencies?.['tinyapp-exam']).toBe('workspace:*');
  expect(root.devDependencies?.['node-html-parser']).toBeUndefined();
  expect(typeof root.scripts?.typecheck).toBe('string');
  expect(
    (root.scripts.typecheck as string).endsWith('bunx tsc -p packages/tinyapp-exam --noEmit'),
  ).toBe(true);

  // Imported by a computed specifier, so what is tested is the runtime resolution the
  // workspace link makes — the same one `tests/state-exams/*` rely on.
  const specifier: string = 'tinyapp-exam';
  const helper = (await import(specifier)) as Record<string, unknown>;
  expect(EXPORTS.length).toBe(13);
  for (const name of EXPORTS) {
    expect(typeof helper[name]).toBe('function');
  }
});

// ---------------------------------------------------------------- (h) [M9]

const EXAM_FILES = [
  'tests/state-exams/buy-milk.test.ts',
  'tests/state-exams/empty-todo-refused.test.ts',
];

test('leg (h) [M9]: both first-run exams are written as exams of this helper', () => {
  const sources = EXAM_FILES.map((path) => ({
    path,
    text: readFileSync(resolve(repoRoot, path), 'utf8'),
  }));

  for (const {path, text} of sources) {
    // The helper, imported by package name — either quoting.
    expect(
      text.includes("from 'tinyapp-exam'") || text.includes('from "tinyapp-exam"'),
    ).toBe(true);
    // The fixture's own mutations, from the fixture's own module.
    expect(text).toContain('client/src/storeData');
    expect(text).toContain('createTodosStore');
    expect(text).toContain('addTodo');
    // The spec each file declares.
    for (const fragment of [
      'state-exams/seeds/',
      'state-exams/expected/',
      'entry:',
      'clock:',
      'view:',
      'mutant:',
    ]) {
      expect([path, fragment, text.includes(fragment)]).toEqual([path, fragment, true]);
    }
  }

  const buyMilk = sources[0]!.text;
  expect(buyMilk).toContain('one-open-todo.json');
  expect(/(['"])buy milk\1/.test(buyMilk)).toBe(true);

  expect(sources[1]!.text).toContain('still-empty.json');
});

test(
  'leg (h) [M9]: bun test over the two first-run exams exits 0',
  () => {
    const {exitCode, output} = bunTest(EXAM_FILES);

    // Both files ran and both exams passed: `bun test` prints no name for a passing test,
    // so the tally and the exit code are what say so.
    expect(exitCode).toBe(0);
    expect(output).toContain('0 fail');
    expect(Number(/(\d+) pass/.exec(output)?.[1] ?? '0')).toBeGreaterThanOrEqual(2);
  },
  120000,
);
