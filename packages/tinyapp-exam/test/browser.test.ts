// Exam for task 1, legs (a)-(e): the CDP driver — launch, seed a page, act, read, snapshot.
//
// M1. `launchBrowser({binary?, env?})` spawns `binary` (default `env.TINYAPP_BROWSER`, else
//     `/headless-shell/headless-shell`) with `--headless`, `--remote-debugging-port=0`, a
//     fresh `--user-data-dir` under `os.tmpdir()`, `--disable-gpu` and `--hide-scrollbars`,
//     reads the `DevTools listening on ws://…` line off its stderr, connects with the global
//     `WebSocket`, and resolves a `Browser` (its `argv` the arguments it spawned with) whose
//     `close()` ends the process and removes the directory; a `binary` that does not exist
//     rejects with a message beginning `browser: ` naming the path, and no process is left.
// M2. `browser.open({html, clock})` creates a target, attaches to it flat, blocks every
//     network request of the page (`Network.setBlockedURLs` with `["*"]` after
//     `Network.enable`), installs a script on new documents that pins `Date.now` and
//     `new Date()` to `clock`, navigates to `data:text/html;base64,` of `html`, waits for the
//     load event, and resolves a `Page`; a page whose script calls `fetch` or opens a
//     `WebSocket` sees it fail, and `Date.now()` evaluated in the page equals
//     `Date.parse(clock)`.
// M3. `page.act(action)` performs one of `{click: selector}` (mouse pressed and released at
//     the centre of the element's content box, from `DOM.getBoxModel`), `{type: [selector,
//     text]}` (focus the element, then `Input.insertText`), `{key: [selector, key]}` (focus,
//     then `Input.dispatchKeyEvent` `keyDown` and `keyUp` for `key`, with `Enter` carrying
//     `\r` as text and code `Enter`); a selector matching nothing rejects with
//     `act: no element matches <selector>`.
// M4. `page.evaluate(expression)` resolves the JSON value of `expression` evaluated in the
//     page (`Runtime.evaluate` with `returnByValue`, `awaitPromise`); `page.snapshot()`
//     resolves `{dom, screenshot}` — `dom` the document's outer HTML after the
//     `REFLECT_CHECKED` script has run in the page, `screenshot` PNG bytes — and
//     `page.close()` detaches and closes the target.
// M5. `index.ts` exports `launchBrowser`, and the sealed package still exports every name it
//     exported at BASE.
//
// No leg dials a network. Every page this file opens is opened from a `data:` URL built out
// of an inline string; the two hosts a page reaches for are on `.invalid`, and the whole
// point of leg (b) is that neither request leaves the browser. The one socket the exam is
// party to is the helper's own loopback WebSocket to the Chromium it spawned.
//
// Legs (b), (c) and (d) need a real Chromium. The fleet image carries one at
// `/headless-shell/headless-shell`; a laptop names one through `TINYAPP_BROWSER`. With
// neither on the machine this file prints one line saying so and naming both paths it looked
// at, and runs only M1's missing-binary rejection and M5's exports — the task's Context asks
// for exactly that, so the suite is green on a laptop without Chromium and full on the fleet.

import {afterAll, expect, test} from 'bun:test';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join, resolve} from 'node:path';

import {launchBrowser, type Page} from '../src/browser';
import {actionsOf, type Action} from '../src/types';

// ---------------------------------------------------------------- fixtures

/** The repository root, so every path reads the same whatever `bun test`'s cwd is. */
const repoRoot = resolve(import.meta.dir, '../../..');

/** The path M1 names as the default when neither `binary` nor `env.TINYAPP_BROWSER` says. */
const IMAGE_BROWSER = '/headless-shell/headless-shell';

/** A binary that is not there — leg (a)'s rejection, spelled once so the message can name it. */
const MISSING_BROWSER = '/nonexistent/chrome';

/** The Chromium this machine has, or `null` when it has none. */
const BROWSER: string | null = (() => {
  const named = process.env.TINYAPP_BROWSER;
  if (named && existsSync(named)) return named;
  if (existsSync(IMAGE_BROWSER)) return IMAGE_BROWSER;
  return null;
})();

if (!BROWSER) {
  console.log(
    `browser.test: no Chromium at ${process.env.TINYAPP_BROWSER ?? '$TINYAPP_BROWSER (unset)'} ` +
      `or ${IMAGE_BROWSER} — legs (b), (c) and (d) want one; set TINYAPP_BROWSER to run them.`,
  );
}

const CLOCK = '2026-01-01T00:00:00Z';

/** The instant M2 pins the page's clock to. */
const CLOCK_MS = Date.parse(CLOCK);

/** The first four bytes of any PNG. */
const PNG_SIGNATURE = [137, 80, 78, 71];

/**
 * Leg (b)'s page: it reads the pinned clock at parse time, then reaches for two things on
 * `.invalid` and records that each one failed. Both records land after the load event — a
 * rejected `fetch` and a `WebSocket` `error` are asynchronous — so the leg polls for them.
 * The stylesheet link is a blocked subresource of the document itself: the page still reaches
 * `complete`, which is the fallback-to-sans-serif the render move relies on.
 *
 * `__DATA_FETCH` is the one request here that would succeed on a machine with no network at
 * all: a `data:` URL is served out of the page's own bytes. `Network.setBlockedURLs` with
 * `["*"]` blocks it too (measured), so it is what tells "every request is blocked" apart from
 * "`.invalid` does not resolve" — and it still dials nothing.
 */
const CLOCK_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>clock</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter"></head><body>
<p>clock</p>
<script>
window.__NOW = Date.now();
window.__NEW = new Date().getTime();
window.__FETCH_FAILED = false;
window.__WS_FAILED = false;
window.__DATA_FETCH = 'pending';
fetch('https://example.invalid/x').then(function () {}, function () { window.__FETCH_FAILED = true; });
fetch('data:text/plain;base64,aGk=').then(function (response) { return response.text(); }).then(
  function (text) { window.__DATA_FETCH = 'reached:' + text; },
  function () { window.__DATA_FETCH = 'blocked'; }
);
try {
  var socket = new WebSocket('ws://example.invalid/');
  socket.onerror = function () { window.__WS_FAILED = true; };
} catch (error) { window.__WS_FAILED = true; }
</script></body></html>`;

/**
 * Legs (c) and (d)'s page: a checkbox in an `li` whose click flips `window.__X` and adds the
 * class `done`, and a text input whose Enter appends its value to `window.__ROWS`. The
 * keydown handler also records `e.key` and `e.code`, and a keypress handler records the
 * character — a keypress only fires when the key event carries `\r` as its text, which is the
 * one witness from outside the driver that M3's `Enter` clause has.
 */
const APP_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>app</title></head><body>
<ul><li id="row"><input type="checkbox" id="c"><label>buy milk</label></li></ul>
<input id="i">
<script>
window.__X = false;
window.__ROWS = [];
window.__KEY = null;
window.__PRESS = null;
document.getElementById('c').addEventListener('click', function () {
  window.__X = true;
  document.getElementById('row').classList.add('done');
});
document.getElementById('i').addEventListener('keypress', function (event) {
  window.__PRESS = [event.key, event.charCode];
});
document.getElementById('i').addEventListener('keydown', function (event) {
  window.__KEY = [event.key, event.code];
  if (event.key === 'Enter') { window.__ROWS.push(this.value); this.value = ''; }
});
</script></body></html>`;

type BrowserHandle = Awaited<ReturnType<typeof launchBrowser>>;

/** Every browser a leg opened, so a leg that throws mid-way still leaves nothing behind. */
const opened: BrowserHandle[] = [];

/** Launch the machine's Chromium through the helper, and remember it for the sweep. */
const launch = async (): Promise<BrowserHandle> => {
  const browser = await launchBrowser({env: {TINYAPP_BROWSER: BROWSER as string}});
  opened.push(browser);
  return browser;
};

/** Close one, and forget it — so `afterAll` does not close it twice. */
const closeBrowser = async (browser: BrowserHandle): Promise<void> => {
  const at = opened.indexOf(browser);
  if (at >= 0) opened.splice(at, 1);
  await browser.close();
};

afterAll(async () => {
  for (const browser of opened.splice(0)) {
    await browser.close().catch(() => {});
  }
});

/** Every process on the machine as `<ppid>\t<args>`, so a leg can see what survived. */
const processLines = (): Array<{ppid: number; args: string}> => {
  const listed = Bun.spawnSync(['ps', '-eo', 'ppid=,args=']);
  return new TextDecoder()
    .decode(listed.stdout)
    .split('\n')
    .map((line) => line.trim().match(/^(\d+)\s+(.*)$/))
    .filter((matched): matched is RegExpMatchArray => matched !== null)
    .map((matched) => ({ppid: Number(matched[1]), args: matched[2]}));
};

/** The command lines of the processes this test process is the direct parent of. */
const childCommands = (): string[] =>
  processLines()
    .filter((entry) => entry.ppid === process.pid)
    .map((entry) => entry.args);

/**
 * Read `expression` until it stops being `pending` or the deadline passes, then hand back
 * what it last was. The records leg (b) reads are written by a rejection handler and an
 * `error` listener, both of which run after the load event.
 */
const until = async (
  page: {evaluate: (expression: string) => Promise<unknown>},
  expression: string,
  pending: unknown = false,
  ms = 10000,
): Promise<unknown> => {
  const deadline = Date.now() + ms;
  for (;;) {
    const value = await page.evaluate(expression);
    if (value !== pending || Date.now() > deadline) return value;
    await Bun.sleep(50);
  }
};

/** The message of whatever `work` threw, or `null` when it did not throw. */
const rejection = async (work: () => Promise<unknown>): Promise<string | null> => {
  try {
    await work();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

// ---------------------------------------------------------------- (a) [M1]

test(
  'leg (a) [M1]: a missing binary rejects naming the path, a real one spawns with the measured argv, and close() takes both the process and the directory',
  async () => {
    // A `binary` that does not exist rejects with `browser: ` and the path — and leaves no
    // process behind, which is why the leg reads `ps` rather than trusting the rejection.
    const message = await rejection(async () => {
      const stray = await launchBrowser({binary: MISSING_BROWSER});
      await stray.close().catch(() => {});
      return stray;
    });
    expect(message).not.toBeNull();
    expect((message as string).startsWith('browser: ')).toBe(true);
    expect(message).toContain(MISSING_BROWSER);

    const all = processLines();
    // `ps` must have said something, or the next assertion is vacuous.
    expect(all.length).toBeGreaterThan(0);
    expect(all.filter((entry) => entry.args.includes(MISSING_BROWSER)).map((e) => e.args)).toEqual(
      [],
    );

    if (!BROWSER) {
      // With no Chromium on the machine, the default path is still pinned: `launchBrowser`
      // with an empty `env` and no `binary` must reach for `/headless-shell/headless-shell`
      // and say so when it is not there.
      const defaulted = await rejection(async () => {
        const stray = await launchBrowser({env: {}});
        await stray.close().catch(() => {});
        return stray;
      });
      expect(defaulted).not.toBeNull();
      expect((defaulted as string).startsWith('browser: ')).toBe(true);
      expect(defaulted).toContain(IMAGE_BROWSER);
      return;
    }

    const browser = await launch();
    const argv: readonly string[] = browser.argv;
    expect(argv[0]).toBe(BROWSER);
    for (const flag of [
      '--headless',
      '--remote-debugging-port=0',
      '--disable-gpu',
      '--hide-scrollbars',
    ]) {
      expect(argv).toContain(flag);
    }

    const dataDirArg = argv.find((argument) => argument.startsWith('--user-data-dir='));
    expect(typeof dataDirArg).toBe('string');
    const dataDir = (dataDirArg as string).slice('--user-data-dir='.length);
    expect(dataDir.length).toBeGreaterThan(0);
    expect(resolve(dataDir).startsWith(resolve(tmpdir()))).toBe(true);
    // It is there while the browser is open…
    expect(existsSync(dataDir)).toBe(true);

    await closeBrowser(browser);

    // …and gone once it is closed.
    expect(existsSync(dataDir)).toBe(false);

    // And the process is ended: no direct child of this test process is a headless shell.
    // Read for a moment rather than once, so an exit that is reaped a tick late is not a flake.
    const deadline = Date.now() + 5000;
    let survivors = childCommands().filter((args) => args.includes('headless-shell'));
    while (survivors.length > 0 && Date.now() < deadline) {
      await Bun.sleep(100);
      survivors = childCommands().filter((args) => args.includes('headless-shell'));
    }
    expect(survivors).toEqual([]);

    // With `env: {}` and no `binary`, the default is the image path, argv[0] and all.
    const defaulted = await launchBrowser({env: {}});
    opened.push(defaulted);
    try {
      expect((defaulted.argv as readonly string[])[0]).toBe(IMAGE_BROWSER);
    } finally {
      await closeBrowser(defaulted);
    }
  },
  120000,
);

// ---------------------------------------------------------------- (b) [M2]

test(
  'leg (b) [M2]: the page opens from a data: URL with every request blocked and its clock pinned to the exam clock',
  async () => {
    if (!BROWSER) return;

    const browser = await launch();
    try {
      const page = await browser.open({html: CLOCK_HTML, clock: CLOCK});

      // The page got as far as a load event — a blocked stylesheet does not hang it.
      expect(await page.evaluate('document.readyState')).toBe('complete');

      // …and it got there from `data:text/html;base64,`, not from a server.
      expect(await page.evaluate('location.href.slice(0, 22)')).toBe('data:text/html;base64,');

      // Neither request left the browser.
      expect(await until(page, 'window.__FETCH_FAILED')).toBe(true);
      expect(await until(page, 'window.__WS_FAILED')).toBe(true);

      // And the blocking is the page's, not the machine's: a `data:` fetch, which needs no
      // network at all and resolves on any machine, is blocked too.
      expect(await until(page, 'window.__DATA_FETCH', 'pending')).toBe('blocked');

      // Both clocks read the pinned instant, to the millisecond.
      expect(await page.evaluate('window.__NOW')).toBe(CLOCK_MS);
      expect(await page.evaluate('window.__NEW')).toBe(CLOCK_MS);
      // And they still do when read now, not only at parse time.
      expect(await page.evaluate('Date.now()')).toBe(CLOCK_MS);
      expect(await page.evaluate('new Date().getTime()')).toBe(CLOCK_MS);

      await page.close();
    } finally {
      await closeBrowser(browser);
    }
  },
  120000,
);

// ---------------------------------------------------------------- (c) [M3]

test(
  'leg (c) [M3]: click, type and key each land in the page, and a selector matching nothing rejects by name',
  async () => {
    if (!BROWSER) return;

    const browser = await launch();
    try {
      const page = await browser.open({html: APP_HTML, clock: CLOCK});

      // {click: selector} — the mouse lands on the element's content box, so the page's own
      // click handler runs and the checkbox itself toggles.
      await page.act({click: '#c'});
      expect(await page.evaluate('window.__X')).toBe(true);
      expect(await page.evaluate("document.querySelector('li').classList.contains('done')")).toBe(
        true,
      );
      expect(await page.evaluate("document.getElementById('c').checked")).toBe(true);

      // {type: [selector, text]} — the element is focused first, so the text lands in it.
      await page.act({type: ['#i', 'buy milk']});
      expect(await page.evaluate("document.getElementById('i').value")).toBe('buy milk');

      // {key: [selector, key]} — Enter, with code `Enter`…
      await page.act({key: ['#i', 'Enter']});
      expect(await page.evaluate('window.__ROWS')).toEqual(['buy milk']);
      expect(await page.evaluate('window.__KEY')).toEqual(['Enter', 'Enter']);
      // …and carrying `\r` as its text, which is the only reason a keypress fired at all.
      expect(await page.evaluate('window.__PRESS')).toEqual(['Enter', 13]);
      // The handler cleared the input, so the row really came from the typed value.
      expect(await page.evaluate("document.getElementById('i').value")).toBe('');

      // A selector matching nothing rejects, with that exact sentence.
      expect(await rejection(() => page.act({click: '#nope'}))).toBe(
        'act: no element matches #nope',
      );

      await page.close();
    } finally {
      await closeBrowser(browser);
    }
  },
  120000,
);

// ---------------------------------------------------------------- (d) [M4]

test(
  'leg (d) [M4]: snapshot hands back the reflected markup and PNG bytes, and close() ends the page',
  async () => {
    if (!BROWSER) return;

    const browser = await launch();
    try {
      const page = await browser.open({html: APP_HTML, clock: CLOCK});
      await page.act({click: '#c'});

      const {dom, screenshot} = await page.snapshot();

      // `dom` is the document's outer HTML after `REFLECT_CHECKED` (the one exported by
      // `render-move.ts`) has run, so each input's `checked` property is on `data-checked` —
      // which is the attribute `assertView` reads.
      const inputs = dom.match(/<input\b[^>]*>/g) ?? [];
      const checkbox = inputs.find((tag) => tag.includes('id="c"'));
      expect(typeof checkbox).toBe('string');
      expect(checkbox).toContain('data-checked="true"');
      // The clicked one is not the only one it reflected: the untouched text input says false.
      const text = inputs.find((tag) => tag.includes('id="i"'));
      expect(typeof text).toBe('string');
      expect(text).toContain('data-checked="false"');
      // And it is the whole document, not a fragment.
      expect(dom.includes('<html')).toBe(true);

      // `screenshot` is PNG bytes.
      expect(screenshot).toBeInstanceOf(Uint8Array);
      expect(screenshot.length).toBeGreaterThan(PNG_SIGNATURE.length);
      expect(Array.from(screenshot.slice(0, 4))).toEqual(PNG_SIGNATURE);

      // `close()` closes the target, so there is nothing left to evaluate in.
      await page.close();
      expect(await rejection(() => page.evaluate('1 + 1'))).not.toBeNull();
    } finally {
      await closeBrowser(browser);
    }
  },
  120000,
);

// ---------------------------------------------------------------- (e) [M5]

test('leg (e) [M5]: the sealed package exports launchBrowser and everything it exported at BASE', async () => {
  // The list of names the package is sealed around lives in the manifest leg of
  // `state-exam.test.ts`. Read it from there rather than restating it here, so the two exams
  // cannot drift apart: whatever that leg says the package exports is what this leg checks.
  const manifestExam = resolve(repoRoot, 'packages/tinyapp-exam/test/state-exam.test.ts');
  const source = readFileSync(manifestExam, 'utf8');
  const block = source.match(/const EXPORTS\s*(?::[^=]+)?=\s*\[([\s\S]*?)\]/);
  expect(block).not.toBeNull();
  const sealed = [...(block as RegExpMatchArray)[1].matchAll(/['"]([^'"]+)['"]/g)].map(
    (matched) => matched[1],
  );
  expect(sealed.length).toBeGreaterThan(0);

  // Imported by a computed specifier, so what is tested is the runtime resolution the
  // workspace link makes — the same one `tests/state-exams/*` rely on.
  const specifier: string = 'tinyapp-exam';
  const helper = (await import(specifier)) as Record<string, unknown>;

  expect(typeof helper.launchBrowser).toBe('function');
  for (const name of sealed) {
    expect(typeof helper[name]).toBe('function');
  }
});

// =====================================================================================
// Exam for task 3 — "The exam finds a control by role and name — and reads a shadcn page",
// legs (a), (b), (c) and (h).
//
// M1. `packages/tinyapp-exam/src/types.ts` exports a `Locator` type admitting a string and
//     `{role: string, name: string}`, and `Action` admits `{click: Locator}`,
//     `{type: [Locator, string]}` and `{key: [Locator, string]}` — `actionsOf` returns
//     `[{click: {role: 'checkbox', name: 'x'}}]` for that single action — and a string locator
//     behaves exactly as at BASE.
// M2. `page.act` with a `{role, name}` locator finds the control by its role and its
//     *accessible name* as the browser computes it — a name no CSS selector can express — and
//     acts on it as on a selector match: on a page holding
//     `<input type="checkbox" id="c0"><label for="c0">buy milk</label>`,
//     `<input aria-label="New todo">` and `<span role="checkbox" aria-checked="false"
//     aria-label="walk the dog" onclick="window.__hit='walk'"></span>`,
//     `act({click: {role: 'checkbox', name: 'buy milk'}})` leaves
//     `document.getElementById('c0').checked` `true`,
//     `act({type: [{role: 'textbox', name: 'New todo'}, 'buy milk']})` leaves that input's
//     `value` `buy milk`, and `act({click: {role: 'checkbox', name: 'walk the dog'}})` — the
//     span, named only by `aria-label` — leaves `window.__hit` `walk`.
// M3. A locator no node matches rejects with the message
//     `act: no element matches role=checkbox name="Nope"` for `{role: 'checkbox', name: 'Nope'}`;
//     a string locator matching nothing still rejects with `act: no element matches <selector>`.
// M8. `packages/tinyapp-exam/src/index.ts` names `Locator` in its type export from `./types`,
//     and `tinyapp-exam` still exports every runtime name it exported at BASE.
//
// Legs (b) and (c) want a real Chromium and are gated on the same `BROWSER` constant the legs
// above are: with none on the machine the file has already printed the line naming both paths
// it looked at, and these two return without asserting. The page they open is a `data:` URL
// built from an inline string, dialling nothing.

// ------------------------------------------------------------------ fixtures

/**
 * The page M2 spells, verbatim, with one addition: `window.__hit` is initialised, so a click
 * that never reached the span reads as `none` rather than as `undefined`.
 *
 * Three controls, and not one of them is reachable by the name a person would use through a
 * CSS selector: `buy milk` is on a `<label for>` beside the checkbox, `New todo` is an
 * `aria-label`, and `walk the dog` is an `aria-label` on a `<span role="checkbox">` — which a
 * `<label>` cannot name at all, and whose content box has zero area.
 */
const NAMED_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>named</title></head><body>
<script>window.__hit = 'none';</script>
<input type="checkbox" id="c0"><label for="c0">buy milk</label>
<input aria-label="New todo">
<span role="checkbox" aria-checked="false" aria-label="walk the dog" onclick="window.__hit='walk'"></span>
</body></html>`;

/** The `aria-label`led input's value, read in the page — it carries no id to read it by. */
const NEW_TODO_VALUE = 'document.querySelector(\'[aria-label="New todo"]\').value';

/**
 * Performs one action on `page`.
 *
 * The cast is the only way the object locator can be written down before M1 widens `Action`:
 * at BASE `Action` admits a string and nothing else, so the literal below would not compile —
 * and the action itself is untouched, which is the point. It is the locator M2 names, handed
 * to the `act` M2 names, and nothing is substituted for it.
 */
const actOn = (page: Page, action: unknown): Promise<void> => page.act(action as Action);

/**
 * The TypeScript M1's first clause is, compiled rather than asserted at runtime.
 *
 * `packages/tinyapp-exam/tsconfig.json` includes only `src`, so neither `bun test` nor the
 * Proof's `bunx tsc -p` line ever reads a test file — a type-level claim written here would
 * assert nothing. This text is written into a directory under the repository root and compiled
 * on its own instead. The two `@ts-expect-error` lines are what keep the claim two-sided: a
 * `Locator` that admitted everything fails this leg exactly as one that admitted nothing.
 */
const LOCATOR_CHECK = `import type {Action, Locator} from '../packages/tinyapp-exam/src/types';
import type {Locator as LocatorViaIndex} from '../packages/tinyapp-exam/src/index';

// A locator is a string…
const selector: Locator = '.todoItem input[type=checkbox]';
// …or a role and an accessible name.
const named: Locator = {role: 'checkbox', name: 'buy milk'};
// …and the package's entry point names the very same type [M8].
const viaIndex: LocatorViaIndex = {role: 'checkbox', name: 'buy milk'};

// @ts-expect-error a locator is not a half-spelled name
const missingName: Locator = {role: 'checkbox'};
// @ts-expect-error nor anything that is not a string
const notAString: Locator = 42;

// Every action form admits either locator.
const clickNamed: Action = {click: named};
const typeNamed: Action = {type: [named, 'buy milk']};
const keyNamed: Action = {key: [named, 'Enter']};
const clickSelector: Action = {click: selector};
const typeSelector: Action = {type: [selector, 'buy milk']};
const keySelector: Action = {key: [selector, 'Enter']};

export {
  selector,
  named,
  viaIndex,
  missingName,
  notAString,
  clickNamed,
  typeNamed,
  keyNamed,
  clickSelector,
  typeSelector,
  keySelector,
};
`;

/** Every runtime name `packages/tinyapp-exam/src/index.ts` exported at BASE, and its `typeof`. */
const BASE_RUNTIME_EXPORTS: Record<string, string> = {
  runStateExam: 'function',
  stateExam: 'function',
  STATE_EXAM_TIMEOUT_MS: 'number',
  launchBrowser: 'function',
  withContract: 'function',
  browserStoreMove: 'function',
  diffContent: 'function',
  renderDiff: 'function',
  storeMove: 'function',
  READ_CONTENT: 'string',
  assertView: 'function',
  bundleOf: 'function',
  pageFor: 'function',
  renderHtml: 'function',
  renderMove: 'function',
  REFLECT_CHECKED: 'string',
  applyMutant: 'function',
  mutantPath: 'function',
  evidenceDir: 'function',
  examStem: 'function',
  writeEvidence: 'function',
  actionsOf: 'function',
  isCallbackAction: 'function',
  VALUES_TABLE: 'string',
};

/** Every type `index.ts`'s `export type {…} from './types'` block named at BASE. */
const BASE_TYPE_EXPORTS = [
  'Cell',
  'Difference',
  'ExamRecord',
  'ExamStore',
  'MutantEdit',
  'Snapshot',
  'StateExamSpec',
  'Tables',
  'Values',
  'View',
];

/** Runs `argv` from the repository root and hands back its code and everything it printed. */
const runFromRoot = (argv: string[]): {code: number; output: string} => {
  const ran = Bun.spawnSync(argv, {cwd: repoRoot});
  const decoder = new TextDecoder();
  return {
    code: ran.exitCode,
    output: `${decoder.decode(ran.stdout)}${decoder.decode(ran.stderr)}`,
  };
};

// ------------------------------------------------------------------ (a) [M1]

test(
  'task 3, leg (a) [M1]: a Locator-typed value accepts a string and {role, name}, every Action form admits both, and actionsOf carries the object action through',
  () => {
    // M1 names `types.ts` as the module that exports it.
    const typesSource = readFileSync(
      resolve(repoRoot, 'packages/tinyapp-exam/src/types.ts'),
      'utf8',
    );
    expect(typesSource.includes('export type Locator')).toBe(true);

    // The admission is a type-level claim, so it is compiled rather than asserted.
    const dir = mkdtempSync(join(repoRoot, 'tinyapp-exam-locator-'));
    try {
      writeFileSync(join(dir, 'check.ts'), LOCATOR_CHECK, 'utf8');
      const compiled = runFromRoot([
        'bunx',
        'tsc',
        '--noEmit',
        '--strict',
        '--target',
        'ES2022',
        '--module',
        'ESNext',
        '--moduleResolution',
        'bundler',
        '--skipLibCheck',
        '--types',
        'bun',
        `${basename(dir)}/check.ts`,
      ]);
      // tsc prints nothing at all when it is happy, so the output is the message.
      expect(compiled.output.trim()).toBe('');
      expect(compiled.code).toBe(0);
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }

    // The object action survives `actionsOf` unchanged — one action in, a list of exactly
    // that one action out, the locator still the object it was written as.
    expect(actionsOf({click: {role: 'checkbox', name: 'x'}} as unknown as Action)).toEqual([
      {click: {role: 'checkbox', name: 'x'}},
    ]);

    // And the string form is exactly what it was: `actionsOf` here, and `act` in task 1's
    // leg (c) above, which this task re-runs unchanged.
    expect(actionsOf({click: '#c'} as Action)).toEqual([{click: '#c'}]);
    expect(actionsOf([{click: '#c'}, {type: ['#i', 'buy milk']}] as Action[])).toEqual([
      {click: '#c'},
      {type: ['#i', 'buy milk']},
    ]);
  },
  120000,
);

// ------------------------------------------------------------------ (b) [M2]

test(
  'task 3, leg (b) [M2]: a role and an accessible name find the labelled checkbox, the aria-labelled input and the aria-labelled span',
  async () => {
    if (!BROWSER) return;

    const browser = await launch();
    try {
      const page = await browser.open({html: NAMED_HTML, clock: CLOCK});

      // Nothing has happened yet: the box is clear and the span has not been hit.
      expect(await page.evaluate("document.getElementById('c0').checked")).toBe(false);
      expect(await page.evaluate('window.__hit')).toBe('none');
      expect(await page.evaluate(NEW_TODO_VALUE)).toBe('');

      // The checkbox named by its `<label for>` — a name no CSS selector can express.
      await actOn(page, {click: {role: 'checkbox', name: 'buy milk'}});
      expect(await page.evaluate("document.getElementById('c0').checked")).toBe(true);

      // The input named only by `aria-label`, typed into: the object locator focuses it
      // exactly as a selector would have.
      await actOn(page, {type: [{role: 'textbox', name: 'New todo'}, 'buy milk']});
      expect(await page.evaluate(NEW_TODO_VALUE)).toBe('buy milk');

      // The span: `role="checkbox"` and an `aria-label`, labelable by nothing, and a content
      // box of zero area — acted on all the same, and its own handler is what records it.
      await actOn(page, {click: {role: 'checkbox', name: 'walk the dog'}});
      expect(await page.evaluate('window.__hit')).toBe('walk');

      await page.close();
    } finally {
      await closeBrowser(browser);
    }
  },
  120000,
);

// ------------------------------------------------------------------ (c) [M3]

test(
  'task 3, leg (c) [M3]: a role and name matching nothing rejects spelling both, and a selector matching nothing rejects exactly as at BASE',
  async () => {
    if (!BROWSER) return;

    const browser = await launch();
    try {
      const page = await browser.open({html: NAMED_HTML, clock: CLOCK});

      // The new message spells the object as `role=<role> name="<name>"`.
      expect(await rejection(() => actOn(page, {click: {role: 'checkbox', name: 'Nope'}}))).toBe(
        'act: no element matches role=checkbox name="Nope"',
      );

      // A role that matches nothing is the same rejection, whatever the name.
      expect(
        await rejection(() => actOn(page, {type: [{role: 'slider', name: 'buy milk'}, 'x']})),
      ).toBe('act: no element matches role=slider name="buy milk"');

      // And the string form's sentence is byte-identical to the one task 1's leg (c) pinned.
      expect(await rejection(() => page.act({click: '#nope'}))).toBe(
        'act: no element matches #nope',
      );

      await page.close();
    } finally {
      await closeBrowser(browser);
    }
  },
  120000,
);

// ------------------------------------------------------------------ (h) [M8]

test(
  'task 3, leg (h) [M8]: index.ts names Locator in its ./types type export, still exports every runtime name it had at BASE, and the three Run: lines exit 0',
  async () => {
    const indexSource = readFileSync(
      resolve(repoRoot, 'packages/tinyapp-exam/src/index.ts'),
      'utf8',
    );

    // Exactly one `export type {…} from './types'` block — `./types` and `./browser` both
    // re-export `Action`, and only one block may name any given type — and `Locator` is in it,
    // beside every type that block named at BASE.
    const blocks = [...indexSource.matchAll(/export type \{([^}]*)\} from '\.\/types'/g)];
    expect(blocks.length).toBe(1);
    const exportedTypes = blocks[0]![1]!
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name !== '');
    expect(exportedTypes).toContain('Locator');
    for (const name of BASE_TYPE_EXPORTS) {
      expect(exportedTypes).toContain(name);
    }

    // Imported by a computed specifier, so what is read is the runtime resolution the
    // workspace link makes — the same one `tests/state-exams/*` rely on.
    const specifier: string = 'tinyapp-exam';
    const exam = (await import(specifier)) as Record<string, unknown>;
    // One assertion per name, each carrying the name so a missing export says which.
    for (const [name, kind] of Object.entries(BASE_RUNTIME_EXPORTS)) {
      expect([name, typeof exam[name]]).toEqual([name, kind]);
    }

    // The Proof's three `Run:` lines, run from the repository root.
    for (const argv of [
      ['bunx', 'tsc', '-p', 'packages/tinyapp-exam', '--noEmit'],
      ['bun', 'install', '--frozen-lockfile'],
      ['grep', '-q', 'Locator', 'packages/tinyapp-exam/src/index.ts'],
    ]) {
      const ran = runFromRoot(argv);
      if (ran.code !== 0) {
        console.log(`${argv.join(' ')} exited ${ran.code}:\n${ran.output}`);
      }
      expect([argv.join(' '), ran.code]).toEqual([argv.join(' '), 0]);
    }
  },
  120000,
);
