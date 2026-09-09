## fleet run-5 — parked

| | |
|---|---|
| verdict | `NEEDS_ACK` |
| target | `popmechanic/tinyapp-fixture` at `207e3bdca102c80dfc9ac3fc87e856fdb9bc3729` |
| engine | `3fb782b6de9a3cdbd17dbab957f718df15b8399d` |
| plan | `.ultrapowers/plan.md` at `d7b7dde07cbea6ef81e0983becc7438dee478b55` |
| branch | `ultra/integration-run-5` |
| vm | `fleet-r5-2609091736-782c` |

### Checks

```json
{"mode": "gate", "stamp": "run-5", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-5/report.json", "branch": "ultra/integration-run-5", "gateCheck": {"verdict": "NEEDS_ACK", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "repo": "/home/exedev/target"}, "gateCheckExit": 2, "acceptance": {"disposition": "suite", "exit": 0, "output": "s not satisfy is a render failure naming its selector [66.24ms]\\n(pass) leg (d) [M5]: a mutant the expected state already carries is a hollow exam [1.40ms]\\n(pass) leg (e) [M6]: an action that reaches for the network fails as that breach line [0.62ms]\\n(pass) leg (e) [M6]: an empty clock fails as the contract line, with no breach recorded [0.54ms]\\n(pass) state exam: state-exam [0.77ms]\\n(pass) leg (f) [M7]: a file calling stateExam with a hollow mutant exits non-zero saying so [38.39ms]\\n(pass) leg (g) [M8]: the two manifests and the thirteen exports of the sealed package [0.47ms]\\n(pass) leg (h) [M9]: both first-run exams are written as exams of this helper [0.24ms]\\n(pass) leg (h) [M9]: bun test over the two first-run exams exits 0 [60.18ms]\\n(pass) task 1, leg (a) [M1]: STATE_EXAM_TIMEOUT_MS is 120000, from the module and from the index [0.36ms]\\n(pass) task 1, leg (a) [M1]: the registered exam outlives --timeout 50 where a plain test does not [703.19ms]\\n\\npackages/tinyapp-exam/test/render-move.test.ts:\\n(pass) leg (a) [M1]: renderHtml inlines the seed, the bundle and the css, and leaves no script src [3.36ms]\\n(pass) leg (a) [M1]: every module script of the entry is replaced, not only the first [0.94ms]\\n(pass) leg (b) [M2]: every entry that holds contributes no string [1.26ms]\\n(pass) leg (c) [M2]: each failing entry contributes exactly one string naming its selector [0.63ms]\\n(pass) leg (c) [M2]: one non-conforming match fails the universal, and count still holds [0.26ms]\\n(pass) leg (c) [M2]: a list reports one string per failing entry, in list order [0.20ms]\\n(pass) leg (d) [M3]: no TINYAPP_RENDER_URL means skipped, and the renderer is never called [0.18ms]\\n(pass) leg (e) [M3]: an empty TINYAPP_RENDER_URL means skipped too [0.11ms]\\n(pass) leg (f) [M3]: an unset or empty ULTRA_RUN_DIR means skipped, renderer configured or not [0.15ms]\\n(pass) leg (g) [M4]: the configured move bundles the entry, posts one snapshot request and reports the view [79.71ms]\\n(pass) leg (g) [M4]: failures are assertView of the returned dom [66.61ms]\\n(pass) leg (h) [M5]: a non-2xx response rejects with render failed: [61.16ms]\\n(pass) leg (i) [M5]: a 200 with success false rejects, while a 200 with success true does not [114.18ms]\\n(pass) leg (j) [M6]: the tree manifests carry node-html-parser [0.15ms]\\n(pass) task 1, leg (b) [M2]: the reflection writes each box once and then only on a change [69.40ms]\\n(pass) task 1, leg (c) [M3]: no single quote anywhere in REFLECT_CHECKED [0.06ms]\\n(pass) task 1, leg (d) [M3]: REFLECT_CHECKED reads inputs, writes data-checked and observes [0.03ms]\\n(pass) task 1, leg (e) [M3]: the ran branch posts addScriptTag as exactly [{content: REFLECT_CHECKED}] [77.57ms]\\n(pass) task 1, leg (f) [M4]: the manifests carry @happy-dom/global-registrator for this package [0.17ms]\\n\\npackages/tinyapp-exam/test/mutant.test.ts:\\n(pass) leg (a) [M1]: applyMutant returns a new snapshot and leaves the input untouched [0.09ms]\\n(pass) leg (b) [M2]: a cell edit sets exactly that cell in the result [0.07ms]\\n(pass) leg (c) [M2]: a cell edit creates the table and the row when they are absent [0.04ms]\\n(pass) leg (d) [M3]: an absent cell edit removes that cell and leaves the rest of the row [0.07ms]\\n(pass) leg (d) [M3]: removing a row's last cell removes the row, and the table with it [0.05ms]\\n(pass) leg (e) [M4]: an absent row edit removes that row and leaves exactly the other row [0.04ms]\\n(pass) leg (e) [M4]: removing a table's last row removes the table too [0.03ms]\\n(pass) leg (f) [M5]: edits apply in list order, so a later edit to the same cell wins [0.04ms]\\n(pass) leg (g) [M6]: a cell edit's segment is <table>/<row>/<cell>, for a set and for a removal [0.02ms]\\n(pass) leg (h) [M6]: a row edit's segment is <table>/<row> [0.02ms]\\n(pass) leg (i) [M6]: segments come in list order joined by a comma, and no edits is the empty string [0.02ms]\\n\\n 114 pass\\n 0 fail\\n 459 expect() calls\\nRan 114 tests across 13 files. [2.37s]\"}\n"}, "verdict": "NEEDS_ACK"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-5/.ultrapowers/runs/5/

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

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-5/.ultrapowers/plan.md

### Residuals

- [ ] task 1 reviewer — Dead code in the exam file: `tests/state-exams/clear-completed.test.ts` declares `const SEED: TodosContent = [...]` ("The seed of M3, as the file must parse.") but never references it — leg (a) builds its store from an inline literal and leg (d) compares against an inline literal. The `type TodosContent` import exists only to type that unused constant. Nothing in the task requires it, and it invites drift between the constant and the literals the legs actually assert. Removing the constant and the now-unused type import leaves every leg unchanged (all seven tests still assert the same values).
- [ ] task 1 reviewer — Dead code in the exam file: `const SEED: TodosContent = [...]` (tests/state-exams/clear-completed.test.ts:25-33) and the `type TodosContent` import it is the only consumer of (line 21) are never referenced — leg (a) and leg (d) each build the seed literal inline instead. It is harmless (tests/ is outside the `typecheck` script's three projects, so no unused-local error) but it is leftover scaffolding, and worse, it is a second copy of a literal that already appears twice in the file. Either use `SEED` in leg (a)'s `createTodosStore(...)` and leg (d)'s `toEqual(...)` — which would also remove the duplication — or delete it.
- [ ] task 1 reviewer — Stale comment in client/src/storeData.ts:41 — "The three mutations below are the single code path shared by the UI's buttons and by any headless caller" now sits above four mutations, since `clearCompleted` was inserted after `deleteTodo` exactly where the task's Context asked. The count is the only wrong word
- [ ] task 1 reviewer — the claim it makes is still the one this task upholds.
- [ ] task 2 reviewer — unverified: the page half of M5 — the run's live question, whether the renderer honours the helper's injected `data-checked` reflection — is not settled by the exam's `exit 0` alone. `stateExam` asserts the five-entry `view` only when both `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR` are set
- [ ] task 2 reviewer — otherwise it records `"render": "skipped"` and asserts nothing about the DOM. The EXAM EVIDENCE shows `state exam: done-count` passing in 2827 ms (consistent with a real render, but not proof of one), and nothing in the evidence names which branch ran. On the skipped branch the user-facing half of the Claim (`the top bar reads "1 of 2 done"`) rests on leg (g)'s `grep -qF '{done} of {total} done'` over `client/src/DoneCount.tsx`, not on rendered markup. What would settle it: reading `"render"` in `<ULTRA_RUN_DIR>/state-exams/task-2/done-count-<pass>/walls.json` (and the presence of `dom.html`) from this task's exam record. This is advisory only — M5 explicitly discharges the page half on the skipped branch, so the submission satisfies the clause either way, and no edit to this diff is called for.

Closes #758
