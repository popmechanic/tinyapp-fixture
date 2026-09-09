// Exam for task 3, legs (a)-(j): the render move — bundle, seed, snapshot, view.
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
// M3. `renderMove({entry, content, view, env, fetchImpl})` resolves
//     `{render: 'skipped', ms: null, failures: []}` without calling `fetchImpl` when
//     `env.TINYAPP_RENDER_URL` is unset or the empty string, and likewise when
//     `env.ULTRA_RUN_DIR` is unset or the empty string.
// M4. Otherwise it bundles, with `Bun.build({target: 'browser'})`, the module named by the
//     `src` of `entry`'s `<script type="module">` resolved against `entry`'s directory, calls
//     `fetchImpl` exactly once with the URL `<env.TINYAPP_RENDER_URL>/snapshot`, method
//     `POST`, header `content-type: application/json`, and a JSON body whose `html` is
//     `renderHtml(<entry's text>, {js, css, seed: content})` and whose `addScriptTag` is
//     `[{content}]` with `content` a script text containing `data-checked` and
//     `querySelectorAll`, and resolves `{render: 'ran', ms, dom, screenshot, failures}` with
//     `dom` the response's `result.content`, `screenshot` the bytes decoded from the base64
//     `result.screenshot`, `failures` equal to `assertView(dom, view)` and `ms` a finite
//     number greater than or equal to 0.
// M5. A response whose status is not 2xx, or whose JSON has `success` false, makes
//     `renderMove` reject with a message beginning `render failed:`.
// M6. The root `package.json` `devDependencies` carries `node-html-parser`, `bun.lock` records
//     it, and `bun install --frozen-lockfile` exits 0 on the tree. (The install itself is the
//     Proof's `Run:`; this file checks the two manifests it must find on the tree.)

import {afterAll, expect, test} from 'bun:test';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

import {parse} from 'node-html-parser';

import {assertView, renderHtml, renderMove} from '../src/render-move';
import type {Snapshot, View} from '../src/types';

// ---------------------------------------------------------------- fixtures

/** The repository root, so the manifests and the entry read the same from any cwd. */
const repoRoot = resolve(import.meta.dir, '../../..');

/** The entry the fixture ships, and the path `renderMove` is handed. */
const ENTRY_PATH = 'client/index.html';
const ENTRY_HTML = readFileSync(resolve(repoRoot, ENTRY_PATH), 'utf8');

const JS = 'console.log(1)';
const CSS = '.a{}';

/** The buy-milk snapshot every leg seeds with. */
const SEED: Snapshot = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}];

/** The seed script's text, spelled out rather than derived. */
const SEED_SCRIPT_TEXT =
  'window.__TINYAPP_SEED__ = [{"todos":{"0":{"text":"buy milk","completed":false}}},{}];';

const SYNTHETIC_ENTRY =
  '<html><head><title>t</title></head><body><script type="module" src="/a.tsx"></script><p>x</p><script type="module" src="/b.tsx"></script></body></html>';

/** The DOM the stubbed renderer hands back: one open todo. */
const FIXTURE_DOM =
  '<div id="todoList"><div class="todoItem"><input type="checkbox" data-checked="false" id="todo-0"><label for="todo-0">buy milk</label><button>Delete</button></div></div>';

/** The same DOM with the box reflected as checked. */
const FIXTURE_DOM_CHECKED = FIXTURE_DOM.replace(
  'data-checked="false"',
  'data-checked="true"',
);

/** One checked and one unchecked input: neither universal holds. */
const MIXED_DOM = '<div><input data-checked="true"><input data-checked="false"></div>';

/** The placeholder renderer. Never dialled: every leg injects `fetchImpl`. */
const RENDER_URL = 'http://renderer.invalid/v4/accounts/x/browser-rendering';
const SNAPSHOT_URL = 'http://renderer.invalid/v4/accounts/x/browser-rendering/snapshot';

/** The four bytes the stub sends as base64 and the helper must decode. */
const PNG_BYTES = [137, 80, 78, 71];
const PNG_BASE64 = Buffer.from(PNG_BYTES).toString('base64');

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

type Call = {url: string; init: RequestInit | undefined};

/** A `fetchImpl` that records every `(url, init)` and answers with a fresh `respond()`. */
const recorder = (respond: () => Response) => {
  const calls: Call[] = [];
  const fetchImpl = ((url: unknown, init?: RequestInit) => {
    calls.push({url: String(url), init});
    return Promise.resolve(respond());
  }) as unknown as typeof fetch;
  return {calls, fetchImpl};
};

/** The stub the run legs answer with: a 200 carrying the fixture DOM and the png. */
const okResponse = (dom = FIXTURE_DOM): Response =>
  new Response(
    JSON.stringify({success: true, result: {content: dom, screenshot: PNG_BASE64}}),
    {status: 200},
  );

/** One header off an `init`, whether `headers` is a `Headers`, a list of pairs or a record. */
const headerOf = (init: RequestInit | undefined, name: string): string | null => {
  const headers = init?.headers;
  if (headers == null) {
    return null;
  }
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name);
  }
  const entries: Array<[unknown, unknown]> = Array.isArray(headers)
    ? (headers as Array<[unknown, unknown]>)
    : (Object.entries(headers as Record<string, string>) as Array<[unknown, unknown]>);
  for (const [key, value] of entries) {
    if (String(key).toLowerCase() === name.toLowerCase()) {
      return String(value);
    }
  }
  return null;
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

  // Nothing left to fetch: the renderer has no origin to serve `/src/` from.
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

test('leg (d) [M3]: no TINYAPP_RENDER_URL means skipped, and the renderer is never called', async () => {
  const {calls, fetchImpl} = recorder(() => okResponse());
  const result = await renderMove({
    entry: ENTRY_PATH,
    content: SEED,
    view: [{selector: '.todoItem', count: 1}],
    env: {ULTRA_RUN_DIR: runDir},
    fetchImpl,
  });

  expect(result.render).toBe('skipped');
  expect(result.ms).toBeNull();
  expect(result.failures).toEqual([]);
  expect(calls.length).toBe(0);
});

test('leg (e) [M3]: an empty TINYAPP_RENDER_URL means skipped too', async () => {
  const {calls, fetchImpl} = recorder(() => okResponse());
  const result = await renderMove({
    entry: ENTRY_PATH,
    content: SEED,
    env: {TINYAPP_RENDER_URL: '', ULTRA_RUN_DIR: runDir},
    fetchImpl,
  });

  expect(result.render).toBe('skipped');
  expect(result.ms).toBeNull();
  expect(result.failures).toEqual([]);
  expect(calls.length).toBe(0);
});

test('leg (f) [M3]: an unset or empty ULTRA_RUN_DIR means skipped, renderer configured or not', async () => {
  const unset = recorder(() => okResponse());
  const withoutRunDir = await renderMove({
    entry: ENTRY_PATH,
    content: SEED,
    env: {TINYAPP_RENDER_URL: RENDER_URL},
    fetchImpl: unset.fetchImpl,
  });
  expect(withoutRunDir.render).toBe('skipped');
  expect(withoutRunDir.ms).toBeNull();
  expect(withoutRunDir.failures).toEqual([]);
  expect(unset.calls.length).toBe(0);

  const empty = recorder(() => okResponse());
  const emptyRunDir = await renderMove({
    entry: ENTRY_PATH,
    content: SEED,
    env: {TINYAPP_RENDER_URL: RENDER_URL, ULTRA_RUN_DIR: ''},
    fetchImpl: empty.fetchImpl,
  });
  expect(emptyRunDir.render).toBe('skipped');
  expect(emptyRunDir.ms).toBeNull();
  expect(emptyRunDir.failures).toEqual([]);
  expect(empty.calls.length).toBe(0);
});

// ------------------------------------------------------------------ M4

test(
  'leg (g) [M4]: the configured move bundles the entry, posts one snapshot request and reports the view',
  async () => {
    const {calls, fetchImpl} = recorder(() => okResponse());
    const result = await renderMove({
      entry: ENTRY_PATH,
      content: SEED,
      view: [{selector: '.todoItem', count: 1}],
      env: {TINYAPP_RENDER_URL: RENDER_URL, ULTRA_RUN_DIR: runDir},
      fetchImpl,
    });

    // One request, to the snapshot action of the configured renderer.
    expect(calls.length).toBe(1);
    const {url, init} = calls[0]!;
    expect(url).toBe(SNAPSHOT_URL);
    expect(init?.method).toBe('POST');
    expect(headerOf(init, 'content-type')).toBe('application/json');

    const body = JSON.parse(String(init?.body)) as {
      html: string;
      addScriptTag: Array<{content: string}>;
    };

    // The page opens on the post-action state, with nothing left to fetch.
    expect(body.html).toContain(SEED_SCRIPT_TEXT);
    expect(body.html).toContain('<script type="module">');
    expect(body.html).not.toContain('src="/src/index.tsx"');

    // The inlined module is the real bundle of `client/src/index.tsx`, not a placeholder.
    const modules = parse(body.html).querySelectorAll('script[type=module]');
    expect(modules.length).toBe(1);
    const bundle = textOf(modules[0]!);
    expect(bundle.length).toBeGreaterThan(100000);
    expect(bundle).toContain('createRoot');

    // The reflection script rides along as a request parameter.
    expect(Array.isArray(body.addScriptTag)).toBe(true);
    expect(body.addScriptTag.length).toBe(1);
    expect(body.addScriptTag[0]!.content).toContain('data-checked');
    expect(body.addScriptTag[0]!.content).toContain('querySelectorAll');

    // And the response is reported as it came back.
    expect(result.render).toBe('ran');
    expect(result.dom).toBe(FIXTURE_DOM);
    expect(result.screenshot).toBeInstanceOf(Uint8Array);
    expect(result.screenshot).toEqual(new Uint8Array(PNG_BYTES));
    expect(result.failures).toEqual([]);
    expect(typeof result.ms).toBe('number');
    expect(Number.isFinite(result.ms as number)).toBe(true);
    expect(result.ms as number).toBeGreaterThanOrEqual(0);
  },
  60000,
);

test(
  'leg (g) [M4]: failures are assertView of the returned dom',
  async () => {
    const {calls, fetchImpl} = recorder(() => okResponse());
    const result = await renderMove({
      entry: ENTRY_PATH,
      content: SEED,
      view: [{selector: '.todoItem', count: 2}],
      env: {TINYAPP_RENDER_URL: RENDER_URL, ULTRA_RUN_DIR: runDir},
      fetchImpl,
    });

    expect(calls.length).toBe(1);
    expect(result.render).toBe('ran');
    expect(result.failures.length).toBe(1);
    expect(result.failures[0]!).toContain('.todoItem');
  },
  60000,
);

// ------------------------------------------------------------------ M5

test(
  'leg (h) [M5]: a non-2xx response rejects with render failed:',
  async () => {
    const {fetchImpl} = recorder(
      () => new Response(JSON.stringify({success: false}), {status: 500}),
    );
    const {resolved, error} = await settle(() =>
      renderMove({
        entry: ENTRY_PATH,
        content: SEED,
        env: {TINYAPP_RENDER_URL: RENDER_URL, ULTRA_RUN_DIR: runDir},
        fetchImpl,
      }),
    );

    expect(resolved).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message.startsWith('render failed:')).toBe(true);
  },
  60000,
);

test(
  'leg (i) [M5]: a 200 with success false rejects, while a 200 with success true does not',
  async () => {
    const refused = recorder(
      () =>
        new Response(JSON.stringify({success: false, errors: [{message: 'x'}]}), {
          status: 200,
        }),
    );
    const {resolved, error} = await settle(() =>
      renderMove({
        entry: ENTRY_PATH,
        content: SEED,
        env: {TINYAPP_RENDER_URL: RENDER_URL, ULTRA_RUN_DIR: runDir},
        fetchImpl: refused.fetchImpl,
      }),
    );

    expect(resolved).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message.startsWith('render failed:')).toBe(true);

    // The same 200, `success` true, is the run leg's stub: it settles green.
    const accepted = recorder(() => okResponse());
    const green = await settle(() =>
      renderMove({
        entry: ENTRY_PATH,
        content: SEED,
        env: {TINYAPP_RENDER_URL: RENDER_URL, ULTRA_RUN_DIR: runDir},
        fetchImpl: accepted.fetchImpl,
      }),
    );
    expect(green.error).toBeUndefined();
    expect((green.resolved as {render: string}).render).toBe('ran');
  },
  60000,
);

// ------------------------------------------------------------------ M6

test('leg (j) [M6]: the root manifests carry node-html-parser', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
  ) as {devDependencies?: Record<string, string>};
  const range = manifest.devDependencies?.['node-html-parser'];

  expect(typeof range).toBe('string');
  expect((range as string).length).toBeGreaterThan(0);

  expect(readFileSync(resolve(repoRoot, 'bun.lock'), 'utf8')).toContain(
    '"node-html-parser"',
  );
});
