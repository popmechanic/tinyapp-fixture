This is the first fixture run of the state handshake: a Pin button on every todo, and a list that keeps pinned todos on top, built as two tasks in sequence where the second one's exam starts from the exact state the first one reported reaching. It exists to measure whether handing a state along through the run's own record, instead of an author typing it from memory, makes the second task's exam right the first time — the two plans that parked on 2026-09-14 parked on a hand-written state. After this run a pinned todo sits at the top of the list, and the run's record shows the consumer's exam went green from the posted state on the first fold, or shows the exact reason it did not.

**Merge-ready**

> Two sibling tasks on the fixture, one reaching a store state and one whose exam starts from it, fold green with the consumer seeded from what the producer actually posted and not from a file anyone wrote by hand.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | When I press Pin on a todo it is marked as pinned and its button now reads Unpin; pressing Unpin makes it exactly the todo it was; and nothing I already had changes shape. | red at BASE → green | — | killed, reviewer skipped | — |
| 2 | A pinned todo sits at the top of the list above every unpinned one, pinning changes nothing else about the order, and so the first box I can tick is the pinned todo's — starting from exactly the state the Pin task reached. | red at BASE → green | — | SURVIVED | — |

Residuals: 2 from review

Amendments: 1 from workers

- task 1 — files: packages/tinyapp-lint/test/{lint-cli,invariants,reachability,views}.test.ts — left unmodified — These four were in Files only so that a count or list pin one of them turned out to carry would be mine to loosen. None did: all four read their counts and lists off the tree with readdirSync, and they run 23 pass / 0 fail unchanged with the new cell, the fourteenth expected file and the new button on the row. Touching them to no purpose would have been the larger footprint.

<details><summary>Record</summary>

## fleet run-21 — gate-green

| | |
|---|---|
| verdict | `PASS` |
| target | `popmechanic/tinyapp-fixture` at `de77045e5a628bcab137a72d069db7555ffcc17f` |
| engine | `23c42db289d8833bff3101b2c251df10b9d4cf8a` |
| plan | `.ultrapowers/plan.md` at `c62101081b167aa42a64f206fe8b3019048d4d7f` |
| branch | `ultra/integration-run-21` |
| vm | `fleet-r21-2609160734-79e5` |

### Checks

```json
{"mode": "gate", "stamp": "run-21", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-21/report.json", "branch": "ultra/integration-run-21", "gateCheck": {"verdict": "PASS", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 0, "suite": {"passed": true, "unattributed": [], "output": "tate\" exited with code 1\n\n(pass) (e) [M5] `lint:state` over a seeded unreachable state exits 1 and prints the pinned line [3534.78ms]\n\npackages/tinyapp-lint/test/lint-cli.test.ts:\n(pass) (a) [M1] `bun run lint:state` exits 0 with one zero-findings summary line [1436.15ms]\n(pass) (b) [M2] `loadContext()` resolves to the pinned context [125.25ms]\n(pass) (c) [M3] the exam specs, in path order, and the pinned click entry [0.22ms]\n(pass) (d) [M4] `ctx.render` reflects `checked` and paints the two rows [7.24ms]\n$ bun packages/tinyapp-lint/src/cli.ts --rules \"/tmp/tinyapp-lint-rules-j85swu\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `runLint` over two rule modules, the CLI `--rules` run, and an absent directory [190.40ms]\n(pass) (f) [M6] `captureExams` leaves no exam file in the caller`s `require.cache` [111.42ms]\n\npackages/tinyapp-lint/test/invariants.test.ts:\n(pass) (a) [M1] `INVARIANTS` carries the todos invariant first, with the pinned predicate [0.33ms]\n(pass) (a) [M5] the due-date invariant is on `todos`, and holds of an absent or valid date [0.37ms]\n(pass) (b) [M2] the rule is named `invariants` and is quiet over the fixture [111.71ms]\n(pass) (c) [M3] the bad snapshot is exactly one finding, formatted character for character [0.24ms]\n(pass) (d) [M4] an empty snapshot is quiet, and a throwing invariant is one finding per row [0.21ms]\n(pass) (e) [M5] the CLI over one seeded violation exits 1 and names the row [1055.05ms]\n\npackages/tinyapp-lint/test/views.test.ts:\n(pass) (a) [M1] the `views` rule finds nothing over the fixture`s own six exams [131.55ms]\n(pass) (b) [M2] the run-7 spec is one finding naming the narrower selector `#todo-1` [2.02ms]\n(pass) (c) [M3] the `count: 1` spec is one finding reading `found 2` [1.84ms]\n(pass) (d) [M4] the corrected selector holds, and the `unchecked` breach names `#todo-0` [2.44ms]\n(pass) (e) [M5] a `view` of `undefined` asserts nothing, and a missing state is one finding [0.15ms]\n(pass) (f) [M6] `bun run lint:state -- --exams <dir>` exits 1 and prints that line [1390.66ms]\n\ntests/exams/run_21/state-exams/pinned-first.test.ts:\n(skip) the handshake pair > state exam: pinned-first\n(skip) the handshake pair > leg (a) [M1] two-todos-second-pinned-done.json holds exactly the state of M1\n(skip) the handshake pair > leg (a) [M1] the exam\u2019s seed is the posted file, and this file names no other seed\n(skip) the handshake pair > leg (b) [M2] the posted state is deep-equal to Task 1\u2019s expected file\n(skip) the handshake pair > leg (c) [M3] over the pinned state, todo-1 is painted before todo-0\n(skip) the handshake pair > leg (d) [M3] over the two-open content, todo-0 is painted before todo-1\n(skip) the handshake pair > leg (e) [M3] with both rows pinned, todo-0 is painted before todo-1\n(skip) the handshake pair > leg (f) [M3] after pinTodo of row 0, todo-0 is still painted before todo-1\n(skip) the handshake pair > leg (g) [M4] a state exam seeded from an absent posted file is red naming it, with no page opened\n\n9 tests skipped:\n(skip) the handshake pair > state exam: pinned-first\n(skip) the handshake pair > leg (a) [M1] two-todos-second-pinned-done.json holds exactly the state of M1\n(skip) the handshake pair > leg (a) [M1] the exam\u2019s seed is the posted file, and this file names no other seed\n(skip) the handshake pair > leg (b) [M2] the posted state is deep-equal to Task 1\u2019s expected file\n(skip) the handshake pair > leg (c) [M3] over the pinned state, todo-1 is painted before todo-0\n(skip) the handshake pair > leg (d) [M3] over the two-open content, todo-0 is painted before todo-1\n(skip) the handshake pair > leg (e) [M3] with both rows pinned, todo-0 is painted before todo-1\n(skip) the handshake pair > leg (f) [M3] after pinTodo of row 0, todo-0 is still painted before todo-1\n(skip) the handshake pair > leg (g) [M4] a state exam seeded from an absent posted file is red naming it, with no page opened\n\n 402 pass\n 9 skip\n 0 fail\n 1325 expect() calls\nRan 411 tests across 41 files. [135.06s]\n"}, "verdict": "PASS"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-21/.ultrapowers/runs/21/

- approve-receipt.json
- claude-version.txt
- engine.log
- events.jsonl
- exams
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

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-21/.ultrapowers/plan.md

### Residuals

- [ ] task 2 reviewer — INTERFACES lists `TABLES_SCHEMA` among this task's Consumes, but no symbol named `TABLES_SCHEMA` appears anywhere in the diff: `tests/exams/run_21/state-exams/pinned-first.test.ts` imports only `renderStatic`, `* as sd` (used for `createTodosStore` and `pinTodo`) and the `TodosContent`/`TodosStore` types, and `client/src/TodoList.tsx` consumes the schema only indirectly, by reading `table[id]?.pinned === true`. The consumption is real but structural — the `pinned` cell exists only because Task 1 added it to `TABLES_SCHEMA`, and Task 1's own exam leg (b) is what pins that schema shape. None of this task's clauses M1–M4 or Proof legs (a)–(g) names `TABLES_SCHEMA`, so adding a by-name reference here would be an assertion no leg asks for
- [ ] task 2 reviewer — the defect, such as it is, lives in the task's Interfaces list rather than in the diff. Advisory only — nothing to change in this tree.

</details>

