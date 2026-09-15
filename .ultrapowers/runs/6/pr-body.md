This gives a state exam a browser: the interaction a claim is about happens as a real click or keystroke in a Chromium that already ships on the fleet's machines, and the same page yields the store, the DOM and the screenshot the evidence shows. It exists because the exam could only prove what a store callback reached, never that the checkbox is what calls it, and because the renderer it borrowed for the picture lived behind a proxy that cannot carry a browser session. After this run a task on a TinyApp is green or red on one exam that seeds the app, does the interaction, and checks the state and the screen, with no credential and no service in the loop.

**Parked:** parked: gate verdict BLOCKED

> When I read a task's evidence, I can see that a real click in a real browser reached the state the task claimed, with the screenshot beside it, and that the exam would have gone red if it hadn't.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | After this run, the exam helper can open a page in the machine's own Chromium, click or type in it, read a value out of it, and hand back its markup and a picture, with no network. | red at BASE → green | — | — | — |
| 2 | After this run, a state exam whose action is a click or a keystroke proves what that interaction reached in the app, and the picture and markup on the evidence are of the very page it happened in. | red at BASE, task failed | — | killed | — |
| 3 | After this run, a page opened on a seed lets the exam read the app's store back exactly as the app holds it, and a normal page exposes nothing. | red at BASE, task failed | — | — | — |
| 4 | When I read a task's evidence, I can see that a real click in a real browser reached the state the task claimed, with the screenshot beside it, and that the exam would have gone red if it hadn't. | — | — | — | — |

Residuals: 2 from review

<details><summary>Record</summary>

## fleet run-6 — parked

| | |
|---|---|
| verdict | `BLOCKED` |
| target | `popmechanic/tinyapp-fixture` at `1f8e0a65e1c7c960d61c87d84d9b75ec2bf2a7c1` |
| engine | `597c6db1493bdafaeb7f21972856a7e702847aa6` |
| plan | `.ultrapowers/plan.md` at `fa4e4be79bf73683ac99bcaad757fb179f87d74d` |
| branch | `ultra/integration-run-6` |
| vm | `fleet-r6-2609150545-be8e` |

### Checks

```json
{"mode": "gate", "stamp": "run-6", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-6/report.json", "branch": "ultra/integration-run-6", "gateCheck": {"verdict": "BLOCKED", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": false, "detail": "failed/blocked tasks left declared deliverables unproduced: [{\"task\": \"3\", \"files\": [\"AGENTS.md\", \"client/src/Store.tsx\", \"client/src/storeData.ts\", \"client/test/seeded-store-global.test.ts\", \"client/test/seeded-store.test.ts\"]}, {\"task\": \"2\", \"files\": [\"packages/tinyapp-exam/src/render-move.ts\", \"packages/tinyapp-exam/src/state-exam.ts\", \"packages/tinyapp-exam/src/store-move.ts\", \"packages/tinyapp-exam/src/types.ts\", \"packages/tinyapp-exam/test/browser-exam.test.ts\", \"packages/tinyapp-exam/test/render-move.test.ts\", \"packages/tinyapp-exam/test/state-exam.test.ts\"]}, {\"task\": \"4\", \"files\": [\"README.md\", \"state-exams/expected/one-open-todo-typed.json\", \"tests/state-exams/click-completes-todo.test.ts\", \"tests/state-exams/enter-submits-todo.test.ts\", \"tests/state-exams/interaction-evidence.test.ts\"]}]"}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 1, "suite": {"passed": true, "unattributed": [], "output": " a green spec with no run directory is ok, its mutant killed, its render skipped [2.05ms]\n(pass) leg (a) [M1]: opts.main defaults to Bun.main, so an omitted main stems this file [1.56ms]\n(pass) leg (b) [M3]: a red store move reports the diff table and never reaches the renderer [1.71ms]\n(pass) leg (c) [M4]: a green store move with a renderer posts once and files the dom and the picture [72.80ms]\n(pass) leg (c) [M4]: a view the rendered dom does not satisfy is a render failure naming its selector [55.79ms]\n(pass) leg (d) [M5]: a mutant the expected state already carries is a hollow exam [1.27ms]\n(pass) leg (e) [M6]: an action that reaches for the network fails as that breach line [0.66ms]\n(pass) leg (e) [M6]: an empty clock fails as the contract line, with no breach recorded [0.45ms]\n(pass) state exam: state-exam [0.73ms]\n(pass) leg (f) [M7]: a file calling stateExam with a hollow mutant exits non-zero saying so [26.54ms]\n(pass) leg (g) [M8]: the two manifests and the thirteen exports of the sealed package [0.32ms]\n(pass) leg (h) [M9]: both first-run exams are written as exams of this helper [0.16ms]\n(pass) leg (h) [M9]: bun test over the two first-run exams exits 0 [48.97ms]\n(pass) task 1, leg (a) [M1]: STATE_EXAM_TIMEOUT_MS is 120000, from the module and from the index [0.34ms]\n(pass) task 1, leg (a) [M1]: the registered exam outlives --timeout 50 where a plain test does not [689.22ms]\n\npackages/tinyapp-exam/test/render-move.test.ts:\n(pass) leg (a) [M1]: renderHtml inlines the seed, the bundle and the css, and leaves no script src [10.60ms]\n(pass) leg (a) [M1]: every module script of the entry is replaced, not only the first [1.22ms]\n(pass) leg (b) [M2]: every entry that holds contributes no string [1.76ms]\n(pass) leg (c) [M2]: each failing entry contributes exactly one string naming its selector [0.92ms]\n(pass) leg (c) [M2]: one non-conforming match fails the universal, and count still holds [0.46ms]\n(pass) leg (c) [M2]: a list reports one string per failing entry, in list order [0.36ms]\n(pass) leg (d) [M3]: no TINYAPP_RENDER_URL means skipped, and the renderer is never called [0.28ms]\n(pass) leg (e) [M3]: an empty TINYAPP_RENDER_URL means skipped too [0.16ms]\n(pass) leg (f) [M3]: an unset or empty ULTRA_RUN_DIR means skipped, renderer configured or not [0.19ms]\n(pass) leg (g) [M4]: the configured move bundles the entry, posts one snapshot request and reports the view [72.39ms]\n(pass) leg (g) [M4]: failures are assertView of the returned dom [57.87ms]\n(pass) leg (h) [M5]: a non-2xx response rejects with render failed: [59.21ms]\n(pass) leg (i) [M5]: a 200 with success false rejects, while a 200 with success true does not [102.83ms]\n(pass) leg (j) [M6]: the tree manifests carry node-html-parser [0.17ms]\n(pass) task 1, leg (b) [M2]: the reflection writes each box once and then only on a change [69.99ms]\n(pass) task 1, leg (c) [M3]: no single quote anywhere in REFLECT_CHECKED [0.05ms]\n(pass) task 1, leg (d) [M3]: REFLECT_CHECKED reads inputs, writes data-checked and observes [0.03ms]\n(pass) task 1, leg (e) [M3]: the ran branch posts addScriptTag as exactly [{content: REFLECT_CHECKED}] [70.01ms]\n(pass) task 1, leg (f) [M4]: the manifests carry @happy-dom/global-registrator for this package [0.26ms]\n\npackages/tinyapp-exam/test/contract.test.ts:\n(pass) leg (h) [M5]: a clock that is not a non-empty string is refused before fn runs [0.29ms]\n(pass) leg (h) [M5]: a throwing fn rejects with its own message and the clock is restored [0.17ms]\n(pass) leg (i) [M5]: inside the contract the clock is pinned, and afterwards it is the real one again [0.19ms]\n(pass) leg (j) [M5][M6]: a fetch is a breach naming the url, and fetch plus the clock are restored [0.16ms]\n(pass) leg (k) [M5][M6]: a WebSocket is a breach naming the url, and WebSocket plus the clock are restored [0.17ms]\n(pass) leg (l) [M6]: after a green fn, fetch and WebSocket are the originals again [0.11ms]\n\n 119 pass\n 0 fail\n 519 expect() calls\nRan 119 tests across 14 files. [3.21s]\n"}, "verdict": "BLOCKED"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-6/.ultrapowers/runs/6/

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

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-6/.ultrapowers/plan.md

### Residuals

- [ ] task 1 reviewer — Explicit error path gap in the CDP connection: `once()` (packages/tinyapp-exam/src/browser.ts:221-225) has neither a timeout nor a close path, and `give()` (184-190) rejects only `pending` calls, never `waiters`. Every `send()` is bounded by CALL_TIMEOUT_MS, but the one place the driver awaits an *event* — `await loaded` in `open()` (505-511) — is unbounded: a navigation whose `Page.loadEventFired` never arrives, or a browser that dies mid-navigation (socket close fires `give`, which clears `pending` and leaves the waiter dangling), leaves `open()` pending forever. This does not surface in this task's exam, but Task 2 consumes `open()` inside a state exam whose contract is that a browser failure is a red with a `browser: ` line — a hang there is an exam that never returns instead of one that fails. The fix is inside this task's own FILES.
- [ ] task 1 reviewer — Tension between the peer-written exam and the second GLOBAL CONSTRAINT ("A missing browser binary is a red exam that names the path, never a skip"), which carries no `Check:` command — this is my reading of the prose. `packages/tinyapp-exam/test/browser.test.ts` legs (b), (c) and (d) open with `if (!BROWSER) return;`, so on a machine with no Chromium at `$TINYAPP_BROWSER` or `/headless-shell/headless-shell` the suite reports 5/5 pass having proven nothing about open/act/snapshot — a silent green, mitigated only by the console.log at the top of the file. The task's own Context asks for exactly this ("the suite is green on a laptop without Chromium and full on the fleet"), which is why the actor is the plan and not the implementer: no edit inside this tree resolves the contradiction without contradicting the task text. Nothing is unproven on this run — EXAM EVIDENCE shows 60 expect() calls across the five legs, which is the full-fleet count, so the browser legs really executed against the image's binary. Recorded for the operator to settle if the constraint is meant to bind this unit exam too.

</details>

Closes #834
