// Exam for task 2, legs (a)-(g): the exam's action may be an interaction, and every move
// reads from the one page it opened.
//
// M1. `StateExamSpec.action` is either the store callback it is at BASE or an `Action`
//     (`{click}`, `{type}`, `{key}`) or an array of `Action`s performed in order; with an
//     `Action`, the store move opens the page `renderHtml` builds for the entry with `seed`
//     as its seed (the seed global set to `seed`'s content, the module script inlined with
//     no `src`), performs the action, and takes `content` as `JSON.parse(await
//     page.evaluate('JSON.stringify(window.__TINYAPP_STORE__.getContent())'))`; it does this
//     twice on two fresh pages and rejects `nondeterministic store:` when the two contents
//     differ, exactly as the callback form does.
// M2. With an `Action`, the render move is the same page: after the action, `snapshot()`
//     supplies `dom` and `screenshot`, `assertView` reads `dom`, and no second page is
//     opened; with a callback action and an `entry`, the render move opens one page seeded
//     from the post-action content and snapshots it — the renderer is the local browser in
//     both forms, and the string `TINYAPP_RENDER_URL` no longer occurs in
//     `packages/tinyapp-exam/src`.
// M3. The render move runs whenever the spec names an `entry`, run directory or not (a
//     laptop run writes under `os.tmpdir()` as at BASE); with no `entry` it is `skipped` and
//     recorded so.
// M4. `walls.json` carries `action_ms` (the wall of the interaction alone, `null` for a
//     callback action) and `browser: 'ran' | 'skipped'` beside its BASE keys;
//     `contract.json` gains `pinned_in_page: true | false`.
// M5. A missing browser binary with an `Action`, or with an `entry`, fails the exam with the
//     `browser: ` line and writes the evidence files as for any red; the mutant move is
//     unchanged.
// M6. `render-move.test.ts` and `state-exam.test.ts` pass on the patched tree, and neither
//     contains the string `TINYAPP_RENDER_URL` or the string `fetchImpl`.
// M7. `bundleOf` builds with `minify: true`, and the page's `data:` URL is under 2,000,000
//     characters for the fixture's entry.
//
// Two seams the legs name without spelling, pinned here so the implementation and its
// grading agree on them (both are in the task's Context):
//   * `ExamOptions.browser?: Browser` — the fake every leg but (g) hands `runStateExam`, so
//     no leg here but (g) needs a Chromium ("passing the browser in through a new
//     `browser?: Browser` option so no test needs Chromium").
//   * `ExamOptions.minify?: boolean`, default `true` — leg (g)'s "`bundleOf` forced
//     unminified (an option the test passes)".
//
// M5's "the six evidence files exist" is read the only way it can be: `evidence.ts` is
// outside this task's file scope and writes `dom.html`/`screenshot.png` only when the record
// carries them, so a `launchBrowser` rejection leaves six files only if the record carries an
// empty `dom` and an empty `screenshot` for that red.
//
// No leg dials a network. Legs (a)-(f) open no browser at all: their pages are a fake object
// whose `open` records the html it was handed. Leg (g)'s pages are `data:` URLs in the
// machine's own Chromium, whose every request the driver blocks; the one socket the exam is
// party to is the driver's loopback WebSocket to the process it spawned.

import {afterAll, expect, test} from 'bun:test';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join, relative, resolve} from 'node:path';

import {addTodo, createTodosStore} from '../../../client/src/storeData';
import {launchBrowser} from '../src/browser';
import type {Action, Browser, Page} from '../src/browser';
import {assertView} from '../src/render-move';
import {runStateExam} from '../src/state-exam';
import type {ExamOutcome} from '../src/state-exam';
import {diffContent} from '../src/store-move';
import type {MutantEdit, Snapshot, StateExamSpec} from '../src/types';

// ---------------------------------------------------------------- fixtures

/** The repository root, so every path reads the same whatever `bun test`'s cwd is. */
const repoRoot = resolve(import.meta.dir, '../../..');

/** A repository path spelled relative to `process.cwd()`, the way a spec names it. */
const atRoot = (path: string): string => relative(process.cwd(), resolve(repoRoot, path));

/** An absolute path spelled relative to `process.cwd()`, the way a spec names it. */
const atCwd = (absolute: string): string => relative(process.cwd(), absolute);

const CLOCK = '2026-03-04T05:06:07Z';

/** M7's ceiling on the page's `data:` URL for the fixture's entry. */
const URL_LIMIT = 2_000_000;

/** The ceiling Chromium itself refuses a `data:` URL above, which `open` must name. */
const DATA_URL_CEILING = 2_097_152;

/** What the `data:` URL of `html` costs, the way `open` builds it. */
const dataUrlLength = (html: string): number =>
  'data:text/html;base64,'.length + Buffer.from(html, 'utf8').toString('base64').length;

/** The six names the engine reads out of an evidence directory. */
const SIX_FILES = [
  'contract.json',
  'dom.html',
  'mutant.json',
  'screenshot.png',
  'store-diff.json',
  'walls.json',
].sort();

/** The first four bytes of any PNG. */
const PNG_SIGNATURE = [137, 80, 78, 71];

/** The bytes the fake's `snapshot()` hands back as its picture. */
const PNG = new Uint8Array([...PNG_SIGNATURE, 13, 10, 26, 10]);

/** The DOM the fake's `snapshot()` hands back: one completed todo. */
const FIXTURE_DOM =
  '<div id="todoList"><div class="todoItem completed">' +
  '<input type="checkbox" data-checked="true"><label>buy milk</label></div></div>';

/** The seed the interaction specs load: one open todo. */
const SEED: Snapshot = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}];

/** What the fake page answers after the interaction: that todo completed. */
const CLICKED: Snapshot = [{todos: {'0': {text: 'buy milk', completed: true}}}, {}];

/** The mutant of the interaction specs: flip the todo's `completed` back. */
const MUTANT: MutantEdit[] = [{table: 'todos', row: '0', cell: 'completed', value: false}];

/** The mutant of the callback specs, spelled against `one-open-todo.json`. */
const CALLBACK_MUTANT: MutantEdit[] = [
  {table: 'todos', row: '0', cell: 'completed', value: true},
];

/** The mutant's name, spelled out rather than derived. */
const MUTANT_PATH = 'todos/0/completed';

/** The binary the fleet image carries, and the one leg (e) makes `launchBrowser` refuse. */
const IMAGE_BROWSER = '/headless-shell/headless-shell';
const MISSING_BROWSER = '/nonexistent/chrome';

/** Directories this exam made, or made the helper make, swept at the end. */
const madeDirs: string[] = [];

const scratch = (label: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `tinyapp-browser-exam-${label}-`));
  madeDirs.push(dir);
  return dir;
};

const fixtureDir = scratch('files');

/** Writes `text` into the fixture directory and hands back the path a spec would name. */
const fixtureFile = (name: string, text: string): string => {
  const absolute = join(fixtureDir, name);
  writeFileSync(absolute, text);
  return atCwd(absolute);
};

/** Writes `snapshot` as JSON and hands back the path a spec would name. */
const fixtureSnapshot = (name: string, snapshot: Snapshot): string =>
  fixtureFile(name, JSON.stringify(snapshot));

/**
 * The entry the fake-browser legs bundle: one module script with a `src`, and two markers —
 * one in the document, one inside the module — so the opened html can be shown to be this
 * entry, bundled and inlined, rather than any other string.
 */
const ENTRY_MARKER = 'fixture-entry-marker';
const APP_MARKER = 'fixture-app-marker';

fixtureFile('app.js', `window.__TINYAPP_APP__ = ${JSON.stringify(APP_MARKER)};\n`);

const ENTRY = fixtureFile(
  'entry.html',
  [
    '<!doctype html>',
    '<html lang="en">',
    '  <head><meta charset="UTF-8" /><title>fixture</title></head>',
    `  <body><div id="root" data-marker="${ENTRY_MARKER}"></div>`,
    '    <script type="module" src="/app.js"></script>',
    '  </body>',
    '</html>',
    '',
  ].join('\n'),
);

const SEED_PATH = fixtureSnapshot('seed.json', SEED);
const EXPECTED_CLICKED = fixtureSnapshot('expected-clicked.json', CLICKED);
const EXPECTED_OPEN = fixtureSnapshot('expected-open.json', SEED);

/** Leg (g)'s expected state: the first todo completed by the click, the second untouched. */
const EXPECTED_AFTER_CLICK: Snapshot = [
  {
    todos: {
      '0': {text: 'buy milk', completed: true},
      '1': {text: 'walk the dog', completed: false},
    },
  },
  {},
];
const EXPECTED_G = fixtureSnapshot('expected-two-todos-first-done.json', EXPECTED_AFTER_CLICK);

afterAll(() => {
  for (const dir of madeDirs) {
    rmSync(dir, {recursive: true, force: true});
  }
});

// ------------------------------------------------------------- the fake browser

/** One thing a fake page was asked to do, in the order it was asked. */
type Asked =
  | {kind: 'act'; action: Action}
  | {kind: 'read'; expression: string}
  | {kind: 'evaluate'; expression: string}
  | {kind: 'snapshot'}
  | {kind: 'close'};

/** What one fake page was asked to do. */
type FakePage = {
  asked: Asked[];
  acts: Action[];
  /** Every store read, in order — an `evaluate` naming `window.__TINYAPP_STORE__`. */
  reads: string[];
  /** The store reads that came after the last act: where `content` must be taken. */
  readsAfterActing: string[];
  snapshots: number;
  closes: number;
};

/** The view of a page's log the assertions below read. */
const asked = (seen: Asked[]): FakePage => {
  const lastAct = seen.map((one) => one.kind).lastIndexOf('act');
  const reads = (entries: Asked[]): string[] =>
    entries.flatMap((one) => (one.kind === 'read' ? [one.expression] : []));
  return {
    asked: seen,
    acts: seen.flatMap((one) => (one.kind === 'act' ? [one.action] : [])),
    reads: reads(seen),
    readsAfterActing: reads(seen.slice(lastAct + 1)),
    snapshots: seen.filter((one) => one.kind === 'snapshot').length,
    closes: seen.filter((one) => one.kind === 'close').length,
  };
};

/** A fake `Browser`, and everything it was asked. */
type Fake = {
  browser: Browser;
  opens: {html: string; clock: string}[];
  logs: Asked[][];
  closes: number;
};

/** The pages a fake was asked for, each as the log of what it was asked. */
const pagesOf = (fake: Fake): FakePage[] => fake.logs.map(asked);

/**
 * A `Browser` that opens nothing.
 *
 * Its `open` records the html and the clock it was handed; each page it hands back logs
 * everything it was asked, in order, answers a store read with `JSON.stringify` of the
 * content canned for that page — so an implementation that does not parse what it evaluated
 * reads a string where a snapshot belongs — and answers `snapshot()` with a fixed DOM and
 * PNG.
 */
const fakeBrowser = (canned: {
  contents?: Snapshot[];
  dom?: string;
  screenshot?: Uint8Array;
}): Fake => {
  const opens: {html: string; clock: string}[] = [];
  const logs: Asked[][] = [];
  const fake: Fake = {
    opens,
    logs,
    closes: 0,
    browser: undefined as unknown as Browser,
  };

  fake.browser = {
    argv: ['fake-browser'],

    open: async ({html, clock}: {html: string; clock: string}): Promise<Page> => {
      const index = opens.length;
      opens.push({html, clock});
      const seen: Asked[] = [];
      logs.push(seen);

      return {
        act: async (action: Action): Promise<void> => {
          seen.push({kind: 'act', action});
        },
        evaluate: async (expression: string): Promise<unknown> => {
          if (!expression.includes('__TINYAPP_STORE__')) {
            seen.push({kind: 'evaluate', expression});
            return undefined;
          }
          seen.push({kind: 'read', expression});
          const contents = canned.contents ?? [];
          const answer = contents[Math.min(index, contents.length - 1)];
          return answer === undefined ? undefined : JSON.stringify(answer);
        },
        snapshot: async (): Promise<{dom: string; screenshot: Uint8Array}> => {
          seen.push({kind: 'snapshot'});
          return {dom: canned.dom ?? FIXTURE_DOM, screenshot: canned.screenshot ?? PNG};
        },
        close: async (): Promise<void> => {
          seen.push({kind: 'close'});
        },
      };
    },

    close: async (): Promise<void> => {
      fake.closes += 1;
    },
  };

  return fake;
};

// ---------------------------------------------------------------- the specs

/** One interaction spec: a seed, an `Action`, the state the examiner expects. */
const actionSpec = (over: Record<string, unknown> = {}): StateExamSpec =>
  ({
    clock: CLOCK,
    entry: ENTRY,
    seed: SEED_PATH,
    store: createTodosStore,
    action: {click: '#c'} as Action,
    expected: EXPECTED_CLICKED,
    mutant: MUTANT,
    ...over,
  }) as unknown as StateExamSpec;

/** The BASE form: a store callback, over the repository's own seed and expected files. */
const callbackSpec = (over: Record<string, unknown> = {}): StateExamSpec =>
  ({
    clock: CLOCK,
    entry: ENTRY,
    seed: atRoot('state-exams/seeds/empty.json'),
    store: createTodosStore,
    action: (store: any) => {
      addTodo(store, 'buy milk');
    },
    expected: atRoot('state-exams/expected/one-open-todo.json'),
    mutant: CALLBACK_MUTANT,
    ...over,
  }) as unknown as StateExamSpec;

/** The content `callbackSpec`'s action reaches — what a render page must be seeded from. */
const CALLBACK_CONTENT: Snapshot = JSON.parse(
  readFileSync(resolve(repoRoot, 'state-exams/expected/one-open-todo.json'), 'utf8'),
) as Snapshot;

/** What a caller hands `runStateExam` — the two new options among the BASE ones. */
type Opts = {
  env?: Record<string, string | undefined>;
  main?: string;
  browser?: Browser;
  minify?: boolean;
};

/** `runStateExam`, with the spec and the options spelled as the task's contract has them. */
const runExam = (spec: StateExamSpec, opts: Opts): Promise<ExamOutcome> =>
  runStateExam(spec, opts as any);

const remember = <T extends {dir: string}>(result: T): T => {
  madeDirs.push(result.dir);
  return result;
};

/** The names in `dir`, sorted — what the evidence writer left behind. */
const filesIn = (dir: string): string[] => readdirSync(dir).sort();

/** One evidence file, parsed. */
const evidence = (dir: string, name: string): any =>
  JSON.parse(readFileSync(join(dir, name), 'utf8'));

/** The `failure` of a red run, asserted to be a string before it is read. */
const failureOf = (result: ExamOutcome): string => {
  expect(typeof result.failure).toBe('string');
  return result.failure ?? '';
};

/** The seed literal an opened page carries, parsed back out of its html. */
const seedIn = (html: string): unknown => {
  const found = /window\.__TINYAPP_SEED__ = (.*?);/.exec(html);
  expect(found).not.toBeNull();
  return JSON.parse(found?.[1] ?? 'null');
};

/** True when `message` names a number at or above the `data:` URL ceiling. */
const namesTheCeiling = (message: string): boolean =>
  (message.match(/\d[\d_,]*/g) ?? [])
    .map((digits) => Number(digits.replace(/[_,]/g, '')))
    .some((value) => value >= URL_LIMIT);

/** Every `.ts` file under `dir`, recursively — what the `Run:` greps walk. */
const filesUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });

/** `<path>:<line>` for every line of `paths` carrying one of `needles`. */
const linesCarrying = (paths: string[], needles: string[]): string[] =>
  paths.flatMap((path) =>
    readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        needles.some((needle) => line.includes(needle))
          ? [`${relative(repoRoot, path)}:${index + 1}`]
          : [],
      ),
  );

// ------------------------------------------------- the one run legs (a), (b), (d), (e) read

/**
 * The green click run every leg below shares: one spec, one fake browser, one outcome — so
 * "in the same run" in leg (b) is literally the same run leg (a) looked at.
 */
let shared: Promise<{fake: Fake; result: ExamOutcome}> | null = null;

const greenClickRun = (): Promise<{fake: Fake; result: ExamOutcome}> => {
  shared ??= (async () => {
    const fake = fakeBrowser({contents: [CLICKED, CLICKED]});
    const result = remember(
      await runExam(
        actionSpec({
          view: [
            {selector: '.todoItem', count: 1, text: 'buy milk'},
            {selector: '.todoItem input', checked: true},
          ],
        }),
        {env: {}, main: '/x/click-completes-todo.test.ts', browser: fake.browser},
      ),
    );
    return {fake, result};
  })();
  return shared;
};

// ---------------------------------------------------------------- (a) [M1]

test(
  'leg (a) [M1]: a click opens two pages seeded from `seed`, acts once on each, and reads the store through the page',
  async () => {
    const {fake, result} = await greenClickRun();
    const pages = pagesOf(fake);

    // [M1] two fresh pages, and nothing else opened.
    expect(fake.opens.length).toBe(2);
    expect(pages.length).toBe(2);

    for (const [index, opened] of fake.opens.entries()) {
      // [M1] the page `renderHtml` builds for the entry: the entry's own document, the
      // entry's module bundled and inlined, and no `src` left anywhere.
      expect([index, opened.html.includes(ENTRY_MARKER)]).toEqual([index, true]);
      expect([index, opened.html.includes(APP_MARKER)]).toEqual([index, true]);
      expect([index, /<script\b[^>]*\bsrc\s*=/i.test(opened.html)]).toEqual([index, false]);

      // [M1] the seed global set to `seed`'s content, verbatim.
      expect([
        index,
        opened.html.includes(`window.__TINYAPP_SEED__ = ${JSON.stringify(SEED)}`),
      ]).toEqual([index, true]);
      expect(seedIn(opened.html)).toEqual(SEED);

      // [M1] the page's clock is the spec's, pinned by `open` before the app runs.
      expect([index, opened.clock]).toEqual([index, CLOCK]);
    }

    // [M1] the action performed once on each page.
    for (const [index, page] of pages.entries()) {
      expect([index, page.acts]).toEqual([index, [{click: '#c'}]]);
    }

    // [M1] `content` is taken after the action, from exactly one
    // `JSON.stringify(window.__TINYAPP_STORE__.getContent())` per page — and it was parsed:
    // the fake answered a string, and the diff below is of the snapshot that string spells.
    for (const [index, page] of pages.entries()) {
      expect([index, page.readsAfterActing.length]).toEqual([index, 1]);
      const read = page.readsAfterActing[0] ?? '';
      expect([index, read.includes('window.__TINYAPP_STORE__.getContent()')]).toEqual([
        index,
        true,
      ]);
      expect([index, read.includes('JSON.stringify')]).toEqual([index, true]);
    }

    // [M1] `storeDiff` is the diff of the canned content against `expected` — empty here,
    // because this spec's expected file is that content.
    expect(result.record.storeDiff).toEqual(diffContent(CLICKED, CLICKED));
    expect(result.record.storeDiff).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.failure).toBeNull();
  },
  120_000,
);

test(
  'leg (a) [M1]: the diff is of the content the page answered, against the expected file',
  async () => {
    const fake = fakeBrowser({contents: [CLICKED, CLICKED]});
    const result = remember(
      await runExam(actionSpec({expected: EXPECTED_OPEN}), {
        env: {},
        main: '/x/click-completes-todo.test.ts',
        browser: fake.browser,
      }),
    );

    // [M1] exactly `diffContent(<what the page answered>, <the expected file>)`.
    expect(result.record.storeDiff).toEqual(diffContent(CLICKED, SEED));
    expect(result.record.storeDiff).toEqual([
      {table: 'todos', row: '0', cell: 'completed', got: true, wanted: false},
    ]);
    expect(result.ok).toBe(false);
    expect(failureOf(result).startsWith('store move: expected state not reached')).toBe(true);
  },
  120_000,
);

test(
  'leg (a) [M1]: a type action, a key action and an array of them are performed, in order, on each page',
  async () => {
    const cases: {action: Action | Action[]; acts: Action[]}[] = [
      {action: {type: ['#i', 'buy milk']}, acts: [{type: ['#i', 'buy milk']}]},
      {action: {key: ['#i', 'Enter']}, acts: [{key: ['#i', 'Enter']}]},
      {
        action: [{type: ['#i', 'buy milk']}, {key: ['#i', 'Enter']}],
        acts: [{type: ['#i', 'buy milk']}, {key: ['#i', 'Enter']}],
      },
    ];

    for (const {action, acts} of cases) {
      const fake = fakeBrowser({contents: [CLICKED, CLICKED]});
      const result = remember(
        await runExam(actionSpec({action}), {
          env: {},
          main: '/x/enter-submits-todo.test.ts',
          browser: fake.browser,
        }),
      );

      // [M1] both pages saw exactly those acts, in that order.
      const pages = pagesOf(fake);
      expect([action, pages.length]).toEqual([action, 2]);
      for (const page of pages) {
        expect([action, page.acts]).toEqual([action, acts]);
      }
      expect([action, result.ok]).toEqual([action, true]);
    }
  },
  120_000,
);

test(
  'leg (a) [M1]: two pages that answer different contents are a nondeterministic store',
  async () => {
    const fake = fakeBrowser({contents: [CLICKED, SEED]});
    const result = remember(
      await runExam(actionSpec(), {
        env: {},
        main: '/x/click-completes-todo.test.ts',
        browser: fake.browser,
      }),
    );

    // [M1] rejected `nondeterministic store:`, exactly as the callback form does.
    expect(result.ok).toBe(false);
    expect(failureOf(result).startsWith('nondeterministic store:')).toBe(true);
    expect(fake.opens.length).toBe(2);
  },
  120_000,
);

// ---------------------------------------------------------------- (b) [M2]

test(
  'leg (b) [M2]: with an action the render move is the first page — one snapshot, no third page',
  async () => {
    const {fake, result} = await greenClickRun();
    const pages = pagesOf(fake);

    // [M2] exactly one snapshot, taken on the first page, and no second page opened for it.
    expect(fake.opens.length).toBe(2);
    expect(pages[0]?.snapshots).toBe(1);
    expect(pages[1]?.snapshots).toBe(0);
    expect(pages.map((page) => page.snapshots).reduce((a, b) => a + b, 0)).toBe(1);

    // [M2] and it was taken after the action, so the picture is of the state it reached.
    const order = (pages[0]?.asked ?? []).map((one) => one.kind);
    expect(order.includes('act')).toBe(true);
    expect(order.lastIndexOf('snapshot')).toBeGreaterThan(order.lastIndexOf('act'));

    // [M2] `dom` and `screenshot` are that snapshot's, and they are what was filed.
    expect(result.record.dom).toBe(FIXTURE_DOM);
    expect(new Uint8Array(result.record.screenshot ?? new Uint8Array())).toEqual(PNG);
    expect(result.record.walls.render).toBe('ran');
    expect(filesIn(result.dir)).toEqual(SIX_FILES);
    expect(readFileSync(join(result.dir, 'dom.html'), 'utf8')).toBe(FIXTURE_DOM);
    expect(new Uint8Array(readFileSync(join(result.dir, 'screenshot.png')))).toEqual(PNG);
  },
  120_000,
);

test(
  'leg (b) [M2]: the view failures are `assertView` of the page that was acted on',
  async () => {
    const view = [{selector: '.todoItem', count: 2}, {selector: '#absent', count: 1}];
    const fake = fakeBrowser({contents: [CLICKED, CLICKED]});
    const result = remember(
      await runExam(actionSpec({view}), {
        env: {},
        main: '/x/click-completes-todo.test.ts',
        browser: fake.browser,
      }),
    );

    const failures = assertView(FIXTURE_DOM, view);
    expect(failures.length).toBe(2);

    // [M2] `assertView` read the snapshot's `dom`: every failure of it, and no other.
    expect(result.ok).toBe(false);
    const failure = failureOf(result);
    expect(failure.startsWith('render: view not satisfied')).toBe(true);
    for (const line of failures) {
      expect(failure).toContain(line);
    }
    expect(failure).toBe(`render: view not satisfied\n${failures.join('\n')}`);

    // The store move was green all the same, so the picture was still filed.
    expect(result.record.storeDiff).toEqual([]);
    expect(result.record.walls.render).toBe('ran');
    expect(filesIn(result.dir)).toEqual(SIX_FILES);
  },
  120_000,
);

test(
  'leg (b) [M2]: a callback action with an entry opens one page, seeded from the post-action content',
  async () => {
    const fake = fakeBrowser({contents: [CALLBACK_CONTENT]});
    const result = remember(
      await runExam(callbackSpec({view: [{selector: '.todoItem', count: 1}]}), {
        env: {},
        main: '/x/buy-milk.test.ts',
        browser: fake.browser,
      }),
    );

    // [M2] one page, one snapshot — the renderer is the local browser here too.
    const pages = pagesOf(fake);
    expect(fake.opens.length).toBe(1);
    expect(pages[0]?.snapshots).toBe(1);
    expect(pages[0]?.acts).toEqual([]);

    // [M2] seeded from the state the callback reached, not from the spec's seed file.
    const seeded = seedIn(fake.opens[0]?.html ?? '');
    expect(diffContent(seeded as Snapshot, CALLBACK_CONTENT)).toEqual([]);
    expect(diffContent(seeded as Snapshot, [{}, {}])).not.toEqual([]);
    expect(fake.opens[0]?.clock).toBe(CLOCK);

    expect(result.ok).toBe(true);
    expect(result.record.dom).toBe(FIXTURE_DOM);
    expect(result.record.walls.render).toBe('ran');
  },
  120_000,
);

test('leg (b) [M2]: `TINYAPP_RENDER_URL` occurs nowhere under packages/tinyapp-exam/src', () => {
  // The second `Run:` line of the Proof, as an assertion that names its offenders.
  const src = resolve(repoRoot, 'packages/tinyapp-exam/src');
  expect(linesCarrying(filesUnder(src), ['TINYAPP_RENDER_URL'])).toEqual([]);
});

// ---------------------------------------------------------------- (c) [M3]

/** The no-entry run legs (c) and (d) share. */
let noEntry: Promise<{fake: Fake; result: ExamOutcome}> | null = null;

const noEntryRun = (): Promise<{fake: Fake; result: ExamOutcome}> => {
  noEntry ??= (async () => {
    const spec = callbackSpec();
    delete (spec as unknown as Record<string, unknown>).entry;
    const fake = fakeBrowser({contents: [CALLBACK_CONTENT]});
    const result = remember(
      await runExam(spec, {env: {}, main: '/x/buy-milk.test.ts', browser: fake.browser}),
    );
    return {fake, result};
  })();
  return noEntry;
};

test(
  'leg (c) [M3]: no entry means the render move is skipped and no page is ever opened',
  async () => {
    const {fake, result} = await noEntryRun();

    // [M3] skipped, and recorded so — and nothing was opened to skip it.
    expect(result.record.walls.render).toBe('skipped');
    expect(result.record.walls.render_ms).toBeNull();
    expect(fake.opens.length).toBe(0);
    expect(pagesOf(fake).length).toBe(0);

    // A skipped render is not a failure: the exam still holds.
    expect(result.ok).toBe(true);
    expect(result.failure).toBeNull();
  },
  120_000,
);

test(
  'leg (c) [M3]: with an entry and no run directory the render still runs, under os.tmpdir()',
  async () => {
    const {fake, result} = await greenClickRun();

    // [M3] the run directory is not the trigger: `ULTRA_RUN_DIR` was unset and the page was
    // opened all the same.
    expect(fake.opens.length).toBeGreaterThan(0);
    expect(result.record.walls.render).toBe('ran');
    expect(typeof result.record.walls.render_ms).toBe('number');

    // [M3] and the evidence landed under `os.tmpdir()`, as at BASE.
    expect(resolve(result.dir).startsWith(resolve(tmpdir()))).toBe(true);
    expect(basename(result.dir).startsWith('tinyapp-exam-click-completes-todo-')).toBe(true);
    expect(existsSync(result.dir)).toBe(true);
  },
  120_000,
);

// ---------------------------------------------------------------- (d) [M4]

test(
  'leg (d) [M4]: walls.json carries action_ms and browser, and contract.json pinned_in_page',
  async () => {
    const {result} = await greenClickRun();
    const walls = evidence(result.dir, 'walls.json');

    // [M4] the two new keys, beside the four the engine already reads.
    for (const key of [
      'store_ms',
      'render_ms',
      'mutant_ms',
      'render',
      'action_ms',
      'browser',
    ]) {
      expect([key, Object.keys(walls).includes(key)]).toEqual([key, true]);
    }
    expect(typeof walls.action_ms).toBe('number');
    expect(Number.isFinite(walls.action_ms)).toBe(true);
    expect(walls.action_ms).toBeGreaterThanOrEqual(0);
    expect(walls.browser).toBe('ran');
    expect(walls).toEqual(result.record.walls as unknown as Record<string, unknown>);

    // [M4] the interaction form's contract is the page's: clock pinned in the page.
    expect(evidence(result.dir, 'contract.json')).toEqual({
      clock: CLOCK,
      breach: null,
      pinned_in_page: true,
    });
  },
  120_000,
);

test(
  'leg (d) [M4]: a callback action with no browser records action_ms null and browser skipped',
  async () => {
    const {result} = await noEntryRun();
    const walls = evidence(result.dir, 'walls.json');

    // [M4] `null` for a callback action, and no browser ran.
    expect(walls.action_ms).toBeNull();
    expect(walls.browser).toBe('skipped');
    expect(walls.render).toBe('skipped');

    // [M4] the callback form's contract is the process's, not the page's.
    expect(evidence(result.dir, 'contract.json')).toEqual({
      clock: CLOCK,
      breach: null,
      pinned_in_page: false,
    });
  },
  120_000,
);

test(
  'leg (d) [M4]: a callback action rendered in a page still records action_ms null',
  async () => {
    const fake = fakeBrowser({contents: [CALLBACK_CONTENT]});
    const result = remember(
      await runExam(callbackSpec(), {
        env: {},
        main: '/x/buy-milk.test.ts',
        browser: fake.browser,
      }),
    );

    // [M4] `action_ms` times the interaction alone, and a callback is not one.
    expect(evidence(result.dir, 'walls.json').action_ms).toBeNull();
    // [M4] the browser did run — it is what rendered the page.
    expect(evidence(result.dir, 'walls.json').browser).toBe('ran');
    // [M4] the action itself was not pinned in any page.
    expect(evidence(result.dir, 'contract.json').pinned_in_page).toBe(false);
  },
  120_000,
);

// ---------------------------------------------------------------- (e) [M5]

test(
  'leg (e) [M5]: a missing binary with an action is the `browser: ` line, with the evidence still written',
  async () => {
    const result = remember(
      await runExam(actionSpec(), {
        env: {TINYAPP_BROWSER: MISSING_BROWSER},
        main: '/x/click-completes-todo.test.ts',
      }),
    );

    // [M5] not ok, and the failure is the launch's own line, naming the path.
    expect(result.ok).toBe(false);
    const failure = failureOf(result);
    expect(failure.startsWith('browser: ')).toBe(true);
    expect(failure).toContain(MISSING_BROWSER);

    // [M5] the evidence files land as for any red — all six of them.
    expect(filesIn(result.dir)).toEqual(SIX_FILES);
  },
  120_000,
);

test(
  'leg (e) [M5]: a missing binary with a callback action and an entry is the same red',
  async () => {
    const result = remember(
      await runExam(callbackSpec(), {
        env: {TINYAPP_BROWSER: MISSING_BROWSER},
        main: '/x/buy-milk.test.ts',
      }),
    );

    expect(result.ok).toBe(false);
    const failure = failureOf(result);
    expect(failure.startsWith('browser: ')).toBe(true);
    expect(failure).toContain(MISSING_BROWSER);
    expect(filesIn(result.dir)).toEqual(SIX_FILES);
  },
  120_000,
);

test('leg (e) [M5]: the mutant move is unchanged — a green click spec still kills its mutant', async () => {
  const {result} = await greenClickRun();

  expect(result.record.mutant).toEqual({
    killed: true,
    path: MUTANT_PATH,
    edits: MUTANT,
  });
  expect(evidence(result.dir, 'mutant.json')).toEqual({
    killed: true,
    path: MUTANT_PATH,
    edits: MUTANT,
  });
});

// ---------------------------------------------------------------- (f) [M6]

const SURVIVORS = [
  'packages/tinyapp-exam/test/render-move.test.ts',
  'packages/tinyapp-exam/test/state-exam.test.ts',
];

test(
  'leg (f) [M6]: the two re-aimed test files pass, and neither names the endpoint or its stub',
  () => {
    // The third `Run:` line, as an assertion that names its offenders.
    expect(
      linesCarrying(
        SURVIVORS.map((path) => resolve(repoRoot, path)),
        ['TINYAPP_RENDER_URL', 'fetchImpl'],
      ),
    ).toEqual([]);

    // The first `Run:` line: both files green on this tree.
    const spawned = Bun.spawnSync(['bun', 'test', ...SURVIVORS], {
      cwd: repoRoot,
      env: {...process.env, ULTRA_RUN_DIR: ''},
    });
    const output = `${spawned.stderr.toString()}${spawned.stdout.toString()}`;
    expect([spawned.exitCode, output.includes('0 fail')]).toEqual([0, true]);
  },
  300_000,
);

// ---------------------------------------------------------------- (g) [M1] [M7]

/** The Chromium this machine has. A missing one is a red naming both paths, never a skip. */
const browserBinary = (): string => {
  const named = process.env.TINYAPP_BROWSER;
  if (named !== undefined && named !== '' && existsSync(named)) {
    return named;
  }
  if (existsSync(IMAGE_BROWSER)) {
    return IMAGE_BROWSER;
  }
  throw new Error(
    `browser: no such binary ${IMAGE_BROWSER} (and none at TINYAPP_BROWSER=${
      process.env.TINYAPP_BROWSER ?? '<unset>'
    }) — leg (g) is an end-to-end leg and does not skip`,
  );
};

/** A real browser whose `open` records the `data:` URL it would navigate to. */
const recordingBrowser = async (): Promise<{
  browser: Browser;
  urls: number[];
  close: () => Promise<void>;
}> => {
  const real = await launchBrowser({binary: browserBinary(), env: process.env});
  const urls: number[] = [];
  return {
    urls,
    close: () => real.close(),
    browser: {
      argv: real.argv,
      open: async (opts: {html: string; clock: string}): Promise<Page> => {
        urls.push(dataUrlLength(opts.html));
        return real.open(opts);
      },
      close: () => real.close(),
    },
  };
};

test(
  'leg (g) [M1] [M7]: a click on the fixture completes the todo, read through the page store, under the ceiling',
  async () => {
    const real = await recordingBrowser();
    let result: ExamOutcome;
    try {
      result = remember(
        await runExam(
          actionSpec({
            entry: atRoot('client/index.html'),
            seed: atRoot('state-exams/seeds/two-open-todos.json'),
            expected: EXPECTED_G,
            action: {click: {role: 'checkbox', name: 'buy milk'}} as Action,
            view: [{selector: '#todoList li', count: 2}],
          }),
          {env: {}, main: '/x/click-completes-todo.test.ts', browser: real.browser},
        ),
      );
    } finally {
      await real.close();
    }

    // [M1] the content read through `window.__TINYAPP_STORE__` is exactly the state the
    // click reached: the first todo completed, the second untouched.
    expect(result.record.storeDiff).toEqual([]);
    expect(result.failure).toBeNull();
    expect(result.ok).toBe(true);

    // [M1] two fresh pages, agreeing.
    expect(real.urls.length).toBe(2);

    // [M4] the browser ran, and the interaction was timed.
    expect(result.record.walls.browser).toBe('ran');
    expect(result.record.walls.render).toBe('ran');
    expect(typeof result.record.walls.action_ms).toBe('number');

    // [M7] every page's `data:` URL is under 2,000,000 characters for this entry.
    for (const length of real.urls) {
      expect([length, length < URL_LIMIT]).toEqual([length, true]);
    }

    // The picture and the markup are of that page.
    expect(filesIn(result.dir)).toEqual(SIX_FILES);
    expect([...new Uint8Array(readFileSync(join(result.dir, 'screenshot.png'))).slice(0, 4)]).toEqual(
      PNG_SIGNATURE,
    );
    expect(readFileSync(join(result.dir, 'dom.html'), 'utf8')).toBe(result.record.dom);
    expect((result.record.dom ?? '').includes('id="todoList"')).toBe(true);
    expect(result.record.mutant.killed).toBe(true);
  },
  600_000,
);

test(
  'leg (g) [M7]: forced unminified, the url is over the ceiling and the exam says so rather than hanging',
  async () => {
    const real = await recordingBrowser();
    let result: ExamOutcome;
    const started = performance.now();
    try {
      result = remember(
        await runExam(
          actionSpec({
            entry: atRoot('client/index.html'),
            seed: atRoot('state-exams/seeds/two-open-todos.json'),
            expected: EXPECTED_G,
            action: {click: {role: 'checkbox', name: 'buy milk'}} as Action,
          }),
          {
            env: {},
            main: '/x/click-completes-todo.test.ts',
            browser: real.browser,
            minify: false,
          },
        ),
      );
    } finally {
      await real.close();
    }
    const elapsed = performance.now() - started;

    // [M7] the unminified page really is over the ceiling — that is what is being refused.
    expect(real.urls.length).toBeGreaterThan(0);
    expect([real.urls[0], (real.urls[0] ?? 0) > DATA_URL_CEILING]).toEqual([
      real.urls[0],
      true,
    ]);

    // [M7] and the exam failed with a message naming the ceiling, rather than waiting on a
    // load that will not come.
    expect(result.ok).toBe(false);
    const failure = failureOf(result);
    expect([failure, namesTheCeiling(failure)]).toEqual([failure, true]);
    expect(elapsed).toBeLessThan(300_000);
  },
  600_000,
);

test(
  'leg (g) [M7]: `open` refuses a data: url over the ceiling within 15 s, naming it',
  async () => {
    const real = await launchBrowser({binary: browserBinary(), env: process.env});
    const html = `<!doctype html><html><head><title>big</title></head><body><p>${'x'.repeat(
      1_700_000,
    )}</p></body></html>`;
    expect(dataUrlLength(html)).toBeGreaterThan(DATA_URL_CEILING);

    const LATE = Symbol('late');
    try {
      const outcome = await Promise.race([
        real.open({html, clock: CLOCK}).then(
          () => 'resolved',
          (error: unknown) => (error instanceof Error ? error.message : String(error)),
        ),
        new Promise<typeof LATE>((done) => {
          const timer = setTimeout(() => done(LATE), 15_000);
          (timer as unknown as {unref?: () => void}).unref?.();
        }),
      ]);

      // [M7] it rejected — it did not resolve, and it did not hang past 15 s.
      expect(outcome).not.toBe(LATE);
      expect(outcome).not.toBe('resolved');
      const message = String(outcome);
      expect(message.startsWith('browser: ')).toBe(true);
      expect([message, namesTheCeiling(message)]).toEqual([message, true]);
    } finally {
      await real.close();
    }
  },
  300_000,
);
