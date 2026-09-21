# The convergence exam proves convergence and nothing about the run that wrote it — its replayed Run lines, the spawned bash and the frozen sha go

**Grammar:** claims-v1

**Claim:** When the practice app's whole test suite runs on main, the convergence exam is green again, and it stays green when a later plan adds a snapshot — it proves that two browsers converge, and says nothing about the run that wrote it. (elicited)
**Summary:** This repairs the one red test on the practice app's main. It exists because the convergence exam carried a sentence that was only true of the run that wrote it — that no snapshot had changed — and run-36 was the first to add snapshots since (n=1 run). After this run the suite is green again, the rule that no test spawns another test runner holds with no exception, and it is the second factory run on a TinyApp, this time through the sync server.

**Goal:** `tests/state-exams/two-pages-converge.test.ts` keeps its convergence legs and loses the five legs that replay its own plan's `Run:` lines through a spawned `bash` against a frozen commit of this repository. One contract, one file.
**Closes:** #37

**Tech Stack:** Bun 1.4 + TypeScript 6 + TinyBase 9.7; the `tinyapp-exam` convergence exam over celld 0.5 (`/usr/local/bin/celld` on the fleet image) and `/headless-shell/headless-shell`.
**Exam command:** bun test {paths}
**Bootstrap:** bun install --frozen-lockfile

**Spec:** none on disk — issue #37 is the brief, and everything a worker needs is in the Context below. The sandbox holds no spec.
**Target:** popmechanic/tinyapp-fixture at `a6c0d9af4438db8d9120df8619aa599f08b7626f` (main after run-36).

## Global Constraints

- Check: bun run typecheck
- Check: bun run lint:state
- Check: git diff --quiet $ULTRA_BASE -- server client packages state-exams package.json bun.lock README.md AGENTS.md
- Check: ! grep -rnE 'bun test|bun run|Bun\.spawn|spawnSync|execSync' tests/state-exams | grep -vE ':[0-9]+:[[:space:]]*(//|\*|/\*)' | grep .
- The last check is red at BASE on purpose — measured at `a6c0d9a`, its one offender is line 165 of the file this plan's task repairs — and green once that task lands; it is here, run-wide, because after this plan it holds over every state exam with no exclusion.
- Nothing but the one exam file changes: the app, the server, the exam package, the snapshots and the two documents are byte-identical to BASE.

### Task 1: The convergence exam keeps its convergence legs and drops the five that replay a finished run

**Type:** implementation
**Review:** lean

**Files:**
- Modify: `tests/state-exams/two-pages-converge.test.ts`

**Claim:** The convergence exam is green on main again, stays green when a later plan adds a snapshot, and no longer spawns a shell or names a commit of this repository. (derived)
Machine: M1. On this task's tree `bun test tests/state-exams/two-pages-converge.test.ts` exits 0 on a machine with celld and a browser — at BASE it exits non-zero, on the test named `leg (b) [M2]: the fourth Run: line — no file under state-exams/ is created or changed`.
M2. `tests/state-exams/two-pages-converge.test.ts` contains no match for `Bun\.spawn|spawnSync|execSync` outside comment lines, and no 40-character hexadecimal string anywhere.
M3. The file still registers its convergence exam — the line `convergenceExam(SPEC);` is there exactly once — and still carries the tests named `leg (a) [M1]: the registration is the one M1 spells, read back in this process`, `leg (b) [M2]: the expected file is the persistence exam's own snapshot, and the seed is inside it`, and the two `leg (c) [M3]` tests; the five tests whose names contain `Run: line` are gone.

**Authorized-by:** #37; the operator's signed Claim of 2026-09-21.

**Interfaces:**
- Consumes: none
- Produces: none

**Context:** You see this task body and nothing else. `tests/state-exams/two-pages-converge.test.ts` (366 lines at BASE, merged by fixture runs 33 to 35) is the convergence exam: `convergenceExam(SPEC)` at line 123 opens two pages onto one module object on a real celld, types into the first, and holds the second page, the object's own rows and a third page to the expected state. Those legs are sound and stay exactly as they are. Beside them the file replays five `Run:` lines of the plan that wrote it, as permanent tests: a helper `runLine` (line 164) runs a command through `Bun.spawnSync(['bash', '-c', command], …)` with `ULTRA_BASE` defaulting to `BASE_SHA = '7be55c13db331973f1d1b79936b9f03c6ac4360f'` (line 131), `expectRunLine` (line 180) asserts exit 0, and five tests call it — named `the first Run: line` (a `sed | grep` over `client/src/TodoItem.tsx`), `the third Run: line` (a `grep` of a seed file), `the fourth Run: line` (`git diff --quiet $ULTRA_BASE -- state-exams`), `the fifth Run: line` (a `sed | grep` over `README.md`) and `the sixth Run: line` (the same over `AGENTS.md`). Two things are wrong with that, both measured on 2026-09-21 at `a6c0d9a`: the fourth line's sentence — no snapshot changed since that commit — was true of run-33's own task and is false for ever after run-36 added three snapshots, so main is red (full suite, laptop with Chrome: the only test failing on main and not at the previous base); and the spawned `bash` is the single offender of the run-wide rule that no state exam spawns a runner (`tests/state-exams/two-pages-converge.test.ts:165`), and the frozen sha the single 40-hex string under any test directory. A committed exam proves its claim through imports and calls; a comparison against a run's base is a line of that run's plan, paid once by its driver, never a leg that outlives the run. Delete `BASE_SHA`, `runLine`, `expectRunLine` and the five tests that call `expectRunLine`, together with the header-comment paragraphs that describe them (the file's header explains the fourth `Run:` line and the `$ULTRA_BASE` fallback around lines 62 to 69) and any import left unused — `bun run typecheck` is a run-wide check and an unused import or variable may fail it. What those five lines asserted needs no replacement: the seed's content is already asserted by the test `the expected file is the persistence exam's own snapshot, and the seed is inside it`, which reads the seed through `parse(...)` and compares rows; the `#todo-0` accessible name is asserted by leg (a)'s view checks; and the README and AGENTS sentences were claims about run-33's documents. Do not weaken, rename or reorder the legs that stay, and touch no other file — a run-wide check holds `server`, `client`, `packages`, `state-exams`, `README.md` and `AGENTS.md` byte-identical to BASE. The exam never skips: a machine without celld or a browser is its red, so run it with the `run_exam` tool or `bun test tests/state-exams/two-pages-converge.test.ts` on this sandbox, where `/usr/local/bin/celld` and `/headless-shell/headless-shell` are installed. If that command is red for a reason that is not one of the five deleted tests — celld will not start, the browser will not start — do not edit around it: say so in your hand-in note and through the `hand` tool, because that is a finding about the sandbox and not about this file.

**Proof:**
- Run: bun test tests/state-exams/two-pages-converge.test.ts
- Run: ! grep -nE 'Bun\.spawn|spawnSync|execSync' tests/state-exams/two-pages-converge.test.ts | grep -vE '^[0-9]+:[[:space:]]*(//|\*|/\*)' | grep .
- Run: ! grep -qE '[0-9a-f]{40}' tests/state-exams/two-pages-converge.test.ts
- Run: test "$(grep -c '^convergenceExam(SPEC);$' tests/state-exams/two-pages-converge.test.ts)" = 1 && test "$(grep -c 'Run: line' tests/state-exams/two-pages-converge.test.ts)" = 0 && grep -q 'the registration is the one M1 spells' tests/state-exams/two-pages-converge.test.ts && grep -q 'the seed is inside it' tests/state-exams/two-pages-converge.test.ts && test "$(grep -c 'leg (c) \[M3\]' tests/state-exams/two-pages-converge.test.ts)" -ge 2
- Legs: (a) [M1] the first `Run:` line — the exam itself exits 0 over this tree, where at BASE it exits non-zero; (b) [M2] the second and third `Run:` lines — no spawn outside a comment, and no 40-hex string; (c) [M3] the fourth `Run:` line — the registration is there exactly once, no test name carries `Run: line`, and the named legs that stay are still named.

**Stale-if:**
- issue-closed: #37
