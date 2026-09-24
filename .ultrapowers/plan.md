# The practice app deploys itself after its merge and proves two browsers still converge on the live server

**Grammar:** claims-v1
**Claim:** do: launch this plan; see: after the run merges, the practice app's sync server is on its production Durable Object, a probe against the live URL shows a second client receives what a first one wrote, and the run's tag says published true or false with the probe's exit. (elicited)
**Summary:** The engine can now deploy after its own merge and check the deploy live, and this is the first plan to ask it to. It exists because the practice app has never been deployed, so nothing yet says whether a deploy through the fleet's edge works, whether the live server accepts a sync socket, or whether the check can roll a bad deploy back. After this run you can open the app's server URL from the run's record, and the record says whether the first live convergence held.
**Goal:** a socket-only live probe, `server/probe/converge-live.ts <origin>`, that exits 0 when a second and a third client converge on what a first wrote through the live `/sync/` socket and non-zero otherwise, using no exam surface; the server's `wrangler.jsonc` naming the account and its workers.dev route; and the three publish lines below, which the sandbox runs after its self-merge — the deploy through the `cloudflare` edge integration, the probe against the URL the deploy printed, and a rollback on red (popmechanic/ultrapowers #835, run-230 and #1263).
**Tech Stack:** Bun 1.4 + TypeScript + TinyBase 9.7; `celld` 0.5 at `/usr/local/bin/celld` on the fleet image for the probe's own rehearsal; wrangler 4 from `server/`'s devDependencies for the deploy.
**Bootstrap:** bun install --frozen-lockfile
**Publish:** bun install --frozen-lockfile && bun run --cwd server deploy
**Verify:** bun server/probe/converge-live.ts $ULTRA_PUBLISH_URL
**Rollback:** cd server && bunx wrangler rollback --yes --message "fleet: the live check was red"
**Spec:** none on disk; popmechanic/ultrapowers #835 and its 2026-09-23 comments are the brief, and everything a worker needs is in the Context below. The sandbox holds no spec.
**Target:** popmechanic/tinyapp-fixture at `e79447d83dab34ea0d830be0efeca823c1421be5` (main after run-37).

## Global Constraints

- Check: bun run typecheck
- Check: bun run lint:state
- Check: git diff --quiet $ULTRA_BASE -- client packages state-exams tests package.json bun.lock AGENTS.md server/index.ts server/facets server/build-facets.ts
- The app, the exam package, the snapshots, the tests and the server's code are byte-identical to BASE: this plan adds one probe file, one config field pair and one README section, and changes no behaviour of the running server.
- The live probe reaches the server through `/sync/<facet>` and nothing else: the deployed worker has no `.dev.vars`, so its exam surface is off, and a probe that asked `/exam/…` would read a 404 in production.
- What the run measures, and is not asked to prove: whether wrangler's upload passes the exe.dev `http-proxy` edge (no row on any record, 2026-09-23), whether the account's workers.dev subdomain is enabled so the deploy prints a URL, whether the `worker_loaders` binding deploys on this account, and what `wrangler rollback` answers on a worker's first version. Each of those is a `publish:*` row on the run's tag, and a red one is the finding.

### Task 1: The live convergence probe

**Type:** implementation
**Review:** lean

**Files:**
- Create: `server/probe/converge-live.ts`

**Claim:** do: point the probe at a running server; see: it says how long a second client took to receive the first client's row and a third client took to catch up, exits 0 when both happened, and exits non-zero when the server does not answer. (derived)
Machine: M1. `bun server/probe/converge-live.ts http://127.0.0.1:<p>` against a `celld dev` of `server/` started with no `.dev.vars` (exam surface off) exits 0 and prints, as its last stdout line, one JSON object carrying the keys `facet`, `connect_ms`, `sync_ms` and `converge_ms`, each `_ms` value a non-negative integer.
M2. The same command against `http://127.0.0.1:9` (nothing listening) exits non-zero within 30 seconds.
M3. The file contains the string `/sync/` and does not contain the string `/exam/`.

**Authorized-by:** https://github.com/popmechanic/ultrapowers/issues/835 (the 2026-09-23 cut-three comment: the pre- and post-deploy check is a probe the driver pays after the self-merge); `README.md` §the convergence exam (this repository).

**Interfaces:**
- Consumes: `createMergeableStore()` (`tinybase`)
- Consumes: `createWsSynchronizer(store, ws)` (`tinybase/synchronizers/synchronizer-ws-client`)
- Produces: `server/probe/converge-live.ts <origin>`

**Context:** The sibling `server/probe/convergence.ts` (unchanged) is the hand probe against a local `celld dev` with the exam surface on: it dials `/sync/<facet>` with two clients, has A write a row and waits for B to equal A, then reads the facet's content and rows through `/exam/content` and `/exam/rows`, forks through `/exam/fork`, and finishes with a third client C converging; it takes `process.argv[2]` as the base URL, `http://127.0.0.1:9876` when absent, turns `http` into `ws` for the socket, waits with a 10 000 ms `until`, prints its walls as one JSON line and `process.exit(0)`. This task's file is that probe with every `/exam/` call removed: a fresh facet named `todos@live-<base36 stamp>` (a module of `todos` exists; the `@label` suffix names a fork the root creates on first dial, so a rerun starts empty), clients A and B on it, A sets row `0` of table `todos` to `{text: 'buy milk', completed: false}`, B is waited on until its content equals A's (that wall is `sync_ms`), then a fresh client C is opened and waited on until it equals A (`converge_ms`), `connect_ms` is the wall to both A and B synced, and the last line printed is `JSON.stringify({facet, connect_ms, sync_ms, converge_ms})`. A wait that runs past its limit throws, an unhandled throw exits Bun non-zero, and a socket that never opens is the same throw: the `until` limit is 10 000 ms and the whole probe therefore fails within 30 s on a dead origin. `https://` becomes `wss://` by the same `replace(/^http/, 'ws')`. Every synchronizer is destroyed before `process.exit(0)`. The probe's rehearsal in this task's `Run:` starts `celld dev . --no-watch --clean --port <p>` in `server/` with `CELLD_ESBUILD` pointed at the repository's `node_modules/.bin/esbuild` (a transitive install, present after the bootstrap) and `CELLD_MAX_RSS_MB=512`, after `bun build-facets.ts` and after removing any `server/.dev.vars`, waits for the root to answer `/`, runs the probe, and kills celld; the port is drawn from `$RANDOM` so two implementers' rehearsals never collide. On the fleet image celld is `/usr/local/bin/celld`; the laptop has none, so the M1 probe is red there for want of the binary, not for want of the file.

**Proof:**
- Run: bash -c 'cd server && bun build-facets.ts >/dev/null && rm -f .dev.vars && p=$((20000 + RANDOM % 20000)) && (CELLD_ESBUILD="$PWD/../node_modules/.bin/esbuild" CELLD_MAX_RSS_MB=512 celld dev . --no-watch --clean --port "$p" >"/tmp/celld-live-$p.log" 2>&1 & echo $! >"/tmp/celld-live-$p.pid"); for i in $(seq 1 60); do curl -sf "http://127.0.0.1:$p/" >/dev/null 2>&1 && break; sleep 1; done; out=$(bun probe/converge-live.ts "http://127.0.0.1:$p"); rc=$?; kill "$(cat "/tmp/celld-live-$p.pid")" 2>/dev/null; [ "$rc" = 0 ] || { echo "$out"; tail -n 20 "/tmp/celld-live-$p.log"; exit 1; }; printf "%s\n" "$out" | tail -n 1 | python3 -c "import json,sys; o=json.loads(sys.stdin.read()); assert set(o)>={\"facet\",\"connect_ms\",\"sync_ms\",\"converge_ms\"}, o; assert all(isinstance(o[k],int) and o[k]>=0 for k in (\"connect_ms\",\"sync_ms\",\"converge_ms\")), o"' [M1]
- Run: bash -c 'test -f server/probe/converge-live.ts || exit 1; start=$(date +%s); bun server/probe/converge-live.ts http://127.0.0.1:9 >/dev/null 2>&1; rc=$?; end=$(date +%s); [ "$rc" != 0 ] && [ $((end - start)) -le 30 ]' [M2]
- Run: grep -q '/sync/' server/probe/converge-live.ts && ! grep -q '/exam/' server/probe/converge-live.ts [M3]
- Legs: (a) against a celld with the exam surface off the probe exits 0 and its last line is a JSON object with the four keys and non-negative integer walls [M1]; (b) against a closed port it exits non-zero inside 30 s [M2]; (c) the file names `/sync/` and never `/exam/` [M3].

**Stale-if:**
- path-exists: `server/probe/converge-live.ts`

### Task 2: The server names its account and its route, and the README says how a run publishes

**Type:** implementation
**Review:** lean

**Files:**
- Modify: `server/wrangler.jsonc`
- Modify: `README.md`

**Claim:** do: read the server's config; see: it names the Cloudflare account the fleet's token belongs to and asks for a workers.dev URL, so a deploy from a sandbox that holds no account id lands in the right account and prints the URL the live probe needs. (derived)
Machine: M1. `server/wrangler.jsonc`, with its `//` comment lines removed, parses as JSON whose `account_id` is exactly `e33948793047032de7f5e18ec342a7d1`, whose `workers_dev` is exactly `true`, and whose `name` is still exactly `tinyapp-fixture-server`.
M2. `README.md` carries a `## Publishing` heading whose section names `**Publish:**`, `**Verify:**`, `converge-live.ts` and `account_id`.

**Authorized-by:** https://github.com/popmechanic/ultrapowers/issues/835 and its plan of 2026-09-23 (the account id is the target's own `wrangler.jsonc`, never a plan line or a secret); the operator's pick of 2026-09-23 ("In the target's wrangler.jsonc").

**Interfaces:**
- Consumes: none
- Produces: nothing

**Context:** `server/wrangler.jsonc` at BASE carries `$schema`, `name` (`tinyapp-fixture-server`), `main`, `compatibility_date`, `durable_objects`, `migrations`, `worker_loaders` and `services`, with `//` comment lines between them; it has no `account_id` and no `workers_dev`. Add the two fields after `compatibility_date`: `"account_id": "e33948793047032de7f5e18ec342a7d1"` (the account the fleet's `cloudflare` edge integration's token belongs to, read from `wrangler whoami` on the operator's laptop, 2026-09-23; an account id is not a secret) and `"workers_dev": true` (wrangler's default, written so the deploy's printed `https://<name>.<subdomain>.workers.dev` URL is asked for explicitly — the sandbox reads that URL off the deploy's output to run the live probe). Keep every other field and comment byte for byte. The README gains one `## Publishing` section, after its convergence-exam section, saying in plain words: a plan that deploys this app carries three header lines, `**Publish:** bun install --frozen-lockfile && bun run --cwd server deploy`, `**Verify:** bun server/probe/converge-live.ts $ULTRA_PUBLISH_URL` and `**Rollback:** cd server && bunx wrangler rollback --yes --message "…"`; the sandbox runs them after its own merge with the Cloudflare API reached through the fleet's edge and the account named by `account_id` here; the token never enters this repository; and `server/probe/converge-live.ts <origin>` is the live check, sockets only, usable by hand against any origin.

**Proof:**
- Run: python3 -c "import re, json; s=open('server/wrangler.jsonc').read(); s=re.sub(r'^\s*//.*$', '', s, flags=re.M); d=json.loads(s); assert d['account_id']=='e33948793047032de7f5e18ec342a7d1' and d['workers_dev'] is True and d['name']=='tinyapp-fixture-server', {k: d.get(k) for k in ('account_id','workers_dev','name')}" [M1]
- Run: sed -n '/^## Publishing/,/^## /p' README.md | tr '\n' ' ' | grep -q '\*\*Publish:\*\*' && sed -n '/^## Publishing/,/^## /p' README.md | grep -q '\*\*Verify:\*\*' && sed -n '/^## Publishing/,/^## /p' README.md | grep -q 'converge-live.ts' && sed -n '/^## Publishing/,/^## /p' README.md | grep -q 'account_id' [M2]
- Legs: (a) the comment-stripped config parses with the pinned `account_id`, `workers_dev` true and the unchanged `name` [M1]; (b) the README's `## Publishing` section names the two publish lines, the probe file and the config field [M2].

**Stale-if:**
- path-absent: `server/wrangler.jsonc`
