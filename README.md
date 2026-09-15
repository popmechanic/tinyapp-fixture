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
