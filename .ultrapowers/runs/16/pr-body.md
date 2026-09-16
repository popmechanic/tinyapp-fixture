This adds a single-step undo for deletion. It exists because an undo is a state transition in both directions, the first exam on the fixture whose action is two interactions with an assertion between. After the run a deleted todo returns with its text, its done state and its due date when Undo is pressed, and the button disappears once used.

**Merge-ready**

> After I delete a todo I can press Undo once and it comes back exactly as it was, and after that Undo is gone until the next delete.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | When I press Delete on a todo it leaves the list and waits, whole, in a trash that only ever holds the last one I deleted; an undo puts it back exactly as it was, an undo with nothing waiting does nothing, and Clear completed never fills the trash. | red at BASE → green | — | killed | — |
| 2 | After I delete a todo an Undo button appears; pressing it puts the todo back in the list exactly as it was, and the button is gone until I delete something again. | red at BASE → green | — | killed | — |

Residuals: 13 from review

Amendments: 2 from workers

- task 1 — sim: tests/state-exams/set-todo-due.test.ts leg (g) — re-aimed the meta-pin on done-count.test.ts: it required the exact cell list ['completed','due','text'] and asserted the two-cell list it replaced was gone. It now asserts done-count still reads Object.keys(TABLES_SCHEMA.todos), that the outgrown two-cell list is still absent, and that 'completed' and 'text' are each named via toContain — no exact list of its own. — M9 orders done-count leg (o) to become toContain per cell and 'never a new exact list', which makes that leg red by construction. It is a BASE exam file outside FILES that the plan's Context did not know about (the Context describes a BASE with no `due` cell at all), so it was left red by the plan rather than deliberately frozen. Leaving it red would have put the tree's own suite at 276 pass / 1 fail.
- task 1 — files: tests/state-exams/set-todo-due.test.ts — edited, though it is outside FILES. — Same leg as above; no path inside FILES can satisfy both it and M9.

<details><summary>Record</summary>

## fleet run-16 — gate-green

| | |
|---|---|
| verdict | `PASS` |
| target | `popmechanic/tinyapp-fixture` at `e0762d4f3b1f550cce0a1a8e78f9eaea68b7d5ac` |
| engine | `5f75eaaa59aa30801bbab19d0cb6698b3129203b` |
| plan | `.ultrapowers/plan.md` at `94f8a077569ce20f042e1cf697a3cd6c0d27dd75` |
| branch | `ultra/integration-run-16` |
| vm | `fleet-r16-2609160037-4bda` |

### Checks

```json
{"mode": "gate", "stamp": "run-16", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-16/report.json", "branch": "ultra/integration-run-16", "gateCheck": {"verdict": "PASS", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 0, "suite": {"passed": true, "unattributed": [], "output": "an entry is the same red [1.39ms]\n(pass) leg (e) [M5]: the mutant move is unchanged \u2014 a green click spec still kills its mutant [0.14ms]\n(pass) leg (f) [M6]: the two re-aimed test files pass, and neither names the endpoint or its stub [2816.95ms]\n(pass) leg (g) [M1] [M7]: a click on the fixture completes the todo, read through the page store, under the ceiling [1181.58ms]\n(pass) leg (g) [M7]: forced unminified, the url is over the ceiling and the exam says so rather than hanging [150.90ms]\n(pass) leg (g) [M7]: `open` refuses a data: url over the ceiling within 15 s, naming it [116.22ms]\n\npackages/tinyapp-lint/test/references.test.ts:\n(pass) (a) [M1] the rule is named `references` and says nothing about the fixture [80.57ms]\n(pass) (b) [M2] the dangling `owner` is one finding, formatted exactly as pinned [0.23ms]\n(pass) (c) [M3] a resolvable reference, and a row without the cell, are both silent [0.09ms]\n(pass) (d) [M4] a snapshot without the referenced table names the missing row [0.06ms]\n(pass) (e) [M5] the fixture store module, and `lint:state` over one seeded violation [73.39ms]\n\npackages/tinyapp-lint/test/reachability.test.ts:\n(pass) (a) [M1] the rule is named `reachability`, and the fixture`s four expected states are each reached [4844.24ms]\n(pass) (b) [M2] an unreachable expected state is one finding, on the pinned line, in under 3,000 ms [2078.62ms]\n(pass) (c) [M3] a state equal to a seed is reached in zero moves [0.21ms]\n(pass) (d) [M4] the walk runs under the context`s clock, and a callback that dials breaches the contract [0.68ms]\n$ bun packages/tinyapp-lint/src/cli.ts --expected \"/home/exedev/target/.claude/ultrapowers/run-run-16/clones/integration/state-exams/lint-tmp-Gu7uau/expected\" --exams \"/home/exedev/target/.claude/ultrapowers/run-run-16/clones/integration/state-exams/lint-tmp-Gu7uau/exams\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `lint:state` over a seeded unreachable state exits 1 and prints the pinned line [2157.84ms]\n\npackages/tinyapp-lint/test/lint-cli.test.ts:\n(pass) (a) [M1] `bun run lint:state` exits 0 with one zero-findings summary line [4615.30ms]\n(pass) (b) [M2] `loadContext()` resolves to the pinned context [56.78ms]\n(pass) (c) [M3] the exam specs, in path order, and the pinned click entry [0.39ms]\n(pass) (d) [M4] `ctx.render` reflects `checked` and paints the two rows [6.32ms]\n$ bun packages/tinyapp-lint/src/cli.ts --rules \"/tmp/tinyapp-lint-rules-atk7ud\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `runLint` over two rule modules, the CLI `--rules` run, and an absent directory [165.92ms]\n(pass) (f) [M6] `captureExams` leaves no exam file in the caller`s `require.cache` [80.14ms]\n\npackages/tinyapp-lint/test/invariants.test.ts:\n(pass) (a) [M1] `INVARIANTS` carries the todos invariant first, with the pinned predicate [0.32ms]\n(pass) (a) [M5] the due-date invariant is on `todos`, and holds of an absent or valid date [0.41ms]\n(pass) (b) [M2] the rule is named `invariants` and is quiet over the fixture [65.76ms]\n(pass) (c) [M3] the bad snapshot is exactly one finding, formatted character for character [0.21ms]\n(pass) (d) [M4] an empty snapshot is quiet, and a throwing invariant is one finding per row [0.21ms]\n(pass) (e) [M5] the CLI over one seeded violation exits 1 and names the row [87.23ms]\n\npackages/tinyapp-lint/test/views.test.ts:\n(pass) (a) [M1] the `views` rule finds nothing over the fixture`s own six exams [104.18ms]\n(pass) (b) [M2] the run-7 spec is one finding naming the narrower selector `#todo-1` [2.55ms]\n(pass) (c) [M3] the `count: 1` spec is one finding reading `found 2` [1.88ms]\n(pass) (d) [M4] the corrected selector holds, and the `unchecked` breach names `#todo-0` [3.09ms]\n(pass) (e) [M5] a `view` of `undefined` asserts nothing, and a missing state is one finding [0.13ms]\n(pass) (f) [M6] `bun run lint:state -- --exams <dir>` exits 1 and prints that line [4719.37ms]\n\n 320 pass\n 0 fail\n 1140 expect() calls\nRan 320 tests across 34 files. [144.13s]\n"}, "verdict": "PASS"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-16/.ultrapowers/runs/16/

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

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-16/.ultrapowers/plan.md

### Residuals

- [ ] task 1 reviewer — GLOBAL CONSTRAINT "No exam and no source names a `due` cell" cannot hold on this tree, and the diff is right to ignore it. BASE `client/src/storeData.ts` already carries `due: {type: 'string'}` (merged by the earlier due-date run, commits #12/#14), together with the `due` invariant, `setTodoDue`, `tests/state-exams/set-todo-due.test.ts` and the linter leg `[M5] the due-date invariant is on todos`. The patch does not introduce the cell: it moves the existing `due` line, unchanged and with its comment, into the shared `TODO_CELLS` literal (patch lines 13-21), which is exactly what the task's Context orders ("Write the todo cells once and use that one literal for both tables ... so a cell a later change adds to a todo is a cell of a trashed todo by construction") and what the third global constraint (trash row copied whole) requires. The new exam `tests/state-exams/delete-to-trash.test.ts` names no `due` cell at all. Removing `due` to satisfy the constraint literally would redden the sibling-owned due-date exam and the linter suite. The constraint carries no `Check:`, so this is recorded as minor and blocks nothing
- [ ] task 1 reviewer — nothing inside this task's FILES should change for it — the plan text is what is stale.
- [ ] task 1 reviewer — plan-defect: M1, M2 and M6 spell whole-content literals (`[{...}, {}]`), so the exam legs that transcribe them — `tests/state-exams/delete-to-trash.test.ts` legs (b), (c), (f) and the round-trip of leg (j) — assert the store's values slot is exactly `{}`. GLOBAL CONSTRAINT 1 forbids "a test that lists ... every value", because a sibling run adds a values schema on this same base
- [ ] task 1 reviewer — if that schema declares any value with a `default`, TinyBase materialises it into `getContent()[1]` and every one of those `toEqual`s, plus the three new one-line expected JSON files, goes red at the publish fold. The submission is faithful to the clauses it was given (and to the BASE exams, which pin content the same way), and the current `filter` value is deliberately default-less, so the hazard is latent rather than live — which is why this is minor and its fix does not belong inside this task's FILES: narrowing the legs to `content[0]` would contradict M1/M2/M6 as written. Flagged for the operator to settle at the fold
- [ ] task 1 reviewer — if the sibling values schema lands with a default, the cheapest repair is to compare `content[0]` in legs (b)/(c)/(f) and in the leg (j) round-trip, leaving the M1 state exam (whose `expected` file the exam runner compares) as the one whole-content pin.
- [ ] task 2 reviewer — Global constraint (prose, no `Check:` behind it): "No exam and no source names a `due` cell." The new exam's header comment in `tests/state-exams/undo-delete.test.ts` contains the literal string `due` in a backticked cell name — "...row or the store's values, and no `due` cell is named anywhere in it...". The sentence is self-negating and creates no dependency on the cell, so nothing in the behaviour is wrong
- [ ] task 2 reviewer — but a mechanical grep for `due` over the exam set — which is how the constraint is worded — would flag this file. Reword the comment to avoid the cell name, e.g. "...and it names no cell a sibling run is adding concurrently". Everything else checks out: FILES footprint is exactly the three declared paths with no deletions and nothing sibling-owned
- [ ] task 2 reviewer — M1 leg (a) is the Proof's `stateExam` block verbatim plus the expected-file `toEqual` on the M1 seed literal (mutant todos/0 killed per the state-exam record)
- [ ] task 2 reviewer — M2 leg (b) and M3 leg (c) assert the static render's observable markup, and leg (c) would go red if `UndoDelete` were unmounted
- [ ] task 2 reviewer — M4 legs (d)–(h) spawn the five `Run:` lines verbatim (RUN EVIDENCE exit 0 on each)
- [ ] task 2 reviewer — Consumes `undoDelete(store: TodosStore): void` is imported from `./storeData` and called as named, Produces `UndoDelete` is exported and mounted directly after `<ClearCompleted />` as the Context directs
- [ ] task 2 reviewer — the component mirrors `ClearCompleted.tsx`'s shape with both hooks called before the `null` early return, so hook order is stable
- [ ] task 2 reviewer — the content literals in the exam are the plan's own M1/M2/M3 literals and pin no schema key set, cell list or value list, and they are green on this already-folded tree (which carries both the `due` cell — defaultless, so unmaterialised — and `VALUES_SCHEMA`), so global constraint 1 holds.

</details>

