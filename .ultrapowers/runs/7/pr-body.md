This finishes what run-6 started: the driver is on main, and this run rewires the exam onto it, exposes the seeded store to the page, and writes the two exams whose evidence is the click, the state and the screenshot. It exists because run-6 parked on two defects in its plan — a missing edge the new scheduler exposed, and a browser ceiling the unminified bundle hit — and both are carried in here as rules. After this run a task on a TinyApp is green or red on one exam that seeds the app, does the interaction, and checks the state and the screen.

**Parked:** parked: gate verdict BLOCKED

> When I read a task's evidence, I can see that a real click in a real browser reached the state the task claimed, with the screenshot beside it, and that the exam would have gone red if it hadn't.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | After this run, a page opened on a seed lets the exam read the app's store back exactly as the app holds it, and a normal page exposes nothing. | red at BASE → green | — | — | — |
| 2 | After this run, a state exam whose action is a click or a keystroke proves what that interaction reached in the app, and the picture and markup on the evidence are of the very page it happened in. | red at BASE → green | — | killed | — |
| 3 | When I read a task's evidence, I can see that a real click in a real browser reached the state the task claimed, with the screenshot beside it, and that the exam would have gone red if it hadn't. | red at BASE, task failed | — | killed | — |

Residuals: 7 from review

<details><summary>Record</summary>

## fleet run-7 — parked

| | |
|---|---|
| verdict | `BLOCKED` |
| target | `popmechanic/tinyapp-fixture` at `213c000d354bfd2d5c2539432c7b4aa43f265e5a` |
| engine | `597c6db1493bdafaeb7f21972856a7e702847aa6` |
| plan | `.ultrapowers/plan.md` at `807ab6c1a23816c821418747f3a0bf2606f0c809` |
| branch | `ultra/integration-run-7` |
| vm | `fleet-r7-2609150635-ccb3` |

### Checks

```json
{"mode": "gate", "stamp": "run-7", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-7/report.json", "branch": "ultra/integration-run-7", "gateCheck": {"verdict": "BLOCKED", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": false, "detail": "failed/blocked tasks left declared deliverables unproduced: [{\"task\": \"3\", \"files\": [\"README.md\", \"state-exams/expected/one-open-todo-typed.json\", \"tests/state-exams/click-completes-todo.test.ts\", \"tests/state-exams/enter-submits-todo.test.ts\", \"tests/state-exams/interaction-evidence.test.ts\"]}]"}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 1, "suite": {"passed": true, "unattributed": [], "output": "ndles the entry, opens one page, photographs it once and reports the view [29.24ms]\n(pass) leg (g) [M4]: failures are assertView of the photographed dom [34.63ms]\n(pass) leg (h) [M5]: an open that rejects rejects the move, and nothing was photographed [27.46ms]\n(pass) leg (i) [M5]: a snapshot that rejects rejects the move, and the page is closed all the same [59.21ms]\n(pass) leg (j) [M6]: the tree manifests carry node-html-parser [0.29ms]\n(pass) leg (k) [M7]: the default bundle is minified and its page fits under the ceiling; unminified does not [149.84ms]\n(pass) task 1, leg (b) [M2]: the reflection writes each box once and then only on a change [67.57ms]\n(pass) task 1, leg (c) [M3]: no single quote anywhere in REFLECT_CHECKED [0.06ms]\n(pass) task 1, leg (d) [M3]: REFLECT_CHECKED reads inputs, writes data-checked and observes [0.03ms]\n(pass) task 1, leg (e) [M3]: the driver runs REFLECT_CHECKED in the page it photographs [0.15ms]\n(pass) task 1, leg (f) [M4]: the manifests carry @happy-dom/global-registrator for this package [0.15ms]\n\npackages/tinyapp-exam/test/browser-exam.test.ts:\n(pass) leg (a) [M1]: a click opens two pages seeded from `seed`, acts once on each, and reads the store through the page [5.32ms]\n(pass) leg (a) [M1]: the diff is of the content the page answered, against the expected file [2.88ms]\n(pass) leg (a) [M1]: a type action, a key action and an array of them are performed, in order, on each page [8.52ms]\n(pass) leg (a) [M1]: two pages that answer different contents are a nondeterministic store [3.57ms]\n(pass) leg (b) [M2]: with an action the render move is the first page \u2014 one snapshot, no third page [0.54ms]\n(pass) leg (b) [M2]: the view failures are `assertView` of the page that was acted on [5.20ms]\n(pass) leg (b) [M2]: a callback action with an entry opens one page, seeded from the post-action content [5.22ms]\n(pass) leg (b) [M2]: `TINYAPP_RENDER_URL` occurs nowhere under packages/tinyapp-exam/src [2.28ms]\n(pass) leg (c) [M3]: no entry means the render move is skipped and no page is ever opened [2.31ms]\n(pass) leg (c) [M3]: with an entry and no run directory the render still runs, under os.tmpdir() [0.24ms]\n(pass) leg (d) [M4]: walls.json carries action_ms and browser, and contract.json pinned_in_page [0.40ms]\n(pass) leg (d) [M4]: a callback action with no browser records action_ms null and browser skipped [0.21ms]\n(pass) leg (d) [M4]: a callback action rendered in a page still records action_ms null [5.59ms]\n(pass) leg (e) [M5]: a missing binary with an action is the `browser: ` line, with the evidence still written [0.49ms]\n(pass) leg (e) [M5]: a missing binary with a callback action and an entry is the same red [1.42ms]\n(pass) leg (e) [M5]: the mutant move is unchanged \u2014 a green click spec still kills its mutant [0.14ms]\n(pass) leg (f) [M6]: the two re-aimed test files pass, and neither names the endpoint or its stub [2785.59ms]\n(pass) leg (g) [M1] [M7]: a click on the fixture completes the todo, read through the page store, under the ceiling [1025.86ms]\n(pass) leg (g) [M7]: forced unminified, the url is over the ceiling and the exam says so rather than hanging [109.17ms]\n(pass) leg (g) [M7]: `open` refuses a data: url over the ceiling within 15 s, naming it [80.10ms]\n\npackages/tinyapp-exam/test/contract.test.ts:\n(pass) leg (h) [M5]: a clock that is not a non-empty string is refused before fn runs [0.36ms]\n(pass) leg (h) [M5]: a throwing fn rejects with its own message and the clock is restored [0.22ms]\n(pass) leg (i) [M5]: inside the contract the clock is pinned, and afterwards it is the real one again [0.26ms]\n(pass) leg (j) [M5][M6]: a fetch is a breach naming the url, and fetch plus the clock are restored [0.22ms]\n(pass) leg (k) [M5][M6]: a WebSocket is a breach naming the url, and WebSocket plus the clock are restored [0.18ms]\n(pass) leg (l) [M6]: after a green fn, fetch and WebSocket are the originals again [0.12ms]\n\n 146 pass\n 0 fail\n 717 expect() calls\nRan 146 tests across 16 files. [12.53s]\n"}, "verdict": "BLOCKED"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-7/.ultrapowers/runs/7/

- claude-version.txt
- engine.log
- events.jsonl
- gate-receipt.json
- kata.jsonl
- pr-body.md
- publish-fold
- receipt.json
- report.json
- residuals.jsonl
- state-exams
- status.json
- transcripts

### Plan

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-7/.ultrapowers/plan.md

### Residuals

- [ ] task 1 reviewer — unverified: the two happy-dom test files coexisting in one `bun test` process is not settled by the evidence given. `client/test/seeded-store-global.test.ts` (PATCH lines 111-122, 251-273) is written specifically for the case where it and `client/test/seeded-store.test.ts` share a Bun process — it registers a window only when none is registered, and its `afterAll` blanks `globalThis.happyDOM` so `GlobalRegistrator.unregister()` restores the globals without closing the window (so the already-bound `react-dom` scheduler keeps a live MessageChannel for the sibling file). Every piece of evidence supplied ran exactly one of the two files in isolation: EXAM EVIDENCE is `bun test client/test/seeded-store-global.test.ts` alone, RUN EVIDENCE is `bun test client/test/seeded-store.test.ts` alone. What would settle it: a single `bun test client/test` (or whole-suite) run showing both files green in one process. The legs this task establishes are all green, so this blocks nothing.
- [ ] task 1 reviewer — `client/test/seeded-store-global.test.ts` makes two process-wide mutations that outlive the file and are never undone: line 168 assigns `RecordingSocket` to `globalThis.WebSocket` permanently, and `afterAll` (lines 260-271) deliberately leaks a happy-dom window rather than closing it (the comment states this: "One leaked window for the rest of the test process is the price"). Both are justified in-file and needed for the sharing rule above, but both mean any later file in the same Bun process inherits a stubbed `WebSocket` and a stale window. The `happyDOM = undefined` trick also depends on an internal precondition of `GlobalRegistrator.unregister()` rather than a documented API, so it can break silently on a dependency bump. Consider restoring the original `globalThis.WebSocket` in `afterAll` (capture it before line 168) — that costs nothing and removes half the blast radius
- [ ] task 1 reviewer — the window leak is the part that genuinely has to stay.
- [ ] task 2 reviewer — Dead public option: `ExamOptions.unminified?: boolean` (packages/tinyapp-exam/src/state-exam.ts, the ExamOptions block) is declared and read once in `const minify = opts.minify ?? (opts.unminified === true ? false : undefined)` but nothing in the tree ever passes it — the exam's leg (g) forces the big page with `minify: false`, and no other caller exists. It is untested public API surface on the helper's options type, and a second spelling of a knob that already has one. The same package-boundary note applies to `READ_CONTENT`, which `index.ts` now re-exports although only `store-move.ts` uses it
- [ ] task 2 reviewer — `browserStoreMove`, `bundleOf` and `pageFor` at least have consumers (the exam and render-move.test.ts). Neither costs a criterion — the task's Context explicitly anticipates the export list growing — so this is advisory.
- [ ] task 2 reviewer — `bundleOf`'s single `minify` flag also switches `process.env.NODE_ENV` (packages/tinyapp-exam/src/render-move.ts, `const production = opts.minify ?? true` feeding both `minify:` and `define:`). The coupling is disclosed at length in the doc comment and is load-bearing twice over — a development React double-invokes `<StrictMode>`'s initialiser so `window.__TINYAPP_STORE__` would be a stale twin, and a merely-unminified production build (~1.96 M chars) would sit under the ceiling so leg (g)'s refusal could not be shown — so it is a lawful, correct divergence, not a defect. The residue is naming: a caller asking `bundleOf(entry, html, {minify: false})` for a readable bundle silently also gets a development build with different runtime semantics, and leg (k)'s `expect(minified.js.length).toBeLessThan(plain.js.length)` measures the two changes together while its comment reads 'the minification is bundleOf's doing'. Worth an option that says what it does (`{production?: boolean}`, with `minify` kept as an alias) or a one-line note at the call sites in state-exam.ts and store-move.ts.
- [ ] task 2 reviewer — packages/tinyapp-exam/test/render-move.test.ts leg (f) — 'a run directory is no longer a trigger — an entry renders with or without one' — loops `for (const _runDir of [runDir, ''])` over a variable it never uses, so both iterations are byte-identical calls to `renderMove({entry, content, clock, browser})`. The test's own comment concedes it ('the two halves differ only in an environment the move no longer reads at all'), but as written it names a distinction it cannot exercise: since `renderMove` no longer takes `env` and the test neither sets nor clears `ULTRA_RUN_DIR`, a re-added run-directory trigger reading `process.env` would not be reliably caught here. M3's criterion is not left unverified — state-exam.test.ts's new 'an entry with no run directory renders all the same, under the temp directory' leg and browser-exam.test.ts's leg (c) both run with `env: {}` and assert the page opened and the evidence landed under `os.tmpdir()` — so this is clarity only: drop the loop and keep the single call, or keep the loop and spawn with the environment actually varied.

</details>

Closes #834
