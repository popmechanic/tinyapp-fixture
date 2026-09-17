This plan gives the fixture its first exam of the synced app itself: two real pages in the sandbox's Chromium, syncing through a module object on celld, judged against the expected state three ways. It exists because until now no exam read the Durable Object's rows or said that two clients agree, and because the runtime, the fork and the recorder were proved by hand on the laptop last night but nothing on the fleet can use them yet. After it, a TinyApp plan can name a convergence exam the way it names a state exam, the helper owns the runtime's start and stop, and the record of a run carries the walls that decide celld's GO or NO on the fleet.

**Parked:** parked: gate verdict BLOCKED

> do: run the fixture's convergence exam on the fleet; see: two pages through a real module object on celld agree, the object's own rows equal the expected state, a third fresh page converges to the same state, every transition of the session is on the evidence, and the exam's mutant is killed — with the runtime started and stopped by the helper, never by hand.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | do: ask the exam helper for a runtime; see: it starts celld on a disposable copy of the server, with the exam surface on or off as asked, on a port of its own, and hands back a client for the root's exam verbs — content, rows, fork, reload, discard, and the transitions socket — and when I stop it the port is free and the copy is gone. | red at BASE, task failed | — | — | — |
| 2 | do: open the app with a sync origin handed in before it loads; see: it syncs to that origin's todos module instead of the built-in server, hands its live store out for the exam to read, and a page opened without the handle is exactly the page it was. | red at BASE → green | — | — | — |
| 3 | do: declare a convergence exam — the server, the page, the module, an action, an expected state, a mutant; see: the helper starts the runtime, opens two pages that sync through the module, acts in the first, waits for the second to agree, reads the module's own content and rows, opens a third page, judges all three against the expected state, kills the mutant, and leaves the walls and every transition of the session on the evidence. | — | — | — | — |
| 4 | do: type buy milk into one page of the app and press Enter while a second page is open on the same module; see: the second page shows it, the module object's own rows hold it, a third page opened afterwards shows it too, and an expected state that says otherwise fails the exam. | — | — | — | — |

Residuals: 4 from review

Amendments: 2 from workers

- task 1 — clause: M3 says the first five verbs each `fetch <url>/exam/<verb>?…`; `fork(from, to)` sends one extra request first — it opens a WebSocket to `<ws>/sync/<to>` and closes it (best effort, 2 s cap, cached per name) before fetching `/exam/fork`. — Leg (d) requires the fork's transition to arrive with `module` `todos@y`. A module object learns its name only from the `x-tinyapp-module` header the root forwards on `/sync/<name>`; the root's exam verbs build a bare `Request('http://facet/exam/…')`, so measured at BASE a fork delivers `[{module:'',seq:1},{module:'',seq:1},{module:'',seq:2}]`. The server is frozen by the global constraints, so the dial through the existing sync route is the only way the leg passes; after it, the seed transition reads `{module:'todos@y',seq:2}`.
- task 1 — clause: `events(onTransition)` returns a handle that is both `{close()}` (M3's wording) and a thenable resolving to that same handle once the socket is open; `examSurface` also exposes `call(verb, query?)` beyond the six the Produces line names. — Leg (d) runs `events(cb)` immediately followed by `fork(...)`, so an exam that awaits the handle cannot outrun the root's socket registration while one that does not await still gets a working `close()`. `call` exists because leg (d) names `(surface as any).call('nope')` as one of its two readings of the 404 check — without it that reading is a TypeError rather than a rejection carrying `404`.

<details><summary>Record</summary>

## fleet run-33 — parked

| | |
|---|---|
| verdict | `BLOCKED` |
| target | `popmechanic/tinyapp-fixture` at `e3b1d490e54d6a1ff0a205ffcbc05a7f755b50bb` |
| engine | `6bcb97ec5f832158ed737538c5bac1ff913bef87` |
| plan | `.ultrapowers/plan.md` at `cd93730cdf15f84445b2519086e7ab3e45d91956` |
| branch | `ultra/integration-run-33` |
| vm | `fleet-r33-2609171606-ba67` |

### Checks

```json
{"mode": "gate", "stamp": "run-33", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-33/report.json", "branch": "ultra/integration-run-33", "gateCheck": {"verdict": "BLOCKED", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": false, "detail": "failed/blocked tasks left declared deliverables unproduced: [{\"task\": \"1\", \"files\": [\"packages/tinyapp-exam/src/celld.ts\", \"packages/tinyapp-exam/src/index.ts\", \"packages/tinyapp-exam/src/surface.ts\", \"packages/tinyapp-exam/test/celld.test.ts\", \"server/test/celld.ts\", \"server/test/exam-surface.test.ts\", \"server/test/recorder.test.ts\"]}, {\"task\": \"3\", \"files\": [\"packages/tinyapp-exam/src/browser.ts\", \"packages/tinyapp-exam/src/convergence-move.ts\", \"packages/tinyapp-exam/src/evidence.ts\", \"packages/tinyapp-exam/src/index.ts\", \"packages/tinyapp-exam/src/types.ts\", \"packages/tinyapp-exam/test/convergence-move.test.ts\", \"packages/tinyapp-exam/test/fixtures/convergence/app.ts\", \"packages/tinyapp-exam/test/fixtures/convergence/entry.html\"]}, {\"task\": \"4\", \"files\": [\"AGENTS.md\", \"README.md\", \"tests/state-exams/two-pages-converge.test.ts\"]}]"}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 1, "suite": {"passed": true, "unattributed": [], "output": "bun test v1.4.2 (744846f84)\n\nclient/test/sync-origin.test.ts:\n(pass) leg (a) [M1]: readSyncOrigin returns the ws:// and wss:// handles and undefined for every other case, including no window [0.11ms]\n(pass) leg (a) [M1]: readSyncOrigin is undefined with globalThis.window replaced by undefined, and the window is restored after [0.03ms]\n(pass) leg (a) [M1]: vite-env.d.ts declares __TINYAPP_SYNC__?: string on Window beside the two existing handles [0.06ms]\n(pass) leg (b) [M2]: syncUrl('todos') is the handle's /sync/todos with the handle set and SERVER's with it unset, SERVER unchanged [0.11ms]\n(pass) leg (b) [M2]: an unseeded, unflagged render with the handle set constructs the socket exactly once, with the handle's /sync/todos [303.91ms]\n(pass) leg (c) [M3]: that render exposes the Provider store itself, which follows setTodoCompleted, with one persister and one synchronizer [306.76ms]\n(pass) leg (d) [M4]: with no handle the page dials ws://localhost:9876/sync/todos once and leaves __TINYAPP_STORE__ undefined [306.94ms]\n(pass) leg (d) [M4]: a seeded page with the handle set dials nothing and is the seeded page it was at BASE [302.11ms]\n(pass) leg (d) [M4]: a flagged page with the handle set dials nothing and is the flagged page it was at BASE [302.21ms]\n(pass) leg (e) [M5]: the Key Files section of AGENTS.md names __TINYAPP_SYNC__, then /sync/todos, then store, in that order [0.55ms]\n\n 10 pass\n 0 fail\n 46 expect() calls\nRan 10 tests across 1 file. [1.66s]\n"}, "verdict": "BLOCKED"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-33/.ultrapowers/runs/33/

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
- status.json
- transcripts

### Plan

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-33/.ultrapowers/plan.md

### Residuals

- [ ] task 2 reviewer — Sibling-path overlap on `AGENTS.md`. The diff edits `AGENTS.md` (the new `__TINYAPP_SYNC__` bullet in `## Key Files`, patch lines 9-15), which this task's own Files block declares as `Modify:` and which M5 plus the first Proof `Run:` line require — but `AGENTS.md` is also listed under SIBLING FILES group 4 (popmechanic-tinyapp-fixture#7n6t). Both tasks therefore append to the same `## Key Files` list, so the two branches will collide on integration. The implementer could not have avoided this without abandoning M5
- [ ] task 2 reviewer — the fix is in the plan's file assignment, not in this tree. Nothing else in the diff leaves this task's FILES (`client/src/config.ts`, `client/src/Store.tsx`, `client/src/storeData.ts`, `client/src/vite-env.d.ts`, `client/test/sync-origin.test.ts` are all declared), no BASE file is deleted, and no other sibling-owned path is touched.
- [ ] task 2 reviewer — unverified: GLOBAL CONSTRAINT "No exam dials anything but loopback" is not settled by this diff. `readSyncOrigin` (client/src/storeData.ts) accepts any `ws://`/`wss://` string — exactly what M1 specifies — so the origin is scheme-checked but not host-checked
- [ ] task 2 reviewer — a harness handing in `ws://example.com` would be dialled. Enforcement of the loopback-only rule lives in the browser-side request block owned by sibling group 3 (`packages/tinyapp-exam/src/browser.ts`), which this patch does not touch. What would settle it: the sibling's block failing every non-127.0.0.1 request before it leaves the machine, exercised against a page carrying a non-loopback `__TINYAPP_SYNC__`.

</details>

