This plan gives the fixture its first exam of the synced app itself: two real pages in the sandbox's Chromium, syncing through a module object on celld, judged against the expected state three ways. It exists because until now no exam read the Durable Object's rows or said that two clients agree, and because the runtime, the fork and the recorder were proved by hand on the laptop last night but nothing on the fleet can use them yet. After it, a TinyApp plan can name a convergence exam the way it names a state exam, the helper owns the runtime's start and stop, and the record of a run carries the walls that decide celld's GO or NO on the fleet.

**Parked:** parked: gate verdict BLOCKED

> do: run the fixture's convergence exam on the fleet; see: two pages through a real module object on celld agree, the object's own rows equal the expected state, a third fresh page converges to the same state, every transition of the session is on the evidence, and the exam's mutant is killed — with the runtime started and stopped by the helper, never by hand.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | do: ask the exam helper for a runtime; see: it starts celld on a disposable copy of the server, with the exam surface on or off as asked, on a port of its own, and hands back a client for the root's exam verbs — content, rows, fork, reload, discard, and the transitions socket — and when I stop it the port is free and the copy is gone. | red at BASE → green | — | — | — |
| 3 | do: declare a convergence exam — the server, the page, the module, an action, an expected state, a mutant; see: the helper starts the runtime, opens two pages that sync through the module, acts in the first, waits for the second to agree, reads the module's own content and rows, opens a third page, judges all three against the expected state, kills the mutant, and leaves the walls and every transition of the session on the evidence. | red at BASE → green | — | SURVIVED | — |
| 4 | do: type buy milk into one page of the app and press Enter while a second page is open on the same module; see: the second page shows it, the module object's own rows hold it, a third page opened afterwards shows it too, and an expected state that says otherwise fails the exam. | red at BASE, task failed | — | killed | — |

Act on these: 2 of 15

- task 1 reviewer — Global constraint "Every runtime an exam starts is stopped by the exam: SIGTERM ... never a hard kill, never a port left held" — the readiness-timeout path in `packages/tinyapp-exam/src/celld.ts` does not honour it. `end()` (celld.ts:93-100) sends SIGTERM and then escalates to `proc.kill('SIGKILL')` after 2 s, and the timeout branch (celld.ts:146-150) removes `dir` and throws without ever waiting for the port to clear the way `stop()` does (celld.ts:159-165). The task's own Context records the consequence of a hard kill: "a hard kill leaves the node draining with the port held, and the next `--port` dies on `Address already in use`". A real `celld dev` that is merely slower than `readyMs` would be SIGKILLed here. Leg (b) passes because its stand-in is `sleep 600`, which dies on SIGTERM alone, so the escalation is untested as well as unwanted. This constraint carries no `Check:` the driver ran, so it is graded minor on my reading of the prose. Fix inside this task's own FILES: drop the SIGKILL escalation and reuse the `stop()` shape on the timeout path — SIGTERM, `await proc.exited`, poll `portFree(port)` for at most 10 s, then `rmSync(dir, …)` — so that both the failure path and the success path leave the port bindable and the copy gone. — attention 3.0, actor implementer, verified / implementation
- task 3 reviewer — Narrow runtime-leak window in `packages/tinyapp-exam/src/convergence-move.ts` (`measure`): `startCelld` is awaited, and then `serveExam(html, …)` and `examSurface(runtime.url).events(…)` run *before* the `try` whose `finally` calls `runtime.stop()`. If `Bun.serve` or the events socket construction throws, the `celld dev` this call started is never stopped — its port and its temp copy stay held, which is exactly what the global constraint "Every runtime an exam starts is stopped by the exam" forbids. The persistence move has the same shape at BASE, but there the pre-`try` resource is only a `Bun.serve`, not a supervised child process. Fix: open the `try` immediately after `startCelld` and hold the page server and the events handle in the same `ours` object the browser already uses (`ours.server`, `ours.events`), so the existing `finally` lets all three go: `const ours: {browser?: Browser — attention 3.0, actor implementer, verified / implementation

Residuals: 15 from review

Amendments: 7 from workers

- task 1 — clause: M1's result list `{url, ws, dir, port, stop}` — the instance also carries `argv` and `env`, and `startCelld` takes an extra `onSpawn?: (spawn) => void` option. — Leg (a) requires the spawned argv and env to be pinned "by a `startCelld` option or export the exam can read the argv and env through, or by a probe binary script"; both routes are provided so the peer's exam can take either, and the M1 shape is a subset of what is returned.
- task 1 — clause: M1's `CELLD_ESBUILD=<root>/node_modules/.bin/esbuild` and the `node_modules` symlink target — `<root>` is read as the parent of the resolved `serverDir`, not as a separately discovered workspace root. — `serverDir` became a parameter, so `<root>` had to be defined from it; the parent of `serverDir` is exactly what `server/test/celld.ts` used at BASE (`join(SERVER, '..')`), which is the shape the task says to lift byte for byte.
- task 3 — files: packages/tinyapp-lint/src/capture-plugin.ts — added `convergenceExam`, `runConvergenceExam`, `startCelld`, `examSurface`, `SYNC_TIMEOUT_MS` and `CONVERGE_TIMEOUT_MS` to `EXAM_NO_OPS`, with a sentence in the doc comment saying why `convergenceExam` is a no-op rather than a second capture. — The lint capture child links a stub of `tinyapp-exam` built from that list; a name missing from it makes `bun run lint:state` die as `capture failed`. Without the edit, `lint:state` — one of my own Check proofs — goes red for the whole tree the moment task 4's `tests/state-exams/two-pages-converge.test.ts` folds in and imports `convergenceExam`. The persistence move's names are already there by the same rule.
- task 3 — files: packages/tinyapp-exam/test/fixtures/convergence/expected-one-row.json — created, holding `[{"todos":{"0":{"text":"buy milk","completed":false}}},{}]`. — The task's Context names this file and its exact contents as part of the stand-in, and leg (a) of the Proof passes its path as `expected`, but the Files list stops at `entry.html` and `app.ts`. The fixture is unusable without it and the peer's exam cannot write it, since the Context pins it as the fixture's own.
- task 3 — clause: M3's failure ladder — I read "the first failed step in run order" as: run every step and record it, then judge in the order the steps ran (sync wait, converge wait, A-vs-expected, object-vs-expected, C-vs-expected, view, mutant). A page C that differs from expected is spelled with the converge-timeout sentence, as M3 says, and that branch is unreachable while the two diffs above it hold — kept anyway, with a comment saying so, since M3 makes `ok` out of all three diffs. — M3 pins six sentences and an order but not whether a failed step short-circuits the rest of the run. Running everything before judging is the persistence move's own stated rule ("a red exam's evidence is as complete as a green one's"), and it is what makes a red run's `transitions.json` and `rows.json` worth reading.
- task 3 — clause: The mutant failure is `convergence: mutant survived — the perturbation <path> is not told apart from the expected state`; `converge_ms` is measured from the moment page C's store handle appears rather than from its navigation. — M3 pins `mutant survived` as a prefix and the Context asks for failures that are "a sentence a reader can act on", so the path is appended after the pinned words. The Context's measured wall for a third client converging is 0 ms, which is the wait itself and not the page load, so `converge_ms` times the wait; leg (a) only asks that it be a number of at least 0 either way.
- task 4 — clause: M1's spec list read as the fields the registration must carry rather than as an exhaustive literal: the registered spec also names `clock: '2026-01-01T00:00:00Z'` and `assets: {'/sqlite3.wasm': 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm'}`. — `clock` is a required field of `ConvergenceExamSpec`, so the spec does not typecheck without it. `assets` is load-bearing and measured: without the wasm mapping the page's SQLite persister never initialises, the app never mounts, and the run dies at `act: no element matches role=textbox name="New todo"` before any convergence leg is reached. The persistence exam on the same entry (`tests/state-exams/added-todo-survives-reload.test.ts`) names the same asset for the same reason.

<details><summary>Record</summary>

## fleet run-34 — parked

| | |
|---|---|
| verdict | `BLOCKED` |
| target | `popmechanic/tinyapp-fixture` at `1081e08aab43d5cead1fd09cacd5a1c8749ae07c` |
| engine | `6bcb97ec5f832158ed737538c5bac1ff913bef87` |
| plan | `.ultrapowers/plan.md` at `131029a4379d36e2a8f33d9554d4c1cc6e26b95e` |
| branch | `ultra/integration-run-34` |
| vm | `fleet-r34-2609171626-ca2e` |

### Checks

```json
{"mode": "gate", "stamp": "run-34", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-34/report.json", "branch": "ultra/integration-run-34", "gateCheck": {"verdict": "BLOCKED", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": false, "detail": "failed/blocked tasks left declared deliverables unproduced: [{\"task\": \"4\", \"files\": [\"AGENTS.md\", \"README.md\", \"tests/state-exams/two-pages-converge.test.ts\"]}]"}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 1, "suite": {"passed": true, "unattributed": [], "output": "bun test v1.4.2 (744846f84)\n\npackages/tinyapp-exam/test/convergence-move.test.ts:\n(pass) leg (a) [M1] [M2] [M3]: A acts, B agrees, the object and C agree, and the session is on the record [4366.21ms]\n(pass) leg (c) [M2]: after the honest run the runtime is stopped \u2014 its port bindable, its copy gone [0.24ms]\n(pass) leg (b) [M3]: an expected state page A never reaches is `page A differs from expected` [4413.51ms]\n(pass) leg (b) [M3]: a mutant that leaves the expected unchanged is `mutant survived` [4425.93ms]\n(pass) leg (b) [M3]: a view page B does not satisfy is `view not satisfied` [4402.70ms]\n(pass) leg (b) [M3]: `syncTimeoutMs: 1` is either already equal or `B never matched A within 1 ms`, and nothing else [1297.02ms]\n(pass) leg (d) [M4]: the honest record leaves the six files, and the walls count the transitions it wrote [0.95ms]\n(pass) leg (e) [M5]: a listed origin is continued and the same request unlisted is failed in the browser [249.03ms]\n(pass) convergence exam: convergence-move [4392.34ms]\n(pass) leg (f) [M6]: this file registers `convergence exam: convergence-move` [0.17ms]\n(pass) leg (f) [M6]: a red registration run as a child `bun test` exits non-zero with the failure on its output [4478.92ms]\n(pass) [M1]: the package names `convergenceExam` and `ConvergenceExamSpec` where the Proof asks [0.16ms]\n\n 12 pass\n 0 fail\n 106 expect() calls\nRan 12 tests across 1 file. [28.07s]\n"}, "verdict": "BLOCKED"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-34/.ultrapowers/runs/34/

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
- residuals-jev.jsonl
- residuals.jsonl
- state-exams
- status.json
- transcripts

### Plan

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-34/.ultrapowers/plan.md

### Residuals

- [ ] task 1 reviewer — Global constraint "Every runtime an exam starts is stopped by the exam: SIGTERM ... never a hard kill, never a port left held" — the readiness-timeout path in `packages/tinyapp-exam/src/celld.ts` does not honour it. `end()` (celld.ts:93-100) sends SIGTERM and then escalates to `proc.kill('SIGKILL')` after 2 s, and the timeout branch (celld.ts:146-150) removes `dir` and throws without ever waiting for the port to clear the way `stop()` does (celld.ts:159-165). The task's own Context records the consequence of a hard kill: "a hard kill leaves the node draining with the port held, and the next `--port` dies on `Address already in use`". A real `celld dev` that is merely slower than `readyMs` would be SIGKILLed here. Leg (b) passes because its stand-in is `sleep 600`, which dies on SIGTERM alone, so the escalation is untested as well as unwanted. This constraint carries no `Check:` the driver ran, so it is graded minor on my reading of the prose. Fix inside this task's own FILES: drop the SIGKILL escalation and reuse the `stop()` shape on the timeout path — SIGTERM, `await proc.exited`, poll `portFree(port)` for at most 10 s, then `rmSync(dir, …)` — so that both the failure path and the success path leave the port bindable and the copy gone.
- [ ] task 1 reviewer — Ownership overlap, recorded so rule 3 is not read as trespass: `packages/tinyapp-exam/src/index.ts` appears both in this task's Files block (`Modify:`) and in SIBLING FILES group 3 (popmechanic-tinyapp-fixture#99f1). The diff's change to it is purely additive — six export lines appended at index.ts:176-182, no existing line touched — so it is this task's declared path, not a sibling's file taken. Nothing for the implementer to do
- [ ] task 1 reviewer — the operator should expect task 3 to append to the same tail and merge both sets of exports rather than replace them.
- [ ] task 1 reviewer — Plan-text slip in the task's Context, corrected by the submission and worth recording so a later round does not 'fix' it back: the Context says the exam's `server/` is at "path `server` relative to the workspace root, which is two directories above the test file". The exam lands at `packages/tinyapp-exam/test/celld.test.ts`, so the workspace root is three directories above it, which is what the diff uses (`const ROOT = join(import.meta.dir, '..', '..', '..')`, celld.test.ts:359, with its comment saying three). The exam is green on that reading
- [ ] task 1 reviewer — two levels would have pointed at `packages/`.
- [ ] task 1 reviewer — concern: plan-defect: the Context sentence `/exam/discard?f=<facet>` "answers text `discarded <facet>`" describes the facet shape (server/index.ts, MODULE_SHAPE === 'facet')
- [ ] task 1 reviewer — the fixture runs the named shape, where server/facets/todos.ts answers the bare text `discarded`. Leg (d) asks only for text containing `discarded`, which is what it gets, so nothing here is unsatisfiable — but an exam that pinned the whole string `discarded todos@x` would be red for a reason no implementation can reach, the server being uneditable by this task.
- [ ] task 3 reviewer — Narrow runtime-leak window in `packages/tinyapp-exam/src/convergence-move.ts` (`measure`): `startCelld` is awaited, and then `serveExam(html, …)` and `examSurface(runtime.url).events(…)` run *before* the `try` whose `finally` calls `runtime.stop()`. If `Bun.serve` or the events socket construction throws, the `celld dev` this call started is never stopped — its port and its temp copy stay held, which is exactly what the global constraint "Every runtime an exam starts is stopped by the exam" forbids. The persistence move has the same shape at BASE, but there the pre-`try` resource is only a `Bun.serve`, not a supervised child process. Fix: open the `try` immediately after `startCelld` and hold the page server and the events handle in the same `ours` object the browser already uses (`ours.server`, `ours.events`), so the existing `finally` lets all three go: `const ours: {browser?: Browser
- [ ] task 3 reviewer — server?: ReturnType<typeof Bun.serve>
- [ ] task 3 reviewer — events?: {close(): Promise<void>}} = {}` … `finally { … await ours.events?.close().catch(() => {})
- [ ] task 3 reviewer — ours.server?.stop(true)
- [ ] task 3 reviewer — await runtime.stop().catch(() => {})
- [ ] task 3 reviewer — }`. No `Check:` command grades this constraint, so it is graded minor on my reading of it.
- [ ] task 3 reviewer — Advisory, no change required: receipt 01M2R4HH0D0000C59AXT7T5332 ("hollow: hollow left its mutant todos/0/text alive — the exam did not catch the wrong state") is the deliberate negative control of this exam, not a hole in it. `packages/tinyapp-exam/test/convergence-move.test.ts` runs the `mutant survived` leg with `{main: '/x/hollow.test.ts'}`, so that run's evidence directory is stemmed `hollow` and its `mutant.json` carries `{killed: false, path: 'todos/0/text'}` by design — the leg's whole point is a mutant that sets `todos/0/text` to the value the expected state already has, and it asserts `failure` starts with `convergence: mutant survived` and `record.mutant.killed === false`. The opposite direction is pinned too: leg (a) asserts `record.mutant.killed === true` and that `stores.a`, `.b`, `.c` and `.object` each equal `[{todos:{'0':{text:'buy milk',completed:false}}},{}]`, so a wrong state is caught by the exam. The `/x/hollow.test.ts` stem is the convention already used at BASE by `packages/tinyapp-exam/test/persistence-move.test.ts:835`
- [ ] task 3 reviewer — if the driver's hollow scan is to stay quiet over convergence evidence, the cheapest change is renaming that leg's `main` to `/x/mutant-survived.test.ts`, at the cost of diverging from the sibling move's naming.

</details>

