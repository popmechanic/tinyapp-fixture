This lands the two exams run-7 ran green but could not produce, because their plan pinned a state the click never reaches. It exists so the fixture carries, on its main branch, one exam that clicks a checkbox and one that types and presses Enter, each proving what the interaction did to the app's state with the screenshot beside it. After this run a task on a TinyApp can be judged on a real interaction in a real browser, and a reader of its evidence can see the state, the picture, and that a wrong state would have failed it.

**Merge-ready**

> When I read a task's evidence, I can see that a real click in a real browser reached the state the task claimed, with the screenshot beside it, and that the exam would have gone red if it hadn't.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | When I read a task's evidence, I can see that a real click in a real browser reached the state the task claimed, with the screenshot beside it, and that the exam would have gone red if it hadn't. | red at BASE → green | — | killed | — |

Residuals: 2 from review

<details><summary>Record</summary>

## fleet run-8 — gate-green

| | |
|---|---|
| verdict | `PASS` |
| target | `popmechanic/tinyapp-fixture` at `c952dadd06c308d18a6e240717a2a41a89f6dcc4` |
| engine | `597c6db1493bdafaeb7f21972856a7e702847aa6` |
| plan | `.ultrapowers/plan.md` at `e7e2cdfa38d98aa8f19c3607f862b76f34f62fe6` |
| branch | `ultra/integration-run-8` |
| vm | `fleet-r8-2609150811-c420` |

### Checks

```json
{"mode": "gate", "stamp": "run-8", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-8/report.json", "branch": "ultra/integration-run-8", "gateCheck": {"verdict": "PASS", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 0, "suite": {"passed": true, "unattributed": [], "output": "dles the entry, opens one page, photographs it once and reports the view [36.37ms]\n(pass) leg (g) [M4]: failures are assertView of the photographed dom [28.95ms]\n(pass) leg (h) [M5]: an open that rejects rejects the move, and nothing was photographed [26.32ms]\n(pass) leg (i) [M5]: a snapshot that rejects rejects the move, and the page is closed all the same [48.99ms]\n(pass) leg (j) [M6]: the tree manifests carry node-html-parser [0.18ms]\n(pass) leg (k) [M7]: the default bundle is minified and its page fits under the ceiling; unminified does not [128.71ms]\n(pass) task 1, leg (b) [M2]: the reflection writes each box once and then only on a change [68.41ms]\n(pass) task 1, leg (c) [M3]: no single quote anywhere in REFLECT_CHECKED [0.06ms]\n(pass) task 1, leg (d) [M3]: REFLECT_CHECKED reads inputs, writes data-checked and observes [0.03ms]\n(pass) task 1, leg (e) [M3]: the driver runs REFLECT_CHECKED in the page it photographs [0.14ms]\n(pass) task 1, leg (f) [M4]: the manifests carry @happy-dom/global-registrator for this package [0.13ms]\n\npackages/tinyapp-exam/test/browser-exam.test.ts:\n(pass) leg (a) [M1]: a click opens two pages seeded from `seed`, acts once on each, and reads the store through the page [5.31ms]\n(pass) leg (a) [M1]: the diff is of the content the page answered, against the expected file [2.41ms]\n(pass) leg (a) [M1]: a type action, a key action and an array of them are performed, in order, on each page [7.28ms]\n(pass) leg (a) [M1]: two pages that answer different contents are a nondeterministic store [3.03ms]\n(pass) leg (b) [M2]: with an action the render move is the first page \u2014 one snapshot, no third page [0.42ms]\n(pass) leg (b) [M2]: the view failures are `assertView` of the page that was acted on [2.68ms]\n(pass) leg (b) [M2]: a callback action with an entry opens one page, seeded from the post-action content [3.83ms]\n(pass) leg (b) [M2]: `TINYAPP_RENDER_URL` occurs nowhere under packages/tinyapp-exam/src [1.15ms]\n(pass) leg (c) [M3]: no entry means the render move is skipped and no page is ever opened [1.50ms]\n(pass) leg (c) [M3]: with an entry and no run directory the render still runs, under os.tmpdir() [0.19ms]\n(pass) leg (d) [M4]: walls.json carries action_ms and browser, and contract.json pinned_in_page [0.29ms]\n(pass) leg (d) [M4]: a callback action with no browser records action_ms null and browser skipped [0.13ms]\n(pass) leg (d) [M4]: a callback action rendered in a page still records action_ms null [4.25ms]\n(pass) leg (e) [M5]: a missing binary with an action is the `browser: ` line, with the evidence still written [0.54ms]\n(pass) leg (e) [M5]: a missing binary with a callback action and an entry is the same red [1.44ms]\n(pass) leg (e) [M5]: the mutant move is unchanged \u2014 a green click spec still kills its mutant [0.16ms]\n(pass) leg (f) [M6]: the two re-aimed test files pass, and neither names the endpoint or its stub [2791.76ms]\n(pass) leg (g) [M1] [M7]: a click on the fixture completes the todo, read through the page store, under the ceiling [1235.18ms]\n(pass) leg (g) [M7]: forced unminified, the url is over the ceiling and the exam says so rather than hanging [158.77ms]\n(pass) leg (g) [M7]: `open` refuses a data: url over the ceiling within 15 s, naming it [104.17ms]\n\npackages/tinyapp-exam/test/contract.test.ts:\n(pass) leg (h) [M5]: a clock that is not a non-empty string is refused before fn runs [0.29ms]\n(pass) leg (h) [M5]: a throwing fn rejects with its own message and the clock is restored [0.16ms]\n(pass) leg (i) [M5]: inside the contract the clock is pinned, and afterwards it is the real one again [0.17ms]\n(pass) leg (j) [M5][M6]: a fetch is a breach naming the url, and fetch plus the clock are restored [0.16ms]\n(pass) leg (k) [M5][M6]: a WebSocket is a breach naming the url, and WebSocket plus the clock are restored [0.13ms]\n(pass) leg (l) [M6]: after a green fn, fetch and WebSocket are the originals again [0.08ms]\n\n 158 pass\n 0 fail\n 764 expect() calls\nRan 158 tests across 19 files. [18.59s]\n"}, "verdict": "PASS"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-8/.ultrapowers/runs/8/

- approve-receipt.json
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

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-8/.ultrapowers/plan.md

### Residuals

- [ ] task 1 reviewer — unverified: two GLOBAL CONSTRAINTS are not settled by anything in this diff, because they are properties of `packages/tinyapp-exam` at BASE, which constraint 4 forbids this plan from editing and which this patch correctly leaves untouched. (1) "The exam never dials a network" — the new exams assert `walls.json` reads `browser: "ran"` (tests/state-exams/interaction-evidence.test.ts:435, :467) but nothing about the `data:` entry URL, request blocking, or the loopback-only CDP socket. (2) "A missing browser binary is a red exam that names the path, never a skip" — no leg runs an exam with `TINYAPP_BROWSER` pointed at a nonexistent binary, so the red-not-skip behavior is exercised nowhere here. Neither constraint carries a `Check:` command, so this rests on my reading of the prose alone, and neither appears in this task's Machine clauses M1–M5, so adding coverage would be scope creep for the implementer rather than a fix. What would settle them: a helper-level leg (outside this task's FILES) that opens an exam and asserts the recorded entry URL is `data:` with a blocked-request count, and a leg that runs any exam with `TINYAPP_BROWSER=/nonexistent/chrome` and asserts a non-zero exit whose output contains that path. Recorded for the operator
- [ ] task 1 reviewer — it blocks nothing.

</details>

