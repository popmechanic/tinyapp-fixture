This adds a single-step undo for deletion. It exists because an undo is a state transition in both directions, the first exam on the fixture whose action is two interactions with an assertion between. After the run a deleted todo returns with its text, its done state and its due date when Undo is pressed, and the button disappears once used.

**Merge-ready**

> After I delete a todo I can press Undo once and it comes back exactly as it was, and after that Undo is gone until the next delete.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | When I press Delete on a todo it leaves the list and waits, whole, in a trash that only ever holds the last one I deleted; an undo puts it back exactly as it was, an undo with nothing waiting does nothing, and Clear completed never fills the trash. | red at BASE → green | — | killed | — |
| 2 | After I delete a todo an Undo button appears; pressing it puts the todo back in the list exactly as it was, and the button is gone until I delete something again. | red at BASE → green | — | killed | — |

Residuals: 7 from review

Amendments: 3 from workers

- task 1 — clause: M9 / Proof leg (k): the Context measures `bun test packages/tinyapp-lint` at 10 red on this change, but at BASE in my tree it was 7 red. Legs `lint-cli` (c), `lint-cli` (f) and `views` (a) pin the exam count at 6 and only go red once a seventh exam file exists. I loosened all four files as M9 names them anyway, reading the exam list off the tree with a `>= 6` lower bound. — The three extra reds the Context counted come from the peer's `tests/state-exams/delete-to-trash.test.ts`, which is not in my tree while I work. Loosening them regardless is what M9 asks for and is what makes the suite green both before and after the driver lays that exam over the path — verified by standing a scratch exam in at that path, running the linter suite green (27 pass) and `lint:state` green (`0 findings over 10 snapshots and 7 exams`), then deleting it.
- task 1 — clause: M7 fixes the `trash` INVARIANTS entry's `table` and its predicate's two answers but not its `message`; I gave it its own sentence, 'a completed todo waiting in the trash has non-empty text', rather than reusing the todos sentence verbatim. — The invariants rule puts the message into the finding, so a distinct sentence names which table's row broke which rule. `invariants.test.ts` reads the todos sentence with `find` on (table, message) and with `toContain` over the message list, so both readings stay green; reusing the todos sentence would also have passed.
- task 2 — clause: client/src/UndoDelete.tsx — the button is written `<button type="button" id="undoDelete" onClick={…}>Undo</button>`, not the `id`-first JSX the Context sentence prescribes. — The Context gives two spellings that disagree: the prescribed JSX puts `id` first, but the markup it says the prototype measured is `<button type="button" id="undoDelete">Undo</button>`, and React emits attributes in JSX order. Leg (b)'s regex accepts either, but a peer writing the exam from the Context could `toContain` that quoted literal, and no proof reads the source order inside the file — so `type`-first satisfies both readings and `id`-first only one.

<details><summary>Record</summary>

## fleet run-14 — gate-green

| | |
|---|---|
| verdict | `PASS` |
| target | `popmechanic/tinyapp-fixture` at `f24d4059a76fa6c58a38a26ca2b60d4cd59fe336` |
| engine | `5f75eaaa59aa30801bbab19d0cb6698b3129203b` |
| plan | `.ultrapowers/plan.md` at `643e42917d0c3af65fc4d0d40e378c9bae977407` |
| branch | `ultra/integration-run-14` |
| vm | `fleet-r14-2609152352-a1d2` |

### Checks

```json
{"mode": "gate", "stamp": "run-14", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-14/report.json", "branch": "ultra/integration-run-14", "gateCheck": {"verdict": "PASS", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 0, "suite": {"passed": true, "unattributed": [], "output": "wser: ` line, with the evidence still written [0.68ms]\n(pass) leg (e) [M5]: a missing binary with a callback action and an entry is the same red [2.00ms]\n(pass) leg (e) [M5]: the mutant move is unchanged \u2014 a green click spec still kills its mutant [0.21ms]\n(pass) leg (f) [M6]: the two re-aimed test files pass, and neither names the endpoint or its stub [2676.22ms]\n(pass) leg (g) [M1] [M7]: a click on the fixture completes the todo, read through the page store, under the ceiling [1220.95ms]\n(pass) leg (g) [M7]: forced unminified, the url is over the ceiling and the exam says so rather than hanging [130.75ms]\n(pass) leg (g) [M7]: `open` refuses a data: url over the ceiling within 15 s, naming it [101.10ms]\n\npackages/tinyapp-lint/test/references.test.ts:\n(pass) (a) [M1] the rule is named `references` and says nothing about the fixture [71.52ms]\n(pass) (b) [M2] the dangling `owner` is one finding, formatted exactly as pinned [0.41ms]\n(pass) (c) [M3] a resolvable reference, and a row without the cell, are both silent [0.21ms]\n(pass) (d) [M4] a snapshot without the referenced table names the missing row [0.14ms]\n(pass) (e) [M5] the fixture store module, and `lint:state` over one seeded violation [85.76ms]\n\npackages/tinyapp-lint/test/reachability.test.ts:\n(pass) (a) [M1] the rule is named `reachability`, and the fixture`s expected states are each reached [823.85ms]\n(pass) (b) [M2] an unreachable expected state is one finding, on the pinned line, in under 3,000 ms [1244.67ms]\n(pass) (c) [M3] a state equal to a seed is reached in zero moves [0.21ms]\n(pass) (d) [M4] the walk runs under the context`s clock, and a callback that dials breaches the contract [1.02ms]\n$ bun packages/tinyapp-lint/src/cli.ts --expected \"/home/exedev/target/.claude/ultrapowers/run-run-14/clones/integration/state-exams/lint-tmp-dlkuxc/expected\" --exams \"/home/exedev/target/.claude/ultrapowers/run-run-14/clones/integration/state-exams/lint-tmp-dlkuxc/exams\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `lint:state` over a seeded unreachable state exits 1 and prints the pinned line [1543.28ms]\n\npackages/tinyapp-lint/test/lint-cli.test.ts:\n(pass) (a) [M1] `bun run lint:state` exits 0 with one zero-findings summary line [1156.96ms]\n(pass) (b) [M2] `loadContext()` resolves to the pinned context [76.99ms]\n(pass) (c) [M3] the exam specs, in path order, and the pinned click entry [0.18ms]\n(pass) (d) [M4] `ctx.render` reflects `checked` and paints the two rows [3.45ms]\n$ bun packages/tinyapp-lint/src/cli.ts --rules \"/tmp/tinyapp-lint-rules-Gml18Y\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `runLint` over two rule modules, the CLI `--rules` run, and an absent directory [164.88ms]\n(pass) (f) [M6] `captureExams` leaves no exam file in the caller`s `require.cache` [76.94ms]\n\npackages/tinyapp-lint/test/invariants.test.ts:\n(pass) (a) [M1] `INVARIANTS` carries the todos invariant, with the pinned predicate [0.36ms]\n(pass) (b) [M2] the rule is named `invariants` and is quiet over the fixture [48.28ms]\n(pass) (c) [M3] the bad snapshot is exactly one finding, formatted character for character [0.21ms]\n(pass) (d) [M4] an empty snapshot is quiet, and a throwing invariant is one finding per row [0.23ms]\n(pass) (e) [M5] the CLI over one seeded violation exits 1 and names the row [96.53ms]\n\npackages/tinyapp-lint/test/views.test.ts:\n(pass) (a) [M1] the `views` rule finds nothing over the fixture`s own exams [75.10ms]\n(pass) (b) [M2] the run-7 spec is one finding naming the narrower selector `#todo-1` [2.43ms]\n(pass) (c) [M3] the `count: 1` spec is one finding reading `found 2` [1.71ms]\n(pass) (d) [M4] the corrected selector holds, and the `unchecked` breach names `#todo-0` [3.25ms]\n(pass) (e) [M5] a `view` of `undefined` asserts nothing, and a missing state is one finding [0.21ms]\n(pass) (f) [M6] `bun run lint:state -- --exams <dir>` exits 1 and prints that line [991.02ms]\n\n 216 pass\n 0 fail\n 967 expect() calls\nRan 216 tests across 26 files. [36.47s]\n"}, "verdict": "PASS"}

```

## Publish fold

- attempt 1: conflict parked on client/src/TodoList.tsx

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-14/.ultrapowers/runs/14/publish-fold/receipt.json

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-14/.ultrapowers/runs/14/

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

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-14/.ultrapowers/plan.md

### Residuals

- [ ] task 1 reviewer — unverified: every whole-content comparison in the exam — legs (a) `expect(content).toEqual(readJson(...two-open-todos-first-trashed.json))`, (b), (c), (f) and the leg (j) round-trip `expect(loaded).toEqual(wanted)` at tests/state-exams/delete-to-trash.test.ts:561,606,646,701,770 — compares `getContent()` as a whole, so it also pins the values slot `content[1]` to the `{}` each snapshot file carries. Global constraint 1 says nothing may pin the store's values, and a concurrent sibling run adding a values schema with defaults would make `getContent()[1]` non-empty and turn all of these red at the fold (the same would be true of the BASE exams, so this is the plan's shape, not a divergence: M1/M2/M3/M6/M8 each say the content is 'exactly' or 'deep-equal to' the file). Nothing in this clone can settle it — this patch's own EXAM EVIDENCE is exit 0. What would settle it: folding the values-schema sibling onto this tree and re-running `bun test tests/state-exams/delete-to-trash.test.ts`
- [ ] task 1 reviewer — if it goes red, the fix is to compare `content[0]` (the tables slot) against `parsed[0]` in these legs rather than the whole content, which the M clauses' intent survives.
- [ ] task 1 reviewer — Stale comment left behind by the M9 loosening: packages/tinyapp-lint/test/views.test.ts still reads `// Every one of the six asserts a view, and names a state that is there.` directly under the assertion that was just changed from `toHaveLength(6)` to `toBeGreaterThanOrEqual(6)`. The count in the prose is exactly the pin M9 asked to stop spelling. Reword to 'Every one of them asserts a view, and names a state that is there.'
- [ ] task 2 reviewer — undeclared amendment: the Proof's leg (a) clause spells the second half of that leg as "a `bun:test` block beside it in which the parsed `state-exams/expected/two-open-todos-restored.json` is `toEqual` the seed literal of M1 written out in the test — `[{todos: {'0': {text: 'buy milk', completed: false}, '1': {text: 'walk the dog', completed: false}}}, {}]`". tests/state-exams/undo-delete.test.ts:171-188 reads that clause otherwise: it compares the parsed restored file against the *parsed* seed file (`expect(parsed).toEqual(seed)`) and then reads the named values one cell at a time, with no content literal in the test at all. The substance of the divergence is right — the prescribed literal would pin the whole key set of a todos row and of the store's values, which the first GLOBAL CONSTRAINT names as a finding, and the relative form still fails naming any cell, id or table by which the restored file differs from the seed — so this is the plan's own clause colliding with its own constraint, not a defect in the tree. The lapse is only that AMENDMENTS declares the button attribute order and not this
- [ ] task 2 reviewer — rule 9 grades an undeclared re-reading of a clause `minor`. The fix is an AMENDMENTS entry (`amends: clause`, leg (a) of the Proof) saying what the file's header comment at lines 72-80 already explains
- [ ] task 2 reviewer — do not undo the test.
- [ ] task 2 reviewer — The first GLOBAL CONSTRAINT ends "A test that lists every table, every cell of a row, or every value is a finding." tests/state-exams/undo-delete.test.ts:197 does exactly that for the M2 content: `expect(Object.keys(content[0]).sort()).toEqual(['todos', 'trash'])` lists every table of that content exhaustively. It is the one assertion in the file that departs from the habit the file's own header states ("a state is compared against a *parsed* seed or expected file, never against a content literal spelled in here"). Nothing the constraint names as the concurrent change — a cell added to `todos`, a values schema — adds a table, so this will very likely survive the fold, and the constraint carries no `Check:` the driver ran that enforces it over exam files (the four tinyapp-lint rules are invariants/reachability/references/views), which is why this is graded minor rather than blocking. Stating it relatively keeps everything the guard is for: the rows and cells M2 names are asserted one at a time on the lines below it and are untouched by this change.

</details>

