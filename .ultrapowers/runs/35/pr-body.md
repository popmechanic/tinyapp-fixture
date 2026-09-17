This plan gives the fixture its first exam of the synced app itself: two real pages in the sandbox's Chromium, syncing through a module object on celld, judged against the expected state three ways. It exists because until now no exam read the Durable Object's rows or said that two clients agree, and because the runtime, the fork and the recorder were proved by hand on the laptop last night but nothing on the fleet can use them yet. After it, a TinyApp plan can name a convergence exam the way it names a state exam, the helper owns the runtime's start and stop, and the record of a run carries the walls that decide celld's GO or NO on the fleet.

**Merge-ready**

> do: run the fixture's convergence exam on the fleet; see: two pages through a real module object on celld agree, the object's own rows equal the expected state, a third fresh page converges to the same state, every transition of the session is on the evidence, and the exam's mutant is killed — with the runtime started and stopped by the helper, never by hand.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 4 | do: type buy milk into one page of the app and press Enter while a second page is open on the same module; see: the second page shows it, the module object's own rows hold it, a third page opened afterwards shows it too, and an expected state that says otherwise fails the exam. | red at BASE → green | — | killed, reviewer skipped | — |

Residuals: 1 from review

Amendments: none

<details><summary>Record</summary>

## fleet run-35 — gate-green

| | |
|---|---|
| verdict | `PASS` |
| target | `popmechanic/tinyapp-fixture` at `7be55c13db331973f1d1b79936b9f03c6ac4360f` |
| engine | `b17f964ee20944852477e3f65ddd222614b1e751` |
| plan | `.ultrapowers/plan.md` at `f4524c627ad619756082f99e13f72dea3bfbbfb5` |
| branch | `ultra/integration-run-35` |
| vm | `fleet-r35-2609171715-b9dd` |

### Checks

```json
{"mode": "gate", "stamp": "run-35", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-35/report.json", "branch": "ultra/integration-run-35", "gateCheck": {"verdict": "PASS", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 0, "suite": {"passed": true, "unattributed": [], "output": "bun test v1.4.2 (744846f84)\n\ntests/state-exams/two-pages-converge.test.ts:\n(pass) convergence exam: two-pages-converge [4511.64ms]\n(pass) leg (a) [M1]: the registration is the one M1 spells, read back in this process [0.29ms]\n(pass) leg (a) [M1]: the first Run: line \u2014 #todo-0's element is the one carrying the todo's words as its name [3.82ms]\n(pass) leg (b) [M2]: the expected file is the persistence exam's own snapshot, and the seed is inside it [0.51ms]\n(pass) leg (b) [M2]: the third Run: line \u2014 the seed carries Learn TinyBase [2.51ms]\n(pass) leg (b) [M2]: the fourth Run: line \u2014 no file under state-exams/ is created or changed [3.30ms]\n(pass) leg (c) [M3]: the same spec run in-process is ok, and leaves the walls and the transitions of the session [4488.79ms]\n(pass) leg (c) [M3]: an expected state that says otherwise fails the exam, naming the species [4492.96ms]\n(pass) leg (d) [M4]: the fifth Run: line \u2014 README's State exams section names celld, CELLD_BIN and TINYAPP_BROWSER [3.64ms]\n(pass) leg (d) [M4]: the sixth Run: line \u2014 AGENTS.md's Verification section is the convergence exam, and the two-clients sentence is gone [4.24ms]\n\n 10 pass\n 0 fail\n 35 expect() calls\nRan 10 tests across 1 file. [13.59s]\n"}, "verdict": "PASS"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-35/.ultrapowers/runs/35/

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
- residuals-jev.jsonl
- residuals.jsonl
- state-exams
- status.json
- transcripts

### Plan

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-35/.ultrapowers/plan.md

### Residuals

- [ ] task 4 reviewer — concern: plan-defect: M1's field list for the registration omits two fields the spec needs, so a `tests/state-exams/two-pages-converge.test.ts` written from M1's words alone is red on its first run. Registered with exactly M1's `server`/`entry`/`module`/actions/`expected`/views/mutant, the exam fails with `act: no element matches role=textbox name="New todo"`: the convergence page is unseeded and unflagged, so `StoreLinks` mounts `useCreatePersister`, `getDb()` fetches `/sqlite3.wasm`, `serveExam` answers the page HTML for every path `assets` does not name, `onReady` never fires, and `client/src/App.tsx` is still painting `<div id="loading">` when `act` runs (evidence from that run: `walls.json` `store_ms` 212, `render` `skipped`, `action_ms` null — `__TINYAPP_STORE__` is handed out at store creation, so `waitStore` is not the wait that was missing). The registration needs `assets: {'/sqlite3.wasm': 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm'}` — the same line `tests/state-exams/added-todo-survives-reload.test.ts` already carries for the same page — plus `clock`, which is required on `ConvergenceExamSpec` and also unnamed by M1. With those two beside M1's fields I measured the exam green. This is a disclosure that M1's list is not exhaustive, not a park: leg (c) is satisfiable and I verified it is. Recorded in full on the kata thread so the exam's author sees it.

</details>

