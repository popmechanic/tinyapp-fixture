## fleet run-4 — parked

| | |
|---|---|
| verdict | `NEEDS_ACK` |
| target | `popmechanic/tinyapp-fixture` at `a2135f15cc2982d20d954da672f3cc62c4b67156` |
| engine | `3fb782b6de9a3cdbd17dbab957f718df15b8399d` |
| plan | `.ultrapowers/plan.md` at `eaf3a430749b9f584f9d68ff3deae3963adf975b` |
| branch | `ultra/integration-run-4` |
| vm | `fleet-r4-2609091720-522b` |

### Checks

```json
{"mode": "gate", "stamp": "run-4", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-4/report.json", "branch": "ultra/integration-run-4", "gateCheck": {"verdict": "NEEDS_ACK", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "repo": "/home/exedev/target"}, "gateCheckExit": 2, "acceptance": {"disposition": "suite", "exit": 0, "output": "oes not satisfy is a render failure naming its selector [57.89ms]\\n(pass) leg (d) [M5]: a mutant the expected state already carries is a hollow exam [1.47ms]\\n(pass) leg (e) [M6]: an action that reaches for the network fails as that breach line [0.60ms]\\n(pass) leg (e) [M6]: an empty clock fails as the contract line, with no breach recorded [0.48ms]\\n(pass) state exam: state-exam [0.77ms]\\n(pass) leg (f) [M7]: a file calling stateExam with a hollow mutant exits non-zero saying so [45.46ms]\\n(pass) leg (g) [M8]: the two manifests and the thirteen exports of the sealed package [0.36ms]\\n(pass) leg (h) [M9]: both first-run exams are written as exams of this helper [0.19ms]\\n(pass) leg (h) [M9]: bun test over the two first-run exams exits 0 [56.55ms]\\n(pass) task 1, leg (a) [M1]: STATE_EXAM_TIMEOUT_MS is 120000, from the module and from the index [0.32ms]\\n(pass) task 1, leg (a) [M1]: the registered exam outlives --timeout 50 where a plain test does not [702.33ms]\\n\\npackages/tinyapp-exam/test/render-move.test.ts:\\n(pass) leg (a) [M1]: renderHtml inlines the seed, the bundle and the css, and leaves no script src [4.25ms]\\n(pass) leg (a) [M1]: every module script of the entry is replaced, not only the first [1.21ms]\\n(pass) leg (b) [M2]: every entry that holds contributes no string [2.21ms]\\n(pass) leg (c) [M2]: each failing entry contributes exactly one string naming its selector [1.10ms]\\n(pass) leg (c) [M2]: one non-conforming match fails the universal, and count still holds [0.49ms]\\n(pass) leg (c) [M2]: a list reports one string per failing entry, in list order [0.32ms]\\n(pass) leg (d) [M3]: no TINYAPP_RENDER_URL means skipped, and the renderer is never called [0.28ms]\\n(pass) leg (e) [M3]: an empty TINYAPP_RENDER_URL means skipped too [0.16ms]\\n(pass) leg (f) [M3]: an unset or empty ULTRA_RUN_DIR means skipped, renderer configured or not [0.19ms]\\n(pass) leg (g) [M4]: the configured move bundles the entry, posts one snapshot request and reports the view [74.94ms]\\n(pass) leg (g) [M4]: failures are assertView of the returned dom [75.19ms]\\n(pass) leg (h) [M5]: a non-2xx response rejects with render failed: [66.83ms]\\n(pass) leg (i) [M5]: a 200 with success false rejects, while a 200 with success true does not [134.60ms]\\n(pass) leg (j) [M6]: the tree manifests carry node-html-parser [0.32ms]\\n(pass) task 1, leg (b) [M2]: the reflection writes each box once and then only on a change [84.40ms]\\n(pass) task 1, leg (c) [M3]: no single quote anywhere in REFLECT_CHECKED [0.11ms]\\n(pass) task 1, leg (d) [M3]: REFLECT_CHECKED reads inputs, writes data-checked and observes [0.07ms]\\n(pass) task 1, leg (e) [M3]: the ran branch posts addScriptTag as exactly [{content: REFLECT_CHECKED}] [61.06ms]\\n(pass) task 1, leg (f) [M4]: the manifests carry @happy-dom/global-registrator for this package [0.18ms]\\n\\npackages/tinyapp-exam/test/mutant.test.ts:\\n(pass) leg (a) [M1]: applyMutant returns a new snapshot and leaves the input untouched [0.09ms]\\n(pass) leg (b) [M2]: a cell edit sets exactly that cell in the result [0.08ms]\\n(pass) leg (c) [M2]: a cell edit creates the table and the row when they are absent [0.04ms]\\n(pass) leg (d) [M3]: an absent cell edit removes that cell and leaves the rest of the row [0.08ms]\\n(pass) leg (d) [M3]: removing a row's last cell removes the row, and the table with it [0.04ms]\\n(pass) leg (e) [M4]: an absent row edit removes that row and leaves exactly the other row [0.03ms]\\n(pass) leg (e) [M4]: removing a table's last row removes the table too [0.03ms]\\n(pass) leg (f) [M5]: edits apply in list order, so a later edit to the same cell wins [0.02ms]\\n(pass) leg (g) [M6]: a cell edit's segment is <table>/<row>/<cell>, for a set and for a removal [0.02ms]\\n(pass) leg (h) [M6]: a row edit's segment is <table>/<row> [0.01ms]\\n(pass) leg (i) [M6]: segments come in list order joined by a comma, and no edits is the empty string [0.02ms]\\n\\n 91 pass\\n 0 fail\\n 428 expect() calls\\nRan 91 tests across 11 files. [2.36s]\"}\n"}, "verdict": "NEEDS_ACK"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-4/.ultrapowers/runs/4/

- acceptance.log
- claude-version.txt
- engine.log
- events.jsonl
- gate-receipt.json
- pr-body.md
- publish-fold
- receipt.json
- referee
- report.json
- state-exams
- status.json
- transcripts

### Plan

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-4/.ultrapowers/plan.md

### Residuals

- [ ] deferred:external — Task 1 — the render-ran branch end to end against a live TINYAPP_RENDER_URL: that the 120 s registration wall and the guarded REFLECT_CHECKED together let a real state exam reach the renderer (run-3 measured 3.7 s with data-checked correct on both inputs) instead of dying at bun's 5000 ms or at Cloudflare's 422/code 6002 after ~61 s. — The global constraint forbids any test reaching the network — every fetch in the suite is an injected fetchImpl and the renderer URL is a .invalid placeholder that is never dialled — so the integrated evidence exercises the ran branch only through stubs (leg (e) checks the posted body, legs (g)-(i) the response handling). The defect this task fixes was measured against the live renderer and cannot be re-measured here. [structural false-green: sandbox could not execute it against the target]
- [ ] task 1 reviewer — Copy-pasted helpers in `packages/tinyapp-exam/test/state-exam.test.ts`. `slowSource()` (patch:344-362) is `hollowSource()` (BASE state-exam.test.ts:424-443) verbatim apart from the `action` line and the mutant constant, and `bunTestAt50()` (patch:376-385) is `bunTest()` (BASE:446-455) with two extra argv entries and one extra env key. Both would collapse into the existing helpers with a parameter — e.g. `examSource({action, mutant})` and `bunTest(paths, {args = [], env = {}})` — leaving one spawn shape and one generated-file shape for the file to maintain. Incidental divergence the parameterisation would also remove: `bunTest` concatenates `stderr + stdout` while `bunTestAt50` uses `stdout + stderr`
- [ ] task 1 reviewer — harmless for the `toContain` checks, but two orders for one thing.
- [ ] task 1 reviewer — unverified: the Claim's live-renderer half. M2's counts are measured under `@happy-dom/global-registrator` and leg (e) posts through an injected `fetchImpl` at `renderer.invalid`, so the diff establishes that the guarded script settles in a happy-dom document and that the exact exported text is what gets posted — not that Cloudflare's `/snapshot` now answers 200 in ~3.7 s where the unguarded script drew 422/`code 6002` after ~61 s, nor that 120000 ms is the right wall for a real 2-6 s render. This is forced by the no-network global constraint, so it cannot be settled inside this suite and correctly blocks nothing. What would settle it: one run of a state exam with `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR` set against the live renderer, outside `bun run test`, checking the returned DOM carries `input#todo-0 data-checked="false"` and `input#todo-1 data-checked="true"` — the shape run-3's workers already used to measure the defect.
- [ ] task 1 reviewer — unverified: the Claim's live-renderer half — "A state exam that renders gets the time it needs" against the real `TINYAPP_RENDER_URL` (a ~1.9 MB page returning 200 with `data-checked` set on both inputs, instead of the 422/code 6002 the unguarded script produced) — is not settled by this diff and cannot be, since the first GLOBAL CONSTRAINT forbids any test dialling the renderer. The committed suite settles the in-tree proxies only: `STATE_EXAM_TIMEOUT_MS` is 120000 and beats `--timeout 50` on a spawned exam (state-exam.test.ts leg (a), exit 0), and the guarded `REFLECT_CHECKED` reaches a fixed point under happy-dom at exactly 2/2/3 `setAttribute` calls (render-move.test.ts leg (b)). The renderer-side facts rest entirely on run-3's 3/3 measurements cited in Authorized-by. What would settle it: one run of a state exam with `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR` both set, outside the suite, checking the filed DOM carries `input#todo-0 data-checked="false"` and `input#todo-1 data-checked="true"`. Recorded for the operator
- [ ] task 1 reviewer — it blocks nothing, since no in-tree edit could answer it under the network constraint.
- [ ] task 1 reviewer — `settleObserver()` in packages/tinyapp-exam/test/render-move.test.ts is a fixed 20 ms sleep, and the middle assertion of leg (b) — `expect(writes).toBe(2)` after appending a `<span>` — is a negative one: on a loaded machine where happy-dom has not yet delivered the observer callback within 20 ms, it would hold for the wrong reason. The leg is not silently green overall, because the third step asserts the count *rises* to 3 after the same 20 ms wait, so a too-slow observer reddens the test rather than passing it vacuously
- [ ] task 1 reviewer — this is a flake-hardness note, not a coverage gap. The task's Context measured 20 ms and says a longer wait is fine. If it ever flakes, replace the fixed sleep with a bounded poll — e.g. loop up to ~500 ms awaiting a 20 ms timer until `writes` stops changing, then assert — which keeps the same three counts while removing the dependence on one macrotask being enough.
- [ ] task 1 reviewer — dependency manifest changed: `bun.lock` (devDependencies, @happy-dom/global-registrator)
- [ ] task 1 reviewer — dependency manifest changed: `packages/tinyapp-exam/package.json` (devDependencies, @happy-dom/global-registrator)

Closes #758
