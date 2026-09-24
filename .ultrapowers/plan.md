# The live probe waits for the deploy to answer before it judges it

**Grammar:** claims-v1
**Claim:** do: launch this plan; see: after the run merges and deploys, the live probe waits until the deployed server answers, then checks convergence, and the run's tag says published true with the probe's walls. (elicited)
**Summary:** Run-40 was the practice app's first real deploy: the upload passed the edge, Cloudflare put the worker up, and the live check ran 386 milliseconds later and hit a socket that was not yet there, so the record says published false for a deploy that works. Run from the same box a minute later, the same check passes. This teaches the probe to wait for the server to answer, up to thirty seconds, before it opens its first client, so the check judges the deploy and not the clock. After it, the next run's record should carry the first published true.
**Goal:** `server/probe/converge-live.ts` polls the origin's root until it answers 200, up to 30 s, before opening client A, retries the first socket inside the same budget, and reports the wait as `ready_ms` beside its three walls; the plan carries the three publish lines so the merged tree deploys and is checked live (popmechanic/ultrapowers #835; run-40 on this repository, tag `ultra/evidence/run-40`).
**Tech Stack:** Bun 1.4 + TypeScript + TinyBase 9.7; `celld` 0.5 at `/usr/local/bin/celld` on the fleet image for the probe's rehearsal; wrangler 4 for the deploy.
**Bootstrap:** bun install --frozen-lockfile
**Publish:** bun install --frozen-lockfile && bun run --cwd server deploy
**Verify:** bun server/probe/converge-live.ts $ULTRA_PUBLISH_URL
**Rollback:** cd server && bunx wrangler rollback --yes --message "fleet: the live check was red"
**Spec:** none on disk; run-40's record (`publish-verify.log`: `tinybase:5` on the first socket, 386 ms after the deploy printed its URL; the same probe green from the run's VM at 1.0–1.3 s connect a minute later, 2026-09-24) is the brief.
**Target:** popmechanic/tinyapp-fixture at `51a4cc071513e814d33a5c5a63f2b12812800984` (main after run-40).

## Global Constraints

- Check: bun run typecheck
- Check: git diff --quiet $ULTRA_BASE -- client server/index.ts server/facets server/build-facets.ts server/wrangler.jsonc server/.env.deploy server/package.json packages state-exams tests package.json bun.lock AGENTS.md README.md
- Nothing but the probe file changes. The deploy, the account file and the README are byte-identical to BASE.
- What the run measures: whether the deployed worker answers a socket inside the probe's wait and the run writes `published: true`; and, if the check is still red, what a rollback answers now that a previous version exists (run-40 left version `63571db0`).

### Task 1: The probe waits for the origin, then judges it

**Type:** implementation
**Review:** lean

**Files:**
- Modify: `server/probe/converge-live.ts`

**Claim:** do: point the probe at an origin that comes up a few seconds later; see: it waits, then reports the wait and the same three walls and exits 0, and against an origin that never comes up it gives up after its budget and exits non-zero. (derived)
Machine: M1. Against a `celld dev` of `server/` started five seconds after the probe, the probe exits 0 and its last stdout line is one JSON object carrying `facet`, `ready_ms`, `connect_ms`, `sync_ms` and `converge_ms`, each `_ms` value a non-negative integer and `ready_ms` at least `3000`.
M2. Against `http://127.0.0.1:9` (nothing listening) the probe exits non-zero, and the run takes at least 25 and at most 60 seconds — the wait budget is spent before it gives up.
M3. The file contains the string `/sync/` and does not contain the string `/exam/`.

**Authorized-by:** https://github.com/popmechanic/ultrapowers/issues/835; run-40's record on this repository (tag `ultra/evidence/run-40`, `publish-verify.log`).

**Interfaces:**
- Consumes: `createWsSynchronizer(store, ws)` (`tinybase/synchronizers/synchronizer-ws-client`)
- Produces: `server/probe/converge-live.ts <origin>`

**Context:** `server/probe/converge-live.ts` at BASE (46 lines) reads `base` from `process.argv[2]`, makes `ws` by `replace(/^http/, 'ws')`, defines `until(label, pred, limit = 10_000)`, `client(facet)` (a `createMergeableStore`, a `createWsSynchronizer` over `new WebSocket(`${ws}/sync/${facet}`)`, `startSync`), opens A and B on `todos@live-<stamp>`, sets row `0` of `todos` from A, waits for B (`sync_ms`), opens C and waits (`converge_ms`), prints `JSON.stringify({facet: F, connect_ms, sync_ms, converge_ms})`, destroys the three synchronizers and exits 0; a socket that errors rejects `createWsSynchronizer` with `tinybase:5` (run-40's log), which is an unhandled throw and a non-zero exit. This task adds one wait before A: a `ready(base, budgetMs = 30_000)` loop that `fetch(base + '/')`es every 500 ms until the response is `ok` (the root answers `200 tinyapp-fixture root` in production and under celld alike), throwing `origin not answering within <budget> ms` when the budget is spent; then opens A inside the remainder of the same budget, retrying `client(F)` every 500 ms when `createWsSynchronizer` rejects, so a root that answers before its socket does is covered too; `ready_ms` is the wall from start to the first `ok` response, and the JSON line gains it as its second key: `{facet, ready_ms, connect_ms, sync_ms, converge_ms}`. `connect_ms` stays the wall from start to both A and B synced (it now includes the wait — a reader compares it to `ready_ms`). Nothing after A changes. The M1 rehearsal starts celld with a five-second `sleep` in front of it, in a backgrounded subshell that is itself inside parentheses — run-41's line put the `&` after the whole `cd server && … &&` chain, which backgrounded the chain and left the foreground outside `server/` with no port, three red rehearsals on a probe that passes by hand (2026-09-24) — so the probe is already polling when the server comes up; the M2 rehearsal measures wall seconds around the dead-port run. On the fleet image celld is `/usr/local/bin/celld`; the laptop has none, so M1 is red there for want of the binary and M2 is its own clock.

**Proof:**
- Run: bash -c 'cd server && bun build-facets.ts >/dev/null && rm -f .dev.vars && p=$((20000 + RANDOM % 20000)) && ( (sleep 5; CELLD_ESBUILD="$PWD/../node_modules/.bin/esbuild" CELLD_MAX_RSS_MB=512 exec celld dev . --no-watch --clean --port "$p") >"/tmp/celld-wait-$p.log" 2>&1 & echo $! >"/tmp/celld-wait-$p.pid" ); out=$(bun probe/converge-live.ts "http://127.0.0.1:$p"); rc=$?; pkill -P "$(cat "/tmp/celld-wait-$p.pid")" 2>/dev/null; kill "$(cat "/tmp/celld-wait-$p.pid")" 2>/dev/null; [ "$rc" = 0 ] || { echo "$out"; tail -n 20 "/tmp/celld-wait-$p.log"; exit 1; }; printf "%s\n" "$out" | tail -n 1 | python3 -c "import json,sys; o=json.loads(sys.stdin.read()); assert set(o)>={\"facet\",\"ready_ms\",\"connect_ms\",\"sync_ms\",\"converge_ms\"}, o; assert all(isinstance(o[k],int) and o[k]>=0 for k in (\"ready_ms\",\"connect_ms\",\"sync_ms\",\"converge_ms\")), o; assert o[\"ready_ms\"]>=3000, o"' [M1]
- Run: bash -c 'test -f server/probe/converge-live.ts || exit 1; start=$(date +%s); bun server/probe/converge-live.ts http://127.0.0.1:9 >/dev/null 2>&1; rc=$?; end=$(date +%s); took=$((end - start)); [ "$rc" != 0 ] && [ "$took" -ge 25 ] && [ "$took" -le 60 ] || { echo "rc=$rc took=$took"; exit 1; }' [M2]
- Run: grep -q '/sync/' server/probe/converge-live.ts && ! grep -q '/exam/' server/probe/converge-live.ts [M3]
- Legs: (a) with the server five seconds late the probe exits 0, reports the five keys with non-negative integer walls, and `ready_ms` is at least 3000 [M1]; (b) against a dead port it exits non-zero after at least 25 and at most 60 seconds [M2]; (c) the file names `/sync/` and never `/exam/` [M3].

**Stale-if:**
- path-absent: `server/probe/converge-live.ts`
