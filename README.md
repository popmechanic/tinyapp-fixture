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
