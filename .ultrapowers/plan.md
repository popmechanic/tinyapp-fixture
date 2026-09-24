# The live probe gives a fresh deploy ninety seconds to converge, and says how many tries it took

**Grammar:** claims-v1
**Claim:** do: launch this plan; see: after the run merges and deploys, the live probe keeps trying the two-client convergence on fresh facets until the deploy answers within its budget, and the run's tag says published true with the walls and the number of attempts. (elicited)
**Summary:** Run-42 got further than any run before it: the deploy went up in five seconds, the probe's new wait found the server, both clients connected, and then the second client did not receive the first one's row inside ten seconds, so the deploy was rolled back and the record says published false. A minute later the same check passes in sixty milliseconds, so the object needs longer than ten seconds the first time it is loaded after a deploy. This gives the probe ninety seconds and more than one try, on a fresh facet each time, and makes it report the try that succeeded. After it, a deploy that works is judged as working, and one that never converges is still red.
**Goal:** `server/probe/converge-live.ts` runs its convergence attempt — open A and B on a fresh facet, A writes, B converges, C converges — inside a loop that gives the first sync up to 30 s and repeats the whole attempt on a fresh facet, after a two-second pause, until a 90 s budget from start is spent; the JSON line gains `attempts`; the plan carries the three publish lines (popmechanic/ultrapowers #835; run-42 on this repository, tag `ultra/evidence/run-42`).
**Tech Stack:** Bun 1.4 + TypeScript + TinyBase 9.7; `celld` 0.5 at `/usr/local/bin/celld` on the fleet image for the probe's rehearsal; wrangler 4 for the deploy.
**Bootstrap:** bun install --frozen-lockfile
**Publish:** bun install --frozen-lockfile && bun run --cwd server deploy
**Verify:** bun server/probe/converge-live.ts $ULTRA_PUBLISH_URL
**Rollback:** cd server && bunx wrangler rollback --yes --message "fleet: the live check was red"
**Spec:** none on disk; run-42's record (`publish-verify.log`: `B equals A: not within 10000 ms` at 11.7 s after a 5.3 s deploy; the same probe green from the laptop a minute later at `sync_ms` 63; run-40's `tinybase:5` at 386 ms; 2026-09-24) is the brief.
**Target:** popmechanic/tinyapp-fixture at `d71c0373494de1d9f122fff3962ca3cc9962fb62` (main after run-42).

## Global Constraints

- Check: bun run typecheck
- Check: git diff --quiet $ULTRA_BASE -- client server/index.ts server/facets server/build-facets.ts server/wrangler.jsonc server/.env.deploy server/package.json packages state-exams tests package.json bun.lock AGENTS.md README.md
- Nothing but the probe file changes.
- What the run measures: how many attempts a fresh deploy needs before two clients agree, whether that is inside ninety seconds, and whether the run writes `published: true`; a rollback, if any, now lands on run-42's own rollback target (version `63571db0`).

### Task 1: The probe retries the whole convergence inside a ninety-second budget

**Type:** implementation
**Review:** lean

**Files:**
- Modify: `server/probe/converge-live.ts`

**Claim:** do: point the probe at an origin; see: it reports the walls of the attempt that converged and how many attempts that took, exits 0 when one converged inside ninety seconds, and exits non-zero after the budget when none did. (derived)
Machine: M1. Against a `celld dev` of `server/` started five seconds after the probe, the probe exits 0 and its last stdout line is one JSON object carrying `facet`, `attempts`, `ready_ms`, `connect_ms`, `sync_ms` and `converge_ms`, with `attempts` equal to `1`, every `_ms` value a non-negative integer and `ready_ms` at least `3000`.
M2. Against `http://127.0.0.1:9` (nothing listening) the probe exits non-zero after `ready`'s own 30 s budget — the run takes at least 25 and at most 60 seconds; a root that never answers is not retried as a convergence failure.
M3. The file contains the strings `/sync/` and `attempts` and does not contain the string `/exam/`.

**Authorized-by:** https://github.com/popmechanic/ultrapowers/issues/835; run-42's record on this repository (tag `ultra/evidence/run-42`).

**Interfaces:**
- Consumes: `createWsSynchronizer(store, ws)` (`tinybase/synchronizers/synchronizer-ws-client`)
- Produces: `server/probe/converge-live.ts <origin>`

**Context:** `server/probe/converge-live.ts` at BASE (83 lines, run-42's) has `until(label, pred, limit = 10_000)`, `client(facet)`, `ready(origin, budgetMs = 30_000)` polling `fetch(origin + '/')` every 500 ms, `clientWithRetry(facet, deadline)`, a `budgetMs = 30_000` and `deadline = t0 + budgetMs`, then a single straight-line attempt: `A = await clientWithRetry(F, deadline)`, `B = await client(F)`, `connect_ms`, A sets row `0` of `todos`, `sync_ms = await until('B equals A', …)`, `C = await client(F)`, `converge_ms = await until('C converges', …)`, one `console.log(JSON.stringify({facet: F, ready_ms, connect_ms, sync_ms, converge_ms}))`, the three synchronizers destroyed, `process.exit(0)`; a throw anywhere is an unhandled rejection and a non-zero exit. This task makes the budget 90 000 ms from `t0` (`ready` keeps its own 30 000 ms sub-budget), wraps everything after `ready` in an `attempt()` that picks a fresh facet `todos@live-<stamp>-<n>` each time, opens A (with the retry, against the overall deadline) and B, writes the row, waits for B with a 30 000 ms limit (the first sync after a deploy is where run-42 spent its ten seconds), opens C and waits for C with the 10 000 ms limit, and returns `{facet, connect_ms, sync_ms, converge_ms}` with `connect_ms` measured from that attempt's start; on any throw inside an attempt every client the attempt opened is destroyed (each destroy in its own try), and, when at least 2 000 ms remain before the deadline, the loop sleeps 2 000 ms and tries again, else rethrows the last error — so a dead origin fails after `ready`'s 30 s (its own throw is not retried: a root that never answers is not a convergence failure), and an origin that answers but never converges fails after about 90 s. The JSON line is `{facet, attempts, ready_ms, connect_ms, sync_ms, converge_ms}` with `attempts` the 1-based index of the attempt that converged. The rehearsals are run-42's, with `attempts` added to the M1 key check and `attempts == 1` pinned (a late server converges on its first try, because `ready` absorbs the lateness).

**Proof:**
- Run: bash -c 'cd server && bun build-facets.ts >/dev/null && rm -f .dev.vars && p=$((20000 + RANDOM % 20000)) && ( (sleep 5; CELLD_ESBUILD="$PWD/../node_modules/.bin/esbuild" CELLD_MAX_RSS_MB=512 exec celld dev . --no-watch --clean --port "$p") >"/tmp/celld-retry-$p.log" 2>&1 & echo $! >"/tmp/celld-retry-$p.pid" ); out=$(bun probe/converge-live.ts "http://127.0.0.1:$p"); rc=$?; pkill -P "$(cat "/tmp/celld-retry-$p.pid")" 2>/dev/null; kill "$(cat "/tmp/celld-retry-$p.pid")" 2>/dev/null; [ "$rc" = 0 ] || { echo "$out"; tail -n 20 "/tmp/celld-retry-$p.log"; exit 1; }; printf "%s\n" "$out" | tail -n 1 | python3 -c "import json,sys; o=json.loads(sys.stdin.read()); assert set(o)>={\"facet\",\"attempts\",\"ready_ms\",\"connect_ms\",\"sync_ms\",\"converge_ms\"}, o; assert o[\"attempts\"]==1, o; assert all(isinstance(o[k],int) and o[k]>=0 for k in (\"ready_ms\",\"connect_ms\",\"sync_ms\",\"converge_ms\")), o; assert o[\"ready_ms\"]>=3000, o"' [M1]
- Run: bash -c 'test -f server/probe/converge-live.ts || exit 1; start=$(date +%s); bun server/probe/converge-live.ts http://127.0.0.1:9 >/dev/null 2>&1; rc=$?; end=$(date +%s); took=$((end - start)); [ "$rc" != 0 ] && [ "$took" -ge 25 ] && [ "$took" -le 60 ] || { echo "rc=$rc took=$took"; exit 1; }' [M2]
- Run: grep -q '/sync/' server/probe/converge-live.ts && ! grep -q '/exam/' server/probe/converge-live.ts && grep -q 'attempts' server/probe/converge-live.ts [M3]
- Legs: (a) with the server five seconds late the probe exits 0 on its first attempt, reports the six keys with non-negative integer walls, and `ready_ms` is at least 3000 [M1]; (b) against a dead port it exits non-zero after `ready`'s budget, between 25 and 60 seconds [M2]; (c) the file names `/sync/` and `attempts` and never `/exam/` [M3].

**Stale-if:**
- path-absent: `server/probe/converge-live.ts`
