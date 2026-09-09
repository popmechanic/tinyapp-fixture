# TinyApp state exams, Plan A — the `tinyapp-exam` helper and the fixture that honours the seed

**Grammar:** claims-v1

**Claim:** I write a state exam for the fixture todo app — a seed, an action through the app's own callback, and the state I expect — and one `bun test` tells me in a table whether the app reached that state, proves the exam would have noticed a wrong answer, and leaves the evidence files where I can look at them. (elicited)

**Goal:** Plan A of the signed spec `2026-09-09-tinyapp-state-exams` (ultrapowers #758, map #525
The Verification Frontier; §7 step 3 names two plans in two repositories — this is the fixture
repository's). Target: `popmechanic/tinyapp-fixture` at BASE `a99a2be2` (the `create-tinybase`
todos scaffold as a bun workspace, green: `bun run test` passes). It adds the `tinyapp-exam`
workspace package — `stateExam(spec)`, the three moves, the view vocabulary, the determinism
contract, the evidence writer — with its suite (spec §4.2 legs (a)–(l)), and makes the fixture
honour the seed convention (`window.__TINYAPP_SEED__`) with pure store callbacks the exams can
call. The two first-run claims of §4.3 ("buy milk", "empty todo refused") are written here as
ordinary tests under `tests/state-exams/`, since the fixture repository's first fleet run happens
later and needs them present; the plugin-side engine edits (§3.8) are Plan B and are not touched.
Eleven choices were made in place of an operator question, each the least machinery that keeps
the spec's contract: (1) `stateExam`'s spec carries one field beyond the spec's seven, `store: ()
=> MergeableStore` — the app's own factory (`createTodosStore`) — because a helper cannot type a
store against a schema it is never handed (§3.1's example imports `schema` and never passes it),
and a factory also keeps the helper free of any runtime `tinybase` import, which matters under
Bun 1.3's isolated installs (below). (2) TinyBase's `setContent` does not reject a snapshot the
schema disagrees with — measured at BASE: an unknown cell is dropped, a missing cell is filled
with its default — so "fails at load" is the helper's own check: after `setContent(seed)` the
store's `getContent()` must deep-equal the seed, or the move rejects with `snapshot violates
schema:`. (3) The diff's `absent` side is `null` (no TinyBase cell or value is `null`); a store
value differs under table `$values`, row empty. (4) A mutant edit is `{table, row, cell, value}`,
`{table, row, cell, absent: true}` or `{table, row, absent: true}`. (5) The evidence directory
with `ULTRA_RUN_DIR` unset or empty is a fresh `mkdtemp` under `os.tmpdir()`; with it set and
`ULTRA_TASK`/`ULTRA_EXAM_PASS` unset, those read `none`. (6) The exam stem is the running test
file's basename minus `.test.ts`, read from `Bun.main` — measured: inside `bun test`, `Bun.main`
is the current test file's absolute path even from an imported module. (7) The render move's
`view` semantics: `count` exact, `text`/`attr` at least one match, `checked`/`unchecked` every
match and at least one, `absent` zero matches. (8) The render POST body is
`{html, addScriptTag: [{content}]}` — Cloudflare's Browser Rendering REST reference lists
`addScriptTag: [{content | url}]` among `/snapshot`'s request parameters; this is doc-sourced and
unverified live (the suite stubs the endpoint), which is what §7 asked Plan A to record.
(9) `bun.lock` has one writer per wave: Bun 1.3 links workspaces isolated (measured at BASE:
`tinybase` lives in `client/node_modules`, never at the root), the derived bootstrap is `bun
install --frozen-lockfile` on every clone and every fold candidate, and a lockfile folded from two
writers is not one bun wrote. (10) The fixture's component-level pin of "neither persister nor
synchronizer" renders `Store` under `@happy-dom/global-registrator` (a `client` devDependency)
with module-mocked factories — measured: without a seed the scaffold constructs one socket, one
persister and one synchronizer within 300 ms. (11) Adding a row keeps TinyBase's own `addRow`
ids — measured: on an emptied store the first id is `"0"`, on two fresh stores alike — so the
expected snapshots pin row `"0"` and no id is passed in.
**Closes:** (none — the fixture repository has no issues; the plugin ticket is #758)

**Tech Stack:** Bun 1.3 + TypeScript 6 + TinyBase 9.7 (`with-schemas` entry points), React 19,
Vite 8 for the app's own build. The committed suite is the root `bun run test` (`package.json`
`scripts.test` = `bun run typecheck && bun test`, `typecheck` = the client's and the server's
`tsc --noEmit` in turn): the greenfield knob `bunx tsc --noEmit && bun test` does not typecheck a
workspace's sub-projects, which is why the root script exists and is the testCmd the launcher
detects (`package-json-bun`). Bootstrap is `bun install --frozen-lockfile`, driver-derived.
**Exam command:** bun test {paths}

**Spec:** `docs/superpowers/specs/2026-09-09-tinyapp-state-exams.md` in the ultrapowers
repository (untracked there, absent from every sandbox — every fact a worker needs is in its
task's Context).

**Parallelization rationale:** three waves. Wave 1, width 2: the store move with the contract
and the shared types (Task 1) and the fixture app (Task 5) share nothing — Task 5 is wave 1's one
`bun.lock` writer. Wave 2, width 3: the mutant perturbation (Task 2), the render move (Task 3) and
the evidence writer (Task 4) each import `packages/tinyapp-exam/src/types.ts`, a file Task 1
creates (worktree rule 4), and Task 3 is wave 2's one `bun.lock` writer (`node-html-parser`).
Wave 3, width 1: the composition and the two first-run exams (Task 6) need the runtime behaviour
of every move and of the fixture's callbacks — its exam runs whole state exams end to end and its
`Run:` runs the two first-run exam files — and it is wave 3's one `bun.lock` writer (the
workspace package). No task's `Create:` collides with another's; `package.json` and `bun.lock`
are shared across waves only.

## Global Constraints

- Check: git diff --quiet $ULTRA_BASE -- server/ client/index.html client/vite.config.js client/tsconfig.json client/src/App.tsx client/src/TodoList.tsx client/src/config.ts client/src/sqlite.tsx client/src/Button.tsx client/src/Input.tsx client/src/Loading.tsx client/src/TopBar.tsx tests/smoke.test.ts AGENTS.md
- Check: test "$(grep -rl api.cloudflare.com client/src client/test packages tests state-exams 2>/dev/null | wc -l)" -eq 0
- Check: test "$(grep -rlE 'Bun\.serve\(|createWsServer|\.listen\(' client/test packages tests 2>/dev/null | wc -l)" -eq 0
- No test reaches the network: every `fetch` a test exercises is an injected `fetchImpl` or the
  contract's blocked one, no test starts a server or a Durable Object, and the renderer URL a test
  passes is a placeholder that is never dialled. `bun install` is the only network use in the run
  and happens only in the driver's bootstrap.
- The app reads from nowhere but its one TinyBase `MergeableStore` (schema `todos: {text: string,
  completed: boolean}`; the cell is `completed`, not `done`); every `do:` is a store mutation
  through a callback in `client/src/storeData.ts`, and the seeded page starts neither the
  SQLite persister nor the `WsSynchronizer`.
- `getContent()` — `[tables, values]` — is the only serialisation the helper compares or writes;
  `getMergeableContent()` (HLC-stamped) appears nowhere in the helper.
- The scaffold's generated files not named in a task's Files block are byte-identical to BASE
  (the first Check); no task adds a dependency outside its own Files block, and `bun.lock` is
  written by at most one task per wave.

**Acceptance:** suite — the committed suite is the verification.

### Task 1: The store move, the diff table and the determinism contract

**Type:** implementation
**Review:** peer

**Files:**
- Create: `packages/tinyapp-exam/src/types.ts`
- Create: `packages/tinyapp-exam/src/store-move.ts`
- Create: `packages/tinyapp-exam/src/contract.ts`
- Test: `packages/tinyapp-exam/test/store-move.test.ts`
- Test: `packages/tinyapp-exam/test/contract.test.ts`

**Claim:** An examiner hands the helper a seed, an action and the state they expect, and gets back either an empty diff or a table naming every row and cell that differs — and an action that reads the clock, reaches for the network, or answers differently the second time is refused with a line saying which. (derived)
Machine: M1. `diffContent(got, wanted)` returns `[]` when the two snapshots are deep-equal, and otherwise one `Difference` `{table, row, cell, got, wanted}` per cell present in either side with a different value, the side lacking the cell carrying `null`, ordered by table, then row, then cell in string order; a store value that differs is one `Difference` with `table` `$values`, `row` the empty string and `cell` the value's id, after every table row.
M2. `renderDiff(differences)` returns a string whose first line is exactly `table / row / cell / got / wanted`, followed by one line per difference in order spelled `<table> / <row> / <cell> / <got> / <wanted>`, where `<got>` and `<wanted>` are `JSON.stringify` of the value and the bare word `absent` for `null`.
M3. `storeMove(spec)` builds a store with `spec.store()`, calls `setContent` with the JSON parsed from the file at `spec.seed` (a path relative to `process.cwd()`), awaits `spec.action(store)` under the contract of M5–M6, and resolves `{content, diff, ms}` with `content` the store's `getContent()` after the action, `diff` equal to `diffContent(content, <the JSON parsed from the file at spec.expected>)`, and `ms` a finite number greater than or equal to 0.
M4. When the store's `getContent()` after `setContent(seed)` is not deep-equal to the parsed seed, `storeMove` rejects with an error whose message begins `snapshot violates schema: <spec.seed>` and contains `<table>/<row>/<cell>` of the first difference in M1's order, and `spec.action` is never called.
M5. `withContract(clock, fn)` rejects with the message `contract: clock is required` without calling `fn` when `clock` is not a non-empty string; otherwise, while `fn` runs, `Date.now()` returns `Date.parse(clock)` and `new Date().toISOString()` returns `new Date(clock).toISOString()`, and both `Date.now` and the `Date` constructor are the originals again after `withContract` settles, resolved or rejected.
M6. While `fn` runs, a call to `globalThis.fetch(url)` or a `new globalThis.WebSocket(url)` makes `withContract` reject with the message `contract breach: <url>` (`url` as the caller spelled it), and `globalThis.fetch` and `globalThis.WebSocket` are the originals again after it settles, whether or not `fn` breached.
M7. `storeMove` runs the seed-load-action sequence twice, each time on a fresh `spec.store()`, and rejects with a message beginning `nondeterministic store:` when `JSON.stringify` of the two post-action `getContent()` results differ; when they are equal, `content` is the first and `spec.store` has been called exactly twice.

**Authorized-by:** spec `2026-09-09-tinyapp-state-exams` §3.1, §3.2 move 1, §3.4, §4.2 (a)–(f); ultrapowers #758

**Interfaces:**
- Consumes: nothing
- Produces: `Snapshot` (type, `src/types.ts`)
- Produces: `Difference` (type, `src/types.ts`)
- Produces: `MutantEdit` (type, `src/types.ts`)
- Produces: `View` (type, `src/types.ts`)
- Produces: `StateExamSpec` (type, `src/types.ts`)
- Produces: `ExamRecord` (type, `src/types.ts`)
- Produces: `diffContent(got: Snapshot, wanted: Snapshot) -> Difference[]`
- Produces: `renderDiff(differences: Difference[]) -> string`
- Produces: `storeMove(spec: StateExamSpec) -> Promise<{content: Snapshot, diff: Difference[], ms: number}>`
- Produces: `withContract(clock: string, fn: () => unknown) -> Promise<void>`

**Context:** The helper is a bun workspace package at `packages/tinyapp-exam/` whose manifest
(`package.json`, `tsconfig.json`) a later task writes; this task writes source and nothing else
under it, so import nothing but `node:*` at runtime and take every TinyBase type with `import
type … from 'tinybase/with-schemas'` — a type import is erased and needs no installed package in
this clone (Bun 1.3 links each workspace's dependencies under that workspace's own
`node_modules`; the root's holds only `typescript` and `@types/bun`). The shared literals every
helper task writes against, defined once in `src/types.ts`: `type Cell = string | number |
boolean`; `type Tables = Record<string, Record<string, Record<string, Cell>>>`; `type Values =
Record<string, Cell>`; `type Snapshot = [Tables, Values]` — exactly TinyBase's `getContent()`
shape, the shape of every seed and expected file and of `window.__TINYAPP_SEED__`; `type
Difference = {table: string, row: string, cell: string, got: Cell | null, wanted: Cell | null}`;
`type MutantEdit = {table: string, row: string, cell: string, value: Cell} | {table: string,
row: string, cell: string, absent: true} | {table: string, row: string, absent: true}`; `type
View = {selector: string, count?: number, text?: string, attr?: {name: string, value: string},
checked?: true, unchecked?: true, absent?: true}`; `interface ExamStore {setContent(content:
Snapshot): unknown; getContent(): Snapshot}`; `type StateExamSpec<S extends ExamStore =
ExamStore> = {clock: string, entry?: string, seed: string, action: (store: S) => void |
Promise<void>, expected: string, view?: View | View[], mutant: MutantEdit[], store: () => S}`;
`type ExamRecord = {walls: {store_ms: number, render_ms: number | null, mutant_ms: number,
render: 'ran' | 'skipped'}, mutant: {killed: boolean, path: string, edits: MutantEdit[]},
contract: {clock: string, breach: string | null}, storeDiff: Difference[], dom?: string,
screenshot?: Uint8Array}`. The store the exams hand in is the fixture's `createTodosStore()`
from `client/src/storeData.ts` (a `MergeableStore` with `TABLES_SCHEMA = {todos: {text:
{type: 'string', default: ''}, completed: {type: 'boolean', default: false}}}`), and that is the
store the exam uses too: from `packages/tinyapp-exam/test/` it is
`../../../client/src/storeData`, which resolves `tinybase` through `client/node_modules`.
Measured at BASE on that store: `setContent([{}, {}])` empties the two default rows;
`setContent([{todos: {'1': {text: 'a', completed: false, done: true}}}, {}])` yields
`[{todos: {'1': {text: 'a', completed: false}}}, {}]` — the unknown cell is dropped silently, and
a row given only `text` comes back with `completed: false` added — which is why M4 is a
deep-equality check after the load and not a TinyBase error; `addRow` on the emptied store
returns `'0'`. Values compare as a flat record; there is no values schema. `withContract`
installs a `Date` whose no-argument constructor returns the clock instant and whose static
`now` returns `Date.parse(clock)` (keep `Date.parse`, `Date.UTC` and `new Date(x)` working), and
replaces `globalThis.fetch` and `globalThis.WebSocket` with a function and a class that record
the url and throw an error carrying it — restore all four in a `finally`. Bun runs every test
file of a `bun test` invocation in one process, so a global left replaced leaks into the next
file: the restore is part of the contract, and the exam checks it. The action may be async;
await it. The two runs of M7 catch a `Math.random` or a clock read the contract could not pin;
`Date.now` differences cannot occur under M5, so the exam for M7 uses `Math.random`. Timing
(`ms`) comes from `performance.now()` around the first run; no leg asserts a bound.
**BASE facts:** (generated at a99a2be)
- `content` at `client/src/vite-env.d.ts:2` blob 31f07ea
- `package.json` blob ea97c56
- `client/src/storeData.ts` blob 63b5107
- `createTodosStore` at `client/src/storeData.ts:14` blob 63b5107

**Proof:**
- Test: `packages/tinyapp-exam/test/store-move.test.ts`
- Test: `packages/tinyapp-exam/test/contract.test.ts`
- Guard: `packages/tinyapp-exam/test/store-move.test.ts`
- Guard: `packages/tinyapp-exam/test/contract.test.ts`
- Legs: (a) `diffContent` of two deep-equal snapshots (two todo rows and one value) is exactly `[]` [M1]; (b) `diffContent([{todos: {'0': {text: 'a', completed: true}}}, {}], [{todos: {'0': {text: 'a', completed: false}}}, {}])` is exactly `[{table: 'todos', row: '0', cell: 'completed', got: true, wanted: false}]` [M1]; (c) a row present only in `got` yields one difference per cell with `wanted` `null`, a row present only in `wanted` yields `got` `null`, a value `n` that is `1` in `got` and `2` in `wanted` yields `{table: '$values', row: '', cell: 'n', got: 1, wanted: 2}` as the last difference, and with rows `'b'` and `'a'` and cells `text` and `completed` differing the order is `a/completed`, `a/text`, `b/completed`, `b/text` [M1]; (d) `renderDiff` of the difference of the second leg is the two lines `table / row / cell / got / wanted` and `todos / 0 / completed / true / false`, and a difference with `got` `null` and `wanted` `"x"` renders `absent` and `"x"` [M2]; (e) with `spec.seed` a temp file holding `[{}, {}]`, `spec.expected` a temp file holding `[{todos: {'0': {text: 'buy milk', completed: false}}}, {}]`, `spec.store` the fixture's `createTodosStore`, `spec.clock` `2026-01-01T00:00:00Z` and an action that calls `store.addRow('todos', {text: 'buy milk', completed: false})`, `storeMove` resolves with `diff` exactly `[]`, `content` deep-equal to the expected snapshot and `ms` a finite number greater than or equal to 0 [M3]; (f) the same spec with an action that adds `{text: 'buy milk', completed: true}` resolves with `diff` exactly `[{table: 'todos', row: '0', cell: 'completed', got: true, wanted: false}]` [M3]; (g) the same spec with a seed file holding `[{todos: {'1': {text: 'a', completed: false, done: true}}}, {}]` rejects with a message that begins `snapshot violates schema: ` followed by the seed path and contains `todos/1/done` — so `done`, the cell the schema drops, is what fails, and the message does not name `todos/1/text` — an action wrapped in a spy was called exactly 0 times, and the same spec with the seed `[{todos: {'1': {text: 'a', completed: false}}}, {}]` (a snapshot the schema round-trips) does not reject [M4]; (h) `withContract('', fn)` and `withContract(undefined, fn)` each reject with message exactly `contract: clock is required` and `fn` is called 0 times; an `fn` that throws `new Error('boom')` under a valid clock makes `withContract` reject with message `boom`, and afterwards `globalThis.Date` is the constructor captured before and `Date.now()` is within 60000 ms of the value read before the call [M5]; (i) inside `withContract('2026-01-01T00:00:00Z', fn)`, `Date.now()` is `1767225600000` and `new Date().toISOString()` is `2026-01-01T00:00:00.000Z`, and after it resolves `Date.now()` is within 60000 ms of the value the test read before calling it and `globalThis.Date` is the constructor the test captured before [M5]; (j) an `fn` that calls `fetch('http://127.0.0.1:9/x')` makes `withContract` reject with message exactly `contract breach: http://127.0.0.1:9/x`, and afterwards `globalThis.fetch` is the function the test captured before, `globalThis.Date` is the constructor captured before and `Date.now` is the function captured before — the clock is restored on the rejected path too [M5] [M6]; (k) an `fn` that runs `new WebSocket('ws://127.0.0.1:9/')` makes it reject with message exactly `contract breach: ws://127.0.0.1:9/`, and afterwards `globalThis.WebSocket` is the class the test captured before and `globalThis.Date` is the constructor captured before [M5] [M6]; (l) after a green `fn`, `globalThis.fetch` and `globalThis.WebSocket` are the captured originals [M6]; (m) the spec of the fifth leg with an action that adds `{text: String(Math.random()), completed: false}` rejects with a message beginning `nondeterministic store:`, and the spec of the fifth leg with its deterministic action resolves with `content` deep-equal to expected and a `spec.store` spy called exactly 2 times [M7].

**Stale-if:**
- path-exists: `packages/tinyapp-exam/src/store-move.ts`
- path-absent: `client/src/storeData.ts`

### Task 2: The mutant perturbation

**Type:** implementation
**Review:** peer

**Files:**
- Create: `packages/tinyapp-exam/src/mutant.ts`
- Test: `packages/tinyapp-exam/test/mutant.test.ts`

**Claim:** An examiner names the change to the expected state that their exam must notice — a flipped cell, a missing cell, a missing row — and the helper produces exactly that perturbed state to test the exam against, leaving the original untouched. (derived)
Machine: M1. `applyMutant(snapshot, edits)` returns a new snapshot and leaves `snapshot` deep-equal to what it was before the call.
M2. An edit `{table, row, cell, value}` sets that cell to `value` in the result, creating the table and the row when they are absent.
M3. An edit `{table, row, cell, absent: true}` removes that cell; when it was the row's last cell the row is removed too, and when that row was the table's last row the table is removed too.
M4. An edit `{table, row, absent: true}` removes that row, and the table too when it was the table's last row.
M5. Edits apply in list order as one perturbation, so a later edit to the same cell wins.
M6. `mutantPath(edits)` returns one segment per edit in list order, joined by `,`: a cell edit's segment is `<table>/<row>/<cell>` and a row edit's segment is `<table>/<row>`.

**Authorized-by:** spec `2026-09-09-tinyapp-state-exams` §3.1 (the `mutant` list), §3.2 move 3; ultrapowers #758

**Interfaces:**
- Consumes: `Snapshot`
- Consumes: `MutantEdit`
- Produces: `applyMutant(snapshot: Snapshot, edits: MutantEdit[]) -> Snapshot`
- Produces: `mutantPath(edits: MutantEdit[]) -> string`

**Context:** Pure code over `packages/tinyapp-exam/src/types.ts` (this task's tree holds it):
`type Snapshot = [Tables, Values]` with `Tables = Record<string, Record<string, Record<string,
Cell>>>`, `Values = Record<string, Cell>`, `Cell = string | number | boolean`; `type MutantEdit
= {table: string, row: string, cell: string, value: Cell} | {table: string, row: string, cell:
string, absent: true} | {table: string, row: string, absent: true}`. Values (`snapshot[1]`) are
never edited by a mutant in this release. The killed/hollow judgment is not here: the
composition task computes `killed = diffContent(content, applyMutant(expected, edits)).length >
0` and writes `mutant.json` as `{killed, path: mutantPath(edits), edits}` — a mutant is a
perturbation of the *expected* state, never of the implementation. Copy with
`structuredClone` (Bun has it) or a hand-rolled deep copy; the exam checks the input by
deep-equality against a copy taken before the call. The empty-row and empty-table rules mirror
TinyBase, where a row with no cells and a table with no rows do not exist, so a perturbed
expected state stays a state `setContent` would round-trip.
**BASE facts:** (generated at a99a2be)

**Proof:**
- Test: `packages/tinyapp-exam/test/mutant.test.ts`
- Guard: `packages/tinyapp-exam/test/mutant.test.ts`
- Legs: (a) with `base = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}]` and a deep copy `before` of it, `applyMutant(base, [{table: 'todos', row: '0', cell: 'completed', value: true}])` returns a snapshot that is not the same object as `base`, and `base` is deep-equal to `before` afterwards [M1]; (b) that call's result is exactly `[{todos: {'0': {text: 'buy milk', completed: true}}}, {}]` [M2]; (c) `applyMutant([{}, {}], [{table: 'todos', row: '0', cell: 'text', value: ''}])` is exactly `[{todos: {'0': {text: ''}}}, {}]` — the table and the row are created [M2]; (d) on `base`, `[{table: 'todos', row: '0', cell: 'completed', absent: true}]` gives exactly `[{todos: {'0': {text: 'buy milk'}}}, {}]`; on `[{todos: {'0': {text: 'x'}}}, {}]`, `[{table: 'todos', row: '0', cell: 'text', absent: true}]` gives exactly `[{}, {}]` — row and table gone [M3]; (e) on a two-row `todos` table, `[{table: 'todos', row: '0', absent: true}]` leaves exactly the other row; on `base`, `[{table: 'todos', row: '0', absent: true}]` gives exactly `[{}, {}]` [M4]; (f) on `base`, `[{table: 'todos', row: '0', cell: 'text', value: 'a'}, {table: 'todos', row: '0', cell: 'text', value: 'b'}]` gives `text` exactly `'b'` [M5]; (g) `mutantPath([{table: 'todos', row: '0', cell: 'completed', value: true}])` is exactly `todos/0/completed` and `mutantPath([{table: 'todos', row: '0', cell: 'completed', absent: true}])` is exactly `todos/0/completed` — the cell edit's segment, for a set and for a removal [M6]; (h) `mutantPath([{table: 'todos', row: '1', absent: true}])` is exactly `todos/1` — the row edit's segment [M6]; (i) `mutantPath([{table: 'todos', row: '0', cell: 'completed', value: true}, {table: 'todos', row: '1', absent: true}])` is exactly `todos/0/completed,todos/1` and `mutantPath([])` is exactly the empty string [M6].

**Stale-if:**
- path-exists: `packages/tinyapp-exam/src/mutant.ts`
- path-absent: `packages/tinyapp-exam/src/types.ts`

### Task 3: The render move — bundle, seed, snapshot, view

**Type:** implementation
**Review:** peer

**Files:**
- Create: `packages/tinyapp-exam/src/render-move.ts`
- Modify: `package.json`
- Modify: `bun.lock`
- Test: `packages/tinyapp-exam/test/render-move.test.ts`

**Claim:** When a renderer is configured the helper builds the app into one page that opens on the post-action state, asks the renderer for the page's DOM and picture, and checks the DOM against the small view vocabulary — and on a machine with no renderer it says it skipped, never that it passed. (derived)
Machine: M1. `renderHtml(entryHtml, {js, css, seed})` returns a document in which the first `<script>` element inside `<head>` has the text `window.__TINYAPP_SEED__ = <JSON.stringify(seed)>;`, every `<script type="module" src="…">` of `entryHtml` is replaced by one `<script type="module">` whose text is `js`, a `<style>` whose text is `css` is inside `<head>`, and no `<script>` element carries a `src` attribute.
M2. `assertView(html, views)` returns `[]` when every entry holds and otherwise one string per failing entry containing that entry's `selector`, where for the elements matching `selector`: `count` holds when their number equals it; `text` holds when at least one of them has a `textContent` containing it; `attr` holds when at least one has the attribute `name` equal to `value`; `checked` holds when there is at least one and every one has `data-checked` equal to `true`; `unchecked` the same with `false`; `absent` holds when there are none.
M3. `renderMove({entry, content, view, env, fetchImpl})` resolves `{render: 'skipped', ms: null, failures: []}` without calling `fetchImpl` when `env.TINYAPP_RENDER_URL` is unset or the empty string, and likewise when `env.ULTRA_RUN_DIR` is unset or the empty string.
M4. Otherwise it bundles, with `Bun.build({target: 'browser'})`, the module named by the `src` of `entry`'s `<script type="module">` resolved against `entry`'s directory, calls `fetchImpl` exactly once with the URL `<env.TINYAPP_RENDER_URL>/snapshot`, method `POST`, header `content-type: application/json`, and a JSON body whose `html` is `renderHtml(<entry's text>, {js, css, seed: content})` and whose `addScriptTag` is `[{content}]` with `content` a script text containing `data-checked` and `querySelectorAll`, and resolves `{render: 'ran', ms, dom, screenshot, failures}` with `dom` the response's `result.content`, `screenshot` the bytes decoded from the base64 `result.screenshot`, `failures` equal to `assertView(dom, view)` and `ms` a finite number greater than or equal to 0.
M5. A response whose status is not 2xx, or whose JSON has `success` false, makes `renderMove` reject with a message beginning `render failed:`.
M6. The root `package.json` `devDependencies` carries `node-html-parser`, `bun.lock` records it, and `bun install --frozen-lockfile` exits 0 on the tree.

**Authorized-by:** spec `2026-09-09-tinyapp-state-exams` §3.2 move 2, §3.3, §3.5 (the skip rule), §4.2 (i)–(j); ultrapowers #758

**Interfaces:**
- Consumes: `Snapshot`
- Consumes: `View`
- Produces: `renderHtml(entryHtml: string, parts: {js: string, css: string, seed: Snapshot}) -> string`
- Produces: `assertView(html: string, views: View | View[] | undefined) -> string[]`
- Produces: `renderMove(args: {entry: string, content: Snapshot, view?: View | View[], env: Record<string, string | undefined>, fetchImpl?: typeof fetch}) -> Promise<{render: 'ran' | 'skipped', ms: number | null, dom?: string, screenshot?: Uint8Array, failures: string[]}>`

**Context:** The shared types are in `packages/tinyapp-exam/src/types.ts` (in this task's
tree): `Snapshot = [Tables, Values]` (TinyBase's `getContent()` shape) and `View = {selector:
string, count?: number, text?: string, attr?: {name: string, value: string}, checked?: true,
unchecked?: true, absent?: true}`; a `view` of `undefined` asserts nothing and `assertView`
returns `[]`. Parse the returned DOM with `node-html-parser` (`parse(html).querySelectorAll`
— css-select, so `input[type=checkbox]` and `.todoItem` work); it is this task's one
dependency and goes in the ROOT `package.json` `devDependencies` (`bun add -d node-html-parser`
at the repository root, which rewrites `bun.lock`), because Bun 1.3 links each workspace's
dependencies under that workspace's own `node_modules` and the helper has no manifest of its own
until a later task writes one — a module under `packages/tinyapp-exam/src/` resolves a root
devDependency by walking up to the root `node_modules`. No other task in this wave touches
`bun.lock`; the composition task later moves the dependency into the package manifest. The
fixture's entry is `client/index.html`, whose one script tag is `<script type="module"
src="/src/index.tsx"></script>` — a root-relative `src`, resolved against the entry's directory
(`client/`) to `client/src/index.tsx`; the default `entry` is `index.html`. Measured at BASE:
`await Bun.build({entrypoints: ['client/src/index.tsx'], target: 'browser'})` succeeds in about
20 ms with two outputs — the entry point (`kind` `entry-point`, 1.93 MB of JS, `@sqlite.org/
sqlite-wasm` bundled in, its wasm fetched only when `getDb()` runs, which the seeded page never
does) and one `text/css` asset (4.7 KB from the components' `import './x.css'` lines); read them
with `output.text()`. Inline both; the page must load with no relative fetch, since the renderer
receives raw HTML with no origin to serve `/src/` from. The seed script goes first in `<head>` so
it is set before the module script runs. The renderer is Cloudflare Browser Rendering's REST
`snapshot` action behind an exe.dev `http-proxy` — from a sandbox `TINYAPP_RENDER_URL` is
`https://browser-run.int.exe.xyz/client/v4/accounts/<id>/browser-rendering` (https: the plain
http address answers 301 with an empty body, measured 2026-09-09) and the helper appends
`/snapshot`; measured through the proxy on 2026-09-09 with a one-line HTML page: `http=200`,
`{success: true, result: {content: <the DOM>, screenshot: <13,288 base64 chars>}}` in 2.18 s
wall, so the body and the binary pass through unchanged; `addScriptTag: [{content}]` is a
documented request parameter, not yet exercised live (the suite stubs the endpoint, and the
first run reads it). The reflection script:
`(function(){var f=function(){document.querySelectorAll('input').forEach(function(i){i.
setAttribute('data-checked', i.checked ? 'true' : 'false')})};f();new MutationObserver(f).
observe(document.documentElement,{subtree:true,childList:true,attributes:true})})()` — a DOM
*property* is invisible in serialised markup, so `checked`/`unchecked` read the attribute it
writes. The exam stubs `fetchImpl` with a function that records `(url, init)` and returns
`new Response(JSON.stringify({success: true, result: {content: '<fixture html>', screenshot:
'<base64>'}}), {status: 200})`; no real endpoint is dialled and the placeholder URL is
`http://renderer.invalid/v4/accounts/x/browser-rendering`. The skip rule has two triggers on
purpose (§3.5, spec review round 4 item 4): the suite at the fold and the integrated `Run:`
have no `ULTRA_RUN_DIR`, a laptop has no `TINYAPP_RENDER_URL`; both record `skipped`. Whether
move 1 was green is the composition's decision, not this module's.
**BASE facts:** (generated at a99a2be)
- `content` at `client/src/vite-env.d.ts:2` blob 31f07ea
- `package.json` blob ea97c56
- `bun.lock` blob d9edcd5
- `client/index.html` blob 692ccb1
- `client/src/index.tsx` blob 4da4ca8

**Proof:**
- Test: `packages/tinyapp-exam/test/render-move.test.ts`
- Guard: `packages/tinyapp-exam/test/render-move.test.ts`
- Run: bun install --frozen-lockfile
- Legs: (a) `renderHtml` on the text of `client/index.html` with `js` `console.log(1)`, `css` `.a{}` and `seed` `[{todos: {'0': {text: 'buy milk', completed: false}}}, {}]`, parsed with `node-html-parser`: the first `script` under `head` has text exactly `window.__TINYAPP_SEED__ = [{"todos":{"0":{"text":"buy milk","completed":false}}},{}];`, exactly one `script[type=module]` exists and its text is `console.log(1)`, a `head style` has text `.a{}`, and `querySelectorAll('script[src]')` is empty; and on the synthetic entry `<html><head><title>t</title></head><body><script type="module" src="/a.tsx"></script><p>x</p><script type="module" src="/b.tsx"></script></body></html>` with the same parts, `querySelectorAll('script[type=module]')` has exactly one element whose text is `console.log(1)`, `querySelectorAll('script[src]')` is empty, the `<p>x</p>` survives, and the seed script is still the first `script` under `head` — both `src` scripts are replaced, not only the first [M1]; (b) on the fixture DOM `<div id="todoList"><div class="todoItem"><input type="checkbox" data-checked="false" id="todo-0"><label for="todo-0">buy milk</label><button>Delete</button></div></div>`, for each of `{selector: '.todoItem', count: 1}`, `{selector: '.todoItem', text: 'buy milk'}`, `{selector: '.todoItem input', attr: {name: 'id', value: 'todo-0'}}`, `{selector: '.todoItem input[type=checkbox]', unchecked: true}`, `{selector: '.missing', absent: true}`, and — on the same DOM with `data-checked="true"` — `{selector: '.todoItem input', checked: true}`, `assertView` returns exactly `[]` [M2]; (c) on the first fixture DOM, for each of `{selector: '.todoItem', count: 2}`, `{selector: '.todoItem', text: 'buy bread'}`, `{selector: '.todoItem input', attr: {name: 'id', value: 'todo-9'}}`, `{selector: '.todoItem input', checked: true}`, `{selector: '.todoItem', absent: true}`, and `{selector: '.missing', checked: true}` (no match: `checked` needs at least one), `assertView` returns exactly one string, and it contains the entry's selector; and `{selector: '.todoItem input', unchecked: true}` on the `data-checked="true"` DOM returns one string; and on a mixed DOM `<div><input data-checked="true"><input data-checked="false"></div>`, `{selector: 'input', checked: true}` returns exactly one string and `{selector: 'input', unchecked: true}` returns exactly one string — one non-conforming match fails the universal — while `{selector: 'input', count: 2}` on it returns exactly `[]`; and on the first fixture DOM the three-entry list `[{selector: '.todoItem', count: 2}, {selector: '.todoItem', text: 'buy milk'}, {selector: '.missing', checked: true}]` returns exactly two strings, the first containing `.todoItem` and the second containing `.missing` — one string per failing entry, in list order, the passing entry contributing none [M2]; (d) `renderMove` with `env` lacking `TINYAPP_RENDER_URL` (but with `ULTRA_RUN_DIR` set to a temp dir) resolves `{render: 'skipped', ms: null, failures: []}` and a `fetchImpl` spy is called 0 times [M3]; (e) the same with `TINYAPP_RENDER_URL` set to the empty string resolves the same and the spy is called 0 times [M3]; (f) the same with `TINYAPP_RENDER_URL` set to the placeholder and `ULTRA_RUN_DIR` unset resolves the same and the spy is called 0 times, and with `ULTRA_RUN_DIR` the empty string likewise [M3]; (g) with both set, `entry` `client/index.html`, `content` the buy-milk snapshot, `view` `[{selector: '.todoItem', count: 1}]` and a recording `fetchImpl` returning the stub response whose `result.content` is the first fixture DOM and whose `result.screenshot` is the base64 of the bytes `[137, 80, 78, 71]`: the spy was called exactly once, its url is exactly `http://renderer.invalid/v4/accounts/x/browser-rendering/snapshot`, its `init.method` is `POST`, its `content-type` header is `application/json`, the parsed body's `html` contains `window.__TINYAPP_SEED__ = [{"todos":{"0":{"text":"buy milk","completed":false}}},{}];` and contains `<script type="module">` and no `src="/src/index.tsx"`, and, parsed with `node-html-parser`, its one `script[type=module]` has a text longer than 100000 characters that contains `createRoot` (the scaffold's `client/src/index.tsx` calls `ReactDOM.createRoot`, and the bundle is not minified) — the bundle is the module the entry names, not a placeholder, the body's `addScriptTag` is an array of one object whose `content` contains `data-checked` and `querySelectorAll`, and the result has `render` `ran`, `dom` equal to the fixture DOM, `screenshot` equal to `Uint8Array [137, 80, 78, 71]`, `failures` exactly `[]` and `ms` finite and greater than or equal to 0; the same call with `view` `[{selector: '.todoItem', count: 2}]` resolves `failures` of length 1 [M4]; (h) a `fetchImpl` returning status 500 makes `renderMove` reject — the promise fails, no `render` value is resolved — with a message beginning `render failed:` [M5]; (i) a `fetchImpl` returning status 200 with `{success: false, errors: [{message: 'x'}]}` makes it reject with a message beginning `render failed:`, while the 200 `success: true` stub of the earlier run leg resolved and did not reject [M5]; (j) the `Run:` exits 0, and the test reads `package.json` and asserts `devDependencies['node-html-parser']` is a non-empty string and that `bun.lock` contains the text `"node-html-parser"` [M6].

**Stale-if:**
- path-exists: `packages/tinyapp-exam/src/render-move.ts`
- path-absent: `client/index.html`
- path-absent: `packages/tinyapp-exam/src/types.ts`

### Task 4: The evidence writer

**Type:** implementation
**Review:** peer

**Files:**
- Create: `packages/tinyapp-exam/src/evidence.ts`
- Test: `packages/tinyapp-exam/test/evidence.test.ts`

**Claim:** After an exam runs, the operator finds its record — the diff, the mutant verdict, the contract, the walls and, when a picture was taken, the DOM and the screenshot — in one directory named for the task, the exam and the pass, and a run of the suite on a laptop leaves the same files in a temp directory instead. (derived)
Machine: M1. `evidenceDir(stem, env)` returns `<env.ULTRA_RUN_DIR>/state-exams/task-<env.ULTRA_TASK>/<stem>-<env.ULTRA_EXAM_PASS>` when `env.ULTRA_RUN_DIR` is a non-empty string — with `ULTRA_TASK` and `ULTRA_EXAM_PASS` each read as `none` when unset or empty — and that directory exists when it returns.
M2. When `env.ULTRA_RUN_DIR` is unset or empty, `evidenceDir(stem, env)` returns a directory that exists, lies under `os.tmpdir()`, has a basename beginning `tinyapp-exam-<stem>-`, and differs between two calls.
M3. `writeEvidence(dir, record)` writes `store-diff.json` (the `storeDiff` array), `mutant.json` (`{killed, path, edits}`), `contract.json` (`{clock, breach}`) and `walls.json` (`{store_ms, render_ms, mutant_ms, render}`), each as `JSON.stringify(value, null, 2)` followed by one newline, and returns the sorted list of file names it wrote.
M4. `dom.html` (the `dom` string, utf-8) and `screenshot.png` (the `screenshot` bytes) are written only when the record carries them; a record without them leaves neither file, and `writeEvidence` returns exactly the four names.
M5. `examStem(mainPath)` returns the basename of `mainPath` with a trailing `.test.ts` or `.test.tsx` removed, or with its last extension removed when it has neither: `buy-milk` for `/x/tests/state-exams/buy-milk.test.ts` and `probe` for `/x/probe.ts`.

**Authorized-by:** spec `2026-09-09-tinyapp-state-exams` §3.4 (own temp path), §3.5 (the `ULTRA_RUN_DIR` rule), §3.6, §4.2 (k); ultrapowers #758

**Interfaces:**
- Consumes: `ExamRecord`
- Produces: `evidenceDir(stem: string, env: Record<string, string | undefined>) -> string`
- Produces: `writeEvidence(dir: string, record: ExamRecord) -> string[]`
- Produces: `examStem(mainPath: string) -> string`

**Context:** `node:fs`, `node:os`, `node:path` only; the record type is in
`packages/tinyapp-exam/src/types.ts` (in this task's tree): `type ExamRecord = {walls:
{store_ms: number, render_ms: number | null, mutant_ms: number, render: 'ran' | 'skipped'},
mutant: {killed: boolean, path: string, edits: MutantEdit[]}, contract: {clock: string, breach:
string | null}, storeDiff: Difference[], dom?: string, screenshot?: Uint8Array}`. The directory
rule is the engine's evidence contract (Plan B adds `ULTRA_TASK`, `ULTRA_RUN_DIR` and
`ULTRA_EXAM_PASS` — `base`, `0`, `1`, `2` — to every exam run's environment; `ULTRA_RUN_DIR` is
the run's own directory, and `state-exams/` is the name chosen so it never collides with the
reserved `tests/exams/` root). A test reads env from the argument, never from `process.env`, so
the suite is independent of what the driver set for it; `stem` is what `examStem(Bun.main)`
gives — measured at BASE: inside `bun test`, `Bun.main` is the running test file's absolute path
even when read from an imported module, which is how `stateExam` learns its own stem without
being told. Use `fs.mkdirSync(dir, {recursive: true})` for M1 and `fs.mkdtempSync(path.join(os.
tmpdir(), 'tinyapp-exam-' + stem + '-'))` for M2 (compare with `fs.realpathSync` on both sides
when asserting the parent, since macOS's `os.tmpdir()` is a symlink). `screenshot.png` is
written with `fs.writeFileSync(file, bytes)`; the four JSON files always, in one pass, and the
returned names sorted with plain `Array.prototype.sort`.
**BASE facts:** (generated at a99a2be)

**Proof:**
- Test: `packages/tinyapp-exam/test/evidence.test.ts`
- Guard: `packages/tinyapp-exam/test/evidence.test.ts`
- Legs: (a) with `env` `{ULTRA_RUN_DIR: <temp dir>, ULTRA_TASK: '3', ULTRA_EXAM_PASS: '0'}`, `evidenceDir('buy-milk', env)` returns exactly `<temp dir>/state-exams/task-3/buy-milk-0` and `fs.existsSync` of it is true [M1]; (b) with `env` `{ULTRA_RUN_DIR: <temp dir>}` alone it returns exactly `<temp dir>/state-exams/task-none/buy-milk-none`, and with `ULTRA_TASK` the empty string the same [M1]; (c) with `env` `{}` and with `env` `{ULTRA_RUN_DIR: ''}`, `evidenceDir('buy-milk', env)` returns an existing directory whose realpath's parent is the realpath of `os.tmpdir()`, whose basename starts with `tinyapp-exam-buy-milk-`, and two calls return different paths [M2]; (d) `writeEvidence(dir, record)` with a record whose `storeDiff` is `[{table: 'todos', row: '0', cell: 'completed', got: true, wanted: false}]`, `mutant` `{killed: true, path: 'todos/0/completed', edits: [{table: 'todos', row: '0', cell: 'completed', value: true}]}`, `contract` `{clock: '2026-01-01T00:00:00Z', breach: null}`, `walls` `{store_ms: 3, render_ms: null, mutant_ms: 1, render: 'skipped'}` and no `dom`/`screenshot` returns exactly `['contract.json', 'mutant.json', 'store-diff.json', 'walls.json']`, each file parses back to the value written, and each file's bytes equal `JSON.stringify(value, null, 2) + '\n'` [M3]; (e) the directory of the previous leg has no `dom.html` and no `screenshot.png` [M4]; (f) a record with `dom` `<p>x</p>`, `screenshot` `Uint8Array [137, 80, 78, 71]` and `walls.render` `ran` returns exactly `['contract.json', 'dom.html', 'mutant.json', 'screenshot.png', 'store-diff.json', 'walls.json']`, `dom.html` reads back `<p>x</p>` and `screenshot.png` reads back those four bytes [M4]; (g) `examStem('/x/tests/state-exams/buy-milk.test.ts')` is exactly `buy-milk`, `examStem('/x/a/b.test.tsx')` is `b`, and `examStem('/x/probe.ts')` is `probe` [M5].

**Stale-if:**
- path-exists: `packages/tinyapp-exam/src/evidence.ts`
- path-absent: `packages/tinyapp-exam/src/types.ts`

### Task 5: The fixture honours the seed and exposes its callbacks

**Type:** implementation
**Review:** peer

**Files:**
- Modify: `client/src/storeData.ts`
- Modify: `client/src/Store.tsx`
- Modify: `client/src/TodoInput.tsx`
- Modify: `client/src/TodoItem.tsx`
- Modify: `client/src/index.tsx`
- Modify: `client/src/vite-env.d.ts`
- Modify: `client/package.json`
- Modify: `bun.lock`
- Create: `state-exams/seeds/empty.json`
- Create: `state-exams/expected/one-open-todo.json`
- Create: `state-exams/expected/still-empty.json`
- Test: `client/test/todos-store.test.ts`
- Test: `client/test/seeded-store.test.ts`

**Claim:** A todo is added, ticked or deleted through one plain store call each — the same calls the buttons make — an empty todo is refused and the list stays as it was, and a page opened with a seed shows the seed and talks to no database and no server. (derived)
Machine: M1. `addTodo(store, text)` on a `todos` store adds one row to `todos` whose `text` is `text` with surrounding whitespace removed and whose `completed` is `false`, and returns that row's id; on a store whose `todos` table is empty the returned id is `"0"`.
M2. `addTodo(store, "")` and `addTodo(store, "   ")` each return `undefined` and leave the store's `getContent()` deep-equal to what it was before.
M3. `setTodoCompleted(store, id, completed)` sets row `id`'s `completed` cell to `completed`, and `deleteTodo(store, id)` removes row `id`.
M4. `createTodosStore()` with no argument returns a store with the scaffold's two default rows `'1'` and `'2'`, and `createTodosStore(seed)` returns a store whose `getContent()` deep-equals `seed`, for `seed` `[{}, {}]` and for `[{"todos": {"0": {"text": "buy milk", "completed": false}}}, {}]`.
M5. `readSeed()` returns `window.__TINYAPP_SEED__` when a `window` exists and carries it, and `undefined` when `window` carries none.
M6. Rendering `<Provider><Store onReady={f} /></Provider>` with `react-dom/client` into a DOM whose `window.__TINYAPP_SEED__` is the buy-milk snapshot, once the render's effects have run (the exam awaits a fixed settle timer): `f` has been called, the store provided under `STORE_ID` has `getContent()` deep-equal to the seed, and the sqlite-wasm persister factory, the ws-synchronizer factory and the `reconnecting-websocket` constructor (each module-mocked and counted) have been called 0 times each; the same render with no seed, after the same settle, has called each of the three at least once.
M7. `state-exams/seeds/empty.json` parses to `[{}, {}]`, `state-exams/expected/one-open-todo.json` parses to `[{"todos": {"0": {"text": "buy milk", "completed": false}}}, {}]`, and `state-exams/expected/still-empty.json` parses to `[{}, {}]`.
M8. `client/src/TodoInput.tsx` calls `addTodo(`, `client/src/TodoItem.tsx` calls `setTodoCompleted(` and `deleteTodo(`, and `client/src/index.tsx` calls `readSeed(` — each a text the file contains — and `client/package.json` `devDependencies` carries `@happy-dom/global-registrator`, with `bun install --frozen-lockfile` exiting 0 on the tree.

**Authorized-by:** spec `2026-09-09-tinyapp-state-exams` §3.2 move 2 (the seed convention), §4.1, §4.2 (l), §4.3 (the two first-run claims' seeds and expected states); ultrapowers #758

**Interfaces:**
- Consumes: nothing
- Produces: `addTodo(store: TodosStore, text: string) -> string | undefined`
- Produces: `setTodoCompleted(store: TodosStore, id: string, completed: boolean) -> void`
- Produces: `deleteTodo(store: TodosStore, id: string) -> void`
- Produces: `createTodosStore(seed?: TodosContent) -> TodosStore`
- Produces: `readSeed() -> TodosContent | undefined`
- Produces: `TodosStore` (type, `client/src/storeData.ts`)

**Context:** The scaffold at BASE (`create-tinybase` todos, TypeScript + React, `with-schemas`
entry points). `client/src/storeData.ts` exports `TABLES_SCHEMA = {todos: {text: {type:
'string', default: ''}, completed: {type: 'boolean', default: false}}} as const`, `TodoRow`,
`STORE_ID = 'todos'` and `createTodosStore = () => createMergeableStore().setTablesSchema(
TABLES_SCHEMA).setDefaultContent([{todos: {'1': {…}, '2': {…}}}, {}])` — the two default rows
are present immediately (the smoke test pins `getRowCount('todos') === 2`). Add `type Schemas =
[typeof TABLES_SCHEMA, NoValuesSchema]`, `type TodosStore = MergeableStore<Schemas>`, `type
TodosContent = Content<Schemas>` (or the equivalent `[Tables, Values]` type), the three callbacks,
`readSeed`, and the optional `seed` argument: `createTodosStore(seed)` calls `setContent(seed)`
after the schema — measured at BASE: `setContent([{}, {}])` empties the defaults, and `addRow`
on the emptied store returns `'0'`, then `'1'`, deterministically on every fresh store, which is
why the expected snapshots pin row `"0"` and `addTodo` passes no id. `addTodo` trims and returns
`undefined` for a blank result without touching the store; it uses `store.addRow('todos', {text,
completed: false})`. Today there is no plain callback — `TodoInput.tsx` uses `useAddRowCallback`
with `text.trim()` and refuses a blank in its submit handler, `TodoItem.tsx` uses
`useSetPartialRowCallback` (`{completed: e.target.checked}`) and `useDelRowCallback`; rewire
both through `useStore(STORE_ID)` (export it from the `UiReact as UiReact.WithSchemas<Schemas>`
destructure in `Store.tsx`, where `useAddRowCallback` and friends come from today) and the
callbacks, so an exam's `action` and the buttons are one code path. `client/src/Store.tsx` is
the file that creates the store and starts both links, inside React hooks: `useCreateMergeableStore(
() => createTodosStore())`, `useProvideStore(STORE_ID, store)`, `useCreatePersister(store,
async … createSqliteWasmPersister(store as MergeableStore<Schemas>, sqlite3, db, STORE_ID) …,
[], async (persister) => { await persister.load(); await persister.startAutoSave(); onReady?.();
})` and `useCreateSynchronizer(store, async … createWsSynchronizer(store, new
ReconnectingWebSocket(SERVER + location.pathname)) … startSync …)`. The seed branch goes here:
read `readSeed()` once; create the store with `createTodosStore(seed)`; when a seed is present
call `onReady` from a `useEffect` and render nothing else; when absent render an inner
component (say `StoreLinks`) that holds the two `useCreate*` hooks unchanged — hooks are
unconditional inside each component, and the branch is which component mounts. Keep the
`store as MergeableStore<Schemas>` cast (TS 6 + tinybase 9.7 need it). `client/src/index.tsx`
runs `if (location.pathname === '/') location.assign('/' + getUniqueId())` before rendering —
a rendered snapshot page has no room path, so skip the redirect when `readSeed()` returns a
seed, or the renderer never sees the app. Declare the global in `client/src/vite-env.d.ts`:
`declare global { interface Window { __TINYAPP_SEED__?: import('./storeData').TodosContent } }`
plus `export {}` as needed — `client/tsconfig.json` includes `src` only, so the test files are
not typechecked and the root `bun run typecheck` stays the client's and the server's `tsc`.
The exam files live at `client/test/*.test.ts` so that `react`, `react-dom` and `tinybase`
resolve through `client/node_modules` (Bun 1.3 links each workspace's dependencies under its
own `node_modules`; from the root `tests/` React is not resolvable). For M6 add
`@happy-dom/global-registrator` to `client/package.json` `devDependencies` (`bun add -d
@happy-dom/global-registrator --cwd client` at the repository root rewrites `bun.lock`; this
task is wave 1's only `bun.lock` writer). Measured at BASE with that setup: a test file that
calls `GlobalRegistrator.register()` at its top, `mock.module('reconnecting-websocket', () =>
({default: class { constructor() { sockets++ } addEventListener() {} }}))`,
`mock.module('../src/sqlite', () => ({getDb: async () => ({sqlite3: {}, db: {}})}))`,
`mock.module('tinybase/persisters/persister-sqlite-wasm/with-schemas', () =>
({createSqliteWasmPersister: () => { persisters++; return {load: async () => {}, startAutoSave:
async () => {}, stopAutoSave() {}, destroy() {}} }}))` and
`mock.module('tinybase/synchronizers/synchronizer-ws-client/with-schemas', () =>
({createWsSynchronizer: async () => { syncs++; return {startSync: async () => {}, getWebSocket:
() => ({addEventListener() {}}), load: async () => {}, save: async () => {}, stopSync() {},
destroy() {}} }}))`, then dynamically imports `react`, `react-dom/client`,
`tinybase/ui-react` (`Provider`) and `../src/Store` and renders into a `div` appended to
`document.body`, observed after a 300 ms settle timer (the figure the exam should use) with the scaffold's unmodified `Store` and no seed:
`sockets=1 persisters=1 syncs=1 ready=1` — that is the negative control of M6, and the seeded
render must read `0 0 0` with `ready` 1. Bun runs every test file in one process: `mock.module`
is process-wide (only `Store.tsx` imports the four mocked modules, so nothing else is
affected), and the file must `GlobalRegistrator.unregister()` in `afterAll` so the DOM does not
leak into the next file. Read the provided store back with `useStore`-free means: capture it
from a tiny child component rendered inside the same `Provider` that calls the exported
`useStore(STORE_ID)`, or read `window.__TINYAPP_SEED__`-independent state through `Store`'s
`onReady` plus a ref — the exam decides. Seeds and expected states are JSON files in
`getContent()` shape: `state-exams/seeds/empty.json` is `[{}, {}]`,
`state-exams/expected/one-open-todo.json` is `[{"todos": {"0": {"text": "buy milk",
"completed": false}}}, {}]`, `state-exams/expected/still-empty.json` is `[{}, {}]`; the
composition task's exams read them by these exact paths from the repository root. The
scaffold's components render `<div id="todoList">` holding one `<div class="todoItem">` per
row with an `<input type="checkbox" id="todo-<id>">`, a `<label>` carrying the text and a
Delete button — there is no `<li>`; keep that markup, the first-run exams' `view` selectors are
written against it.
**BASE facts:** (generated at a99a2be)
- `STORE_ID` at `client/src/storeData.ts:12` blob 63b5107
- `client/src/TodoInput.tsx` blob 6e13c49
- `client/src/TodoItem.tsx` blob 6e9b232
- `client/src/index.tsx` blob 4da4ca8
- `client/package.json` blob d8b848d
- `client/src/storeData.ts` blob 63b5107
- `client/src/Store.tsx` blob a3acdb1
- `client/src/vite-env.d.ts` blob 31f07ea
- `client/tsconfig.json` blob 986bae7
- `bun.lock` blob d9edcd5

**Proof:**
- Test: `client/test/todos-store.test.ts`
- Test: `client/test/seeded-store.test.ts`
- Guard: `client/test/todos-store.test.ts`
- Guard: `client/test/seeded-store.test.ts`
- Run: bun install --frozen-lockfile
- Run: grep -q 'addTodo(' client/src/TodoInput.tsx
- Run: grep -q 'setTodoCompleted(' client/src/TodoItem.tsx
- Run: grep -q 'deleteTodo(' client/src/TodoItem.tsx
- Run: grep -q 'readSeed(' client/src/index.tsx
- Legs: (a) on `createTodosStore([{}, {}])`, `addTodo(store, '  buy milk ')` returns exactly `'0'` and `getContent()` is exactly `[{todos: {'0': {text: 'buy milk', completed: false}}}, {}]`; on `createTodosStore()` (two default rows) `addTodo(store, 'x')` returns a string id, and afterwards `getRowCount('todos')` is 3 and that row's `text` is `'x'` with `completed` `false` [M1]; (b) on `createTodosStore([{}, {}])`, `addTodo(store, '')` and `addTodo(store, '   ')` each return `undefined` and `getContent()` is exactly `[{}, {}]` afterwards [M2]; (c) after `addTodo(store, 'a')` on an emptied store, `setTodoCompleted(store, '0', true)` makes `getCell('todos', '0', 'completed')` `true`, `setTodoCompleted(store, '0', false)` makes it `false`, and `deleteTodo(store, '0')` makes `hasRow('todos', '0')` false with `getContent()` exactly `[{}, {}]` [M3]; (d) `createTodosStore().getContent()[0].todos` has exactly the keys `'1'` and `'2'`; `createTodosStore([{}, {}]).getContent()` is exactly `[{}, {}]`; `createTodosStore(seed).getContent()` for the buy-milk snapshot is deep-equal to it [M4]; (e) with `globalThis.window` set to an object carrying `__TINYAPP_SEED__` `[{}, {}]`, `readSeed()` returns that array (same reference); with the property deleted it returns exactly `undefined`, and with `globalThis.window` itself deleted it returns exactly `undefined` and throws nothing — no seed, no error; the test restores `globalThis.window` afterwards [M5]; (f) in `seeded-store.test.ts`, under happy-dom with the four modules mocked as in Context and `window.__TINYAPP_SEED__` the buy-milk snapshot, rendering `<Provider><Store onReady /></Provider>` and awaiting the settle timer: `onReady` called at least once, the provided store's `getContent()` deep-equal to the seed, and each of the persister-factory count, the synchronizer-factory count and the socket-constructor count exactly 0 [M6]; (g) the same file, a second render into a fresh `div` after deleting `window.__TINYAPP_SEED__` (a new Provider so a new store is created), awaiting the same settle timer: each of the three counts at least 1 [M6]; (h) each of the three JSON files under `state-exams/` parses (read from the repository root, `../../state-exams/…` from `client/test/`) to exactly the snapshot M7 names [M7]; (i) the four `grep` `Run:` lines exit 0, the `bun install` `Run:` exits 0, and the test asserts `devDependencies['@happy-dom/global-registrator']` in `client/package.json` is a non-empty string [M8].

**Stale-if:**
- path-absent: `client/src/Store.tsx`
- path-absent: `client/src/storeData.ts`
- path-exists: `state-exams/seeds/empty.json`

### Task 6: `stateExam` — the three moves composed, the package sealed, the two first-run exams written

**Type:** implementation
**Review:** peer

**Files:**
- Create: `packages/tinyapp-exam/package.json`
- Create: `packages/tinyapp-exam/tsconfig.json`
- Create: `packages/tinyapp-exam/src/index.ts`
- Create: `packages/tinyapp-exam/src/state-exam.ts`
- Create: `tests/state-exams/buy-milk.test.ts`
- Create: `tests/state-exams/empty-todo-refused.test.ts`
- Modify: `package.json`
- Modify: `bun.lock`
- Test: `packages/tinyapp-exam/test/state-exam.test.ts`

**Claim:** One `stateExam({...})` in a test file is a whole exam: `bun test` runs the store move, takes the picture only when a renderer is there and the store was right, checks that the named mutant would have been caught, writes the record, and fails with a table, a breach line or `hollow exam:` when something is wrong — and the two first-run exams for "buy milk" and "empty todo refused" pass on the fixture. (derived)
Machine: M1. `runStateExam(spec, opts)` — `opts.env` defaulting to `process.env`, `opts.main` to `Bun.main`, `opts.fetchImpl` to `fetch` — resolves `{ok, failure, record, dir}` where `dir` is `evidenceDir(examStem(opts.main), opts.env)`, the six-or-four evidence files of `record` have been written into `dir`, and `record.mutant` is `{killed: diffContent(content, applyMutant(expected, spec.mutant)).length > 0, path: mutantPath(spec.mutant), edits: spec.mutant}`.
M2. On a green spec — seed `state-exams/seeds/empty.json`, `store` the fixture's `createTodosStore`, action `addTodo(store, 'buy milk')`, expected `state-exams/expected/one-open-todo.json`, mutant `[{table: 'todos', row: '0', cell: 'completed', value: true}]`, `clock` `2026-01-01T00:00:00Z`, `entry` `client/index.html` — with an `env` lacking `ULTRA_RUN_DIR`: `ok` is `true`, `failure` is `null`, `record.storeDiff` is `[]`, `record.mutant.killed` is `true`, `record.walls.render` is `skipped` with `render_ms` `null`, `record.contract` is `{clock: '2026-01-01T00:00:00Z', breach: null}`, and `store_ms` and `mutant_ms` are finite numbers greater than or equal to 0.
M3. When the store move's diff is non-empty, `ok` is `false`, `failure` begins `store move: expected state not reached` and contains `renderDiff(diff)`, `record.storeDiff` is that diff, and `opts.fetchImpl` is called 0 times even when `env` carries both `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR`.
M4. When the store move's diff is empty and `env` carries both `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR`, `opts.fetchImpl` is called exactly once, `record.walls.render` is `ran` with a finite `render_ms`, `dir` is `<ULTRA_RUN_DIR>/state-exams/task-<ULTRA_TASK>/<stem>-<ULTRA_EXAM_PASS>` and holds `dom.html` and `screenshot.png`; a non-empty `failures` from the render move makes `ok` `false` with `failure` beginning `render: view not satisfied` and containing each failure string.
M5. When the mutant applied to the expected state is not distinguished — `diffContent(content, applyMutant(expected, spec.mutant))` is `[]` — `ok` is `false`, `failure` is exactly `hollow exam: mutant <mutantPath(spec.mutant)> not distinguished`, and `record.mutant.killed` is `false`.
M6. A contract rejection from the store move — `contract breach: <url>`, `contract: clock is required`, `snapshot violates schema: …`, `nondeterministic store: …` — makes `ok` `false` with `failure` that error's message and, for a breach, `record.contract.breach` equal to it.
M7. `stateExam(spec)` registers one bun test named `state exam: <examStem(Bun.main)>` whose body awaits `runStateExam(spec)` and throws an `Error` with message `failure` when `ok` is false: a file calling `stateExam` with the green spec of M2 passes under `bun test`, and a file calling it with the hollow mutant of M5 exits non-zero under `bun test` with `hollow exam:` in its output.
M8. `packages/tinyapp-exam/package.json` names the package `tinyapp-exam` with `main` `src/index.ts` and `dependencies` `tinybase` and `node-html-parser`; the root `package.json` `devDependencies` carries `tinyapp-exam` as `workspace:*` and no `node-html-parser`; `scripts.typecheck` ends with `bunx tsc -p packages/tinyapp-exam --noEmit`; `bun install --frozen-lockfile` exits 0 on the tree; `src/index.ts` exports `stateExam`, `runStateExam`, `storeMove`, `renderMove`, `applyMutant`, `diffContent`, `renderDiff`, `assertView`, `withContract`, `evidenceDir`, `writeEvidence`, `examStem` and `mutantPath`.
M9. `bun test tests/state-exams/buy-milk.test.ts tests/state-exams/empty-todo-refused.test.ts` exits 0, where each file imports `stateExam` from `tinyapp-exam` and `createTodosStore` and `addTodo` from `../../client/src/storeData` and declares `clock`, `entry: 'client/index.html'`, a `seed` under `state-exams/seeds/`, an `expected` under `state-exams/expected/`, a `view` and a `mutant`; the first's action is `addTodo(store, 'buy milk')` with expected `one-open-todo.json`, the second's is `addTodo(store, '   ')` with expected `still-empty.json`.

**Authorized-by:** spec `2026-09-09-tinyapp-state-exams` §3.1, §3.2 (the order of the three moves, render only when move 1 is green), §3.5 (a workspace package the target depends on), §3.6, §4.2 (g), (h), (k), §4.3; ultrapowers #758

**Interfaces:**
- Consumes: `storeMove(spec: StateExamSpec) -> Promise<{content: Snapshot, diff: Difference[], ms: number}>`
- Consumes: `diffContent(got: Snapshot, wanted: Snapshot) -> Difference[]`
- Consumes: `renderDiff(differences: Difference[]) -> string`
- Consumes: `applyMutant(snapshot: Snapshot, edits: MutantEdit[]) -> Snapshot`
- Consumes: `mutantPath(edits: MutantEdit[]) -> string`
- Consumes: `renderMove(args: {entry: string, content: Snapshot, view?: View | View[], env: Record<string, string | undefined>, fetchImpl?: typeof fetch}) -> Promise<{render: 'ran' | 'skipped', ms: number | null, dom?: string, screenshot?: Uint8Array, failures: string[]}>`
- Consumes: `evidenceDir(stem: string, env: Record<string, string | undefined>) -> string`
- Consumes: `writeEvidence(dir: string, record: ExamRecord) -> string[]`
- Consumes: `examStem(mainPath: string) -> string`
- Consumes: `addTodo(store: TodosStore, text: string) -> string | undefined`
- Consumes: `createTodosStore(seed?: TodosContent) -> TodosStore`
- Produces: `stateExam(spec: StateExamSpec) -> void`
- Produces: `runStateExam(spec: StateExamSpec, opts?: {env?: Record<string, string | undefined>, main?: string, fetchImpl?: typeof fetch}) -> Promise<{ok: boolean, failure: string | null, record: ExamRecord, dir: string}>`

**Context:** Everything this task composes is in its tree: `src/types.ts` (`Snapshot`,
`Difference`, `MutantEdit`, `View`, `StateExamSpec` = `{clock, entry?, seed, action, expected,
view?, mutant, store}`, `ExamRecord` = `{walls: {store_ms, render_ms, mutant_ms, render}, mutant:
{killed, path, edits}, contract: {clock, breach}, storeDiff, dom?, screenshot?}`),
`src/store-move.ts` (`storeMove` resolves `{content, diff, ms}`, rejects on a contract breach
with `contract breach: <url>`, on a missing clock with `contract: clock is required`, on a bad
seed with `snapshot violates schema: …`, on two differing runs with `nondeterministic store:
…`; `diffContent`; `renderDiff` whose first line is `table / row / cell / got / wanted`),
`src/contract.ts`, `src/mutant.ts` (`applyMutant`, `mutantPath` — `todos/0/completed`),
`src/render-move.ts` (`renderMove` — skipped when `TINYAPP_RENDER_URL` or `ULTRA_RUN_DIR` is
unset or empty, else one POST to `<url>/snapshot` through `fetchImpl` and `failures` from the
view), `src/evidence.ts` (`evidenceDir`, `writeEvidence` — four JSON files always, `dom.html`
and `screenshot.png` when present — `examStem`), and the fixture's `client/src/storeData.ts`
(`createTodosStore(seed?)`, `addTodo`) with `state-exams/seeds/empty.json`,
`state-exams/expected/one-open-todo.json` = `[{"todos": {"0": {"text": "buy milk",
"completed": false}}}, {}]` and `state-exams/expected/still-empty.json` = `[{}, {}]`. The order
is the spec's: store move; render move only when the store diff is empty (a red store needs no
picture, and an exam probed at BASE must never dial the renderer); mutant last, timed with
`performance.now()`; `walls.mutant_ms` is that timing; a rejection from the store move is
caught, becomes `failure`, and the record is still written (`storeDiff` `[]`, `mutant.killed`
`false`, `breach` the line for a breach and `null` otherwise) so a red exam leaves evidence too.
`stateExam` is `test('state exam: ' + examStem(Bun.main), async () => { const r = await
runStateExam(spec); if (!r.ok) throw new Error(r.failure!) })` with `test` from `bun:test` —
measured at BASE: inside `bun test`, `Bun.main` is the running test file's path even from an
imported module. For M7's red half the exam writes a temporary `<tmp>/hollow.test.ts` that
imports `stateExam` and the fixture by absolute paths (a file outside the repository resolves
nothing relative), runs `Bun.spawnSync(['bun', 'test', thatPath], {cwd: <repo root>, env:
{...process.env, ULTRA_RUN_DIR: ''}})` and reads `exitCode` and `stderr` — measured at BASE: `bun
test <absolute path outside the repo>` runs the file and exits 1 on a failing test. The
package manifest: `{"name": "tinyapp-exam", "version": "0.1.0", "private": true, "type":
"module", "main": "src/index.ts", "dependencies": {"tinybase": "^9.7.0", "node-html-parser":
"^7.0.1"}}` — `tinybase` for the type imports, `node-html-parser` moved here from the root
`devDependencies` where the render task put it; `tsconfig.json` `{"compilerOptions": {"target":
"ES2022", "module": "ESNext", "moduleResolution": "bundler", "strict": true, "noEmit": true,
"skipLibCheck": true, "types": ["bun"], "allowImportingTsExtensions": true}, "include": ["src",
"test"]}` (`@types/bun` resolves from the root `node_modules`). Root `package.json`: add
`"tinyapp-exam": "workspace:*"` to `devDependencies`, remove `node-html-parser` from it, and
append ` && bunx tsc -p packages/tinyapp-exam --noEmit` to `scripts.typecheck`; then `bun
install` at the root rewrites `bun.lock` — measured at BASE: with the workspace dependency
declared, `bun install` creates `node_modules/tinyapp-exam -> ../packages/tinyapp-exam` and
`import {stateExam} from 'tinyapp-exam'` resolves from `tests/`; without the declaration the
link is not made. This task is wave 3's only `bun.lock` writer. The two first-run exams are
ordinary committed tests at `tests/state-exams/buy-milk.test.ts` and
`tests/state-exams/empty-todo-refused.test.ts` (the reserved `tests/exams/` root is the
engine's; these are the fixture's own). Their `view`s are written against the scaffold's markup
(`<div id="todoList">` holding one `<div class="todoItem">` per row with an `<input
type="checkbox">` and a `<label>`; no `<li>`): buy-milk `[{selector: '.todoItem', count: 1,
text: 'buy milk'}, {selector: '.todoItem input[type=checkbox]', unchecked: true}]` with mutant
`[{table: 'todos', row: '0', cell: 'completed', value: true}]`; empty-todo-refused `[{selector:
'.todoItem', absent: true}, {selector: '#todoList', count: 1}]` with mutant `[{table: 'todos',
row: '0', cell: 'text', value: ''}]` (a row the expected empty state does not have, so the
perturbed expectation differs from the empty content and the mutant is killed). In the suite
both run with `ULTRA_RUN_DIR` unset, so their render move is `skipped` and their evidence goes
to a temp directory — the store and mutant moves are the proof. Every path a spec names is
relative to `process.cwd()`, which for `bun test` from the root is the repository root.
**BASE facts:** (generated at a99a2be)
- `store` at `server/index.ts:10` blob 721e893
- `createTodosStore` at `client/src/storeData.ts:14` blob 63b5107
- `client/index.html` blob 692ccb1
- `package.json` blob ea97c56
- `client/src/storeData.ts` blob 63b5107
- `bun.lock` blob d9edcd5

**Proof:**
- Test: `packages/tinyapp-exam/test/state-exam.test.ts`
- Guard: `packages/tinyapp-exam/test/state-exam.test.ts`
- Run: bun install --frozen-lockfile
- Run: bun test tests/state-exams/buy-milk.test.ts tests/state-exams/empty-todo-refused.test.ts
- Run: bunx tsc -p packages/tinyapp-exam --noEmit
- Legs: (a) `runStateExam(greenSpec, {env: {}, main: '/x/buy-milk.test.ts'})` resolves `ok` `true`, `failure` `null`, `record.storeDiff` exactly `[]`, `record.mutant` exactly `{killed: true, path: 'todos/0/completed', edits: greenSpec.mutant}`, `record.walls.render` `skipped`, `record.walls.render_ms` `null`, `record.contract` exactly `{clock: '2026-01-01T00:00:00Z', breach: null}`, `store_ms` and `mutant_ms` finite and greater than or equal to 0, and `dir` an existing directory whose basename starts `tinyapp-exam-buy-milk-` holding exactly `contract.json`, `mutant.json`, `store-diff.json` and `walls.json` [M1] [M2]; (b) the green spec with `expected` pointing at a temp file holding `[{todos: {'0': {text: 'buy milk', completed: true}}}, {}]`, `env` `{TINYAPP_RENDER_URL: 'http://renderer.invalid/v4/accounts/x/browser-rendering', ULTRA_RUN_DIR: <tmp>, ULTRA_TASK: '1', ULTRA_EXAM_PASS: '0'}` and a `fetchImpl` spy: `ok` `false`, `failure` begins `store move: expected state not reached` and contains `table / row / cell / got / wanted` and `todos / 0 / completed / false / true`, `record.storeDiff` has length 1, the spy was called 0 times, and `dir` is exactly `<tmp>/state-exams/task-1/buy-milk-0` [M3]; (c) the green spec with that `env` and a `fetchImpl` stub returning `{success: true, result: {content: '<div id="todoList"><div class="todoItem"><input type="checkbox" data-checked="false"><label>buy milk</label></div></div>', screenshot: <base64 of [137, 80, 78, 71]>}}` and `view` `[{selector: '.todoItem', count: 1, text: 'buy milk'}]`: `ok` `true`, the stub called exactly once, `record.walls.render` `ran`, `render_ms` finite, and `dir` holds `dom.html` and `screenshot.png` alongside the four JSON files; the same with `view` `[{selector: '.todoItem', count: 2}]` gives `ok` `false` and `failure` beginning `render: view not satisfied` and containing `.todoItem` [M4]; (d) the green spec with `mutant` `[{table: 'todos', row: '0', cell: 'completed', value: false}]` (the value expected already has) resolves `ok` `false`, `failure` exactly `hollow exam: mutant todos/0/completed not distinguished`, and `record.mutant.killed` `false` [M5]; (e) the green spec with an action that calls `fetch('http://127.0.0.1:9/x')` resolves `ok` `false`, `failure` exactly `contract breach: http://127.0.0.1:9/x` and `record.contract.breach` the same string; with `clock` `''`, `failure` exactly `contract: clock is required` [M6]; (f) the test file itself calls `stateExam(greenSpec)` at its top level and that registered test, named `state exam: state-exam`, passes as part of the file; and a temp `hollow.test.ts` written as in Context, run with `Bun.spawnSync(['bun', 'test', path], {cwd: root, env: {...process.env, ULTRA_RUN_DIR: ''}})`, has `exitCode` not 0 and `hollow exam: mutant todos/0/completed not distinguished` in `stderr + stdout` [M7]; (g) the test reads `packages/tinyapp-exam/package.json` and asserts `name` `tinyapp-exam`, `main` `src/index.ts`, `dependencies.tinybase` and `dependencies['node-html-parser']` non-empty strings; reads the root `package.json` and asserts `devDependencies['tinyapp-exam']` is `workspace:*`, `devDependencies['node-html-parser']` is `undefined`, and `scripts.typecheck` ends with `bunx tsc -p packages/tinyapp-exam --noEmit`; imports `tinyapp-exam` and asserts each of the thirteen names M8 lists is a function; and the `bun install` and `bunx tsc` `Run:` lines exit 0 [M8]; (h) the `bun test tests/state-exams/…` `Run:` exits 0, and the test reads both exam files and asserts each contains `from 'tinyapp-exam'` or `from "tinyapp-exam"`, `client/src/storeData`, `state-exams/seeds/`, `state-exams/expected/`, `entry:`, `clock:`, `view:` and `mutant:`, that `buy-milk.test.ts` contains `one-open-todo.json` and `'buy milk'`, and that `empty-todo-refused.test.ts` contains `still-empty.json` [M9].

**Stale-if:**
- path-exists: `packages/tinyapp-exam/package.json`
- path-absent: `packages/tinyapp-exam/src/store-move.ts`
- path-absent: `packages/tinyapp-exam/src/render-move.ts`
- path-absent: `packages/tinyapp-exam/src/evidence.ts`
- path-absent: `packages/tinyapp-exam/src/mutant.ts`
- path-absent: `state-exams/expected/one-open-todo.json`
