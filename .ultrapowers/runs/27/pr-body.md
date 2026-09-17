This plan strips every state exam of the commands it ran to re-check other exams, the linter's tests, the app's checks and the typecheck, so each exam proves only its own claim through the helper it already imports. It exists because those re-checks made one exam cost up to ten minutes and the run's final full suite grow from about two minutes to nineteen over four runs, and one such re-check was already failing before the last run started and killed a task. The user gets exams that answer in seconds, a suite that runs once at the end, and no task dying on another exam's failure.

**Merge-ready**

> When I run one exam it costs seconds, not minutes, because no exam runs any other exam, the linter or the typecheck for it.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | The nine exam files that spawned test runners and command-line tools prove only their own claim: none of them starts another exam, a package's tests, the linter, the typecheck or an install any more, each keeps its in-process legs — its passing count stays at or above its BASE count of legs that spawned nothing — and each still passes on its own. | none | — | killed, reviewer skipped | — |
| 2 | The twelve exam files that spawned greps over sibling files, the linter's tests, other exams and the typecheck prove only their own claim: none of them starts a process any more, each keeps its in-process legs — its passing count stays at or above its BASE count of legs that spawned nothing — and each still passes on its own. | none | — | killed, reviewer skipped | — |

Residuals: none

Amendments: 5 from workers

- task 2 — clause: set-todo-due.test.ts leg (e), the lint half: the Context offers "deleted, or rewritten as a call to `loadContext`/`runLint` from `packages/tinyapp-lint/src`". I read it as deleted-only. — Any import from `packages/tinyapp-lint/src` spells `tinyapp-lint`, which M1's own blocking pattern refuses in these twelve files, so the rewrite alternative is unreachable. The file's floor of 12 is computed without that leg, confirming deletion is the intended reading.
- task 2 — clause: store-history.test.ts leg (j), the package.json half: the Context says it is "kept as an in-process read". Kept, but as a read of the *parsed* `typecheck` script asserting its last two steps name `packages/tinyapp-history` then `packages/tinyapp-exam` — not as the verbatim line-text pin it was. — The original predicate's text is `bunx tsc -p packages/tinyapp-history --noEmit && bunx tsc -p packages/tinyapp-exam --noEmit"`, which M1 blocks twice over (`bunx `, `tsc`). Reading the order off the parsed script makes the same claim the leg's comment states — the new step immediately before the exam package's, which stays last — with no blocked literal in the file.
- task 1 — clause: Deleted derived-exam leg (m) (a spawned `grep` over `packages/tinyapp-lint/test/views.test.ts`) and styled-page leg (c) (a spawned read over sibling exam files' text), neither of which the Context's per-file sentence names explicitly. — The Context's own floor arithmetic excludes both — it says derived-exam 'keeps 6 (legs (e), (f), (h), (j), (k), (o))' and styled-page 'keeps 10' — and the Global constraint says a spawned `grep` over another test file is deleted, being the text pin on a sibling file that folds away. Leg (m) also names `tinyapp-lint`, which the M1 pattern blocks outright.
- task 1 — clause: Removed derived-exam's sixth header reading — the recorded amendment explaining why leg (g) spawned `bun <root>/packages/tinyapp-history/src/cli.ts` instead of `bun run history promote` — and replaced it with a reading explaining the in-process call. — That amendment existed only to describe how the leg spawned the CLI with a usable cwd. With the leg no longer spawning anything, the note described code that is gone, and its text ('spawned', 'bun run') matched the M1 pattern the file must now clear.
- task 1 — clause: Reworded prose and doc comments across all nine files: `bun test` → 'the test runner' / 'running this file by its path', `bun run lint:state` → `lint:state`, `bun install` → 'an install', and every occurrence of 'spawn'/'spawned' in comments. — The M1 blocking pattern is a plain `grep -lE` over the whole file and does not distinguish code from prose, so a doc comment naming a child command fails the first Proof line exactly as a live call would. The Context flags this ('a doc comment naming `bun test`').

<details><summary>Record</summary>

## fleet run-27 — gate-green

| | |
|---|---|
| verdict | `PASS` |
| target | `popmechanic/tinyapp-fixture` at `42d19c50aaecd92f13367b2b97324a3013bb62fb` |
| engine | `573495ac0c1cc98f2ccda336b2b8cae520d9de15` |
| plan | `.ultrapowers/plan.md` at `f9df7accfa34adce6066a3e2c421d1bfa74db5a4` |
| branch | `ultra/integration-run-27` |
| vm | `fleet-r27-2609170406-114d` |

### Checks

```json
{"mode": "gate", "stamp": "run-27", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-27/report.json", "branch": "ultra/integration-run-27", "gateCheck": {"verdict": "PASS", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 0, "suite": {"passed": true, "unattributed": [], "output": "s/two-open-todos-first-past-due.json loads through createTodosStore to its own content [0.45ms]\n(pass) leg (j) [M8] state-exams/seeds/two-open-todos.json loads through createTodosStore to its own content [0.40ms]\n(pass) leg (j) [M8] state-exams/seeds/two-todos-one-done.json loads through createTodosStore to its own content [0.41ms]\n(pass) leg (j) [M8] state-exams/seeds/two-todos-second-tagged.json loads through createTodosStore to its own content [0.46ms]\n(pass) leg (j) [M8] state-exams/expected/default-todos-first-done.json loads through createTodosStore to its own content [0.33ms]\n(pass) leg (j) [M8] state-exams/expected/default-todos-plus-buy-milk.json loads through createTodosStore to its own content [0.35ms]\n(pass) leg (j) [M8] state-exams/expected/derived-complete-first-todo.json loads through createTodosStore to its own content [0.39ms]\n(pass) leg (j) [M8] state-exams/expected/one-open-todo.json loads through createTodosStore to its own content [0.45ms]\n(pass) leg (j) [M8] state-exams/expected/second-delete-replaces-trash.json loads through createTodosStore to its own content [0.45ms]\n(pass) leg (j) [M8] state-exams/expected/still-empty.json loads through createTodosStore to its own content [0.37ms]\n(pass) leg (j) [M8] state-exams/expected/two-open-todos-first-trashed.json loads through createTodosStore to its own content [0.44ms]\n(pass) leg (j) [M8] state-exams/expected/two-open-todos-restored.json loads through createTodosStore to its own content [0.43ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-first-done.json loads through createTodosStore to its own content [0.41ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-first-due.json loads through createTodosStore to its own content [0.46ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-first-past-due-done.json loads through createTodosStore to its own content [0.40ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-one-done-filter-done.json loads through createTodosStore to its own content [0.48ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-one-done-filter-open.json loads through createTodosStore to its own content [0.56ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-one-done.json loads through createTodosStore to its own content [0.33ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-second-due.json loads through createTodosStore to its own content [0.27ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-second-pinned-done.json loads through createTodosStore to its own content [0.28ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-second-pinned.json loads through createTodosStore to its own content [0.26ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-second-tagged-filter-home.json loads through createTodosStore to its own content [0.31ms]\n(pass) leg (j) [M8] state-exams/expected/two-todos-second-tagged.json loads through createTodosStore to its own content [0.24ms]\n\ntests/state-exams/mutant-from-diff.test.ts:\n(pass) state exam: mutant-from-diff [949.97ms]\n(pass) editOf \u2014 one diff row to one mutant edit [M1] > (b) a `modified` row becomes the cell put back the way the seed had it [0.12ms]\n(pass) editOf \u2014 one diff row to one mutant edit [M1] > (c) an `added` row becomes the cell dropped [0.03ms]\n(pass) editOf \u2014 one diff row to one mutant edit [M1] > (d) a `removed` row becomes the cell put back the way the seed had it [0.02ms]\n(pass) mutantOf \u2014 editOf over the rows in list order [M2] > (e) over M2\u2019s one-row diff it is exactly the one reversed cell [0.03ms]\n(pass) mutantOf \u2014 editOf over the rows in list order [M2] > (f) over the two `added` rows of `todos/1` it is the two edits in that order [0.02ms]\n(pass) mutantOf \u2014 editOf over the rows in list order [M2] > (g) a row of the `$values` table is skipped, so a values-only diff is [] [0.01ms]\n(pass) mutantOf \u2014 editOf over the rows in list order [M2] > (h) over no rows at all it is [] [0.01ms]\n\n 331 pass\n 0 fail\n 628 expect() calls\nRan 331 tests across 21 files. [40.93s]\n"}, "verdict": "PASS"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-27/.ultrapowers/runs/27/

- approve-receipt.json
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

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-27/.ultrapowers/plan.md

</details>

