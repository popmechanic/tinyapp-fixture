# The live probe writes down every try, the failed first one included

**Grammar:** claims-v1
**Claim:** do: launch this plan; see: after the run merges and deploys, the run's record says how long every try of the live check took, the failed first try included, so the deploy-window reading is one number on the record. (elicited)
**Summary:** Run-43's outside check retried until two browsers agreed, and wrote down only the try that passed. This makes it write down every try, how long each took and why a failed one failed, and still write that line when no try passes inside ninety seconds. After it, whether a fresh deploy stalls on its first open is a number in each run's record, read straight off the tag instead of pieced together from logs.
**Goal:** `server/probe/converge-live.ts` keeps its ninety-second retry loop and its six-key JSON line, and the line gains `converged` (a boolean) and `tries` (one object per attempt: `n`, `ms`, and `error` on a failed one); when the budget is spent with no converged attempt the same line is printed with `converged: false` before the non-zero exit; the plan carries the three publish lines (popmechanic/ultrapowers #835's pre-registered deploy-window reading; run-43 on this repository, tag `ultra/evidence/run-43`).
**Tech Stack:** Bun 1.4 + TypeScript + TinyBase 9.7; `celld` 0.5 at `/usr/local/bin/celld` on the fleet image for the probe's rehearsal; wrangler 4 for the deploy.
**Bootstrap:** bun install --frozen-lockfile
**Publish:** bun install --frozen-lockfile && bun run --cwd server deploy
**Verify:** bun server/probe/converge-live.ts $ULTRA_PUBLISH_URL
**Rollback:** cd server && bunx wrangler rollback --yes --message "fleet: the live check was red"
**Spec:** none on disk; run-43's record (`publish-verify.log` last line `{"facet":"todos@live-muf5q5df-2","attempts":2,"ready_ms":472,"connect_ms":837,"sync_ms":41,"converge_ms":404}` — the first attempt's wall is nowhere on it; 2026-09-24) and #835's pre-registration ("read `attempts` and the first-attempt wall on the next three fixture deploys") are the brief.
**Target:** popmechanic/tinyapp-fixture at `9a8a7347862a50a480bf332a26aee3730ed5c419` (main after run-43).

## Global Constraints

- Check: bun run typecheck
- Check: git diff --quiet $ULTRA_BASE -- client server/index.ts server/facets server/build-facets.ts server/wrangler.jsonc server/.env.deploy server/package.json packages state-exams tests package.json bun.lock AGENTS.md README.md
- Nothing but the probe file changes.
- What the run measures: the second point of #835's deploy-window reading — `attempts` and, now on the record itself, the wall and error of every try before the one that converged; a rollback, if any, lands on run-43's deploy (version 3).

### Task 1: The probe records every attempt's wall, and prints its line even when none converged

**Type:** implementation
**Review:** lean

**Files:**
- Modify: `server/probe/converge-live.ts`

**Claim:** do: point the probe at an origin; see: its one JSON line carries every try it made — how long each took, and why a failed one failed — says whether any converged, exits 0 when one did inside ninety seconds, and still prints that line before exiting non-zero when none did. (derived)
Machine: M1. Against a `celld dev` of `server/` started five seconds after the probe, the probe exits 0 and its last stdout line is one JSON object whose keys include `facet`, `attempts`, `ready_ms`, `connect_ms`, `sync_ms`, `converge_ms`, `converged` and `tries`, with `converged` equal to `true`, `attempts` equal to `1`, `tries` a list of exactly one object whose `n` is `1`, whose `ms` is a non-negative integer at least `connect_ms + sync_ms + converge_ms`, and which carries no `error` key.
M2. Against an origin that answers `200` on `/` but never accepts a sync socket, the probe exits non-zero between 80 and 130 seconds after it started, and its last stdout line is one JSON object with `converged` equal to `false`, `attempts` at least `1`, `tries` of length equal to `attempts`, every entry of `tries` carrying an integer `ms` and a string `error`, and `tries[0].ms` at least `60000`.
M3. Against `http://127.0.0.1:9` (nothing listening) the probe exits non-zero after `ready`'s own 30 s budget — between 25 and 60 seconds — and writes nothing to stdout: a root that never answers is not an attempt and gets no record line.
M4. The file contains the strings `tries`, `converged` and `/sync/` and does not contain the string `/exam/`.

**Authorized-by:** https://github.com/popmechanic/ultrapowers/issues/835 (the pre-registered deploy-window reading); run-43's record on this repository (tag `ultra/evidence/run-43`).

**Interfaces:**
- Consumes: `createWsSynchronizer(store, ws)` (`tinybase/synchronizers/synchronizer-ws-client`)
- Produces: `server/probe/converge-live.ts <origin>`

**Context:** `server/probe/converge-live.ts` at BASE (137 lines, run-43's) has `ready(origin, budgetMs = 30_000)` polling `fetch(origin + '/')`, a `budgetMs = 90_000` with `deadline = t0 + budgetMs`, an `attempt(n)` that opens A (with `clientWithRetry` against `deadline`) and B on facet `todos@live-<stamp>-<n>`, writes row `0` of `todos`, waits for B with a 30 000 ms limit, opens C and waits 10 000 ms, destroys every opened client and returns `{facet, connect_ms, sync_ms, converge_ms}`; a `while (true)` loop increments `attempts`, retries after a 2 000 ms sleep while at least 2 000 ms remain, else rethrows; one `console.log(JSON.stringify({facet, attempts, ready_ms, connect_ms, sync_ms, converge_ms}))`; `process.exit(0)`. Measured at BASE on 2026-09-24: against a `Bun.serve` that returns `200 ok` for every request and never upgrades, `clientWithRetry` retries the failing `createWsSynchronizer` (`error: tinybase:5`) until the deadline, the single attempt throws at about 90 s, the rethrow is an unhandled rejection, the exit is 1 at 91 s wall, and stdout is empty — that is the line this task adds. This task: the loop records, per attempt, `{n, ms}` where `ms` is the whole attempt's wall from its own start (the failed attempt's wall is the time it spent before its throw), and on a throw adds `error: String(err.message ?? err)` to that entry; the emitted line is `{facet, attempts, ready_ms, connect_ms, sync_ms, converge_ms, converged: true, tries}` on success; when the loop exhausts the budget the probe prints `{facet: null, attempts, ready_ms, connect_ms: null, sync_ms: null, converge_ms: null, converged: false, tries}` to stdout as its last line and then exits non-zero (`process.exit(1)`, never an unhandled rejection, so the line is flushed before the exit). `ready`'s own throw stays as at BASE — it happens before any attempt, and nothing is printed for it. The retry pause (2 000 ms) is not part of any attempt's `ms`. The six BASE keys keep their names and meaning so run-43's record and this run's read side by side; `ready_ms` is still measured from `t0`.

**Proof:**
- Run: bash -c 'cd server && bun build-facets.ts >/dev/null && rm -f .dev.vars && p=$((20000 + RANDOM % 20000)) && ( (sleep 5; CELLD_ESBUILD="$PWD/../node_modules/.bin/esbuild" CELLD_MAX_RSS_MB=512 exec celld dev . --no-watch --clean --port "$p") >"/tmp/celld-tries-$p.log" 2>&1 & echo $! >"/tmp/celld-tries-$p.pid" ); out=$(bun probe/converge-live.ts "http://127.0.0.1:$p"); rc=$?; pkill -P "$(cat "/tmp/celld-tries-$p.pid")" 2>/dev/null; kill "$(cat "/tmp/celld-tries-$p.pid")" 2>/dev/null; [ "$rc" = 0 ] || { echo "$out"; tail -n 20 "/tmp/celld-tries-$p.log"; exit 1; }; printf "%s\n" "$out" | tail -n 1 | python3 -c "import json,sys; o=json.loads(sys.stdin.read()); assert set(o)>={\"facet\",\"attempts\",\"ready_ms\",\"connect_ms\",\"sync_ms\",\"converge_ms\",\"converged\",\"tries\"}, o; assert o[\"converged\"] is True, o; assert o[\"attempts\"]==1, o; t=o[\"tries\"]; assert isinstance(t,list) and len(t)==1, o; assert t[0][\"n\"]==1 and \"error\" not in t[0], o; assert isinstance(t[0][\"ms\"],int) and t[0][\"ms\"]>=0, o; assert t[0][\"ms\"]>=o[\"connect_ms\"]+o[\"sync_ms\"]+o[\"converge_ms\"], o"' [M1]
- Run: bash -c 'p=$((20000 + RANDOM % 20000)); ( (exec bun -e "Bun.serve({port: $p, fetch() { return new Response(\"ok\"); }})") >/dev/null 2>&1 & echo $! >"/tmp/deadsync-$p.pid" ); sleep 1; start=$(date +%s); out=$(bun server/probe/converge-live.ts "http://127.0.0.1:$p" 2>/dev/null); rc=$?; end=$(date +%s); kill "$(cat "/tmp/deadsync-$p.pid")" 2>/dev/null; took=$((end - start)); [ "$rc" != 0 ] || { echo "rc=0 out=$out"; exit 1; }; [ "$took" -ge 80 ] && [ "$took" -le 130 ] || { echo "took=$took"; exit 1; }; printf "%s\n" "$out" | tail -n 1 | python3 -c "import json,sys; o=json.loads(sys.stdin.read()); assert o[\"converged\"] is False, o; assert isinstance(o[\"attempts\"],int) and o[\"attempts\"]>=1, o; t=o[\"tries\"]; assert len(t)==o[\"attempts\"], o; assert all(isinstance(x[\"ms\"],int) and isinstance(x[\"error\"],str) for x in t), o; assert t[0][\"ms\"]>=60000, o"' [M2]
- Run: bash -c 'test -f server/probe/converge-live.ts || exit 1; start=$(date +%s); out=$(bun server/probe/converge-live.ts http://127.0.0.1:9 2>/dev/null); rc=$?; end=$(date +%s); took=$((end - start)); [ "$rc" != 0 ] && [ "$took" -ge 25 ] && [ "$took" -le 60 ] && [ -z "$out" ] || { echo "rc=$rc took=$took out=$out"; exit 1; }' [M3]
- Run: grep -q 'tries' server/probe/converge-live.ts && grep -q 'converged' server/probe/converge-live.ts && grep -q '/sync/' server/probe/converge-live.ts && ! grep -q '/exam/' server/probe/converge-live.ts [M4]
- Legs: (a) with the server five seconds late the probe exits 0 on its first attempt and its line carries `converged` true and a one-entry `tries` whose entry is `n` 1, an integer `ms` no smaller than the three measured walls together, and no `error` [M1]; (b) against an origin that answers on `/` but never accepts a sync socket the probe exits non-zero between 80 and 130 seconds, and its last stdout line says `converged` false, `tries` one entry per attempt, each with an integer `ms` and a string `error`, the first at least 60 seconds [M2]; (c) against a dead port it exits non-zero after `ready`'s budget, between 25 and 60 seconds, with empty stdout [M3]; (d) the file names `tries`, `converged` and `/sync/` and never `/exam/` [M4].

**Stale-if:**
- path-absent: `server/probe/converge-live.ts`
