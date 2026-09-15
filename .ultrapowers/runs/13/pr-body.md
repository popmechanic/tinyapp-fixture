This adds a three-way filter above the list. It exists because a filter is the classic case where the visible list and the stored rows differ, which is exactly what a state exam plus a view assertion catches. After the run, picking Open or Done hides the other rows and the top-bar count is unchanged.

**Merge-ready**

> I can switch the list between all, open and done todos, and the counter still counts every todo whatever the filter shows.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | I can tell the app to remember All, Open or Done and it keeps exactly the one I chose; a choice it does not know is ignored, and nothing I had saved before changes shape. | red at BASE → green | — | killed | — |
| 2 | Open means only what I have not done, Done means only what I have, All means everything, and a filter the app does not recognise counts as All. | red at BASE → green | — | — | — |
| 3 | I see All, Open and Done above the list; when I press Open only my open todos stay in the list and the button shows it is the one pressed, the page for Done shows only my done ones with Done marked, and the count in the top bar does not move. | red at BASE → green | — | killed | — |
| 4 | When I press Done only my done todos stay in the list, the Done button shows it is the one pressed and looks pressed, and the count in the top bar does not move. | red at BASE → green | — | killed | — |

Residuals: 4 from review

Amendments: 1 from workers

- task 1 — files: tests/state-exams/set-filter.test.ts — listed in FILES as `Test:` but not written by me; the tree carries no such file at handoff. — The Proof's `Test:` line names the same path, which reserves it for the peer's exam that the driver lays over this tree. I verified leg (f)'s shape locally under a throwaway filename (stateExam over `client/index.html`, seed `two-todos-one-done.json`, action `setFilter(store, 'bogus')`, expected `two-todos-one-done.json`, view `.todoItem` x2 and `#doneCount` `1 of 2 done`, mutant `todos/1/completed=false`) — it passes and the mutant is killed — then deleted it so the peer's exam lands on a clean path.

<details><summary>Record</summary>

## fleet run-13 — gate-green

| | |
|---|---|
| verdict | `PASS` |
| target | `popmechanic/tinyapp-fixture` at `f24d4059a76fa6c58a38a26ca2b60d4cd59fe336` |
| engine | `5f75eaaa59aa30801bbab19d0cb6698b3129203b` |
| plan | `.ultrapowers/plan.md` at `c722517635606b474de3340e26ba688a72be95ab` |
| branch | `ultra/integration-run-13` |
| vm | `fleet-r13-2609152327-6078` |

### Checks

```json
{"mode": "gate", "stamp": "run-13", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-13/report.json", "branch": "ultra/integration-run-13", "gateCheck": {"verdict": "PASS", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 0, "suite": {"passed": true, "unattributed": [], "output": "with the evidence still written [0.67ms]\n(pass) leg (e) [M5]: a missing binary with a callback action and an entry is the same red [2.01ms]\n(pass) leg (e) [M5]: the mutant move is unchanged \u2014 a green click spec still kills its mutant [0.22ms]\n(pass) leg (f) [M6]: the two re-aimed test files pass, and neither names the endpoint or its stub [2755.04ms]\n(pass) leg (g) [M1] [M7]: a click on the fixture completes the todo, read through the page store, under the ceiling [1300.67ms]\n(pass) leg (g) [M7]: forced unminified, the url is over the ceiling and the exam says so rather than hanging [149.34ms]\n(pass) leg (g) [M7]: `open` refuses a data: url over the ceiling within 15 s, naming it [83.52ms]\n\npackages/tinyapp-lint/test/references.test.ts:\n(pass) (a) [M1] the rule is named `references` and says nothing about the fixture [52.14ms]\n(pass) (b) [M2] the dangling `owner` is one finding, formatted exactly as pinned [0.20ms]\n(pass) (c) [M3] a resolvable reference, and a row without the cell, are both silent [0.09ms]\n(pass) (d) [M4] a snapshot without the referenced table names the missing row [0.06ms]\n(pass) (e) [M5] the fixture store module, and `lint:state` over one seeded violation [64.26ms]\n\npackages/tinyapp-lint/test/reachability.test.ts:\n(pass) (a) [M1] the rule is named `reachability`, and the fixture`s four expected states are each reached [1672.19ms]\n(pass) (b) [M2] an unreachable expected state is one finding, on the pinned line, in under 3,000 ms [1279.49ms]\n(pass) (c) [M3] a state equal to a seed is reached in zero moves [0.13ms]\n(pass) (d) [M4] the walk runs under the context`s clock, and a callback that dials breaches the contract [1.40ms]\n$ bun packages/tinyapp-lint/src/cli.ts --expected \"/home/exedev/target/.claude/ultrapowers/run-run-13/clones/integration/state-exams/lint-tmp-pPsOZz/expected\" --exams \"/home/exedev/target/.claude/ultrapowers/run-run-13/clones/integration/state-exams/lint-tmp-pPsOZz/exams\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `lint:state` over a seeded unreachable state exits 1 and prints the pinned line [1622.68ms]\n\npackages/tinyapp-lint/test/lint-cli.test.ts:\n(pass) (a) [M1] `bun run lint:state` exits 0 with one zero-findings summary line [2190.30ms]\n(pass) (b) [M2] `loadContext()` resolves to the pinned context [68.25ms]\n(pass) (c) [M3] the six exam specs, in path order, and the pinned click entry [0.18ms]\n(pass) (d) [M4] `ctx.render` reflects `checked` and paints the two rows [5.96ms]\n$ bun packages/tinyapp-lint/src/cli.ts --rules \"/tmp/tinyapp-lint-rules-Pzmi3u\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `runLint` over two rule modules, the CLI `--rules` run, and an absent directory [134.53ms]\n(pass) (f) [M6] `captureExams` leaves no exam file in the caller`s `require.cache` [76.78ms]\n\npackages/tinyapp-lint/test/invariants.test.ts:\n(pass) (a) [M1] `INVARIANTS` is the one todos invariant, with the pinned predicate [0.39ms]\n(pass) (b) [M2] the rule is named `invariants` and is quiet over the fixture [79.36ms]\n(pass) (c) [M3] the bad snapshot is exactly one finding, formatted character for character [0.20ms]\n(pass) (d) [M4] an empty snapshot is quiet, and a throwing invariant is one finding per row [0.21ms]\n(pass) (e) [M5] the CLI over one seeded violation exits 1 and names the row [136.72ms]\n\npackages/tinyapp-lint/test/views.test.ts:\n(pass) (a) [M1] the `views` rule finds nothing over the fixture`s own six exams [92.98ms]\n(pass) (b) [M2] the run-7 spec is one finding naming the narrower selector `#todo-1` [4.27ms]\n(pass) (c) [M3] the `count: 1` spec is one finding reading `found 2` [3.32ms]\n(pass) (d) [M4] the corrected selector holds, and the `unchecked` breach names `#todo-0` [6.04ms]\n(pass) (e) [M5] a `view` of `undefined` asserts nothing, and a missing state is one finding [0.26ms]\n(pass) (f) [M6] `bun run lint:state -- --exams <dir>` exits 1 and prints that line [2108.22ms]\n\n 226 pass\n 0 fail\n 960 expect() calls\nRan 226 tests across 28 files. [56.28s]\n"}, "verdict": "PASS"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-13/.ultrapowers/runs/13/

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

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-13/.ultrapowers/plan.md

### Residuals

- [ ] task 1 reviewer — Global constraint 3 ("A test that lists every table or every cell of a row is a finding") vs. leg (e) of the exam. `tests/state-exams/set-filter.test.ts` encodes the first `Run:` line as a module-level `SNAPSHOTS_AT_BASE` map holding the literal BASE bytes of all seven snapshot files — which spells out every cell of every `todos` row (`text`, `completed`) — and then asserts both byte-identity (`readFileSync(...) === bytes`) and a round-trip (`createTodosStore(content).getContent()).toEqual(content)`). In this task's own clone that is settled (EXAM EVIDENCE exit 0, and the driver's `git diff --quiet $ULTRA_BASE -- state-exams/...` exit 0), so nothing here blocks. The exposure is the fold: a concurrent sibling run that adds a defaulted cell to `todos` would make the round-trip assertion come back with the extra cell and turn leg (e) red, and one that rewrites any of the seven files turns the byte pin red — exactly the coupling constraint 3 warns about. This is the task's own text rather than the implementer's choice: the Proof's leg (e) and its first `Run:` line demand byte-identity of those seven files, and the exam file is peer-written and driver-laid, so I am not proposing an edit to it. Noted for the operator to weigh at publish. Worth recording in contrast: legs (a)–(c) do this right — they compare `getContent()[0]` against the store's own snapshot taken immediately before the call, never a hand-written row, so a sibling's new cell cannot redden them.
- [ ] task 1 reviewer — Two comments left stating the old literals beside assertions that are now floors. `packages/tinyapp-lint/test/views.test.ts` keeps `// Every one of the six asserts a view, and names a state that is there.` directly under the line changed to `expect(ctx.exams.length).toBeGreaterThanOrEqual(6);`, and `packages/tinyapp-lint/test/invariants.test.ts` keeps `// What the quiet result is measured over: the fixture's seven snapshots` over `expect(ctx.snapshots.length).toBeGreaterThanOrEqual(7);`. Nothing fails and no criterion is affected — the exact-count pins themselves are gone, as leg (k) and the sixth `Run:` line confirm — but the prose now contradicts the floors the constraint asked for, and the next reader of these files will take "six" and "seven" as the tree's real counts. Reword to "at least six" / "the fixture's snapshots, at least the seven of BASE".
- [ ] task 4 reviewer — unverified: the Claim's "looks pressed" is graded only as text. M5 — and legs (e)–(g) in `tests/state-exams/filter-done.test.ts` — assert the import line and the rule body by `grep`/`sed` over `client/src/filterBar.css`, and leg (d) asserts the `data-active="true"` attribute in the markup
- [ ] task 4 reviewer — nothing asserts that the bundled page actually loads `filterBar.css` or that the pressed button's computed `background` resolves to `--accent` (`#d81b60`). A stylesheet that the bundler dropped, or a `--accent` that is not in scope on the bar, would leave every leg of this exam green. This is the plan's own choice of exam and its fix lies outside this task's FILES — `tinyapp-exam`'s `assertView` has no computed-style assertion and `packages/tinyapp-exam` is not edited by this plan — so it blocks nothing. What would settle it: a `view` kind in `tinyapp-exam` that reads `getComputedStyle` on the matched element in the page the `stateExam` already bundles, asserting the pressed button's `background-color` is `rgb(216, 27, 96)`.

</details>

