This adds a due date to each todo and marks overdue ones in the list. It exists as the first of #867's three real-feature runs, the kind of state exam that reads a computed view (overdue is a function of the row and the exam's pinned clock). After the run every todo carries a `due` cell, and an open todo past its date is visibly overdue while a completed one is not.

**Merge-ready**

> I can give a todo a due date, and an open todo whose date has passed shows as overdue in the list.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | I can set a todo's due date through the store or clear it, a bad date is refused, and every todo I already had reads exactly as it did. | red at BASE → green | — | killed | — |
| 2 | Each todo in the list has a date box beside it, and a date I type there is kept on that todo. | red at BASE → green | — | killed | — |
| 3 | An open todo whose date has passed is marked overdue in the list, and ticking it off takes the mark away. | red at BASE → green | — | killed | — |
| 4 | When I type a past date into a todo's date box, that todo shows as overdue in the list and the others do not. | red at BASE → green | — | killed | — |

Residuals: 3 from review

Amendments: none

<details><summary>Record</summary>

## fleet run-12 — gate-green

| | |
|---|---|
| verdict | `PASS` |
| target | `popmechanic/tinyapp-fixture` at `f24d4059a76fa6c58a38a26ca2b60d4cd59fe336` |
| engine | `5f75eaaa59aa30801bbab19d0cb6698b3129203b` |
| plan | `.ultrapowers/plan.md` at `c60d7a8b522636803ac62f1b584eff04c907ee69` |
| branch | `ultra/integration-run-12` |
| vm | `fleet-r12-2609152326-fc68` |

### Checks

```json
{"mode": "gate", "stamp": "run-12", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-12/report.json", "branch": "ultra/integration-run-12", "gateCheck": {"verdict": "PASS", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 0, "suite": {"passed": true, "unattributed": [], "output": "and an entry is the same red [2.36ms]\n(pass) leg (e) [M5]: the mutant move is unchanged \u2014 a green click spec still kills its mutant [0.24ms]\n(pass) leg (f) [M6]: the two re-aimed test files pass, and neither names the endpoint or its stub [2774.26ms]\n(pass) leg (g) [M1] [M7]: a click on the fixture completes the todo, read through the page store, under the ceiling [1066.44ms]\n(pass) leg (g) [M7]: forced unminified, the url is over the ceiling and the exam says so rather than hanging [140.38ms]\n(pass) leg (g) [M7]: `open` refuses a data: url over the ceiling within 15 s, naming it [90.24ms]\n\npackages/tinyapp-lint/test/references.test.ts:\n(pass) (a) [M1] the rule is named `references` and says nothing about the fixture [69.34ms]\n(pass) (b) [M2] the dangling `owner` is one finding, formatted exactly as pinned [0.23ms]\n(pass) (c) [M3] a resolvable reference, and a row without the cell, are both silent [0.09ms]\n(pass) (d) [M4] a snapshot without the referenced table names the missing row [0.07ms]\n(pass) (e) [M5] the fixture store module, and `lint:state` over one seeded violation [53.78ms]\n\npackages/tinyapp-lint/test/reachability.test.ts:\n(pass) (a) [M1] the rule is named `reachability`, and the fixture`s four expected states are each reached [1491.21ms]\n(pass) (b) [M2] an unreachable expected state is one finding, on the pinned line, in under 3,000 ms [2039.84ms]\n(pass) (c) [M3] a state equal to a seed is reached in zero moves [0.15ms]\n(pass) (d) [M4] the walk runs under the context`s clock, and a callback that dials breaches the contract [1.06ms]\n$ bun packages/tinyapp-lint/src/cli.ts --expected \"/home/exedev/target/.claude/ultrapowers/run-run-12/clones/integration/state-exams/lint-tmp-yXZqE2/expected\" --exams \"/home/exedev/target/.claude/ultrapowers/run-run-12/clones/integration/state-exams/lint-tmp-yXZqE2/exams\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `lint:state` over a seeded unreachable state exits 1 and prints the pinned line [2328.63ms]\n\npackages/tinyapp-lint/test/lint-cli.test.ts:\n(pass) (a) [M1] `bun run lint:state` exits 0 with one zero-findings summary line [1916.81ms]\n(pass) (b) [M2] `loadContext()` resolves to the pinned context [87.69ms]\n(pass) (c) [M3] the exam specs, in path order, and the pinned click entry [0.44ms]\n(pass) (d) [M4] `ctx.render` reflects `checked` and paints the two rows [3.91ms]\n$ bun packages/tinyapp-lint/src/cli.ts --rules \"/tmp/tinyapp-lint-rules-Cde9mB\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `runLint` over two rule modules, the CLI `--rules` run, and an absent directory [132.75ms]\n(pass) (f) [M6] `captureExams` leaves no exam file in the caller`s `require.cache` [58.00ms]\n\npackages/tinyapp-lint/test/invariants.test.ts:\n(pass) (a) [M1] `INVARIANTS` carries the todos invariant first, with the pinned predicate [0.43ms]\n(pass) (a) [M5] the due-date invariant is on `todos`, and holds of an absent or valid date [0.38ms]\n(pass) (b) [M2] the rule is named `invariants` and is quiet over the fixture [51.97ms]\n(pass) (c) [M3] the bad snapshot is exactly one finding, formatted character for character [0.40ms]\n(pass) (d) [M4] an empty snapshot is quiet, and a throwing invariant is one finding per row [0.51ms]\n(pass) (e) [M5] the CLI over one seeded violation exits 1 and names the row [92.56ms]\n\npackages/tinyapp-lint/test/views.test.ts:\n(pass) (a) [M1] the `views` rule finds nothing over the fixture`s own six exams [74.64ms]\n(pass) (b) [M2] the run-7 spec is one finding naming the narrower selector `#todo-1` [1.58ms]\n(pass) (c) [M3] the `count: 1` spec is one finding reading `found 2` [1.13ms]\n(pass) (d) [M4] the corrected selector holds, and the `unchecked` breach names `#todo-0` [3.84ms]\n(pass) (e) [M5] a `view` of `undefined` asserts nothing, and a missing state is one finding [0.15ms]\n(pass) (f) [M6] `bun run lint:state -- --exams <dir>` exits 1 and prints that line [1615.85ms]\n\n 236 pass\n 0 fail\n 993 expect() calls\nRan 236 tests across 28 files. [45.08s]\n"}, "verdict": "PASS"}

```

## Publish fold

- attempt 1: suite red

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-12/.ultrapowers/runs/12/publish-fold/receipt.json

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-12/.ultrapowers/runs/12/

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

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-12/.ultrapowers/plan.md

### Residuals

- [ ] task 1 reviewer — unverified: `tests/state-exams/set-todo-due.test.ts` leg (a)'s round-trip pin deep-equals the whole `getContent()` result, including the values half — `expect(content).toEqual([{todos: {'0': {text: 'buy milk', completed: false}}}, {}])` (patch lines 795-798). That is exactly what M1 spells ("is exactly that seed"), so the implementer had no latitude here, and every leg is green in EXAM EVIDENCE
- [ ] task 1 reviewer — but the fourth Global Constraint says nothing in this plan pins a sibling plan's surface, naming the values schema explicitly, and a concurrent sibling run that adds a values schema with defaults would materialise cells into `content[1]` and redden this one assertion. Nothing in this diff can settle it — the sibling schema does not exist at BASE. What would settle it: re-running this exam on a tree that also carries the sibling plan's values schema
- [ ] task 1 reviewer — if it must be made merge-proof, asserting `content[0]` and the row's key set (the two things M1 is actually about) instead of the two-element literal. Recorded rather than fixed, since the pin as written is what the task's Machine clause requires.

</details>

