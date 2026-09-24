# The README says how to run the live check by hand, and the run that merges it is the practice app's first deploy

**Grammar:** claims-v1
**Claim:** do: launch this plan; see: after the run merges, the practice app's sync server is on its production Durable Object with a real token at the edge, the live probe ran against the deployed URL, and the run's tag says published true or false with the probe's exit and the deploy's own log. (elicited)
**Summary:** Run-39 merged the live probe and the account file, then its deploy was refused at the edge because the credential on the fleet was a Global API Key, not an API token; a fresh token is on the integration now and verified active through the proxy. This plan carries one small honest change, the README's hand form of the live check, so that a merge happens and the publish move runs on the merged tree. After it, the record carries the first deploy's outcome and its log, and you can open the app's server URL from that record.
**Goal:** `README.md` §Publishing gains a "By hand" paragraph naming the exact probe command against a workers.dev origin and what the probe prints; the plan carries the three publish lines, so the sandbox deploys, verifies live and rolls back on red after its self-merge (popmechanic/ultrapowers #835; run-39's finding and hotfix #1267 on this laptop's record).
**Tech Stack:** Bun 1.4 + TypeScript + TinyBase 9.7; wrangler 4 from `server/`'s devDependencies for the deploy.
**Bootstrap:** bun install --frozen-lockfile
**Publish:** bun install --frozen-lockfile && bun run --cwd server deploy
**Verify:** bun server/probe/converge-live.ts $ULTRA_PUBLISH_URL
**Rollback:** cd server && bunx wrangler rollback --yes --message "fleet: the live check was red"
**Spec:** none on disk; popmechanic/ultrapowers #835 and run-39's record (tag `ultra/evidence/run-39` on this repository) are the brief.
**Target:** popmechanic/tinyapp-fixture at `2d277630b1e555ce9fa7c9f4ed9902fa5188f35b` (main after run-39).

## Global Constraints

- Check: bun run typecheck
- Check: git diff --quiet $ULTRA_BASE -- client server packages state-exams tests package.json bun.lock AGENTS.md
- Nothing but `README.md` changes: the app, the server, the probe, the env file and the tests are byte-identical to BASE. The run's value is the publish move on the merged tree, not the diff.
- What the run measures, and is not asked to prove: whether wrangler's upload is accepted with a valid token through the exe.dev edge (run-39 measured the edge passes the request and the token was wrong), whether the account's workers.dev subdomain hands the deploy a URL, whether the `worker_loaders` binding deploys on this account, and what `wrangler rollback` answers on a worker's first version if the live check is red. Each is a `publish:*` row and a log on the run's tag, and a red one is the finding.

### Task 1: The README's hand form of the live check

**Type:** implementation
**Review:** lean

**Files:**
- Modify: `README.md`

**Claim:** do: read the README's Publishing section; see: a "By hand" paragraph gives the one command to run the live check against a deployed origin and says what a green run prints. (derived)
Machine: M1. `README.md` §Publishing contains the phrase `By hand`, the literal command `bun server/probe/converge-live.ts https://tinyapp-fixture-server.<subdomain>.workers.dev`, and the four key names `facet`, `connect_ms`, `sync_ms` and `converge_ms`.
M2. The section still carries `**Publish:**`, `**Verify:**`, `converge-live.ts` and `.env.deploy` (what run-39 wrote).

**Authorized-by:** https://github.com/popmechanic/ultrapowers/issues/835; `README.md` §Publishing at BASE (run-39, PR #40 on this repository).

**Interfaces:**
- Consumes: none
- Produces: nothing

**Context:** `README.md` line 90 at BASE is `## Publishing`; the section (to the next `## ` heading or end of file) names the three header lines and ends "`server/probe/converge-live.ts <origin>` is the live check: sockets only, and usable by hand against any origin." Append one paragraph to that section, beginning `**By hand.**`, saying: against a deployed server the check is `bun server/probe/converge-live.ts https://tinyapp-fixture-server.<subdomain>.workers.dev` (the `<subdomain>` is the account's workers.dev subdomain, which the deploy prints); it opens a fresh facet `todos@live-<stamp>` over the `/sync/` socket, writes one row from client A, waits for B and then a fresh C to receive it, prints one JSON line `{facet, connect_ms, sync_ms, converge_ms}` and exits 0, or throws and exits non-zero when a client does not converge within ten seconds. The paragraph is prose with the command in backticks; nothing else in the file changes.

**Proof:**
- Run: sed -n '/^## Publishing/,/^## /p' README.md | tr '\n' ' ' | grep -q 'By hand' && sed -n '/^## Publishing/,/^## /p' README.md | grep -q 'bun server/probe/converge-live.ts https://tinyapp-fixture-server.<subdomain>.workers.dev' && sed -n '/^## Publishing/,/^## /p' README.md | tr '\n' ' ' | grep -q 'facet' && sed -n '/^## Publishing/,/^## /p' README.md | tr '\n' ' ' | grep -q 'connect_ms' && sed -n '/^## Publishing/,/^## /p' README.md | tr '\n' ' ' | grep -q 'sync_ms' && sed -n '/^## Publishing/,/^## /p' README.md | tr '\n' ' ' | grep -q 'converge_ms' [M1]
- Run: sed -n '/^## Publishing/,/^## /p' README.md | tr '\n' ' ' | grep -q '\*\*Publish:\*\*' && sed -n '/^## Publishing/,/^## /p' README.md | grep -q '\*\*Verify:\*\*' && sed -n '/^## Publishing/,/^## /p' README.md | grep -q 'converge-live.ts' && sed -n '/^## Publishing/,/^## /p' README.md | grep -q '.env.deploy' [M2]
- Legs: (a) the section carries `By hand`, the exact hand command, and the four key names [M1]; (b) run-39's four literals are still in the section [M2].

**Stale-if:**
- path-absent: `README.md`
