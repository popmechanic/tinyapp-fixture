# The click is the proof — a state exam drives a real interaction in the sandbox's own Chromium and reads the store, the DOM and the picture from that page

**Grammar:** claims-v1

**Claim:** When I read a task's evidence, I can see that a real click in a real browser reached the state the task claimed, with the screenshot beside it, and that the exam would have gone red if it hadn't. (elicited)
**Summary:** This gives a state exam a browser: the interaction a claim is about happens as a real click or keystroke in a Chromium that already ships on the fleet's machines, and the same page yields the store, the DOM and the screenshot the evidence shows. It exists because the exam could only prove what a store callback reached, never that the checkbox is what calls it, and because the renderer it borrowed for the picture lived behind a proxy that cannot carry a browser session. After this run a task on a TinyApp is green or red on one exam that seeds the app, does the interaction, and checks the state and the screen, with no credential and no service in the loop.

**Goal:** #834 re-chartered on the operator's decisions of 2026-09-14 (recorded there): the browser-driven action runs in the sandbox's own `/headless-shell/headless-shell` (Chromium 151, on the exe.dev image) over the Chrome DevTools Protocol on loopback; the render move runs in that same page, so Cloudflare Browser Rendering and `TINYAPP_RENDER_URL` leave the exam path (the `browser-run` integration stays idle for other uses). Measured on an exe.dev VM the same night, raw CDP: launch 37–73 ms, seeded page 190–270 ms, click and store read 7–13 ms, DOM plus PNG 38–293 ms, 85 MB per browser, four exams at once on two cores in 0.72 s. The plugin-side authoring rule (`skills/ultrawrite/references/greenfield-stack.md` §State exams) learns the action shape in a plugin plan after this one lands.
**Closes:** #834

**Tech Stack:** Bun 1.x + TypeScript (`packages/tinyapp-exam`, the workspace helper; `client/`, the fixture TinyApp; `tests/state-exams/`, its exams). Test command: `bun test` from the repo root; `bun run typecheck` is the type gate.
**Exam command:** bun test {paths}

**Spec:** `2026-09-09-tinyapp-state-exams` (on the plugin laptop, untracked; its §3.2 three moves, §3.4 contract, §3.6 evidence keys are restated in each Context below), #834's 2026-09-14 comment (Shelley's measurement and the decision), the CDP probe on `fleet-counsel` (its sequence is in Task 1's Context).

**Parallelization rationale:** three waves, width 2, 1, 1. Tasks 1 (the CDP driver) and 3 (the fixture exposing its seeded store) are independent and open the run together. Task 2 rewires the exam's three moves onto the driver and `Consumes:` its five symbols, so the compiler places it after Task 1 — justified, since Task 2's end-to-end leg runs the real driver against the fixture page (Task 1's runtime), and it reads the store through the page global Task 3 lands (a shared literal in both Contexts). Task 4 writes the two exams the plan's Claim is read on and `Consumes:` Task 2's action form and Task 3's global; it is last because its proof runs the seeded fixture page through the finished exam, which no literal can promise.

## Global Constraints

- The exam never dials a network: the page is opened from a `data:` URL, every request the page makes is blocked in the browser before it leaves, and the helper's own connection is a loopback WebSocket to a process it spawned.
- Check: bun run typecheck
- A missing browser binary is a red exam that names the path, never a skip: with no browser there is no proof, on the fleet the binary is on the image, and on a laptop `TINYAPP_BROWSER` names one.
- The determinism contract holds in the browser as it does in the store: the page's clock is pinned to the exam's `clock` before the app runs, the store move runs twice on two fresh pages and must agree byte for byte, and the mutant must still kill.
- The evidence keys the engine already reads keep their names: `store-diff.json`, `dom.html`, `screenshot.png`, `mutant.json`, `contract.json`, `walls.json`; `walls.json` may gain keys and loses none.

### Task 1: A CDP driver for the sandbox's Chromium — launch, seed a page, act, read, snapshot

**Type:** implementation
**Review:** peer

**Files:**
- Create: `packages/tinyapp-exam/src/browser.ts`
- Modify: `packages/tinyapp-exam/src/index.ts`
- Test: `packages/tinyapp-exam/test/browser.test.ts`

**Claim:** After this run, the exam helper can open a page in the machine's own Chromium, click or type in it, read a value out of it, and hand back its markup and a picture, with no network. (derived)
Machine: M1. `launchBrowser({binary?, env?})` spawns `binary` (default `env.TINYAPP_BROWSER`, else `/headless-shell/headless-shell`) with `--headless`, `--remote-debugging-port=0`, a fresh `--user-data-dir` under `os.tmpdir()`, `--disable-gpu` and `--hide-scrollbars`, reads the `DevTools listening on ws://…` line off its stderr, connects with the global `WebSocket`, and resolves a `Browser` (its `argv` the arguments it spawned with) whose `close()` ends the process and removes the directory; a `binary` that does not exist rejects with a message beginning `browser: ` naming the path, and no process is left. M2. `browser.open({html, clock})` creates a target, attaches to it flat, blocks every network request of the page (`Network.setBlockedURLs` with `["*"]` after `Network.enable`), installs a script on new documents that pins `Date.now` and `new Date()` to `clock`, navigates to `data:text/html;base64,` of `html`, waits for the load event, and resolves a `Page`; a page whose script calls `fetch` or opens a `WebSocket` sees it fail, and `Date.now()` evaluated in the page equals `Date.parse(clock)`. M3. `page.act(action)` performs one of `{click: selector}` (mouse pressed and released at the centre of the element's content box, from `DOM.getBoxModel`), `{type: [selector, text]}` (focus the element, then `Input.insertText`), `{key: [selector, key]}` (focus, then `Input.dispatchKeyEvent` `keyDown` and `keyUp` for `key`, with `Enter` carrying `\r` as text and code `Enter`); a selector matching nothing rejects with `act: no element matches <selector>`. M4. `page.evaluate(expression)` resolves the JSON value of `expression` evaluated in the page (`Runtime.evaluate` with `returnByValue`, `awaitPromise`); `page.snapshot()` resolves `{dom, screenshot}` — `dom` the document's outer HTML after the `REFLECT_CHECKED` script has run in the page, `screenshot` PNG bytes — and `page.close()` detaches and closes the target. M5. `index.ts` exports `launchBrowser`, and the sealed package still exports every name it exported at BASE.

**Authorized-by:** #834 (2026-09-14 comment: Shelley's measurement, the decision); the CDP probe on `fleet-counsel` 2026-09-14 (`/tmp/cdp-pipe.mjs`, numbers in the Goal); operator decisions 2026-09-14 (local Chromium; local render).

**Interfaces:**
- Consumes: none
- Produces: `launchBrowser(opts?: {binary?: string; env?: Record<string, string | undefined>}) => Promise<Browser>`
- Produces: `Browser.open(opts: {html: string; clock: string}) => Promise<Page>`
- Produces: `Page.act(action: Action) => Promise<void>` — `Action = {click: string} | {type: [string, string]} | {key: [string, string]}`
- Produces: `Page.evaluate(expression: string) => Promise<unknown>`
- Produces: `Page.snapshot() => Promise<{dom: string; screenshot: Uint8Array}>`

**Context:** At BASE (`1f8e0a65`) the helper has no browser code; `render-move.ts` POSTs HTML to a remote renderer and injects `REFLECT_CHECKED` (exported there — import it, do not copy it) to copy each input's `checked` property onto `data-checked`, which `assertView` reads. Bun is the runtime: `Bun.spawn(argv, {stdout: 'ignore', stderr: 'pipe'})`, read stderr as a stream until the `DevTools listening on (ws:\S+)` line (it arrives within ~100 ms; wait at most 15 s, then reject with `browser: no devtools line`), and connect with Bun's global `WebSocket` (no library; Bun cannot hand a child extra pipes, so the port form is the one to use, and `--remote-debugging-port=0` picks a free loopback port). The protocol is JSON messages `{id, method, params, sessionId?}` and replies `{id, result|error}`; keep a map of pending ids. The measured sequence, in order: `Target.createTarget {url: "about:blank"}` → `Target.attachToTarget {targetId, flatten: true}` → with that `sessionId`: `Network.enable`, `Network.setBlockedURLs {urls: ["*"]}`, `Page.enable`, `Page.addScriptToEvaluateOnNewDocument {source: <clock pin>}`, `Page.navigate {url: "data:text/html;base64,…"}`, then await the `Page.loadEventFired` event; click: `DOM.getDocument` → `DOM.querySelector {nodeId: root, selector}` → `DOM.getBoxModel {nodeId}` (`content` is eight numbers, x1 y1 x2 y2 x3 y3 x4 y4; centre is `((x1+x3)/2, (y1+y3)/2)`) → `Input.dispatchMouseEvent {type: "mousePressed", x, y, button: "left", clickCount: 1}` then `mouseReleased`; focus for type/key: `DOM.focus {nodeId}`; text: `Input.insertText {text}`; key: `Input.dispatchKeyEvent {type: "keyDown", key, code, text?}` then `keyUp`; read: `Runtime.evaluate {expression, returnByValue: true, awaitPromise: true}` → `result.result.value`; snapshot: `Runtime.evaluate` of `REFLECT_CHECKED` first, then `DOM.getOuterHTML {nodeId: root}` and `Page.captureScreenshot {format: "png"}` (base64 → bytes); close: `Target.closeTarget`. The clock pin script: `const t = <ms>; const D = Date; globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [t])); } static now() { return t; } }`. On the fleet image the default sandbox mode launched fine (measured), so pass no `--no-sandbox`; make it opt-in through `env.TINYAPP_BROWSER_ARGS` (space-separated extra flags) for a laptop that needs it. Fonts: `client/index.html` links Google Fonts; with every request blocked the page falls back to sans-serif, which is the deterministic choice — say so in a comment. The exam for this task is a Bun test that launches the real binary when it exists (`TINYAPP_BROWSER` or the image path) against a small inline HTML — a checkbox whose click flips a `window.__X` flag and adds a class, an input whose Enter appends a row — and asserts the legs; when no binary exists on the machine the test prints one line saying so and asserts only M1's missing-binary rejection and M5's exports, so the suite is green on a laptop without Chromium and full on the fleet.

**Proof:**
- Test: `packages/tinyapp-exam/test/browser.test.ts`
- Guard: `packages/tinyapp-exam/test/browser.test.ts`
- Run: bun test packages/tinyapp-exam/test/browser.test.ts
- Legs: (a) `launchBrowser({binary: '/nonexistent/chrome'})` rejects with a message starting `browser: ` that contains `/nonexistent/chrome`, and no process named `nonexistent` survives it; with the real binary present, `launchBrowser({env: {TINYAPP_BROWSER: <its path>}})` resolves, its `argv` carries `--headless`, `--remote-debugging-port=0`, `--disable-gpu`, `--hide-scrollbars` and a `--user-data-dir=` under `os.tmpdir()` that exists while open, and `close()` leaves no `headless-shell` child of the test process and that directory gone; with `env: {}` and no `binary` the `argv[0]` is `/headless-shell/headless-shell` [M1]; (b) with the real binary, `open({html, clock: '2026-01-01T00:00:00Z'})` on a page whose inline script calls `fetch('https://example.invalid/x')` and records its rejection, constructs `new WebSocket('ws://example.invalid/')` and records its `error` event, and reads `Date.now()` into `window.__NOW` and `new Date().getTime()` into `window.__NEW`: `evaluate('window.__FETCH_FAILED')` is `true`, `evaluate('window.__WS_FAILED')` is `true`, both `evaluate('window.__NOW')` and `evaluate('window.__NEW')` equal `Date.parse(clock)`, and the page loaded (`evaluate('document.readyState')` is `complete`) [M2]; (c) on the inline checkbox page `act({click: '#c'})` makes `evaluate('window.__X')` `true` and the `li` gain class `done`; `act({type: ['#i', 'buy milk']})` then `act({key: ['#i', 'Enter']})` makes `evaluate('window.__ROWS')` equal `['buy milk']`; `act({click: '#nope'})` rejects with `act: no element matches #nope` [M3]; (d) after the click, `snapshot().dom` contains `data-checked="true"` on `#c` and `snapshot().screenshot` starts with the PNG signature bytes `89 50 4E 47`; `page.close()` then `evaluate` rejects [M4]; (e) `import('tinyapp-exam')` has `launchBrowser` and still every export named in the sealed package's manifest leg of `state-exam.test.ts` (read that list, do not restate it) [M5]; the `Run:` line runs this exam with bun's own exit code.

**Stale-if:**
- path-absent: `packages/tinyapp-exam/src/render-move.ts`
- path-absent: `packages/tinyapp-exam/src/index.ts`

### Task 2: The exam's action may be an interaction, and every move reads from the one page it opened

**Type:** implementation
**Review:** peer

**Files:**
- Modify: `packages/tinyapp-exam/src/types.ts`
- Modify: `packages/tinyapp-exam/src/state-exam.ts`
- Modify: `packages/tinyapp-exam/src/render-move.ts`
- Modify: `packages/tinyapp-exam/src/store-move.ts`
- Modify: `packages/tinyapp-exam/test/state-exam.test.ts`
- Modify: `packages/tinyapp-exam/test/render-move.test.ts`
- Test: `packages/tinyapp-exam/test/browser-exam.test.ts`

**Claim:** After this run, a state exam whose action is a click or a keystroke proves what that interaction reached in the app, and the picture and markup on the evidence are of the very page it happened in. (derived)
Machine: M1. `StateExamSpec.action` is either the store callback it is at BASE or an `Action` (`{click}`, `{type}`, `{key}`) or an array of `Action`s performed in order; with an `Action`, the store move opens the page `renderHtml` builds for the entry with `seed` as its seed (the seed global set to `seed`'s content, the module script inlined with no `src`), performs the action, and takes `content` as `JSON.parse(await page.evaluate('JSON.stringify(window.__TINYAPP_STORE__.getContent())'))`; it does this twice on two fresh pages and rejects `nondeterministic store:` when the two contents differ, exactly as the callback form does. M2. With an `Action`, the render move is the same page: after the action, `snapshot()` supplies `dom` and `screenshot`, `assertView` reads `dom`, and no second page is opened; with a callback action and an `entry`, the render move opens one page seeded from the post-action content and snapshots it — the renderer is the local browser in both forms, and the string `TINYAPP_RENDER_URL` no longer occurs in `packages/tinyapp-exam/src`. M3. The render move runs whenever the spec names an `entry`, run directory or not (a laptop run writes under `os.tmpdir()` as at BASE); with no `entry` it is `skipped` and recorded so. M4. `walls.json` carries `action_ms` (the wall of the interaction alone, `null` for a callback action) and `browser: 'ran' | 'skipped'` beside its BASE keys; `contract.json` gains `pinned_in_page: true | false`. M5. A missing browser binary with an `Action`, or with an `entry`, fails the exam with the `browser: ` line and writes the evidence files as for any red; the mutant move is unchanged. M6. `render-move.test.ts` and `state-exam.test.ts` pass on the patched tree, and neither contains the string `TINYAPP_RENDER_URL` or the string `fetchImpl`.

**Authorized-by:** #834 (re-chartered 2026-09-14); the spec's §3.2 three moves and §3.4 contract; operator decision 2026-09-14 (render local for both, Cloudflare retired from the exam path).

**Interfaces:**
- Consumes: `launchBrowser(opts?: {binary?: string; env?: Record<string, string | undefined>}) => Promise<Browser>`
- Consumes: `Browser.open(opts: {html: string; clock: string}) => Promise<Page>`
- Consumes: `Page.act(action: Action) => Promise<void>`
- Consumes: `Page.evaluate(expression: string) => Promise<unknown>`
- Consumes: `Page.snapshot() => Promise<{dom: string; screenshot: Uint8Array}>`
- Produces: `StateExamSpec.action: ((store: S) => void | Promise<void>) | Action | Action[]`
- Produces: `walls.action_ms: number | null` and `walls.browser: 'ran' | 'skipped'` in `walls.json`

**Context:** At BASE (`1f8e0a65`) `state-exam.ts`'s `runMoves` calls `storeMove(spec)` (store-move.ts ~140: load seed into `spec.store()`, run the callback under `withContract`, `getContent()`, twice), then `renderMove({entry, content, view, env, fetchImpl})` (render-move.ts ~238: skipped when `TINYAPP_RENDER_URL` or `ULTRA_RUN_DIR` is unset, else `bundleOf` + `renderHtml` + POST to `<base>/snapshot` with `addScriptTag: [{content: REFLECT_CHECKED}]`), then the mutant. Keep `renderHtml`, `bundleOf`, `assertView`, `REFLECT_CHECKED` and the evidence writer; replace the POST with the driver: `const browser = await launchBrowser({env})`, `const page = await browser.open({html: renderHtml(entryHtml, {js, css, seed}), clock: spec.clock})`, then `snapshot()`; `fetchImpl` goes away with the endpoint. The driver's signature is Task 1's shared literal (the five `Consumes:` above); the page global the store read uses is Task 3's shared literal: `window.__TINYAPP_STORE__`, an object with `getContent()` returning the `[tables, values]` pair, set by the fixture's store when the page is seeded. With an `Action`, the store move becomes `browserStoreMove(spec, browser)`: bundle once, open a page seeded from `readSnapshot(spec.seed)`, `await page.act(spec.action)`, read the content, snapshot, close; open a second page and repeat the act and the read for the determinism check (the snapshot is taken from the first page). `withContract` stays for the callback form only — the browser form's contract is the page's blocked network and pinned clock (Task 1's M2), which is why `contract.json` says `pinned_in_page: true`. Discriminate the two action forms with `typeof spec.action === 'function'`. The browser is launched once per exam and closed in a `finally`; a launch that rejects (`browser: …`) is the exam's `failure` and the record is still written, as any thrown move is today. `types.ts` gains `Action`, and `ExamRecord.walls` gains `action_ms` and `browser`. The tests: `render-move.test.ts` legs (d), (e), (f) at ~275–330 pin the `TINYAPP_RENDER_URL`/`ULTRA_RUN_DIR` skip rule and legs at ~334–470 stub `fetchImpl` — re-aim the skip legs to "no `entry` → skipped" and the endpoint legs to a fake `Browser` object (a `{open: async () => page}` with a canned `snapshot()` answering the fixture DOM and PNG bytes already in the file), passing the browser in through a new `browser?: Browser` option so no test needs Chromium; `state-exam.test.ts` leg (a) at ~204 expects `render: 'skipped'` with no run directory — that leg becomes "no entry → skipped"; leg (g) at ~480 lists the sealed package's exports and grows by Task 1's names (Task 1 lists the same file; the fold joins the two edits). The exam for this task runs the real browser when present (like Task 1's) on the fixture app's real bundle: it needs the fixture's seeded page to expose `window.__TINYAPP_STORE__` — Task 3's work, landing in the same wave, which is why the exam's browser legs read the store through the shared literal and, when the global is absent on the tree, fail with the message the exam names rather than pass.

**Proof:**
- Test: `packages/tinyapp-exam/test/browser-exam.test.ts`
- Guard: `packages/tinyapp-exam/test/browser-exam.test.ts`
- Run: bun test packages/tinyapp-exam/test/render-move.test.ts packages/tinyapp-exam/test/state-exam.test.ts
- Run: test "$(grep -rc 'TINYAPP_RENDER_URL' packages/tinyapp-exam/src | awk -F: '{s+=$2} END {print s}')" = 0
- Run: test "$(grep -c -e 'TINYAPP_RENDER_URL' -e 'fetchImpl' packages/tinyapp-exam/test/render-move.test.ts packages/tinyapp-exam/test/state-exam.test.ts | awk -F: '{s+=$2} END {print s}')" = 0
- Legs: (a) with a fake `Browser` whose `open` records the html and `clock` it was handed and whose `Page` records each `act` and answers `evaluate` with a canned content: `runStateExam` on a spec with `action: {click: '#c'}` opens two pages whose html each carries `window.__TINYAPP_SEED__ = ` followed by `seed`'s content and no `<script` with a `src=` attribute, acts once on each, and its `storeDiff` is the diff of the canned content against `expected`; with `action: {type: ['#i', 'buy milk']}` the fake's page records exactly that `type` act, with `action: {key: ['#i', 'Enter']}` exactly that `key` act, and with `action: [{type: […]}, {key: […]}]` both, in that order, on each of the two pages; with the fake's second page answering a different content the outcome's `failure` starts `nondeterministic store:` [M1]; (b) in the same run exactly one `snapshot()` was taken, on the first page, `record.dom` is that snapshot's `dom`, the view failures are `assertView` of it, and the fake's `open` was called exactly twice; with a callback action and an `entry`, `open` is called once with html whose seed is the post-action content and `snapshot()` once; and the grep by the second `Run:` line is zero [M2]; (c) with a callback action and no `entry`, `walls.render` is `skipped` and the fake `open` is never called; with `ULTRA_RUN_DIR` unset and an `entry`, `open` is called and the evidence lands under `os.tmpdir()` [M3]; (d) `walls.json` on the tree after leg (a) carries `action_ms` as a number and `browser: 'ran'`, after leg (c)'s first run `action_ms: null` and `browser: 'skipped'`; `contract.json` carries `pinned_in_page: true` for the click spec and `false` for the callback spec [M4]; (e) with `launchBrowser` made to reject `browser: /nonexistent/chrome` (via `TINYAPP_BROWSER` in `opts.env`) and an `Action`, the outcome is not ok, `failure` starts `browser: `, and the six evidence files exist; the same with a callback action and an `entry`: not ok, `failure` starts `browser: `, the six files exist; the mutant on a green click spec is still `killed: true` [M5]; (f) the two survivor test files by the first `Run:` line and the zero count over them by the third, and when the real binary is present one end-to-end leg on the fixture's own `client/index.html` with `action: {click: '.todoItem input[type=checkbox]'}` from `state-exams/seeds/two-open-todos.json`: `content` read through `window.__TINYAPP_STORE__` has one todo `completed: true`, and the failure when that global is absent names `__TINYAPP_STORE__` [M1, M6].

**Stale-if:**
- path-absent: `packages/tinyapp-exam/src/state-exam.ts`
- path-absent: `packages/tinyapp-exam/test/render-move.test.ts`

### Task 3: A seeded fixture page exposes its store to the exam

**Type:** implementation

**Files:**
- Modify: `client/src/Store.tsx`
- Modify: `client/src/storeData.ts`
- Modify: `client/test/seeded-store.test.ts`
- Modify: `AGENTS.md`
- Test: `client/test/seeded-store-global.test.ts`

**Claim:** After this run, a page opened on a seed lets the exam read the app's store back exactly as the app holds it, and a normal page exposes nothing. (derived)
Machine: M1. When `window.__TINYAPP_SEED__` is present at store creation, the store is also set on `window.__TINYAPP_STORE__`, and `window.__TINYAPP_STORE__.getContent()` returns the same `[tables, values]` pair as the store's own `getContent()` after any callback has run. M2. When `window.__TINYAPP_SEED__` is absent, `window.__TINYAPP_STORE__` is not defined. M3. The seeded page still starts neither the persister nor the synchronizer (the BASE rule of `client/test/seeded-store.test.ts`, kept). M4. `AGENTS.md` says, in its Key Files section, that a seeded page sets `window.__TINYAPP_STORE__` for exams and that a normal page does not.

**Authorized-by:** #834 (re-chartered 2026-09-14); the spec §3.2 seed convention ("a TinyApp's store module checks `window.__TINYAPP_SEED__` at creation").

**Interfaces:**
- Consumes: none
- Produces: `window.__TINYAPP_STORE__` — the seeded page's `TodosStore`, with `getContent(): [tables, values]`

**Context:** At BASE (`1f8e0a65`) `client/src/storeData.ts` has `readSeed()` (~75) reading `window.__TINYAPP_SEED__` and `createTodosStore(seed?)` (~26); `client/src/Store.tsx` reads the seed once at mount (`useState(readSeed)`) and renders `SeededStore` (no persister, no synchronizer) or `StoreLinks`. Put the global's assignment in `createTodosStore` when it is handed a seed, or in `Store`'s seeded branch — one place, guarded on `typeof window !== 'undefined'`, typed through a small `declare global` in `storeData.ts`. The shared literal Tasks 2 and 4 read: `window.__TINYAPP_STORE__.getContent()` answers the store's `[tables, values]`. `client/test/seeded-store.test.ts` pins the seed branch with a stubbed `WebSocket` that must never be constructed (spec §4.2 (l)); extend it, or the new file, under `@happy-dom/global-registrator` as that file does. `AGENTS.md`'s Key Files section (~lines 24–33) is where the sentence goes.

**Proof:**
- Test: `client/test/seeded-store-global.test.ts`
- Guard: `client/test/seeded-store-global.test.ts`
- Run: bun test client/test/seeded-store.test.ts
- Run: sed -n '/^## Key Files/,/^## Working Method/p' AGENTS.md | tr '\n' ' ' | grep -q '__TINYAPP_STORE__.*normal page'
- Legs: (a) with `window.__TINYAPP_SEED__` set to `state-exams/seeds/two-open-todos.json`'s content and the store created as the page creates it, `window.__TINYAPP_STORE__` is defined, its `getContent()` deep-equals the seed, and after `setTodoCompleted(store, <first id>, true)` on the app's store it deep-equals the store's own `getContent()` with that todo completed [M1]; (b) with `window.__TINYAPP_SEED__` deleted and a fresh store created, `window.__TINYAPP_STORE__` is `undefined` [M2]; (c) the BASE seeded-store test by the first `Run:` line, and in the new exam, with `WebSocket` stubbed to record construction and the `getDb` export of `client/src/sqlite` mocked to record calls, rendering the seeded `Store` constructs no `WebSocket` and calls `getDb` zero times, while rendering the unseeded `Store` calls `getDb` at least once [M3]; (d) the `AGENTS.md` sentence by the second `Run:` line [M4].

**Stale-if:**
- path-absent: `client/src/storeData.ts`
- path-absent: `client/test/seeded-store.test.ts`

### Task 4: Two exams whose action is the interaction — the checkbox completes the todo, Enter submits the input

**Type:** implementation
**Review:** peer

**Files:**
- Create: `tests/state-exams/click-completes-todo.test.ts`
- Create: `tests/state-exams/enter-submits-todo.test.ts`
- Create: `state-exams/expected/one-open-todo-typed.json`
- Modify: `README.md`
- Test: `tests/state-exams/interaction-evidence.test.ts`

**Claim:** When I read a task's evidence, I can see that a real click in a real browser reached the state the task claimed, with the screenshot beside it, and that the exam would have gone red if it hadn't. (derived)
Machine: M1. `tests/state-exams/click-completes-todo.test.ts` is a `stateExam` with `seed` `state-exams/seeds/two-open-todos.json`, `action: {click: '.todoItem input[type=checkbox]'}`, `expected` `state-exams/expected/two-todos-one-done.json`, a `view` that the first `.todoItem input[type=checkbox]` is `checked`, and a `mutant` that sets that todo's `completed` back to `false`; it passes on the tree. M2. `tests/state-exams/enter-submits-todo.test.ts` is a `stateExam` with `seed` `state-exams/seeds/empty.json`, two actions in order — `{type: ['input[placeholder="What needs to be done?"]', 'buy milk']}` then `{key: ['input[placeholder="What needs to be done?"]', 'Enter']}` — `expected` `state-exams/expected/one-open-todo-typed.json` (one open todo whose `text` is `buy milk`, in the row id the app assigns), a `view` of one `.todoItem` with text `buy milk`, and a `mutant` that empties its `text`; it passes on the tree. M3. After `bun test tests/state-exams/click-completes-todo.test.ts` with `ULTRA_RUN_DIR` set to a fresh directory, that directory holds `state-exams/task-none/click-completes-todo-none/` with all six evidence files, `walls.json` reading `browser: "ran"` with a numeric `action_ms`, `mutant.json` reading `killed: true`, `dom.html` containing `data-checked="true"`, and `screenshot.png` beginning with the PNG signature. M4. `README.md` has a section titled `State exams` carrying, in this order, the words `click`, `type`, `key`, `Chromium`, `TINYAPP_BROWSER`, `store diff`, `DOM` and `screenshot`.

**Authorized-by:** the plan's Claim (elicited 2026-09-14); #834; the spec §4.3's first run (the "buy milk" claim, now made by the interaction).

**Interfaces:**
- Consumes: `StateExamSpec.action: ((store: S) => void | Promise<void>) | Action | Action[]`
- Consumes: `window.__TINYAPP_STORE__` — the seeded page's `TodosStore`, with `getContent(): [tables, values]`
- Produces: none

**Context:** The two exams are written in the shape of `tests/state-exams/buy-milk.test.ts` at BASE (`stateExam({clock, entry: 'client/index.html', seed, store: () => createTodosStore(), action, expected, view, mutant})`) with `action` the interaction form Task 2 adds — one `Action`, or an array of them performed in order, which is what M2's Enter exam uses: `action: [{type: [...]}, {key: [...]}]`. The selectors: `client/src/TodoItem.tsx` renders `<div className="todoItem">` with an `<input type="checkbox">` whose `onChange` calls `setTodoCompleted`; `client/src/TodoInput.tsx` renders the input with `placeholder="What needs to be done?"` and submits on Enter through `addTodo`. The row id the app assigns on `addTodo` is the store's own (read `client/src/storeData.ts` `addTodo`, ~44, and put that id in `one-open-todo-typed.json`; `one-open-todo.json` at BASE uses row `0`). The evidence directory rule is the helper's `evidenceDir`: `<ULTRA_RUN_DIR>/state-exams/task-<ULTRA_TASK|none>/<stem>-<ULTRA_EXAM_PASS|none>`. The exam for this task, `interaction-evidence.test.ts`, runs the two exam files as child `bun test` processes with `ULTRA_RUN_DIR` pointed at a fresh temp directory and reads the evidence back, so it never imports them (the suite collects both anyway).

**Proof:**
- Test: `tests/state-exams/interaction-evidence.test.ts`
- Guard: `tests/state-exams/interaction-evidence.test.ts`
- Run: bun test tests/state-exams/click-completes-todo.test.ts tests/state-exams/enter-submits-todo.test.ts
- Run: sed -n '/^## State exams/,/^## /p' README.md | tr '\n' ' ' | grep -q 'click.*type.*key.*Chromium.*TINYAPP_BROWSER.*store diff.*DOM.*screenshot'
- Legs: (a) the click exam passes by the first `Run:` line, and its file, read as text, names `two-open-todos.json`, `click: '.todoItem input[type=checkbox]'`, `two-todos-one-done.json`, a `view` entry with that selector and `checked: true`, and a mutant on cell `completed` with `value: false` [M1]; (b) the Enter exam passes by the first `Run:` line, and its file, read as text, names `empty.json`, a `type` entry and a `key` entry both on `input[placeholder="What needs to be done?"]` with the `type` first, `one-open-todo-typed.json`, a `view` entry on `.todoItem` with `count: 1` and `text: 'buy milk'`, and a mutant on cell `text` with `value: ''`; and `one-open-todo-typed.json` holds exactly one row, with `text` `buy milk` and `completed` `false` [M2]; (c) run as a child process with `ULTRA_RUN_DIR` set to a fresh directory, the click exam leaves `state-exams/task-none/click-completes-todo-none/` holding exactly the six files, `walls.json` with `browser` `ran` and numeric `action_ms`, `mutant.json` with `killed` `true`, `dom.html` containing `data-checked="true"`, `screenshot.png` starting `89 50 4E 47`; and the same exam run with the expected file swapped for `still-empty.json` exits non-zero with `store move: expected state not reached` in its output — the red the Claim requires [M3]; (d) the README section by the second `Run:` line [M4].

**Stale-if:**
- path-absent: `tests/state-exams/buy-milk.test.ts`
- path-absent: `state-exams/seeds/two-open-todos.json`
