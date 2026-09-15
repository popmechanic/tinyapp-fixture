This adds a linter for the app's saved states — the seed and expected files an exam is written against — so a state an author wrote from memory is checked before anything runs. It exists because two of the five plans on 2026-09-14 parked on exactly that: an expected file with the wrong row done, and a view no two-row state could satisfy, which the exam could only report after a launch. After this run, `bun run lint:state` says in one line per problem which row breaks which rule and what to change, in milliseconds and with no browser, so a wrong state costs a sentence at authoring instead of a parked run.

**Merge-ready**

> A workspace package `packages/tinyapp-lint` on the fixture (popmechanic/tinyapp-fixture), beside `tinyapp-exam`, exposing `bun run lint:state` at the root, which reads every file under `state-exams/seeds/` and `state-exams/expected/` through the app's schema and applies three rules, printing one line per finding in `@shadcn/lint`'s shape — what is wrong, in the app's vocabulary, and the fix — and exiting non-zero on any finding

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | When I run `bun run lint:state` at the fixture's root, I see one summary line saying zero findings over its seven snapshots and six exams, and when a rule reports something I see one line per finding and a non-zero exit. | red at BASE → green | — | — | — |
| 2 | When I write a snapshot with a completed todo whose text is empty, lint:state tells me which row breaks which invariant and what to change; the fixture's own snapshots raise nothing. | red at BASE → green | — | — | — |
| 3 | When a cell the schema marks as a reference points at a row the snapshot does not have, lint:state names the cell, the missing row and the two ways to fix it; the fixture, which declares no references, raises nothing. | red at BASE → green | — | — | — |
| 4 | When I write an expected state no seed can reach through the app's own callbacks, lint:state says so and names the callbacks it tried; the fixture's four expected states are each reached from a seed. | red at BASE → green | — | — | — |
| 5 | When an exam asserts a checked box over a selector that matches more than one box, lint:state names the narrower selector I should have written — the one run-7 parked on — and every view the fixture's six exams assert is found satisfiable. | red at BASE → green | — | — | — |

Residuals: 8 from review

<details><summary>Record</summary>

## fleet run-9 — gate-green

| | |
|---|---|
| verdict | `PASS` |
| target | `popmechanic/tinyapp-fixture` at `c2a75c6a6612fbbbb77c307516d9f35b9366ff26` |
| engine | `680a6b0e8b42ab4370874bebe536e1493e3b029f` |
| plan | `.ultrapowers/plan.md` at `aa756a794a3ea59bb16ad370210d2a7bb4e24426` |
| branch | `ultra/integration-run-9` |
| vm | `fleet-r9-2609150941-a66e` |

### Checks

```json
{"mode": "gate", "stamp": "run-9", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-9/report.json", "branch": "ultra/integration-run-9", "gateCheck": {"verdict": "PASS", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 0, "suite": {"passed": true, "unattributed": [], "output": "dles the entry, opens one page, photographs it once and reports the view [41.90ms]\n(pass) leg (g) [M4]: failures are assertView of the photographed dom [40.96ms]\n(pass) leg (h) [M5]: an open that rejects rejects the move, and nothing was photographed [44.50ms]\n(pass) leg (i) [M5]: a snapshot that rejects rejects the move, and the page is closed all the same [65.24ms]\n(pass) leg (j) [M6]: the tree manifests carry node-html-parser [0.36ms]\n(pass) leg (k) [M7]: the default bundle is minified and its page fits under the ceiling; unminified does not [168.33ms]\n(pass) task 1, leg (b) [M2]: the reflection writes each box once and then only on a change [70.13ms]\n(pass) task 1, leg (c) [M3]: no single quote anywhere in REFLECT_CHECKED [0.05ms]\n(pass) task 1, leg (d) [M3]: REFLECT_CHECKED reads inputs, writes data-checked and observes [0.03ms]\n(pass) task 1, leg (e) [M3]: the driver runs REFLECT_CHECKED in the page it photographs [0.15ms]\n(pass) task 1, leg (f) [M4]: the manifests carry @happy-dom/global-registrator for this package [0.11ms]\n\npackages/tinyapp-exam/test/browser-exam.test.ts:\n(pass) leg (a) [M1]: a click opens two pages seeded from `seed`, acts once on each, and reads the store through the page [7.54ms]\n(pass) leg (a) [M1]: the diff is of the content the page answered, against the expected file [3.02ms]\n(pass) leg (a) [M1]: a type action, a key action and an array of them are performed, in order, on each page [10.08ms]\n(pass) leg (a) [M1]: two pages that answer different contents are a nondeterministic store [2.71ms]\n(pass) leg (b) [M2]: with an action the render move is the first page \u2014 one snapshot, no third page [0.37ms]\n(pass) leg (b) [M2]: the view failures are `assertView` of the page that was acted on [3.03ms]\n(pass) leg (b) [M2]: a callback action with an entry opens one page, seeded from the post-action content [4.61ms]\n(pass) leg (b) [M2]: `TINYAPP_RENDER_URL` occurs nowhere under packages/tinyapp-exam/src [1.04ms]\n(pass) leg (c) [M3]: no entry means the render move is skipped and no page is ever opened [1.17ms]\n(pass) leg (c) [M3]: with an entry and no run directory the render still runs, under os.tmpdir() [0.17ms]\n(pass) leg (d) [M4]: walls.json carries action_ms and browser, and contract.json pinned_in_page [0.24ms]\n(pass) leg (d) [M4]: a callback action with no browser records action_ms null and browser skipped [0.10ms]\n(pass) leg (d) [M4]: a callback action rendered in a page still records action_ms null [3.52ms]\n(pass) leg (e) [M5]: a missing binary with an action is the `browser: ` line, with the evidence still written [0.43ms]\n(pass) leg (e) [M5]: a missing binary with a callback action and an entry is the same red [1.06ms]\n(pass) leg (e) [M5]: the mutant move is unchanged \u2014 a green click spec still kills its mutant [0.16ms]\n(pass) leg (f) [M6]: the two re-aimed test files pass, and neither names the endpoint or its stub [2893.86ms]\n(pass) leg (g) [M1] [M7]: a click on the fixture completes the todo, read through the page store, under the ceiling [1186.56ms]\n(pass) leg (g) [M7]: forced unminified, the url is over the ceiling and the exam says so rather than hanging [123.61ms]\n(pass) leg (g) [M7]: `open` refuses a data: url over the ceiling within 15 s, naming it [95.16ms]\n\npackages/tinyapp-exam/test/contract.test.ts:\n(pass) leg (h) [M5]: a clock that is not a non-empty string is refused before fn runs [0.44ms]\n(pass) leg (h) [M5]: a throwing fn rejects with its own message and the clock is restored [0.22ms]\n(pass) leg (i) [M5]: inside the contract the clock is pinned, and afterwards it is the real one again [0.28ms]\n(pass) leg (j) [M5][M6]: a fetch is a breach naming the url, and fetch plus the clock are restored [0.21ms]\n(pass) leg (k) [M5][M6]: a WebSocket is a breach naming the url, and WebSocket plus the clock are restored [0.20ms]\n(pass) leg (l) [M6]: after a green fn, fetch and WebSocket are the originals again [0.12ms]\n\n 185 pass\n 0 fail\n 876 expect() calls\nRan 185 tests across 24 files. [25.32s]\n"}, "verdict": "PASS"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-9/.ultrapowers/runs/9/

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
- status.json
- transcripts

### Plan

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-9/.ultrapowers/plan.md

### Residuals

- [ ] task 1 reviewer — packages/tinyapp-lint/src/context.ts:190 — `loadContext` has no named error path for a bad `--store` or a bad snapshot file: `storeModule.TABLES_SCHEMA as TablesSchema` is taken on faith (an undefined schema surfaces later as an opaque throw from inside `setTablesSchema`), and `JSON.parse(readFileSync(path,'utf8'))` on a malformed snapshot throws a SyntaxError that names neither the file nor the option that pointed at it. Task 3's exam drives `--store packages/tinyapp-lint/test/fixtures/ref-store.ts`, so a mistyped path there reads as a TinyBase internal error rather than as `lint:state: <path> exports no TABLES_SCHEMA`. Every Machine clause of this task is green either way, hence minor. Suggested fix, inside this task's own FILES: after the `import()`, `if (schema === undefined) throw new Error(`lint:state: ${store} exports no TABLES_SCHEMA`);` and wrap the per-file `JSON.parse` so the thrown message carries `relativeTo(root, path)`.
- [ ] task 1 reviewer — unverified: the task's Interfaces declare `assertView` (`tinyapp-exam`, BASE) as a Consumes symbol, but no file in this diff imports it — the consumption is indirect, via `reflectChecked` in packages/tinyapp-lint/src/context.ts:163 painting `data-checked` onto every `input` the way `REFLECT_CHECKED` does in a page. Leg (d) of the exam pins that attribute on `#todo-0`, `#todo-1` and every other `input`, which is the observable half of the contract
- [ ] task 1 reviewer — that `assertView` actually reads this markup as it reads a page's is settled only by Task 5's views exam (M1/M2 over `runLint`), not by anything this patch can run.
- [ ] task 5 reviewer — packages/tinyapp-lint/src/rules/views.ts:45-64 — `breaches` pairs each `assertView` failure to a view by scanning forward for the first view whose `view <selector>: ` prefix matches, and never advances `at` past a view it has already consumed. When two entries of the same spec carry the same `selector` and both breach, the second failure is attributed to the first entry. Nothing observable changes today because both `subject` (`view <view.selector> over …`) and `fix` (`root.querySelectorAll(view.selector)`) are derived from the selector alone, and the mis-paired entry has the same selector — so M2's two-entry run-7 spec and every fixture exam produce identical lines either way. It is a latent coupling: the moment `fixOf` reads any other field of the view (`view.text`, `view.attr`, `view.count`) it would read the wrong entry's. Fix: have `assertView`'s per-entry ordering carried explicitly — walk `views` and `failures` with a single cursor that advances past each consumed view (`at++` after the push), rather than re-testing the same index.
- [ ] task 2 reviewer — unverified: GLOBAL CONSTRAINT 1 — `bun run lint:state` over the fixture's own seeds, expected states and exams reports zero findings — is not directly executed for this task: the Proof carries no `Run:` line, and leg (e)'s spawn overrides `--expected`/`--exams` and asserts only `contains a matching line`, so a spurious finding on one of the fixture's own default snapshots or exams would not be caught by it. Leg (b) does settle the invariants rule's own share of the constraint (`run` over `await loadContext()` is `[]` with all seven fixture snapshots and one live invariant, exam evidence exit 0), and the constraint's remaining reach is cross-task (Task 1's M1 pins the summary line and exit 0
- [ ] task 2 reviewer — the sibling rules of Tasks 3-5 add their own lines). What would settle it: `bun run lint:state` with no flags, from the repository root, on the folded tree — exit 0 with the single `lint:state: 0 findings over 7 snapshots and 6 exams in <n> ms` line.
- [ ] task 4 reviewer — Leg (c) [M3] in `packages/tinyapp-lint/test/reachability.test.ts:422-436` does not isolate the behavior it names ("a state equal to a seed is reached in zero moves"). With the fixture's four callbacks in `CTX`, `[{}, {}]` is also reachable from `[{}, {}]` by a two-move walk: `setTodoCompleted(store, 'lint', true)` is `store.setPartialRow('todos', 'lint', {completed})` (client/src/storeData.ts:99), which creates row `lint` with the schema default `text: ''`, and `clearCompleted` then deletes it, leaving `[{}, {}]` again — both argument-free or drawn from the pool literal `'lint'`. So deleting the `seedKey === targetKey` shortcut at packages/tinyapp-lint/src/rules/reachability.ts:139-141 leaves leg (c) green. M3's literal criterion (`run` returns `[]`) is still verified, hence minor rather than blocking
- [ ] task 4 reviewer — the cheap strengthening is one extra assertion with `callbacks: {}`, where no walk is possible at all.

</details>

