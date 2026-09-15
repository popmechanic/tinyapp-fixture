# The click is the proof, second half — the exam rewired onto the driver, the seeded store exposed, and the two interaction exams

**Grammar:** claims-v1

**Claim:** When I read a task's evidence, I can see that a real click in a real browser reached the state the task claimed, with the screenshot beside it, and that the exam would have gone red if it hadn't. (elicited)
**Summary:** This finishes what run-6 started: the driver is on main, and this run rewires the exam onto it, exposes the seeded store to the page, and writes the two exams whose evidence is the click, the state and the screenshot. It exists because run-6 parked on two defects in its plan — a missing edge the new scheduler exposed, and a browser ceiling the unminified bundle hit — and both are carried in here as rules. After this run a task on a TinyApp is green or red on one exam that seeds the app, does the interaction, and checks the state and the screen.

**Goal:** the three tasks run-6 (fixture, 2026-09-14, PR #7 merged by hand as `213c000d` with task 1) left unproduced, re-authored on its receipt: task 3's inverted AGENTS.md sentence is spelled out; task 2 now `Consumes:` the page global so it is dispatched after it lands (under the ready-set scheduler a shared literal is not an ordering); the `data:` URL ceiling (~2,097,152 characters, Chromium) is a rule, with `minify: true` and a readable rejection. #834's decisions stand (local Chromium for the click and the render; Cloudflare retired from the exam path).
**Closes:** #834

**Tech Stack:** Bun 1.x + TypeScript (`packages/tinyapp-exam`, the workspace helper; `client/`, the fixture TinyApp; `tests/state-exams/`, its exams). Test command: `bun test` from the repo root; `bun run typecheck` is the type gate.
**Exam command:** bun test {paths}

**Spec:** run-6's receipt (`ultra/evidence/run-6` on the fixture: `report.json` task notes and `judgmentCalls`), #834's 2026-09-14 comment, the state-exams spec `2026-09-09-tinyapp-state-exams` (§3.2, §3.4, §3.6 restated in each Context).

**Parallelization rationale:** two waves, width 1 then 1, then 1: Task 1 (the seeded store exposed) opens the run; Task 2 (the exam rewired) `Consumes:` its page global and the driver already on main, and its end-to-end leg runs the real fixture page, which is Task 1's runtime; Task 3 (the two exams) `Consumes:` Task 2's action form and Task 1's global and runs the finished exam. A chain of three by construction of the proofs, each link a runtime need run-6 measured.

## Global Constraints

- The exam never dials a network: the page is opened from a `data:` URL, every request the page makes is blocked in the browser before it leaves, and the helper's own connection is a loopback WebSocket to a process it spawned.
- Check: bun run typecheck
- A missing browser binary is a red exam that names the path, never a skip.
- The determinism contract holds in the browser as it does in the store: the page's clock is pinned before the app runs, the store move runs twice on two fresh pages and must agree byte for byte, and the mutant must still kill.
- The evidence keys the engine already reads keep their names: `store-diff.json`, `dom.html`, `screenshot.png`, `mutant.json`, `contract.json`, `walls.json`; `walls.json` may gain keys and loses none.
- `packages/tinyapp-exam/src/browser.ts` keeps its landed signatures (`launchBrowser`, `Browser.open/close/argv`, `Page.act/evaluate/snapshot/close`, `Action`); a ceiling check added to `open` is an addition, not a change.

### Task 1: A seeded fixture page exposes its store to the exam

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

**Context:** At BASE (`1f8e0a65`) `client/src/storeData.ts` has `readSeed()` (~75) reading `window.__TINYAPP_SEED__` and `createTodosStore(seed?)` (~26); `client/src/Store.tsx` reads the seed once at mount (`useState(readSeed)`) and renders `SeededStore` (no persister, no synchronizer) or `StoreLinks`. Put the global's assignment in `createTodosStore` when it is handed a seed, or in `Store`'s seeded branch — one place, guarded on `typeof window !== 'undefined'`, typed through a small `declare global` in `storeData.ts`. The shared literal Tasks 2 and 4 read: `window.__TINYAPP_STORE__.getContent()` answers the store's `[tables, values]`. `client/test/seeded-store.test.ts` pins the seed branch with a stubbed `WebSocket` that must never be constructed (spec §4.2 (l)); extend it, or the new file, under `@happy-dom/global-registrator` as that file does. `AGENTS.md`'s Key Files section (~lines 24–33) is where the sentence goes. **Run-6's task 3 failed on exactly this sentence:** it wrote that a *normal* page "starts neither the persister nor the synchronizer", which inverts the tree (the seeded page is the one that starts neither; a normal page starts both — `StoreLinks`). Write it as: "A seeded page (one opened with `window.__TINYAPP_SEED__` set) also sets `window.__TINYAPP_STORE__` so an exam can read the store; a normal page sets no such handle. The seeded page is the one that starts neither the persister nor the synchronizer." — and read `client/src/Store.tsx` before writing any sentence about which page starts what.

**Proof:**
- Test: `client/test/seeded-store-global.test.ts`
- Guard: `client/test/seeded-store-global.test.ts`
- Run: bun test client/test/seeded-store.test.ts
- Run: sed -n '/^## Key Files/,/^## Working Method/p' AGENTS.md | tr '\n' ' ' | grep -q '__TINYAPP_STORE__.*normal page'
- Legs: (a) with `window.__TINYAPP_SEED__` set to `state-exams/seeds/two-open-todos.json`'s content and the store created as the page creates it, `window.__TINYAPP_STORE__` is defined, its `getContent()` deep-equals the seed, and after `setTodoCompleted(store, <first id>, true)` on the app's store it deep-equals the store's own `getContent()` with that todo completed [M1]; (b) with `window.__TINYAPP_SEED__` deleted and a fresh store created, `window.__TINYAPP_STORE__` is `undefined` [M2]; (c) the BASE seeded-store test by the first `Run:` line, and in the new exam, with `WebSocket` stubbed to record construction and the `getDb` export of `client/src/sqlite` mocked to record calls, rendering the seeded `Store` constructs no `WebSocket` and calls `getDb` zero times, while rendering the unseeded `Store` calls `getDb` at least once [M3]; (d) the `AGENTS.md` sentence by the second `Run:` line [M4].

**Stale-if:**
- path-absent: `client/src/storeData.ts`
- path-absent: `client/test/seeded-store.test.ts`

### Task 2: The exam's action may be an interaction, and every move reads from the one page it opened

**Type:** implementation
**Review:** peer

**Files:**
- Modify: `packages/tinyapp-exam/src/types.ts`
- Modify: `packages/tinyapp-exam/src/browser.ts`
- Modify: `packages/tinyapp-exam/src/index.ts`
- Modify: `packages/tinyapp-exam/src/state-exam.ts`
- Modify: `packages/tinyapp-exam/src/render-move.ts`
- Modify: `packages/tinyapp-exam/src/store-move.ts`
- Modify: `packages/tinyapp-exam/test/state-exam.test.ts`
- Modify: `packages/tinyapp-exam/test/render-move.test.ts`
- Test: `packages/tinyapp-exam/test/browser-exam.test.ts`

**Claim:** After this run, a state exam whose action is a click or a keystroke proves what that interaction reached in the app, and the picture and markup on the evidence are of the very page it happened in. (derived)
Machine: M1. `StateExamSpec.action` is either the store callback it is at BASE or an `Action` (`{click}`, `{type}`, `{key}`) or an array of `Action`s performed in order; with an `Action`, the store move opens the page `renderHtml` builds for the entry with `seed` as its seed (the seed global set to `seed`'s content, the module script inlined with no `src`), performs the action, and takes `content` as `JSON.parse(await page.evaluate('JSON.stringify(window.__TINYAPP_STORE__.getContent())'))`; it does this twice on two fresh pages and rejects `nondeterministic store:` when the two contents differ, exactly as the callback form does. M2. With an `Action`, the render move is the same page: after the action, `snapshot()` supplies `dom` and `screenshot`, `assertView` reads `dom`, and no second page is opened; with a callback action and an `entry`, the render move opens one page seeded from the post-action content and snapshots it — the renderer is the local browser in both forms, and the string `TINYAPP_RENDER_URL` no longer occurs in `packages/tinyapp-exam/src`. M3. The render move runs whenever the spec names an `entry`, run directory or not (a laptop run writes under `os.tmpdir()` as at BASE); with no `entry` it is `skipped` and recorded so. M4. `walls.json` carries `action_ms` (the wall of the interaction alone, `null` for a callback action) and `browser: 'ran' | 'skipped'` beside its BASE keys; `contract.json` gains `pinned_in_page: true | false`. M5. A missing browser binary with an `Action`, or with an `entry`, fails the exam with the `browser: ` line and writes the evidence files as for any red; the mutant move is unchanged. M6. `render-move.test.ts` and `state-exam.test.ts` pass on the patched tree, and neither contains the string `TINYAPP_RENDER_URL` or the string `fetchImpl`. M7. `bundleOf` builds with `minify: true`, and the page's `data:` URL is under 2,000,000 characters for the fixture's entry.

**Authorized-by:** #834 (re-chartered 2026-09-14); the spec's §3.2 three moves and §3.4 contract; operator decision 2026-09-14 (render local for both, Cloudflare retired from the exam path).

**Interfaces:**
- Consumes: `launchBrowser(opts?: {binary?: string; env?: Record<string, string | undefined>}) => Promise<Browser>`
- Consumes: `Browser.open(opts: {html: string; clock: string}) => Promise<Page>`
- Consumes: `Page.act(action: Action) => Promise<void>`
- Consumes: `Page.evaluate(expression: string) => Promise<unknown>`
- Consumes: `Page.snapshot() => Promise<{dom: string; screenshot: Uint8Array}>`
- Consumes: `window.__TINYAPP_STORE__` — the seeded page's `TodosStore`, with `getContent(): [tables, values]`
- Produces: `StateExamSpec.action: ((store: S) => void | Promise<void>) | Action | Action[]`
- Produces: `walls.action_ms: number | null` and `walls.browser: 'ran' | 'skipped'` in `walls.json`

**Context:** At BASE (`213c000d`, run-6's task 1 merged) `state-exam.ts`'s `runMoves` calls `storeMove(spec)` (store-move.ts ~140: load seed into `spec.store()`, run the callback under `withContract`, `getContent()`, twice), then `renderMove({entry, content, view, env, fetchImpl})` (render-move.ts ~238: skipped when `TINYAPP_RENDER_URL` or `ULTRA_RUN_DIR` is unset, else `bundleOf` + `renderHtml` + POST to `<base>/snapshot` with `addScriptTag: [{content: REFLECT_CHECKED}]`), then the mutant. Keep `renderHtml`, `bundleOf`, `assertView`, `REFLECT_CHECKED` and the evidence writer; replace the POST with the driver: `const browser = await launchBrowser({env})`, `const page = await browser.open({html: renderHtml(entryHtml, {js, css, seed}), clock: spec.clock})`, then `snapshot()`; `fetchImpl` goes away with the endpoint. The driver is on main (`packages/tinyapp-exam/src/browser.ts`, the five `Consumes:` above); the page global the store read uses is this plan's Task 1's: `window.__TINYAPP_STORE__`, an object with `getContent()` returning the `[tables, values]` pair, set by the fixture's store when the page is seeded. With an `Action`, the store move becomes `browserStoreMove(spec, browser)`: bundle once, open a page seeded from `readSnapshot(spec.seed)`, `await page.act(spec.action)`, read the content, snapshot, close; open a second page and repeat the act and the read for the determinism check (the snapshot is taken from the first page). `withContract` stays for the callback form only — the browser form's contract is the page's blocked network and pinned clock (the driver's `open`), which is why `contract.json` says `pinned_in_page: true`. Discriminate the two action forms with `typeof spec.action === 'function'`. The browser is launched once per exam and closed in a `finally`; a launch that rejects (`browser: …`) is the exam's `failure` and the record is still written, as any thrown move is today. `types.ts` gains `Action`, and `ExamRecord.walls` gains `action_ms` and `browser`. The tests: `render-move.test.ts` legs (d), (e), (f) at ~275–330 pin the `TINYAPP_RENDER_URL`/`ULTRA_RUN_DIR` skip rule and legs at ~334–470 stub `fetchImpl` — re-aim the skip legs to "no `entry` → skipped" and the endpoint legs to a fake `Browser` object (a `{open: async () => page}` with a canned `snapshot()` answering the fixture DOM and PNG bytes already in the file), passing the browser in through a new `browser?: Browser` option so no test needs Chromium; `state-exam.test.ts` leg (a) at ~204 expects `render: 'skipped'` with no run directory — that leg becomes "no entry → skipped"; leg (g) at ~480 lists the sealed package's exports — check it against `index.ts` at BASE first: run-6's task 1 added `launchBrowser` to `index.ts`, so if that leg is red at BASE it is this task's to re-aim, and it grows again by whatever this task re-exports (`browserStoreMove` and its types, as run-6's task 2 did). The exam's end-to-end leg reads the store through `window.__TINYAPP_STORE__`, which this plan's Task 1 lands — hence the `Consumes:` edge: this task is dispatched on the head that already holds it (run-6's task 2 went red on exactly this seam when it was dispatched before its sibling folded). **Run-6's task 2 also found the browser's ceiling:** Chromium refuses to navigate a `data:` URL above ~2,097,152 characters, and it hangs rather than failing; the fixture's unminified bundle is ~1.94 MB, so `bundleOf` must build with `minify: true` (789 KB, ~1.06 M base64 characters; minification is deterministic, so the two-page byte-for-byte rule holds) and `open` must reject with a message naming the ceiling when the URL is over it, never wait on a load that will not come. The driver landed at `213c000d` with the five signatures above, `Browser.argv`, and `close()`; read `packages/tinyapp-exam/src/browser.ts` for `open`'s load wait before adding the ceiling check.

**Proof:**
- Test: `packages/tinyapp-exam/test/browser-exam.test.ts`
- Guard: `packages/tinyapp-exam/test/browser-exam.test.ts`
- Run: bun test packages/tinyapp-exam/test/render-move.test.ts packages/tinyapp-exam/test/state-exam.test.ts
- Run: test "$(grep -rc 'TINYAPP_RENDER_URL' packages/tinyapp-exam/src | awk -F: '{s+=$2} END {print s}')" = 0
- Run: test "$(grep -c -e 'TINYAPP_RENDER_URL' -e 'fetchImpl' packages/tinyapp-exam/test/render-move.test.ts packages/tinyapp-exam/test/state-exam.test.ts | awk -F: '{s+=$2} END {print s}')" = 0
- Legs: (a) with a fake `Browser` whose `open` records the html and `clock` it was handed and whose `Page` records each `act` and answers `evaluate` with a canned content: `runStateExam` on a spec with `action: {click: '#c'}` opens two pages whose html each carries `window.__TINYAPP_SEED__ = ` followed by `seed`'s content and no `<script` with a `src=` attribute, acts once on each, and its `storeDiff` is the diff of the canned content against `expected`; with `action: {type: ['#i', 'buy milk']}` the fake's page records exactly that `type` act, with `action: {key: ['#i', 'Enter']}` exactly that `key` act, and with `action: [{type: […]}, {key: […]}]` both, in that order, on each of the two pages; with the fake's second page answering a different content the outcome's `failure` starts `nondeterministic store:` [M1]; (b) in the same run exactly one `snapshot()` was taken, on the first page, `record.dom` is that snapshot's `dom`, the view failures are `assertView` of it, and the fake's `open` was called exactly twice; with a callback action and an `entry`, `open` is called once with html whose seed is the post-action content and `snapshot()` once; and the grep by the second `Run:` line is zero [M2]; (c) with a callback action and no `entry`, `walls.render` is `skipped` and the fake `open` is never called; with `ULTRA_RUN_DIR` unset and an `entry`, `open` is called and the evidence lands under `os.tmpdir()` [M3]; (d) `walls.json` on the tree after leg (a) carries `action_ms` as a number and `browser: 'ran'`, after leg (c)'s first run `action_ms: null` and `browser: 'skipped'`; `contract.json` carries `pinned_in_page: true` for the click spec and `false` for the callback spec [M4]; (e) with `launchBrowser` made to reject `browser: /nonexistent/chrome` (via `TINYAPP_BROWSER` in `opts.env`) and an `Action`, the outcome is not ok, `failure` starts `browser: `, and the six evidence files exist; the same with a callback action and an `entry`: not ok, `failure` starts `browser: `, the six files exist; the mutant on a green click spec is still `killed: true` [M5]; (f) the two survivor test files by the first `Run:` line and the zero count over them by the third [M6]; (g) with the real binary present, one end-to-end leg on the fixture's own `client/index.html` with `action: {click: '.todoItem input[type=checkbox]'}` from `state-exams/seeds/two-open-todos.json`: `content` read through `window.__TINYAPP_STORE__` has one todo `completed: true`, `walls.browser` is `ran`, and the recorded `data:` URL length is below 2,000,000 characters; the same run with `bundleOf` forced unminified (an option the test passes) shows a URL above that ceiling and the exam failing with a message naming the ceiling rather than hanging (`open` rejects within 15 s) [M1, M7].

**Stale-if:**
- path-absent: `packages/tinyapp-exam/src/state-exam.ts`
- path-absent: `packages/tinyapp-exam/test/render-move.test.ts`

### Task 3: Two exams whose action is the interaction — the checkbox completes the todo, Enter submits the input

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
