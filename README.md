# tinyapp-fixture

The fixture **TinyApp** for ultrapowers' state exams (spec `2026-09-09-tinyapp-state-exams`,
popmechanic/ultrapowers): a `create-tinybase` todos scaffold — TypeScript, React, typed schemas,
a `MergeableStore` synced over a `WsSynchronizer` to a Cloudflare Durable Object with a SQLite
persister — arranged as a bun workspace so the `tinyapp-exam` helper can live beside it.

Generated 2026-09-09 with:

```sh
npm create tinybase@latest -- --non-interactive --projectName tinyapp-fixture --appType todos \
  --language typescript --framework react --tinyWidgets false --schemas true \
  --syncType durable-objects --persistenceType sqlite --prettier false --eslint false --installAndRun false
```

Seed additions over the generator's output: the root `package.json` (workspaces `client`, `server`,
`packages/*`; `bun run test` = both typechecks + `bun test`), `tests/smoke.test.ts`, `.gitignore`, and one
cast in `client/src/Store.tsx` so the generated persister call typechecks under TypeScript 6.

```sh
bun install
bun run test
```

## State exams

An exam's action is either a callback over a store this process makes, or an
interaction with the running page: a `click` on what a selector names, a `type`
that enters text into it, or a `key` press on it — `Enter`, say, to submit the
input.

An interaction happens in a real browser. On the fleet image that is the
sandbox's own Chromium at `/headless-shell/headless-shell`; on a laptop it is
whatever binary `TINYAPP_BROWSER` names, e.g.

```sh
TINYAPP_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  bun test tests/state-exams/click-completes-todo.test.ts
```

The page is opened from a `data:` URL and every request it would make is
blocked in the browser before it leaves, so an exam never dials a network.

Each run leaves its evidence beside the task: the store diff, in
`store-diff.json`, empty when the expected state was reached; the DOM of the
page the action happened in, in `dom.html`; and a screenshot of that same page,
in `screenshot.png` — along with `mutant.json`, `contract.json` and
`walls.json`.

A `persistenceExam` asks the other question: not what the app does, but what it
keeps. It opens the page with nothing behind it — no seed, and
`window.__TINYAPP_EXAM__` raised, which is how the app knows to hand out its
store, its database and its persister — served from the machine's own loopback
origin, because storage belongs to an origin and a `data:` page has none. It
does something, waits for the save to land in the persister's own table,
reloads the page, and reads the state back twice over: from the store the
reloaded page renders from, and from the row the persister wrote. Every request
the page makes beyond that origin is refused in the browser before it leaves,
and a page that opens a `WebSocket` is a red exam that says so.

Its evidence is the six files above and two more: the rows it read back, in
`rows.json`, with the statement, the state they parse to and their difference
from the expected one; and the page as it stood before the reload, in
`dom-before.html`, beside the `dom.html` from after it. `walls.json` carries two
more walls as well — `persist_ms`, from the last action to the save landing,
and `reload_ms`, from the reload to the page reporting itself loaded again.
Both are reported and neither is bounded: how long a save takes is what the
record is for, not something an exam should be red about.

A convergence exam asks the question no single page can answer: whether the
replicas agree. It provides its own runtime — it starts a `celld dev` on a copy
of this repository's server, opens two pages onto the module it names, acts in
the first, and waits for the second to say what the first says; then it reads
the module object's own content and rows, and opens a third page that has to
reach the same state from nothing. Nothing about those pages is in exam mode but
where they sync to: they are told `window.__TINYAPP_SYNC__` and nothing else,
and every request to anywhere but the page's own loopback origin and the
runtime's is failed in the browser. Its evidence carries `walls.json` with
`sync_ms` and `converge_ms`, and `transitions.json`, the session's transitions in
the object's own numbering. On the fleet image both binaries are already there;
on a laptop the two things to provide are `CELLD_BIN`, naming the celld binary,
and `TINYAPP_BROWSER`, naming the browser, e.g.

```sh
CELLD_BIN=/usr/local/bin/celld \
  TINYAPP_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  bun test tests/state-exams/two-pages-converge.test.ts
```

## Publishing

A plan that deploys this app carries three header lines:

**Publish:** `bun install --frozen-lockfile && bun run --cwd server deploy`
**Verify:** `bun server/probe/converge-live.ts $ULTRA_PUBLISH_URL`
**Rollback:** `cd server && bunx wrangler rollback --yes --message "…"`

The sandbox runs them after its own merge, reaching the Cloudflare API through
the fleet's edge and the account named by `server/.env.deploy`; the token
itself never enters this repository. `wrangler.jsonc` carries no account,
because `celld deploy` refuses that key. `server/probe/converge-live.ts
<origin>` is the live check: sockets only, and usable by hand against any
origin.

**By hand.** Against a deployed server the check is
`bun server/probe/converge-live.ts https://tinyapp-fixture-server.<subdomain>.workers.dev`
(the `<subdomain>` is the account's workers.dev subdomain, which the deploy
prints); it opens a fresh facet `todos@live-<stamp>` over the `/sync/` socket,
writes one row from client A, waits for B and then a fresh C to receive it,
prints one JSON line `{facet, connect_ms, sync_ms, converge_ms}` and exits 0,
or throws and exits non-zero when a client does not converge within ten
seconds.
