// Exam for task 2, legs (a)-(g) and (i): the persistence move — the helper serves the page
// unseeded from a loopback origin, acts, waits for the save, reloads, and reads the store and
// the rows back.
//
// M1. `tinyapp-exam` exports at runtime `persistenceExam`, `runPersistenceExam` and
//     `contentOf`, and every runtime name it exported at BASE; `capture-plugin.ts`'s
//     `EXAM_NO_OPS` names the three, so `bun run lint:state` exits 0 on this tree while
//     `tests/state-exams/persistence-exam.test.ts` imports all three; and
//     `bunx tsc -p packages/tinyapp-exam --noEmit` exits 0.
// M2. `contentOf(stamped)` is the plain `[tables, values]` snapshot of a stamped
//     `[[tables, hlc, hash], [values, hlc, hash]]`, with a cell or value whose `value` is
//     `"￼"` or `null` dropped and a row or table left with nothing dropped.
// M3. `renderHtml(entryHtml, {js, css})` — no `seed` — is the entry with the bundle inlined
//     and no `__TINYAPP_SEED__` text anywhere in it, while the seeded call is what it was at
//     BASE; `runPersistenceExam` serves that unseeded page on `http://127.0.0.1:<port>` with
//     `<port>` chosen by the OS, every path answering the page except a path named in
//     `spec.assets`, which answers that file's bytes; and a request beyond that origin is
//     refused in the browser, the second loopback server it would have reached answering
//     exactly 0 requests.
// M4. Every new document runs the clock pin, sets `window.__TINYAPP_EXAM__ = true` and
//     replaces `WebSocket` with a constructor that throws and records the first url on
//     `window.__TINYAPP_BREACH__`; a page constructing one makes `ok` `false` and `failure`
//     exactly `contract breach: <url>`, while the honest page's `record.contract` is
//     `{clock, breach: null, pinned_in_page: true}`.
// M5. The honest stand-in resolves `ok` `true`, `failure` `null`, `storeDiff` `[]`, the
//     `rows` M5 spells, `mutant.killed` `true`, six walls each finite and non-negative with
//     `render` and `browser` `ran`, `domBefore` carrying `data-load="1"` and `dom`
//     `data-load="2"`, both carrying `data-path="/room"`.
// M6. `dir` holds exactly the eight evidence files, each parsing back to the record it came
//     from; `writeEvidence` over a record with neither `rows` nor `domBefore` still writes
//     exactly the four or six files it wrote at BASE.
// M7. Each failure names itself, in the precedence ready, breach, persist, store, rows, view,
//     mutant, the record is written either way, and after every one of them no child of the
//     test process is a Chromium and a `fetch` to the exam's origin rejects.
// M9. `README.md`'s `## State exams` section names `persistenceExam`,
//     `window.__TINYAPP_EXAM__`, `rows.json`, `persist_ms` and `reload_ms`, in that order.
//
// Leg (h) — the registered `bun test` and the seeded regression — is the other exam file,
// `tests/state-exams/persistence-exam.test.ts`, as the task's Context asks.
//
// No leg dials a network. The only sockets any leg is party to are loopback ones: the
// driver's own CDP socket to the Chromium it spawned, the page's requests to the origin the
// driver serves on `127.0.0.1`, and — in leg (c) — a second `127.0.0.1` server this file runs
// only to count the requests it must never receive.
//
// The legs that need a real Chromium are (c)'s served page, (d), (e), (f)'s eight files and
// (g). The fleet image carries one at `/headless-shell/headless-shell`; a laptop names one
// through `TINYAPP_BROWSER`. With neither on the machine this file prints one line saying so
// and runs the rest — `contentOf`, the unseeded `renderHtml`, the evidence-file rule, the
// exports and the `Run:` lines — exactly as `browser.test.ts` does.
//
// The package is imported as a namespace rather than by name on purpose: a missing export is
// then this leg's own red — `tinyapp-exam exports no runPersistenceExam yet` — rather than a
// link error that takes every other leg down with it.

import {afterAll, expect, test} from 'bun:test';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

import * as exam from 'tinyapp-exam';

// ---------------------------------------------------------------- fixtures

/** The repository root: this file sits three directories below it. */
const ROOT = resolve(import.meta.dir, '../../..');

/** The stand-in fixture the task creates, as the specs below name it — from `process.cwd()`. */
const FIXTURE_DIR = 'packages/tinyapp-exam/test/fixtures/persistence';
const ENTRY = `${FIXTURE_DIR}/entry.html`;
const ASSET = `${FIXTURE_DIR}/hello.txt`;
const EXPECTED = `${FIXTURE_DIR}/expected-one-row.json`;

/** The clock every page here is pinned to, and the instant it reads as. */
const CLOCK = '2026-01-01T00:00:00Z';
const CLOCK_MS = 1767225600000;

/** The one line `hello.txt` carries — no trailing newline, so the attribute is the line. */
const HELLO_LINE = "hello from the exam's own origin";

/** The content the fixture saves, reloads into, and is graded against. */
const ONE_ROW = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}];

/** TinyBase's spelling of a deleted cell in JSON: U+FFFC, the object replacement character. */
const DELETED = '￼';

/**
 * M2's stamped literal, spelled as the JSON text the clause spells so every
 * `[value, hlc, hash]` triple reads as written.
 */
const STAMPED_TEXT =
  '[[{"todos":[{"0":[{"text":["buy milk","P1",1],"completed":[false,"P2",2]},"",3],' +
  `"2":[{"text":["${DELETED}","P3",4],"completed":["${DELETED}","P4",5]},"",6]},"",7],` +
  '"trash":[{},"",8]},"",9],' +
  `[{"filter":["done","P5",10],"gone":["${DELETED}","P6",11]},"",12]]`;

/** The runtime names the package exported at BASE, every one of which must survive. */
const BASE_NAMES = [
  'stateExam',
  'runStateExam',
  'STATE_EXAM_TIMEOUT_MS',
  'launchBrowser',
  'withContract',
  'browserStoreMove',
  'diffContent',
  'renderDiff',
  'storeMove',
  'READ_CONTENT',
  'assertView',
  'bundleOf',
  'pageFor',
  'renderHtml',
  'renderMove',
  'REFLECT_CHECKED',
  'applyMutant',
  'mutantPath',
  'evidenceDir',
  'examStem',
  'writeEvidence',
  'actionsOf',
  'isCallbackAction',
  'VALUES_TABLE',
];

/** The three names this task adds. */
const NEW_NAMES = ['persistenceExam', 'runPersistenceExam', 'contentOf'];

/** M6's evidence, sorted as `readdir` returns it. */
const EIGHT_FILES = [
  'contract.json',
  'dom-before.html',
  'dom.html',
  'mutant.json',
  'rows.json',
  'screenshot.png',
  'store-diff.json',
  'walls.json',
];

/** The four files a record with no page leaves, and the six a record with one leaves. */
const FOUR_FILES = ['contract.json', 'mutant.json', 'store-diff.json', 'walls.json'];
const SIX_FILES = [
  'contract.json',
  'dom.html',
  'mutant.json',
  'screenshot.png',
  'store-diff.json',
  'walls.json',
];

/** The first four bytes of any PNG. */
const PNG_SIGNATURE = [137, 80, 78, 71];

/** Where the fleet image keeps its headless shell. */
const IMAGE_BROWSER = '/headless-shell/headless-shell';

/** The Chromium this machine has, or `null` when it has none. */
const BROWSER: string | null = (() => {
  const named = process.env.TINYAPP_BROWSER;
  if (named && existsSync(named)) return named;
  if (existsSync(IMAGE_BROWSER)) return IMAGE_BROWSER;
  return null;
})();

if (!BROWSER) {
  console.log(
    `persistence-move.test: no Chromium at ${process.env.TINYAPP_BROWSER ?? '$TINYAPP_BROWSER (unset)'} ` +
      `or ${IMAGE_BROWSER} — legs (c)-(g) want one; set TINYAPP_BROWSER to run them.`,
  );
}

/** The wall one leg that opens a browser is given. */
const LEG_TIMEOUT_MS = 300_000;

// ---------------------------------------------------------------- shapes

/** The spec literal this task's Context spells, as the legs below build it. */
type PersistenceSpec = {
  clock: string;
  entry: string;
  assets?: Record<string, string>;
  action: unknown;
  expected: string;
  table: string;
  view?: unknown;
  mutant: unknown[];
};

/** The record the outcome carries, read only through the keys the clauses name. */
type Recorded = {
  walls: Record<string, unknown>;
  mutant: {killed: boolean; path: string; edits: unknown[]};
  contract: {clock: string; breach: string | null; pinned_in_page: boolean};
  storeDiff: {table: string; row: string; cell: string; got: unknown; wanted: unknown}[];
  rows?: {sql: string; rows: unknown[]; content: unknown; diff: unknown[]};
  dom?: string;
  domBefore?: string;
  screenshot?: Uint8Array;
};

type Outcome = {ok: boolean; failure: string | null; record: Recorded; dir: string};

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
    throw new Error(`tinyapp-exam exports no \`${name}\` yet — the persistence move is unbuilt`);
  }
  return value as T;
};

const runPersistence = (
  spec: PersistenceSpec,
  opts?: Record<string, unknown>,
): Promise<Outcome> =>
  helperOf<(spec: PersistenceSpec, opts?: Record<string, unknown>) => Promise<Outcome>>(
    'runPersistenceExam',
  )(spec, opts);

const contentOf = (stamped: unknown): unknown =>
  helperOf<(stamped: unknown) => unknown>('contentOf')(stamped);

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

/**
 * The stand-in fixture copied into a fresh directory with its `app.js` altered, and the path
 * of the copy's `entry.html` — the `entry` a variant spec names.
 *
 * Built inside the test body that wants it and never at module level: the lint capture child
 * imports exam files for their specs alone, and a module-level `mkdtemp` would run there too.
 */
const variantEntry = (label: string, change: (appJs: string) => string): string => {
  const dir = mkdtempSync(join(tmpdir(), `persistence-${label}-`));
  temps.push(dir);
  writeFileSync(join(dir, 'entry.html'), fixtureText('entry.html'));
  writeFileSync(join(dir, 'app.js'), change(fixtureText('app.js')));
  return join(dir, 'entry.html');
};

/** A file of `content` in a fresh directory, named as a path from `process.cwd()`. */
const scratchFile = (label: string, name: string, content: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `persistence-${label}-`));
  temps.push(dir);
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
};

/** Every process on the machine as `<ppid> <args>`. */
const processLines = (): {ppid: number; args: string}[] => {
  const listed = Bun.spawnSync(['ps', '-eo', 'ppid=,args=']);
  return new TextDecoder()
    .decode(listed.stdout)
    .split('\n')
    .map((line) => line.trim().match(/^(\d+)\s+(.*)$/))
    .filter((matched): matched is RegExpMatchArray => matched !== null)
    .map((matched) => ({ppid: Number(matched[1]), args: matched[2]!}));
};

/** The command lines of the processes this test process is the direct parent of. */
const childCommands = (): string[] =>
  processLines()
    .filter((entry) => entry.ppid === process.pid)
    .map((entry) => entry.args);

/** The browsers still running as this process's children, read for a moment, not once. */
const survivingBrowsers = async (): Promise<string[]> => {
  const deadline = Date.now() + 5000;
  let survivors = childCommands().filter((args) => args.includes('--remote-debugging-port'));
  while (survivors.length > 0 && Date.now() < deadline) {
    await Bun.sleep(100);
    survivors = childCommands().filter((args) => args.includes('--remote-debugging-port'));
  }
  return survivors;
};

/** The origin the page recorded on itself, or `null` when this record carries no page. */
const originOf = (record: Recorded): string | null => {
  const dom = record.dom ?? record.domBefore ?? '';
  return /data-origin="([^"]+)"/.exec(dom)?.[1] ?? null;
};

/** True when a `fetch` of `url` rejects — the server behind it stopped. */
const fetchRejects = async (url: string): Promise<boolean> => {
  try {
    await fetch(url);
    return false;
  } catch {
    return true;
  }
};

/**
 * The teardown M7 ends on, read after one outcome: no Chromium left a child of this process,
 * and the exam's own origin refusing a connection.
 *
 * The origin is read off `data-origin` in the record's markup. A species whose failure came
 * before any page was photographed carries no markup and so no origin — the browser half of
 * the check still holds of it.
 */
const assertClosed = async (outcome: Outcome): Promise<void> => {
  expect(await survivingBrowsers()).toEqual([]);
  const origin = originOf(outcome.record);
  if (origin !== null) {
    expect(origin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(await fetchRejects(`${origin}/`)).toBe(true);
  }
};

/** One child process from the repository root, its output kept for a red leg to print. */
const ran = (argv: string[], label: string): {code: number; output: string} => {
  const child = Bun.spawnSync(argv, {cwd: ROOT, stdout: 'pipe', stderr: 'pipe'});
  const decoder = new TextDecoder();
  const output = `${decoder.decode(child.stdout)}${decoder.decode(child.stderr)}`;
  if (child.exitCode !== 0) {
    console.log(`${label} exited ${child.exitCode}:\n${output}`);
  }
  return {code: child.exitCode ?? 1, output};
};

// ---------------------------------------------------------------- the specs

/** M5's spec, the one the honest stand-in is graded by. */
const HONEST_SPEC: PersistenceSpec = {
  clock: CLOCK,
  entry: ENTRY,
  assets: {'/hello.txt': ASSET},
  action: {click: {role: 'button', name: 'Add'}},
  expected: EXPECTED,
  table: 'todos',
  view: {selector: '#rows li', count: 1, text: 'buy milk'},
  mutant: [{table: 'todos', row: '0', cell: 'text', value: ''}],
};

/**
 * The honest run, made once and read by legs (c), (d), (e) and (f).
 *
 * The `opts` are M5's own, `{main: '/x/honest.test.ts'}` and nothing else, so the stem this
 * run's evidence lands under is the clause's.
 */
let honestRun: Promise<Outcome> | null = null;
const honest = (): Promise<Outcome> =>
  (honestRun ??= runPersistence(HONEST_SPEC, {main: '/x/honest.test.ts'}));

// ---------------------------------------------------------------- (a) [M1]

test(
  'leg (a) [M1]: the three new names, every BASE name, the capture stub and the first three Run lines',
  () => {
    // Every path in this file is a path from the repository root, so a `bun test` run from
    // anywhere else is a failure that says so rather than a pile of missing fixtures.
    expect(resolve(process.cwd())).toBe(ROOT);

    const names = exam as unknown as Record<string, unknown>;

    // The three this task adds, one assertion each.
    expect(typeof names.persistenceExam).toBe('function');
    expect(typeof names.runPersistenceExam).toBe('function');
    expect(typeof names.contentOf).toBe('function');

    // And every runtime name the package exported at BASE, one assertion each.
    for (const name of BASE_NAMES) {
      expect(`${name}: ${typeof names[name]}`).not.toBe(`${name}: undefined`);
    }

    // The capture stub names all three, or the lint child cannot link an exam file that
    // imports them.
    const plugin = readFileSync(
      resolve(ROOT, 'packages/tinyapp-lint/src/capture-plugin.ts'),
      'utf8',
    );
    const noOps = /EXAM_NO_OPS[^[]*\[([\s\S]*?)\]/.exec(plugin)?.[1] ?? '';
    for (const name of NEW_NAMES) {
      expect(plugin).toContain(name);
      expect(noOps).toContain(name);
    }

    // The first three `Run:` lines, in the Proof's order.
    expect(
      ran(['bunx', 'tsc', '-p', 'packages/tinyapp-exam', '--noEmit'], 'tsc').code,
    ).toBe(0);
    expect(ran(['bun', 'run', 'lint:state'], 'lint:state').code).toBe(0);
    expect(
      ran(
        ['grep', '-q', 'persistenceExam', 'packages/tinyapp-lint/src/capture-plugin.ts'],
        'grep persistenceExam',
      ).code,
    ).toBe(0);
  },
  LEG_TIMEOUT_MS,
);

// ---------------------------------------------------------------- (b) [M2]

test('leg (b) [M2]: contentOf drops the deleted cells, the deleted value and what they empty', () => {
  const stripped = contentOf(JSON.parse(STAMPED_TEXT)) as [
    Record<string, Record<string, Record<string, unknown>>>,
    Record<string, unknown>,
  ];

  expect(stripped).toEqual([{todos: {'0': {text: 'buy milk', completed: false}}}, {filter: 'done'}]);

  // The deleted row and the empty `trash` table are gone, not merely emptied.
  expect(Object.keys(stripped[0])).toEqual(['todos']);
  expect(Object.keys(stripped[0].todos!)).toEqual(['0']);
  // …and so is the deleted value.
  expect(Object.keys(stripped[1])).toEqual(['filter']);

  // The empty stamped pair is the empty snapshot.
  expect(contentOf(JSON.parse('[[{},"",0],[{},"",0]]'))).toEqual([{}, {}]);
});

// ---------------------------------------------------------------- (c) [M3]

test('leg (c) [M3]: renderHtml with no seed inlines the bundle and writes no seed at all', () => {
  const entryHtml = fixtureText('entry.html');
  const renderHtml = helperOf<
    (html: string, parts: {js: string; css: string; seed?: unknown}) => string
  >('renderHtml');

  const unseeded = renderHtml(entryHtml, {js: 'x', css: 'y'});
  expect(unseeded).not.toContain('__TINYAPP_SEED__');
  expect(unseeded).toContain('<script type="module">x</script>');
  expect(unseeded).toContain('<style>y</style>');

  // The seeded call still writes the seed it always wrote — the fifth `Run:` line of leg (i)
  // is what pins it byte for byte against BASE.
  const seeded = renderHtml(entryHtml, {js: 'x', css: 'y', seed: [{}, {}]});
  expect(seeded).toContain('window.__TINYAPP_SEED__ = [{},{}];');
});

test(
  'leg (c) [M3]: the served page carries the entry, the bundle, the asset and the flag — and a leak is refused unheard',
  async () => {
    if (!BROWSER) return;

    // The asset is served as its own bytes, and the attribute is the line it holds.
    expect(fixtureText('hello.txt')).toBe(HELLO_LINE);

    const outcome = await honest();
    for (const markup of [outcome.record.domBefore, outcome.record.dom]) {
      expect(typeof markup).toBe('string');
      expect(markup).toContain('data-marker="persistence-fixture"');
      expect(markup).toContain('data-app="persistence-app"');
      expect(markup).toContain(`data-asset="${HELLO_LINE}"`);
      expect(markup).toContain('data-flag="true"');
      expect(/data-origin="([^"]+)"/.exec(markup ?? '')?.[1] ?? '').toMatch(
        /^http:\/\/127\.0\.0\.1:\d+$/,
      );
    }

    // The second loopback server: it answers, unlike an `.invalid` name, so a driver that
    // refused nothing would have reached it.
    let hits = 0;
    const leakServer = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        hits += 1;
        return new Response('leaked');
      },
    });
    const leakUrl = `http://127.0.0.1:${leakServer.port}/leak`;

    try {
      // The persister handle is handed over only once the leak has settled, so `data-other`
      // is on the page before the driver calls it ready — and therefore in the markup.
      const entry = variantEntry(
        'leak',
        (appJs) =>
          `let __handle;\n` +
          `Object.defineProperty(window, '__TINYAPP_PERSISTER__', {\n` +
          `  configurable: true,\n` +
          `  get() { return __handle; },\n` +
          `  set(handle) {\n` +
          `    fetch(${JSON.stringify(leakUrl)}).then(\n` +
          `      () => { document.body.dataset.other = 'reached'; },\n` +
          `      () => { document.body.dataset.other = 'failed'; },\n` +
          `    ).then(() => { __handle = handle; });\n` +
          `  },\n` +
          `});\n${appJs}`,
      );

      const leaked = await runPersistence(
        {...HONEST_SPEC, entry},
        {main: '/x/leak.test.ts'},
      );

      expect(leaked.record.dom).toContain('data-other="failed"');
      expect(leaked.record.dom).not.toContain('data-other="reached"');
      expect(hits).toBe(0);
    } finally {
      leakServer.stop(true);
    }
  },
  LEG_TIMEOUT_MS,
);

// ---------------------------------------------------------------- (d) [M4]

test(
  'leg (d) [M4]: a WebSocket in the page is the breach, and the honest page is pinned and unbreached',
  async () => {
    if (!BROWSER) return;

    const outcome = await honest();
    expect(outcome.record.contract).toEqual({
      clock: CLOCK,
      breach: null,
      pinned_in_page: true,
    });

    // The clock pin runs on every new document — before the reload and after it.
    expect(outcome.record.domBefore).toContain(`data-now="${CLOCK_MS}"`);
    expect(outcome.record.dom).toContain(`data-now="${CLOCK_MS}"`);

    // The breach is appended: the page is otherwise the honest one, so the throw happens
    // after the persister's chain has started and the breach is what the exam reports.
    const entry = variantEntry(
      'breach',
      (appJs) => `${appJs}\nnew WebSocket('ws://localhost:8787/');\n`,
    );
    const breached = await runPersistence(
      {...HONEST_SPEC, entry},
      {main: '/x/breach.test.ts'},
    );

    expect(breached.ok).toBe(false);
    expect(breached.failure).toBe('contract breach: ws://localhost:8787/');
    expect(breached.record.contract.breach).toBe('contract breach: ws://localhost:8787/');
  },
  LEG_TIMEOUT_MS,
);

// ---------------------------------------------------------------- (e) [M5]

test(
  'leg (e) [M5]: the honest stand-in saves, reloads, and is read back in the store and in its rows',
  async () => {
    if (!BROWSER) return;

    const outcome = await honest();
    const {record} = outcome;

    expect(record.storeDiff).toEqual([]);
    expect(outcome.failure).toBeNull();
    expect(outcome.ok).toBe(true);

    // The rows, read through the `exec` M5 spells.
    const rows = record.rows;
    expect(rows).toBeDefined();
    expect(rows!.sql).toBe('SELECT _id, store FROM "todos"');
    expect(rows!.rows).toHaveLength(1);
    const row = rows!.rows[0] as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(['_id', 'store']);
    expect(row._id).toBe('_');
    expect(typeof row.store).toBe('string');
    expect(rows!.content).toEqual(ONE_ROW);
    expect(rows!.diff).toEqual([]);

    // The mutant is judged against the content read after the reload, and it dies.
    expect(record.mutant.killed).toBe(true);
    expect(record.mutant.path).toBe('todos/0/text');

    // Every wall is reported and read as finite and non-negative — and bounded by nothing.
    for (const name of [
      'store_ms',
      'action_ms',
      'persist_ms',
      'reload_ms',
      'render_ms',
      'mutant_ms',
    ]) {
      const wall = record.walls[name];
      expect(`${name}: ${typeof wall}`).toBe(`${name}: number`);
      expect(Number.isFinite(wall as number)).toBe(true);
      expect(wall as number).toBeGreaterThanOrEqual(0);
    }
    expect(record.walls.render).toBe('ran');
    expect(record.walls.browser).toBe('ran');

    // The same tab, its `sessionStorage` counting the documents, both of them on `/room`.
    expect(record.domBefore).toContain('data-load="1"');
    expect(record.dom).toContain('data-load="2"');
    expect(record.domBefore).toContain('data-path="/room"');
    expect(record.dom).toContain('data-path="/room"');
  },
  LEG_TIMEOUT_MS,
);

// ---------------------------------------------------------------- (f) [M6]

test(
  'leg (f) [M6]: the eight evidence files of the honest run, each parsing back to its record',
  async () => {
    if (!BROWSER) return;

    const outcome = await honest();
    expect(readdirSync(outcome.dir).sort()).toEqual(EIGHT_FILES);

    const read = (name: string): string => readFileSync(join(outcome.dir, name), 'utf8');
    expect(JSON.parse(read('rows.json'))).toEqual(outcome.record.rows);
    expect(JSON.parse(read('walls.json'))).toEqual(outcome.record.walls);
    expect(read('dom-before.html')).toBe(outcome.record.domBefore);
    expect(read('dom.html')).toBe(outcome.record.dom);

    const shot = readFileSync(join(outcome.dir, 'screenshot.png'));
    expect(Array.from(shot.subarray(0, 4))).toEqual(PNG_SIGNATURE);
  },
  LEG_TIMEOUT_MS,
);

test('leg (f) [M6]: a record with neither rows nor domBefore still leaves the four, or the six', () => {
  const writeEvidence = helperOf<(dir: string, record: unknown) => string[]>('writeEvidence');

  const record = {
    walls: {
      store_ms: 3,
      render_ms: null,
      action_ms: null,
      mutant_ms: 1,
      render: 'skipped',
      browser: 'skipped',
    },
    mutant: {
      killed: true,
      path: 'todos/0/completed',
      edits: [{table: 'todos', row: '0', cell: 'completed', value: true}],
    },
    contract: {clock: CLOCK, breach: null, pinned_in_page: false},
    storeDiff: [],
  };

  const bare = mkdtempSync(join(tmpdir(), 'persistence-evidence-bare-'));
  temps.push(bare);
  expect(writeEvidence(bare, record)).toEqual(FOUR_FILES);
  expect(readdirSync(bare).sort()).toEqual(FOUR_FILES);

  const withPage = mkdtempSync(join(tmpdir(), 'persistence-evidence-page-'));
  temps.push(withPage);
  expect(
    writeEvidence(withPage, {
      ...record,
      dom: '<html></html>',
      screenshot: new Uint8Array(PNG_SIGNATURE),
    }),
  ).toEqual(SIX_FILES);
  expect(readdirSync(withPage).sort()).toEqual(SIX_FILES);
});

// ---------------------------------------------------------------- (g) [M7]

test(
  'leg (g) [M7]: a page that never reports its persister is red on the ready wall',
  async () => {
    if (!BROWSER) return;

    // One name changed: the handle the driver polls for is never the one this page sets.
    const entry = variantEntry('never-ready', (appJs) =>
      appJs.replaceAll('__TINYAPP_PERSISTER__', '__TINYAPP_NOT_THE_PERSISTER__'),
    );

    const outcome = await runPersistence(
      {...HONEST_SPEC, entry},
      {main: '/x/never-ready.test.ts', readyTimeoutMs: 500},
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.failure ?? '').toStartWith(
      'persistence: page never reported its persister loaded within 500 ms',
    );
    // The record is written either way.
    expect(existsSync(join(outcome.dir, 'walls.json'))).toBe(true);
    await assertClosed(outcome);
  },
  LEG_TIMEOUT_MS,
);

test(
  'leg (g) [M7]: rows that never match the store are red on the persist wall',
  async () => {
    if (!BROWSER) return;

    // The `exec` of this page answers the empty stamped pair forever, so no poll of it ever
    // matches the store the click filled.
    const entry = variantEntry(
      'never-persisting',
      (appJs) =>
        `${appJs}\nwindow.__TINYAPP_DB__ = {exec({sql}) {` +
        ` document.body.dataset.sql = sql;` +
        ` return [{_id: '_', store: '[[{},"",0],[{},"",0]]'}];` +
        ` }};\n`,
    );

    const outcome = await runPersistence(
      {...HONEST_SPEC, entry},
      {main: '/x/never-persisting.test.ts', persistTimeoutMs: 500},
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.failure ?? '').toStartWith(
      'persistence: rows never matched the store within 500 ms',
    );
    expect(existsSync(join(outcome.dir, 'walls.json'))).toBe(true);
    await assertClosed(outcome);
  },
  LEG_TIMEOUT_MS,
);

test(
  'leg (g) [M7]: a state the reload does not reach is red, naming the cell it differs in',
  async () => {
    if (!BROWSER) return;

    const expected = scratchFile(
      'buy-bread',
      'buy-bread.json',
      JSON.stringify([{todos: {'0': {text: 'buy bread', completed: false}}}, {}]),
    );

    const outcome = await runPersistence(
      {...HONEST_SPEC, expected},
      {main: '/x/buy-bread.test.ts'},
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.failure ?? '').toStartWith(
      'persistence: expected state not reached after reload',
    );

    // The diff names `todos/0/text`, and the failure carries it as `renderDiff` spells it.
    expect(outcome.record.storeDiff).toContainEqual({
      table: 'todos',
      row: '0',
      cell: 'text',
      got: 'buy milk',
      wanted: 'buy bread',
    });
    const renderDiff = helperOf<(differences: unknown[]) => string>('renderDiff');
    expect(outcome.failure ?? '').toContain(renderDiff(outcome.record.storeDiff));

    await assertClosed(outcome);
  },
  LEG_TIMEOUT_MS,
);

test(
  'leg (g) [M7]: rows gone after the second document are red, and read as the empty content',
  async () => {
    if (!BROWSER) return;

    // The store still reloads into the expected state; only the rows are gone, and only on
    // the second document — the one the reload made.
    const entry = variantEntry(
      'rows-gone',
      (appJs) =>
        `${appJs}\nif (document.body.dataset.load === '2') {` +
        ` window.__TINYAPP_DB__ = {exec({sql}) { document.body.dataset.sql = sql; return []; }};` +
        ` }\n`,
    );

    const outcome = await runPersistence(
      {...HONEST_SPEC, entry},
      {main: '/x/rows-gone.test.ts'},
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.failure ?? '').toStartWith('persistence: rows differ from expected');
    expect(outcome.record.rows?.rows).toEqual([]);
    expect(outcome.record.rows?.content).toEqual([{}, {}]);
    expect((outcome.record.rows?.diff ?? []).length).toBeGreaterThan(0);

    await assertClosed(outcome);
  },
  LEG_TIMEOUT_MS,
);

test(
  'leg (g) [M7]: a view the page does not satisfy is red, naming the selector and the counts',
  async () => {
    if (!BROWSER) return;

    const outcome = await runPersistence(
      {...HONEST_SPEC, view: {selector: '#rows li', count: 2}},
      {main: '/x/view.test.ts'},
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.failure ?? '').toStartWith('render: view not satisfied');
    expect(outcome.failure ?? '').toContain('view #rows li: expected 2 matches, found 1');

    await assertClosed(outcome);
  },
  LEG_TIMEOUT_MS,
);

test(
  'leg (g) [M7]: a mutant the exam cannot tell apart is the hollow exam, said exactly',
  async () => {
    if (!BROWSER) return;

    const outcome = await runPersistence(
      {...HONEST_SPEC, mutant: [{table: 'todos', row: '0', cell: 'completed', value: false}]},
      {main: '/x/hollow.test.ts'},
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.failure).toBe('hollow exam: mutant todos/0/completed not distinguished');
    expect(outcome.record.mutant.killed).toBe(false);

    await assertClosed(outcome);
  },
  LEG_TIMEOUT_MS,
);

// ---------------------------------------------------------------- (i) [M9]

test(
  'leg (i) [M9]: the README section names the five in order, and the three BASE helper exams still pass',
  () => {
    expect(
      ran(
        [
          'bash',
          '-c',
          "sed -n '/^## State exams/,$p' README.md | tr '\\n' ' ' | " +
            "grep -q 'persistenceExam.*__TINYAPP_EXAM__.*rows.json.*persist_ms.*reload_ms'",
        ],
        'README ## State exams',
      ).code,
    ).toBe(0);

    // Measured at BASE (7d578da), this line exits 1 on its own: `render-move.test.ts` bundles
    // `client/index.html`, and run-22's `@/components/ui/*` imports do not resolve when the
    // build is started from a file under `packages/tinyapp-exam/test` — that file's nearest
    // tsconfig is `packages/tinyapp-exam/tsconfig.json`, which carries no `paths` and stops the
    // search before `client/tsconfig.json`. The same `pageFor('client/index.html', [{}, {}])`
    // resolves from `tests/state-exams` or from a root script, where no tsconfig intercepts it.
    // `state-exam.test.ts` and `evidence.test.ts` are green; the six red legs are all
    // `render-move.test.ts`'s. The `Run:` line asks for exit 0, so it stays exactly as written.
    expect(
      ran(
        [
          'bun',
          'test',
          'packages/tinyapp-exam/test/state-exam.test.ts',
          'packages/tinyapp-exam/test/evidence.test.ts',
          'packages/tinyapp-exam/test/render-move.test.ts',
        ],
        'the three BASE helper exams',
      ).code,
    ).toBe(0);
  },
  LEG_TIMEOUT_MS,
);
