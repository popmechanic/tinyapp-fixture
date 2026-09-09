# The render branch of the state exam — the time it needs, and a reflection that settles

**Grammar:** claims-v1

**Claim:** A state exam that renders gets the time it needs, and the checkbox reflection settles instead of looping. (elicited)

**Goal:** The fix run for fixture run-3 (evidence tag `ultra/evidence/run-3`; ultrapowers #758,
map #525 The Verification Frontier). Target: `popmechanic/tinyapp-fixture` at BASE `a2135f15`
(the merged Plan A helper — `tinyapp-exam` with its six modules and their suite, the seed
convention, the two first-run exams; run-3 published nothing). On the render-ran branch of the
helper — both `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR` set — every state exam is red for two
reasons inside `packages/tinyapp-exam/src/`, both measured by run-3's workers against the live
renderer and both independent of any app: (1) `state-exam.ts` registers its bun test with no
timeout, so bun's 5000 ms default kills a healthy render move that costs 2–6 s (measured: the
registered test died at exactly 5000.81 ms; the identical call under `--timeout 120000` reached
the renderer); (2) `render-move.ts`'s `REFLECT_CHECKED` observes `{subtree, childList,
attributes}` and writes `data-checked` unconditionally from inside its own callback, so every
write re-triggers the observer, the bundled page never settles, and Cloudflare's `/snapshot`
answers 422 (code 6002, "A timeout was reached") after ~61 s. A guard that writes only when the
attribute differs made the same page render in 3.7 s with `data-checked` correct on both inputs.
This plan is that one task, since both edits are one seam — the render branch of the helper —
and nothing else in the fixture changes. Four choices were made in place of an operator
question, each the least machinery that keeps the helper's contract: (1) the timeout is a
per-registration option, `test(name, fn, {timeout: STATE_EXAM_TIMEOUT_MS})` with
`STATE_EXAM_TIMEOUT_MS = 120_000`, exported so an exam can read it — not a `bunfig.toml` or
`--timeout` change, because the helper owns its registration and the fixture's other tests keep
bun's default — verified against Bun's docs at authoring: `test(name, fn, {timeout})` is the
documented form, a per-test timeout overrides `bun test --timeout`, the documented `bunfig.toml`
`[test] timeout` key is silently ignored (oven-sh/bun#7789), and `setDefaultTimeout()` from
`bun:test` is file-scoped, so neither is a simpler mechanism for one library-registered test;
120 s is chosen so that a stalled renderer fails with the renderer's own error
(its 422 arrives at ~61 s) rather than bun's, with the margin roughly doubling that deadline,
and it is the value run-3's worker measured with. (2) The reflection keeps its observer — a
one-shot script was measured to leave `data-checked` absent because the app paints after the
injected script runs — and gains the compare-before-write guard; it is exported as
`REFLECT_CHECKED` so the exam can evaluate the same text the renderer receives, and it is
written with no single-quote character, so run-3's second suspicion (that the renderer strips
single quotes from `addScriptTag` content — never confirmed) is moot by construction. (3) The
reflection is exercised under `@happy-dom/global-registrator`, which becomes the helper
package's own devDependency: Bun links this workspace isolated (measured at BASE: the root
`node_modules` has no `@happy-dom`, only `client/node_modules` does, and an import of it from
`packages/tinyapp-exam/test/` does not resolve), and after `bun add -d` in the package the lock
gains exactly one `devDependencies` block under the `packages/tinyapp-exam` workspace and the
import resolves. (4) The timeout is pinned at runtime by spawning the exam under `bun test
--timeout 50` — a per-test option beats the CLI flag (measured on Bun 1.3.0) — rather than by
sleeping past five seconds in the suite.
**Closes:** (none — the fixture repository has no issues; the plugin ticket is #758)

**Tech Stack:** Bun 1.4 on the sandbox (1.3.0 on the authoring laptop) + TypeScript 6 + TinyBase
9.7, React 19, Vite 8 for the app's own build; `node-html-parser` 9 and `@happy-dom/global-registrator`
20.14 in the helper. The committed suite is the root `bun run test` (`package.json` `scripts.test`
= `bun run typecheck && bun test`), the testCmd the launcher detects (`package-json-bun`).
Bootstrap is `bun install --frozen-lockfile`, driver-derived.
**Exam command:** bun test {paths}

**Spec:** `docs/superpowers/specs/2026-09-09-tinyapp-state-exams.md` in the ultrapowers
repository (untracked there, absent from every sandbox — every fact the worker needs is in its
task's Context); the defect record is run-3's report on the fixture's `ultra/evidence/run-3` tag.

**Parallelization rationale:** one wave, width 1. Both edits — the registration's timeout and
the reflection script — are the render branch of one helper, the exam that pins them is the
helper's own two exam files, and the one dependency the exam needs makes this task the wave's
one `bun.lock` writer; splitting it would put the lock under two writers for nothing. Genuinely
a single task.

## Global Constraints

- Check: test "$(grep -rl api.cloudflare.com client/src client/test packages tests state-exams 2>/dev/null | wc -l)" -eq 0
- Check: test "$(grep -rlE 'Bun\.serve\(|createWsServer|\.listen\(' client/test packages tests 2>/dev/null | wc -l)" -eq 0
- No test reaches the network: every `fetch` a test exercises is an injected `fetchImpl` or the
  contract's blocked one, no test starts a server or a Durable Object, and the renderer URL a test
  passes is a placeholder that is never dialled. `bun install` is the only network use in the run
  and happens only in the driver's bootstrap and the one `bun add` this task's Context names.
- The helper's public surface grows and never shrinks: every name `packages/tinyapp-exam/src/index.ts`
  exports at BASE is still exported, `renderMove`'s request body is still `{html, addScriptTag}`
  with one script tag, and the skipped branch (either of `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR`
  unset or empty) still dials nothing.
- Every file outside this task's Files block is byte-identical to BASE (the task's `git diff --quiet $ULTRA_BASE` `Run:`); the
  task adds no dependency but the one its Files block names, and `bun.lock` is written by this task
  alone.

**Acceptance:** suite — the committed suite is the verification.

### Task 1: The render branch — an explicit timeout on the registration, a reflection that writes only on change

**Type:** implementation
**Review:** peer

**Files:**
- Modify: `packages/tinyapp-exam/src/state-exam.ts`
- Modify: `packages/tinyapp-exam/src/render-move.ts`
- Modify: `packages/tinyapp-exam/src/index.ts`
- Modify: `packages/tinyapp-exam/package.json`
- Modify: `bun.lock`
- Test: `packages/tinyapp-exam/test/state-exam.test.ts`
- Test: `packages/tinyapp-exam/test/render-move.test.ts`

**Claim:** A state exam that renders gets the time it needs, and the checkbox reflection settles instead of looping. (derived)
Machine: M1. `packages/tinyapp-exam/src/state-exam.ts` exports `STATE_EXAM_TIMEOUT_MS` equal to `120000`, `packages/tinyapp-exam/src/index.ts` re-exports it, and `stateExam(spec)` registers its one bun test with the options argument `{timeout: STATE_EXAM_TIMEOUT_MS}` — so a test file that calls `stateExam` with a green spec whose action awaits 300 ms, run as `bun test --timeout 50 <that file>` with `ULTRA_RUN_DIR` empty, exits 0 with no `timed out` in its output, while a sibling file registering a plain `test` that awaits 300 ms, run the same way, exits non-zero with `timed out after 50ms` in its output.
M2. `packages/tinyapp-exam/src/render-move.ts` exports `REFLECT_CHECKED`, a string; evaluated as a script under happy-dom in a document whose body holds exactly two `<input type="checkbox">` elements, the second with the `checked` attribute: after the evaluation settles, the first input's `data-checked` attribute is `false`, the second's is `true`, and a spy on `Element.prototype.setAttribute` installed before the evaluation counted exactly 2 calls; after a `<span>` is then appended to `document.body` and the observer settles, the count is still 2; after the first input's `checked` property is set to `true` and another `<span>` is appended and the observer settles, the count is exactly 3 and the first input's `data-checked` attribute is `true`.
M3. The character `'` (U+0027) is absent from `REFLECT_CHECKED`; `REFLECT_CHECKED` contains each of `data-checked`, `querySelectorAll` and `MutationObserver`; and the body `renderMove` posts on the ran branch carries `addScriptTag` deep-equal to `[{content: REFLECT_CHECKED}]`.
M4. `packages/tinyapp-exam/package.json` `devDependencies` carries `@happy-dom/global-registrator` as a non-empty string, `bun.lock` records `@happy-dom/global-registrator` under the `packages/tinyapp-exam` workspace's `devDependencies`, and `bun install --frozen-lockfile` exits 0 on the tree.
M5. The committed suite is green on the tree — `bun run test` at the repository root exits 0, so no existing leg of the helper's six exam files, of `client/test/`, of `tests/smoke.test.ts` or of the two first-run exams under `tests/state-exams/` fails — and every file outside this task's Files block is byte-identical to BASE.

**Authorized-by:** ultrapowers #758; spec `2026-09-09-tinyapp-state-exams` §3.2 (the render move, `data-checked` reflection) and §4.2 (g); fixture run-3's two `plan-defect` notes on `ultra/evidence/run-3` (the measurements this task rests on)

**Interfaces:**
- Consumes: none
- Produces: `STATE_EXAM_TIMEOUT_MS: number`
- Produces: `REFLECT_CHECKED: string`

**Context:** The defect, measured by run-3's workers against the live `TINYAPP_RENDER_URL`
(3/3 identical), is two-fold and both halves are in this package. First, `src/state-exam.ts:151`
registers `test(`state exam: ${examStem(Bun.main)}`, async () => {…})` with no third argument;
bun's per-test default is 5000 ms and a healthy render move on the fixture's ~1.9 MB bundled page
costs 2–6 s (bundle + POST), so the registered test dies as `this test timed out after 5000ms`
whenever both `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR` are set — measured at exactly 5000.81 ms,
where the identical call under `--timeout 120000` reached the renderer. The fix is the options
argument: `test(name, fn, {timeout: STATE_EXAM_TIMEOUT_MS})` with `export const
STATE_EXAM_TIMEOUT_MS = 120_000` in `state-exam.ts`, re-exported from `index.ts` beside the
thirteen existing names (the existing leg (g) of `state-exam.test.ts` asserts those thirteen are
functions; an extra numeric export leaves it green). Measured on Bun 1.3.0: `test(name, fn,
{timeout: 120_000})` awaiting 5300 ms passes, the same test without the option fails at 5000 ms,
and under `bun test --timeout 50` the test with the option passes while a plain test awaiting
300 ms fails as `timed out after 50ms` — the per-test option beats the CLI flag, which is what
M1's spawn pins. Second, `src/render-move.ts:170` `REFLECT_CHECKED` is
`(function(){var f=function(){document.querySelectorAll('input').forEach(function(i){i.setAttribute('data-checked', i.checked ? 'true' : 'false')})};f();new MutationObserver(f).observe(document.documentElement,{subtree:true,childList:true,attributes:true})})()`:
`setAttribute` queues a mutation record even when the value is unchanged, so each write
re-triggers `f`, the page never settles, and the renderer's `/snapshot` answers 422 with
`code 6002` after ~61 s; `renderMove` then throws `render failed: 422 …` before any view entry is
read. Isolated by the same worker: the page with no script renders 200 in ~2 s; with a one-shot
reflect (no observer) it renders 200 in ~2 s but `data-checked` is absent on both inputs, because
the app paints after `addScriptTag` runs — the observer is necessary. With the guard `var
v=i.checked?"true":"false";if(i.getAttribute("data-checked")!==v){i.setAttribute("data-checked",v)}`
inside the loop the whole page renders 200 in 3.7 s with `input#todo-0` `data-checked="false"`,
`input#todo-1` `data-checked="true"` and every view entry satisfied. Incidental fact the run
pinned: Cloudflare's `/snapshot` does honour `addScriptTag` — the injected script is present in
the returned DOM and its effects are serialised. The rewritten script uses double quotes inside
the JS (or a template literal) so that `REFLECT_CHECKED.includes("'")` is false; it is exported
(`export const REFLECT_CHECKED`) so the exam evaluates the exact text the renderer receives, and
the existing leg (g) of `render-move.test.ts` — `addScriptTag[0].content` contains `data-checked`
and `querySelectorAll` — still holds. Measured on this laptop under
`@happy-dom/global-registrator` 20.14.0 with the guarded script evaluated by indirect `eval`
against `<input id="a" type="checkbox"><input id="b" type="checkbox" checked>` and a spy
wrapping `Element.prototype.setAttribute`: 2 calls after load (`a` `false`, `b` `true`), still 2
after appending a `<span>`, 3 after `a.checked = true` plus another appended `<span>` (`a` now
`true`) — the counts M2 pins; happy-dom delivers observer callbacks asynchronously, so each
"settles" is one macrotask (`await new Promise((r) => setTimeout(r, 20))` was the measured
wait; a longer one is fine). Bun runs every test file of one `bun test` in a single process and
`GlobalRegistrator.register()` replaces `document`, `window`, `fetch` and more on `globalThis`,
so the happy-dom leg registers inside its test and `await GlobalRegistrator.unregister()`s in a
`finally` (unregister is async in 20.x) — a leaked window would turn the sibling `fetchImpl`
stubs and the contract's `fetch` restoration into cross-file flakes. The spy is removed in the
same `finally`. The dependency: `bun add -d "@happy-dom/global-registrator@^20.14.0"` run in
`packages/tinyapp-exam/` (the same range `client/package.json` already carries, so the lock's
package entry and integrity are unchanged) — measured at BASE: Bun links this workspace
isolated, the root `node_modules` has no `@happy-dom` directory, an import of
`@happy-dom/global-registrator` from `packages/tinyapp-exam/test/` fails to resolve, and after
the add the lock's only delta is a three-line `devDependencies` block under the
`packages/tinyapp-exam` workspace, `packages/tinyapp-exam/node_modules/@happy-dom/global-registrator`
is linked, the import resolves and `bun install --frozen-lockfile` exits 0. Keep the lock's
`"configVersion"` line as the sandbox's Bun writes it (Bun 1.3.0 on the laptop drops it; that is
version drift, not part of this change). This task is the wave's one `bun.lock` writer. M1's
spawn follows the shape the existing leg (f) of `state-exam.test.ts` already uses for its hollow
exam: write a temporary `<tmp>/slow.test.ts` that imports `stateExam` and the fixture's
`createTodosStore`/`addTodo` by absolute path (a file outside the repository resolves nothing
relative), whose action is `async (store) => { await Bun.sleep(300); addTodo(store, 'buy milk') }`
against `state-exams/seeds/empty.json` → `state-exams/expected/one-open-todo.json` with the
`completed: true` mutant, plus a sibling `<tmp>/plain.test.ts` holding one plain `test` that
awaits `Bun.sleep(300)`; run each with `Bun.spawnSync(['bun', 'test', '--timeout', '50',
path], {cwd: <repo root>, env: {...process.env, ULTRA_RUN_DIR: '', TINYAPP_RENDER_URL: ''}})`
and read `exitCode` and `stdout + stderr` — `Bun.sleep` is untouched by the contract (it pins
`Date`, `fetch` and `WebSocket` only), the store move runs the action twice so the exam's own
wall is ~0.6 s, and `Bun.main` inside `bun test` is the running file's path even from an
imported module (measured at BASE by Plan A). On this laptop Bun 1.3.0 fails 5 of the 84 tests
at BASE (`Bun.build` inside `bun test` — legs (c) ×2 of `state-exam.test.ts` and (g)/(h)/(i) of
`render-move.test.ts`, 79 pass) while the sandbox's Bun 1.4.0 is green; that is a laptop-only
Bun defect, not a fact about the tree, and M5's `Run:` is read on the sandbox. `bun run test`
first typechecks the client, the server and `packages/tinyapp-exam` (`bunx tsc -p
packages/tinyapp-exam --noEmit`, `include: ["src"]` — the exam files are not typechecked, the
sources are), so the third argument to `test` must satisfy `@types/bun`'s `TestOptions`
(`{timeout?: number, retry?: number, repeats?: number}`).
**BASE facts:** (generated at a2135f1)
- `packages/tinyapp-exam/src/state-exam.ts` blob 8eb2035
- `packages/tinyapp-exam/src/index.ts` blob c7c619e
- `stateExam` at `packages/tinyapp-exam/src/state-exam.ts:150` blob 8eb2035
- `packages/tinyapp-exam/src/render-move.ts` blob 29d2057
- `REFLECT_CHECKED` at `packages/tinyapp-exam/src/render-move.ts:170` blob 29d2057
- `checked` at `packages/tinyapp-exam/test/render-move.test.ts:250` blob 31209b6
- `renderMove` at `packages/tinyapp-exam/src/render-move.ts:229` blob 29d2057
- `packages/tinyapp-exam/package.json` blob ba310b1
- `bun.lock` blob 198bc6c
- `tests/smoke.test.ts` blob b052fce
- `document` at `packages/tinyapp-exam/test/render-move.test.ts:161` blob 31209b6
- `fetchImpl` at `packages/tinyapp-exam/test/render-move.test.ts:112` blob 31209b6
- `client/package.json` blob 21ea9d0
- `createTodosStore` at `client/src/storeData.ts:26` blob 6f40f9a
- `addTodo` at `client/src/storeData.ts:44` blob 6f40f9a
- `state-exams/seeds/empty.json` blob 5e91688
- `state-exams/expected/one-open-todo.json` blob b12a5d1
- `packages/tinyapp-exam/test/state-exam.test.ts` blob 45bd59e
- `packages/tinyapp-exam/test/render-move.test.ts` blob 31209b6
- `env` at `packages/tinyapp-exam/src/state-exam.ts:120` blob 8eb2035

**Proof:**
- Test: `packages/tinyapp-exam/test/state-exam.test.ts`
- Test: `packages/tinyapp-exam/test/render-move.test.ts`
- Guard: `packages/tinyapp-exam/test/state-exam.test.ts`
- Guard: `packages/tinyapp-exam/test/render-move.test.ts`
- Run: bun install --frozen-lockfile
- Run: git diff --quiet $ULTRA_BASE -- server/ client/ tests/ state-exams/ AGENTS.md README.md package.json packages/tinyapp-exam/tsconfig.json packages/tinyapp-exam/src/contract.ts packages/tinyapp-exam/src/evidence.ts packages/tinyapp-exam/src/mutant.ts packages/tinyapp-exam/src/store-move.ts packages/tinyapp-exam/src/types.ts
- Run: grep -c "timeout: STATE_EXAM_TIMEOUT_MS" packages/tinyapp-exam/src/state-exam.ts
- Run: bun -e "const m = await import('./packages/tinyapp-exam/src/render-move.ts'); if (typeof m.REFLECT_CHECKED !== 'string' || m.REFLECT_CHECKED.includes(String.fromCharCode(39))) { throw new Error('REFLECT_CHECKED missing or carries a single quote') }; console.log('no single quote in REFLECT_CHECKED')"
- Run: bun run test
- Legs: (a) in `state-exam.test.ts`, under a comment naming this task: `STATE_EXAM_TIMEOUT_MS` imported from `../src/state-exam` is exactly `120000` and the same name imported from `../src/index` is the same value; and the temporary `slow.test.ts` written as in Context, spawned as `bun test --timeout 50 <path>` with `ULTRA_RUN_DIR` and `TINYAPP_RENDER_URL` empty, has `exitCode` exactly `0` and `stdout + stderr` not containing `timed out`, while the temporary `plain.test.ts` spawned the same way has `exitCode` not `0` and `stdout + stderr` containing `timed out after 50ms`; the `grep -c` `Run:` prints `1` and exits 0 [M1]; (b) in `render-move.test.ts`, under a comment naming this task: with `GlobalRegistrator.register()` called inside the test, `document.body.innerHTML` set to two checkbox inputs the second carrying `checked`, and a spy wrapping `Element.prototype.setAttribute` that counts calls and delegates, evaluating `REFLECT_CHECKED` by indirect `eval` and awaiting one 20 ms timer gives the first input's `getAttribute('data-checked')` exactly `'false'`, the second's exactly `'true'` and the count exactly `2`; appending a `<span>` to `document.body` and awaiting the same timer leaves the count exactly `2`; setting the first input's `checked` to `true`, appending another `<span>` and awaiting the timer gives the count exactly `3` and the first input's `data-checked` exactly `'true'`; the spy is restored and `GlobalRegistrator.unregister()` awaited in a `finally` [M2]; (c) in `render-move.test.ts`: the single-quote character is absent — `REFLECT_CHECKED.includes("'")` is exactly `false` and `REFLECT_CHECKED.split("'").length` is exactly `1` — and the `bun -e` `Run:`, which throws on that character, exits 0 [M3]; (d) in `render-move.test.ts`, for each of `data-checked`, `querySelectorAll` and `MutationObserver`: `REFLECT_CHECKED.includes(<that text>)` is `true`, one assertion per text [M3]; (e) in `render-move.test.ts`: on the ran branch (an `env` carrying both `TINYAPP_RENDER_URL` on `.invalid` and `ULTRA_RUN_DIR`, a `fetchImpl` stub that records the request body) the parsed body's `addScriptTag` is deep-equal to `[{content: REFLECT_CHECKED}]`, with `REFLECT_CHECKED` imported from `../src/render-move` [M3]; (f) in `render-move.test.ts`: `packages/tinyapp-exam/package.json` read from disk has `devDependencies['@happy-dom/global-registrator']` a non-empty string, and `bun.lock` read from disk as text (it carries trailing commas, so it is not `JSON.parse`d), sliced from its `"packages/tinyapp-exam": {` line to the next `"server": {` line, contains both `"devDependencies"` and `"@happy-dom/global-registrator"`; the `bun install --frozen-lockfile` `Run:` exits 0 [M4]; (g) the `bun run test` `Run:` exits 0 — a red existing leg anywhere in the suite is that command's non-zero exit — and the `git diff --quiet $ULTRA_BASE` `Run:` exits 0, so every file it names is byte-identical to BASE [M5].

**Stale-if:**
- path-exists: `packages/tinyapp-exam/src/state-exam.ts`
- path-exists: `packages/tinyapp-exam/src/render-move.ts`
- sha-matches: `packages/tinyapp-exam/src/state-exam.ts@8eb2035f55a62b5a268ae1989d131d9fc7227eea`
- sha-matches: `packages/tinyapp-exam/src/render-move.ts@29d20579b8582f3bcc8037d352fab5f5e83c6bbb`
