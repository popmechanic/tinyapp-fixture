// Exam for task 3, legs (a)-(j): the render move — bundle, seed, snapshot, view.
//
// Re-aimed by run-7's task 2, which retired the remote renderer: the page is opened in the
// machine's own browser through the driver, so the legs that pinned the endpoint and its
// skip rule now pin the driver and its one.
//
// M1. `renderHtml(entryHtml, {js, css, seed})` returns a document in which the first
//     `<script>` element inside `<head>` has the text
//     `window.__TINYAPP_SEED__ = <JSON.stringify(seed)>;`, every
//     `<script type="module" src="…">` of `entryHtml` is replaced by one
//     `<script type="module">` whose text is `js`, a `<style>` whose text is `css` is inside
//     `<head>`, and no `<script>` element carries a `src` attribute.
// M2. `assertView(html, views)` returns `[]` when every entry holds and otherwise one string
//     per failing entry containing that entry's `selector`, where for the elements matching
//     `selector`: `count` holds when their number equals it; `text` holds when at least one of
//     them has a `textContent` containing it; `attr` holds when at least one has the attribute
//     `name` equal to `value`; `checked` holds when there is at least one and every one has
//     `data-checked` equal to `true`; `unchecked` the same with `false`; `absent` holds when
//     there are none.
// M3. `renderMove({entry, content, view, clock, browser})` resolves
//     `{render: 'skipped', ms: null, failures: []}` without opening a page when `entry` is
//     unset or the empty string. A run directory is not one of its triggers: the only reason
//     the move skips is that the spec names no page to build.
// M4. Otherwise it bundles, with `Bun.build({target: 'browser'})`, the module named by the
//     `src` of `entry`'s `<script type="module">` resolved against `entry`'s directory, calls
//     `browser.open` exactly once with `{html, clock}` — `html` being
//     `renderHtml(<entry's text>, {js, css, seed: content})` and `clock` the one it was
//     handed — takes exactly one `snapshot()` of that page, closes it, and resolves
//     `{render: 'ran', ms, dom, screenshot, failures}` with `dom` and `screenshot` the
//     snapshot's own, `failures` equal to `assertView(dom, view)` and `ms` a finite number
//     greater than or equal to 0.
// M5. An `open` that rejects, or a `snapshot` that rejects, makes `renderMove` reject with
//     that error — and a page that was opened is closed all the same.
// M6. The tree declares `node-html-parser` — the sealed `packages/tinyapp-exam/package.json`
//     owns it as a `dependencies` entry, so the root `package.json` does not repeat it — and
//     `bun.lock` records it, so `bun install --frozen-lockfile` exits 0 on the tree. (The
//     install itself is the Proof's `Run:`; this file checks the two manifests it must find on
//     the tree.)
// M7. `bundleOf` minifies by default, so the `data:` URL the fixture's entry needs is under
//     2,000,000 characters; built with `minify: false` the same page is over the ceiling the
//     driver's `open` refuses.

import {afterAll, expect, test} from 'bun:test';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

import {parse} from 'node-html-parser';

import type {Action, Browser, Page} from '../src/browser';
import {assertView, bundleOf, pageFor, renderHtml, renderMove} from '../src/render-move';
import * as renderMoveModule from '../src/render-move';
import type {Snapshot, View} from '../src/types';

// ---------------------------------------------------------------- fixtures

/** The repository root, so the manifests and the entry read the same from any cwd. */
const repoRoot = resolve(import.meta.dir, '../../..');

/** The entry the fixture ships, and the path `renderMove` is handed. */
const ENTRY_PATH = 'client/index.html';
const ENTRY_HTML = readFileSync(resolve(repoRoot, ENTRY_PATH), 'utf8');

const JS = 'console.log(1)';
const CSS = '.a{}';

/** The clock every leg pins the page to. */
const CLOCK = '2026-01-01T00:00:00Z';

/** The buy-milk snapshot every leg seeds with. */
const SEED: Snapshot = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}];

/** The seed script's text, spelled out rather than derived. */
const SEED_SCRIPT_TEXT =
  'window.__TINYAPP_SEED__ = [{"todos":{"0":{"text":"buy milk","completed":false}}},{}];';

const SYNTHETIC_ENTRY =
  '<html><head><title>t</title></head><body><script type="module" src="/a.tsx"></script><p>x</p><script type="module" src="/b.tsx"></script></body></html>';

/** The DOM the stand-in browser hands back: one open todo. */
const FIXTURE_DOM =
  '<div id="todoList"><div class="todoItem"><input type="checkbox" data-checked="false" id="todo-0"><label for="todo-0">buy milk</label><button>Delete</button></div></div>';

/** The same DOM with the box reflected as checked. */
const FIXTURE_DOM_CHECKED = FIXTURE_DOM.replace(
  'data-checked="false"',
  'data-checked="true"',
);

/** One checked and one unchecked input: neither universal holds. */
const MIXED_DOM = '<div><input data-checked="true"><input data-checked="false"></div>';

/** The four bytes the stand-in page photographs and the helper must carry through. */
const PNG_BYTES = [137, 80, 78, 71];

/** The ceiling Chromium refuses a `data:` URL over, and the wall M7 keeps under. */
const DATA_URL_CEILING = 2_097_152;
const URL_BUDGET = 2_000_000;

const runDir = mkdtempSync(join(tmpdir(), 'tinyapp-exam-render-move-'));
afterAll(() => rmSync(runDir, {recursive: true, force: true}));

// ---------------------------------------------------------------- helpers

/** An element's text, however the parser spells the accessor. */
const textOf = (element: {textContent?: string; text?: string}): string =>
  element.textContent ?? element.text ?? '';

/** The `<script>` elements inside the document's `<head>`, in document order. */
const headScripts = (html: string) => {
  const head = parse(html).querySelector('head');
  expect(head).not.toBeNull();
  return head!.querySelectorAll('script');
};

/** What one `open` was handed. */
type Opened = {html: string; clock: string};

/** What the stand-in browser saw — no Chromium is spawned by any leg in this file. */
type Recorded = {
  opened: Opened[];
  acted: Action[];
  snapshots: number;
  closed: number;
};

/**
 * A `Browser` that opens nothing: it records what it was handed and answers a
 * canned picture, so every leg below runs on a machine with no browser at all.
 */
const standIn = (
  over: {dom?: string; openThrows?: Error; snapshotThrows?: Error} = {},
): {browser: Browser; seen: Recorded} => {
  const seen: Recorded = {opened: [], acted: [], snapshots: 0, closed: 0};

  const browser: Browser = {
    argv: ['stand-in'],
    open: async (opts: Opened): Promise<Page> => {
      seen.opened.push(opts);
      if (over.openThrows !== undefined) {
        throw over.openThrows;
      }
      return {
        act: async (action: Action) => {
          seen.acted.push(action);
        },
        evaluate: async () => JSON.stringify(SEED),
        snapshot: async () => {
          seen.snapshots += 1;
          if (over.snapshotThrows !== undefined) {
            throw over.snapshotThrows;
          }
          return {
            dom: over.dom ?? FIXTURE_DOM,
            screenshot: new Uint8Array(PNG_BYTES),
          };
        },
        close: async () => {
          seen.closed += 1;
        },
      };
    },
    close: async () => {},
  };

  return {browser, seen};
};

/** Run `thunk`, reporting what it resolved and what it threw, one of them unset. */
const settle = async (
  thunk: () => Promise<unknown>,
): Promise<{resolved?: unknown; error?: unknown}> => {
  try {
    return {resolved: await thunk()};
  } catch (error) {
    return {error};
  }
};

/** The length of the `data:` URL `html` would travel to the browser as. */
const dataUrlLength = (html: string): number =>
  `data:text/html;base64,${Buffer.from(html, 'utf8').toString('base64')}`.length;

// ------------------------------------------------------------------ M1

test('leg (a) [M1]: renderHtml inlines the seed, the bundle and the css, and leaves no script src', () => {
  const html = renderHtml(ENTRY_HTML, {js: JS, css: CSS, seed: SEED});
  const document = parse(html);

  // The seed is the first script under `<head>`, so it is set before the module runs.
  const scripts = headScripts(html);
  expect(scripts.length).toBeGreaterThan(0);
  expect(textOf(scripts[0]!)).toBe(SEED_SCRIPT_TEXT);

  // The entry's one `src` module became one inline module carrying `js`.
  const modules = document.querySelectorAll('script[type=module]');
  expect(modules.length).toBe(1);
  expect(textOf(modules[0]!)).toBe(JS);

  // The css is inlined in `<head>`, verbatim.
  expect(document.querySelectorAll('head style').map(textOf)).toContain(CSS);

  // Nothing left to fetch: the page is opened from a `data:` URL with no origin.
  expect(document.querySelectorAll('script[src]').length).toBe(0);
});

test('leg (a) [M1]: every module script of the entry is replaced, not only the first', () => {
  const html = renderHtml(SYNTHETIC_ENTRY, {js: JS, css: CSS, seed: SEED});
  const document = parse(html);

  const modules = document.querySelectorAll('script[type=module]');
  expect(modules.length).toBe(1);
  expect(textOf(modules[0]!)).toBe(JS);
  expect(document.querySelectorAll('script[src]').length).toBe(0);

  // The markup between the two replaced scripts survives.
  expect(html).toContain('<p>x</p>');
  const paragraphs = document.querySelectorAll('p');
  expect(paragraphs.length).toBe(1);
  expect(textOf(paragraphs[0]!)).toBe('x');

  // And the seed still leads `<head>`.
  const scripts = headScripts(html);
  expect(scripts.length).toBeGreaterThan(0);
  expect(textOf(scripts[0]!)).toBe(SEED_SCRIPT_TEXT);
});

// ------------------------------------------------------------------ M2

test('leg (b) [M2]: every entry that holds contributes no string', () => {
  const holding: View[] = [
    {selector: '.todoItem', count: 1},
    {selector: '.todoItem', text: 'buy milk'},
    {selector: '.todoItem input', attr: {name: 'id', value: 'todo-0'}},
    {selector: '.todoItem input[type=checkbox]', unchecked: true},
    {selector: '.missing', absent: true},
  ];
  for (const view of holding) {
    expect(assertView(FIXTURE_DOM, view)).toEqual([]);
  }

  // `checked` reads the attribute the reflection script writes.
  expect(assertView(FIXTURE_DOM_CHECKED, {selector: '.todoItem input', checked: true})).toEqual(
    [],
  );

  // No view asserts nothing.
  expect(assertView(FIXTURE_DOM, undefined)).toEqual([]);
});

test('leg (c) [M2]: each failing entry contributes exactly one string naming its selector', () => {
  const failing: View[] = [
    {selector: '.todoItem', count: 2},
    {selector: '.todoItem', text: 'buy bread'},
    {selector: '.todoItem input', attr: {name: 'id', value: 'todo-9'}},
    {selector: '.todoItem input', checked: true},
    {selector: '.todoItem', absent: true},
    // No match at all: `checked` needs at least one element.
    {selector: '.missing', checked: true},
  ];
  for (const view of failing) {
    const failures = assertView(FIXTURE_DOM, view);
    expect(failures.length).toBe(1);
    expect(failures[0]!).toContain(view.selector);
  }

  // The mirror case on the checked DOM.
  const unchecked = assertView(FIXTURE_DOM_CHECKED, {
    selector: '.todoItem input',
    unchecked: true,
  });
  expect(unchecked.length).toBe(1);
  expect(unchecked[0]!).toContain('.todoItem input');
});

test('leg (c) [M2]: one non-conforming match fails the universal, and count still holds', () => {
  const checked = assertView(MIXED_DOM, {selector: 'input', checked: true});
  expect(checked.length).toBe(1);
  expect(checked[0]!).toContain('input');

  const unchecked = assertView(MIXED_DOM, {selector: 'input', unchecked: true});
  expect(unchecked.length).toBe(1);
  expect(unchecked[0]!).toContain('input');

  expect(assertView(MIXED_DOM, {selector: 'input', count: 2})).toEqual([]);
});

test('leg (c) [M2]: a list reports one string per failing entry, in list order', () => {
  const failures = assertView(FIXTURE_DOM, [
    {selector: '.todoItem', count: 2},
    {selector: '.todoItem', text: 'buy milk'},
    {selector: '.missing', checked: true},
  ]);
  expect(failures.length).toBe(2);
  expect(failures[0]!).toContain('.todoItem');
  expect(failures[1]!).toContain('.missing');
});

// ------------------------------------------------------------------ M3

test('leg (d) [M3]: no entry means skipped, and no page is ever opened', async () => {
  const {browser, seen} = standIn();
  const result = await renderMove({
    content: SEED,
    view: [{selector: '.todoItem', count: 1}],
    clock: CLOCK,
    browser,
  });

  expect(result.render).toBe('skipped');
  expect(result.ms).toBeNull();
  expect(result.failures).toEqual([]);
  expect(seen.opened.length).toBe(0);
});

test('leg (e) [M3]: an empty entry means skipped too', async () => {
  const {browser, seen} = standIn();
  const result = await renderMove({
    entry: '',
    content: SEED,
    clock: CLOCK,
    browser,
  });

  expect(result.render).toBe('skipped');
  expect(result.ms).toBeNull();
  expect(result.failures).toEqual([]);
  expect(seen.opened.length).toBe(0);
});

test(
  'leg (f) [M3]: a run directory is no longer a trigger — an entry renders with or without one',
  async () => {
    // The two halves differ only in an environment the move no longer reads at all.
    for (const _runDir of [runDir, '']) {
      const {browser, seen} = standIn();
      const result = await renderMove({
        entry: ENTRY_PATH,
        content: SEED,
        clock: CLOCK,
        browser,
      });
      expect(result.render).toBe('ran');
      expect(seen.opened.length).toBe(1);
    }

    // And the skip is the entry's absence, nothing else.
    const bare = standIn();
    const skipped = await renderMove({content: SEED, clock: CLOCK, browser: bare.browser});
    expect(skipped.render).toBe('skipped');
    expect(bare.seen.opened.length).toBe(0);
  },
  120000,
);

// ------------------------------------------------------------------ M4

test(
  'leg (g) [M4]: the move bundles the entry, opens one page, photographs it once and reports the view',
  async () => {
    const {browser, seen} = standIn();
    const result = await renderMove({
      entry: ENTRY_PATH,
      content: SEED,
      view: [{selector: '.todoItem', count: 1}],
      clock: CLOCK,
      browser,
    });

    // One page, opened on the clock it was handed, photographed once and closed.
    expect(seen.opened.length).toBe(1);
    expect(seen.snapshots).toBe(1);
    expect(seen.closed).toBe(1);

    const {html, clock} = seen.opened[0]!;
    expect(clock).toBe(CLOCK);

    // The page opens on the post-action state, with nothing left to fetch.
    expect(html).toContain(SEED_SCRIPT_TEXT);
    expect(html).toContain('<script type="module">');
    expect(html).not.toContain('src="/src/index.tsx"');

    // The inlined module is the real bundle of `client/src/index.tsx`, not a
    // placeholder: its size, and the render it produces below, are the evidence.
    // No literal is pinned in it — Bun 1.4.2's bundler minifies `createRoot`
    // away, and that pin parked fleet run-20 (popmechanic/ultrapowers#1051).
    const modules = parse(html).querySelectorAll('script[type=module]');
    expect(modules.length).toBe(1);
    const bundle = textOf(modules[0]!);
    expect(bundle.length).toBeGreaterThan(100000);

    // And the page's own picture and markup are what the move reports.
    expect(result.render).toBe('ran');
    expect(result.dom).toBe(FIXTURE_DOM);
    expect(result.screenshot).toBeInstanceOf(Uint8Array);
    expect(result.screenshot).toEqual(new Uint8Array(PNG_BYTES));
    expect(result.failures).toEqual([]);
    expect(typeof result.ms).toBe('number');
    expect(Number.isFinite(result.ms as number)).toBe(true);
    expect(result.ms as number).toBeGreaterThanOrEqual(0);
  },
  120000,
);

test(
  'leg (g) [M4]: failures are assertView of the photographed dom',
  async () => {
    const {browser, seen} = standIn();
    const result = await renderMove({
      entry: ENTRY_PATH,
      content: SEED,
      view: [{selector: '.todoItem', count: 2}],
      clock: CLOCK,
      browser,
    });

    expect(seen.opened.length).toBe(1);
    expect(result.render).toBe('ran');
    expect(result.failures).toEqual(assertView(result.dom!, [{selector: '.todoItem', count: 2}]));
    expect(result.failures.length).toBe(1);
    expect(result.failures[0]!).toContain('.todoItem');
  },
  120000,
);

// ------------------------------------------------------------------ M5

test(
  'leg (h) [M5]: an open that rejects rejects the move, and nothing was photographed',
  async () => {
    const openThrows = new Error('browser: cannot connect to ws://127.0.0.1:0/');
    const {browser, seen} = standIn({openThrows});
    const {resolved, error} = await settle(() =>
      renderMove({entry: ENTRY_PATH, content: SEED, clock: CLOCK, browser}),
    );

    expect(resolved).toBeUndefined();
    expect(error).toBe(openThrows);
    expect(seen.opened.length).toBe(1);
    expect(seen.snapshots).toBe(0);
  },
  120000,
);

test(
  'leg (i) [M5]: a snapshot that rejects rejects the move, and the page is closed all the same',
  async () => {
    const snapshotThrows = new Error('browser: Page.captureScreenshot did not answer');
    const refused = standIn({snapshotThrows});
    const {resolved, error} = await settle(() =>
      renderMove({
        entry: ENTRY_PATH,
        content: SEED,
        clock: CLOCK,
        browser: refused.browser,
      }),
    );

    expect(resolved).toBeUndefined();
    expect(error).toBe(snapshotThrows);
    expect(refused.seen.closed).toBe(1);

    // The same page, photographed rather than refused, is the run leg's stand-in.
    const accepted = standIn();
    const green = await settle(() =>
      renderMove({
        entry: ENTRY_PATH,
        content: SEED,
        clock: CLOCK,
        browser: accepted.browser,
      }),
    );
    expect(green.error).toBeUndefined();
    expect((green.resolved as {render: string}).render).toBe('ran');
    expect(accepted.seen.closed).toBe(1);
  },
  120000,
);

// ------------------------------------------------------------------ M6

test('leg (j) [M6]: the tree manifests carry node-html-parser', () => {
  // The helper package is sealed: it owns the dependency, and the root does not repeat it.
  const manifest = JSON.parse(
    readFileSync(resolve(repoRoot, 'packages/tinyapp-exam/package.json'), 'utf8'),
  ) as {dependencies?: Record<string, string>};
  const range = manifest.dependencies?.['node-html-parser'];

  expect(typeof range).toBe('string');
  expect((range as string).length).toBeGreaterThan(0);

  const root = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
    devDependencies?: Record<string, string>;
  };
  expect(root.devDependencies?.['node-html-parser']).toBeUndefined();

  expect(readFileSync(resolve(repoRoot, 'bun.lock'), 'utf8')).toContain(
    '"node-html-parser"',
  );
});

// ------------------------------------------------------------------ M7

test(
  'leg (k) [M7]: the default bundle is minified and its page fits under the ceiling; unminified does not',
  async () => {
    const cwd = process.cwd();
    process.chdir(repoRoot);
    try {
      const small = await pageFor(ENTRY_PATH, SEED);
      expect(dataUrlLength(small)).toBeLessThan(URL_BUDGET);

      // Explicitly asking for the default is the same page, byte for byte: the build is
      // deterministic, which is what lets the store move open two pages and compare.
      const again = await pageFor(ENTRY_PATH, SEED, {minify: true});
      expect(again).toBe(small);

      // Unminified, the very same fixture is a URL the browser will not navigate to.
      const big = await pageFor(ENTRY_PATH, SEED, {minify: false});
      expect(dataUrlLength(big)).toBeGreaterThan(DATA_URL_CEILING);

      // And the minification is `bundleOf`'s doing, not the entry's.
      const entryPath = resolve(repoRoot, ENTRY_PATH);
      const minified = await bundleOf(entryPath, ENTRY_HTML);
      const plain = await bundleOf(entryPath, ENTRY_HTML, {minify: false});
      expect(minified.js.length).toBeLessThan(plain.js.length);
    } finally {
      process.chdir(cwd);
    }
  },
  120000,
);

// =====================================================================================
// Exam for task 1 — "The render branch — an explicit timeout on the registration, a
// reflection that writes only on change" — legs (b), (c), (d), (e) and (f).
//
// Re-aimed by run-7's task 2 for leg (e) alone: the reflection no longer rides to a remote
// renderer as a request parameter, it is what the driver evaluates in the page before it
// serialises. The text itself, and everything M2/M3/M4 say about it, is unchanged.
//
// M2. `packages/tinyapp-exam/src/render-move.ts` exports `REFLECT_CHECKED`, a string;
//     evaluated as a script under happy-dom in a document whose body holds exactly two
//     `<input type="checkbox">` elements, the second with the `checked` attribute: after
//     the evaluation settles, the first input's `data-checked` attribute is `false`, the
//     second's is `true`, and a spy on `Element.prototype.setAttribute` installed before
//     the evaluation counted exactly 2 calls; after a `<span>` is then appended to
//     `document.body` and the observer settles, the count is still 2; after the first
//     input's `checked` property is set to `true` and another `<span>` is appended and the
//     observer settles, the count is exactly 3 and the first input's `data-checked`
//     attribute is `true`.
// M3. The character `'` (U+0027) is absent from `REFLECT_CHECKED`; `REFLECT_CHECKED`
//     contains each of `data-checked`, `querySelectorAll` and `MutationObserver`; and the
//     driver runs exactly that text in the page it is about to photograph.
// M4. `packages/tinyapp-exam/package.json` `devDependencies` carries
//     `@happy-dom/global-registrator` as a non-empty string, `bun.lock` records
//     `@happy-dom/global-registrator` under the `packages/tinyapp-exam` workspace's
//     `devDependencies`, and `bun install --frozen-lockfile` exits 0 on the tree. (The
//     install is the Proof's own `Run:`; this file checks the two manifests it rests on.)
//
// Nothing here dials, and nothing here spawns a browser: the happy-dom leg is a document in
// this process and leg (e) reads the driver's own source. happy-dom replaces `document`,
// `window` and `fetch` on `globalThis`, and bun runs every file of one `bun test` in one
// process, so leg (b) registers inside its own test and unregisters — and un-spies — in a
// `finally`.

/** `REFLECT_CHECKED` as `../src/render-move` exports it; M2 says it is a string. */
const REFLECT_CHECKED = (renderMoveModule as unknown as {REFLECT_CHECKED: string})
  .REFLECT_CHECKED;

/** One macrotask: happy-dom delivers observer callbacks asynchronously. */
const settleObserver = (): Promise<void> =>
  new Promise((done) => {
    setTimeout(done, 20);
  });

/** The body M2 pins: two checkboxes, the second checked in the markup. */
const TWO_BOXES = '<input id="a" type="checkbox"><input id="b" type="checkbox" checked>';

// ------------------------------------------------------------------ (b) [M2]

test('task 1, leg (b) [M2]: the reflection writes each box once and then only on a change', async () => {
  expect(typeof REFLECT_CHECKED).toBe('string');

  // Computed so an unresolved dependency reddens this leg alone, not the file's load.
  const specifier = '@happy-dom/global-registrator';
  const {GlobalRegistrator} = (await import(specifier)) as {
    GlobalRegistrator: {register: () => void; unregister: () => Promise<void>};
  };

  GlobalRegistrator.register();
  const ElementClass = (globalThis as unknown as {Element: {prototype: any}}).Element;
  const realSetAttribute = ElementClass.prototype.setAttribute;
  let writes = 0;

  try {
    // The spy goes on after this parse and before the evaluation, so it counts the
    // script's writes and not the parser's.
    document.body.innerHTML = TWO_BOXES;
    ElementClass.prototype.setAttribute = function (this: unknown, ...args: unknown[]) {
      writes += 1;
      return realSetAttribute.apply(this, args);
    };

    // Indirect `eval`: the driver runs this text as a script, not as a module.
    (0, eval)(REFLECT_CHECKED);
    await settleObserver();

    const first = document.querySelector('#a')!;
    const second = document.querySelector('#b')!;
    expect(first.getAttribute('data-checked')).toBe('false');
    expect(second.getAttribute('data-checked')).toBe('true');
    expect(writes).toBe(2);

    // A mutation that leaves both boxes as they were settles without another write —
    // this is the loop the guard closes.
    document.body.appendChild(document.createElement('span'));
    await settleObserver();
    expect(writes).toBe(2);

    // A box whose property really changed is written exactly once more.
    (first as unknown as {checked: boolean}).checked = true;
    document.body.appendChild(document.createElement('span'));
    await settleObserver();
    expect(writes).toBe(3);
    expect(first.getAttribute('data-checked')).toBe('true');
  } finally {
    ElementClass.prototype.setAttribute = realSetAttribute;
    await GlobalRegistrator.unregister();
  }
});

// ------------------------------------------------------------------ (c) [M3]

test('task 1, leg (c) [M3]: no single quote anywhere in REFLECT_CHECKED', () => {
  expect(typeof REFLECT_CHECKED).toBe('string');
  expect(REFLECT_CHECKED.length).toBeGreaterThan(0);

  // The same character the `bun -e` `Run:` throws on, spelled two ways.
  expect(REFLECT_CHECKED.includes("'")).toBe(false);
  expect(REFLECT_CHECKED.split("'").length).toBe(1);
});

// ------------------------------------------------------------------ (d) [M3]

test('task 1, leg (d) [M3]: REFLECT_CHECKED reads inputs, writes data-checked and observes', () => {
  expect(typeof REFLECT_CHECKED).toBe('string');

  expect(REFLECT_CHECKED.includes('data-checked')).toBe(true);
  expect(REFLECT_CHECKED.includes('querySelectorAll')).toBe(true);
  expect(REFLECT_CHECKED.includes('MutationObserver')).toBe(true);
});

// ------------------------------------------------------------------ (e) [M3]

test('task 1, leg (e) [M3]: the driver runs REFLECT_CHECKED in the page it photographs', () => {
  expect(typeof REFLECT_CHECKED).toBe('string');

  // The text is imported from this module — not copied into the driver — and it is
  // evaluated inside `snapshot()`, before the markup and the picture are taken.
  const driver = readFileSync(
    resolve(repoRoot, 'packages/tinyapp-exam/src/browser.ts'),
    'utf8',
  );
  expect(driver).toContain("import {REFLECT_CHECKED} from './render-move'");

  const snapshot = driver.slice(
    driver.indexOf('snapshot: async ()'),
    driver.indexOf('close: async ()', driver.indexOf('snapshot: async ()')),
  );
  expect(snapshot.length).toBeGreaterThan(0);
  expect(snapshot).toContain('await evaluate(REFLECT_CHECKED)');
  expect(snapshot.indexOf('await evaluate(REFLECT_CHECKED)')).toBeLessThan(
    snapshot.indexOf('Page.captureScreenshot'),
  );
});

// ------------------------------------------------------------------ (f) [M4]

test('task 1, leg (f) [M4]: the manifests carry @happy-dom/global-registrator for this package', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(repoRoot, 'packages/tinyapp-exam/package.json'), 'utf8'),
  ) as {devDependencies?: Record<string, string>};
  const range = manifest.devDependencies?.['@happy-dom/global-registrator'];

  expect(typeof range).toBe('string');
  expect((range as string).length).toBeGreaterThan(0);

  // The lock carries trailing commas, so it is read as text: the workspace's own block,
  // from its heading to the next one, must be where the dev dependency is recorded.
  const lock = readFileSync(resolve(repoRoot, 'bun.lock'), 'utf8');
  const start = lock.indexOf('"packages/tinyapp-exam": {');
  expect(start).toBeGreaterThanOrEqual(0);
  const end = lock.indexOf('"server": {', start);
  expect(end).toBeGreaterThan(start);

  const block = lock.slice(start, end);
  expect(block).toContain('"devDependencies"');
  expect(block).toContain('"@happy-dom/global-registrator"');
});
