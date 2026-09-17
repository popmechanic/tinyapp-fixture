This gives every todo a small tags box in its row, so a todo can carry words like home or urgent beside its text, and it turns those words into chips in the filter bar — one per tag in use — that narrow the list to the todos wearing that tag, with the count line saying how many todos are tagged at all. It exists because the fixture's filter bar can only split todos by done and not done, and a real list needs one more axis that the person chooses for themselves. After this run a todo carries the tags typed into its row, the chips appear and disappear as tags come into and go out of use, and the synced store that keeps every browser in step carries the tags exactly as it carries everything else.

**Parked:** parked: gate verdict BLOCKED

> When I type a few tags into a todo's row, the filter bar grows one chip for each tag anyone is using, clicking a chip shows me only the todos carrying that tag, and the count line tells me how many todos are tagged.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | A todo can be given tags and have them taken away again, the store keeps them as one tidy list with no blanks or repeats, a tag filter can be chosen and cleared, and the count line tells me how many todos are tagged. | red at BASE → green | — | killed, reviewer skipped | — |
| 2 | Every todo's row has a tags box after its date box; when I type `home, urgent` into one, that todo now carries those two tags, the count line says one todo is tagged, and the other rows are untouched. | red at BASE, task failed | — | SURVIVED | — |
| 3 | The filter bar shows one chip for each tag any todo is using, in alphabetical order and none when nothing is tagged; when I click a chip only the todos carrying that tag stay in the list, the chip looks pressed, the All/Open/Done choice still applies on top, and the counts above do not move. | red at BASE → green | — | killed, reviewer skipped | — |

Residuals: none

Amendments: 2 from workers

- task 1 — clause: Context's `tests/state-exams/set-filter.test.ts` leg (d) loosening: the clause says to loosen it to "the values schema's `filter` entry is exactly `{type: 'string'}` and a fresh store has no `filter` value". I kept the two pre-existing `VALUES_SCHEMA.filter` assertions and replaced only the whole-schema `toEqual({filter: {type: 'string'}})` with a read of the parsed schema's `filter` entry alone, never re-pinned to the new two-entry literal. — The leg carried four assertions, of which only the whole-schema `toEqual` goes red on the `tag` value. Loosening the other three too would have discarded measurement the clause did not ask me to drop.
- task 1 — clause: Context says the four linter test files are in Files "so that a pin one of them turns out to carry is yours to loosen". None turned out to carry one, so all four are unmodified and absent from the diff. — lint-cli reads the callback list with `arrayContaining` and the snapshot count with `toBeGreaterThanOrEqual(7)`; invariants.test finds entries by message and reads `INVARIANTS[0]`, which the appended entry leaves leading; reachability.test derives the callback list from `ctx.callbacks` and reports rather than pins its walk's wall clock; views.test uses `toBeGreaterThanOrEqual(6)`. Editing a green file would have been a change the plan did not need.

<details><summary>Record</summary>

## fleet run-24 — parked

| | |
|---|---|
| verdict | `BLOCKED` |
| target | `popmechanic/tinyapp-fixture` at `0fac23239655e7169b11a8be97fe9a1b7142ced5` |
| engine | `935fe1974c7a3d2a1aff4260a5ab65067f0d680b` |
| plan | `.ultrapowers/plan.md` at `b9f779b3ed872b979c26d630568c9ea23dd7ec3a` |
| branch | `ultra/integration-run-24` |
| vm | `fleet-r24-2609162311-4571` |

### Checks

```json
{"mode": "gate", "stamp": "run-24", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-24/report.json", "branch": "ultra/integration-run-24", "gateCheck": {"verdict": "BLOCKED", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": false, "detail": "failed/blocked tasks left declared deliverables unproduced: [{\"task\": \"2\", \"files\": [\"client/src/TagsInput.tsx\", \"client/src/TodoItem.tsx\", \"tests/state-exams/type-due-date.test.ts\", \"tests/state-exams/type-tags.test.ts\"]}]"}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 1, "suite": {"passed": true, "unattributed": [], "output": "ction and an entry is the same red [0.88ms]\n(pass) leg (e) [M5]: the mutant move is unchanged \u2014 a green click spec still kills its mutant [0.11ms]\n(pass) leg (f) [M6]: the two re-aimed test files pass, and neither names the endpoint or its stub [5190.94ms]\n(pass) leg (g) [M1] [M7]: a click on the fixture completes the todo, read through the page store, under the ceiling [2151.50ms]\n(pass) leg (g) [M7]: forced unminified, the url is over the ceiling and the exam says so rather than hanging [242.25ms]\n(pass) leg (g) [M7]: `open` refuses a data: url over the ceiling within 15 s, naming it [91.55ms]\n\npackages/tinyapp-lint/test/references.test.ts:\n(pass) (a) [M1] the rule is named `references` and says nothing about the fixture [241.87ms]\n(pass) (b) [M2] the dangling `owner` is one finding, formatted exactly as pinned [0.24ms]\n(pass) (c) [M3] a resolvable reference, and a row without the cell, are both silent [0.10ms]\n(pass) (d) [M4] a snapshot without the referenced table names the missing row [0.06ms]\n(pass) (e) [M5] the fixture store module, and `lint:state` over one seeded violation [188.70ms]\n\npackages/tinyapp-lint/test/reachability.test.ts:\n(pass) (a) [M1] the rule is named `reachability`, and the fixture`s four expected states are each reached [11772.52ms]\n(pass) (b) [M2] an unreachable expected state is one finding, on the pinned line [4272.34ms]\n(pass) (c) [M3] a state equal to a seed is reached in zero moves [0.14ms]\n(pass) (d) [M4] the walk runs under the context`s clock, and a callback that dials breaches the contract [0.63ms]\n$ bun packages/tinyapp-lint/src/cli.ts --expected \"/home/exedev/target/.claude/ultrapowers/run-run-24/clones/integration/state-exams/lint-tmp-uC3NxC/expected\" --exams \"/home/exedev/target/.claude/ultrapowers/run-run-24/clones/integration/state-exams/lint-tmp-uC3NxC/exams\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `lint:state` over a seeded unreachable state exits 1 and prints the pinned line [4259.00ms]\n\npackages/tinyapp-lint/test/lint-cli.test.ts:\n(pass) (a) [M1] `bun run lint:state` exits 0 with one zero-findings summary line [10803.51ms]\n(pass) (b) [M2] `loadContext()` resolves to the pinned context [196.00ms]\n(pass) (c) [M3] the exam specs, in path order, and the pinned click entry [0.33ms]\n(pass) (d) [M4] `ctx.render` reflects `checked` and paints the two rows [16.22ms]\n$ bun packages/tinyapp-lint/src/cli.ts --rules /tmp/tinyapp-lint-rules-jNNKiU\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `runLint` over two rule modules, the CLI `--rules` run, and an absent directory [331.27ms]\n(pass) (f) [M6] `captureExams` leaves no exam file in the caller`s `require.cache` [198.89ms]\n\npackages/tinyapp-lint/test/invariants.test.ts:\n(pass) (a) [M1] `INVARIANTS` carries the todos invariant first, with the pinned predicate [0.17ms]\n(pass) (a) [M5] the due-date invariant is on `todos`, and holds of an absent or valid date [0.21ms]\n(pass) (b) [M2] the rule is named `invariants` and is quiet over the fixture [218.68ms]\n(pass) (c) [M3] the bad snapshot is exactly one finding, formatted character for character [0.50ms]\n(pass) (d) [M4] an empty snapshot is quiet, and a throwing invariant is one finding per row [0.49ms]\n(pass) (e) [M5] the CLI over one seeded violation exits 1 and names the row [1662.44ms]\n\npackages/tinyapp-lint/test/views.test.ts:\n(pass) (a) [M1] the `views` rule finds nothing over the fixture`s own six exams [274.49ms]\n(pass) (b) [M2] the run-7 spec is one finding naming the narrower selector `#todo-1` [2.94ms]\n(pass) (c) [M3] the `count: 1` spec is one finding reading `found 2` [2.07ms]\n(pass) (d) [M4] the corrected selector holds, and the `unchecked` breach names `#todo-0` [3.93ms]\n(pass) (e) [M5] a `view` of `undefined` asserts nothing, and a missing state is one finding [0.15ms]\n(pass) (f) [M6] `bun run lint:state -- --exams <dir>` exits 1 and prints that line [11095.37ms]\n\n 680 pass\n 0 fail\n 2070 expect() calls\nRan 680 tests across 53 files. [1665.74s]\n"}, "verdict": "BLOCKED"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-24/.ultrapowers/runs/24/

- claude-version.txt
- engine.log
- events.jsonl
- frontier
- gate-receipt.json
- kata.jsonl
- pr-body.md
- publish-fold
- receipt.json
- report.json
- state-exams
- status.json
- transcripts

### Plan

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-24/.ultrapowers/plan.md

</details>

