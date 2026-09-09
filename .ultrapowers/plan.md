# TinyApp first run, render ran — Clear completed and the done counter, each proven by a state exam

**Grammar:** claims-v1

**Claim:** I can clear every completed todo with one button, and the top bar tells me how many todos are done. (elicited)

**Goal:** The spec's pre-registered first run on the fixture target, the *render ran* branch
(`2026-09-09-tinyapp-state-exams` §4.3; ultrapowers #758, map #525 The Verification Frontier).
Target: `popmechanic/tinyapp-fixture` at BASE `207e3bdc` (re-pinned after fixture PR #3, the helper's render-branch fix; run-3 on `a2135f15` parked on that defect) — the `create-tinybase` todos scaffold
with the `tinyapp-exam` helper merged (run-2, PR #1), green: `bun run test`. Two `peer` tasks in
one wave: a *Clear completed* button that deletes every completed todo through one store
callback (`clearCompleted(store)` in `client/src/storeData.ts`, the one code path the button and
a headless caller share, like `addTodo`/`setTodoCompleted`/`deleteTodo`), and a done counter in
the top bar reading `<done> of <total> done`, derived from the store with no new store state.
Each task's Proof `Test:` is one state exam the examiner writes in wave 0 and the helper runs;
the engine reads each record from `<runDir>/state-exams/task-<id>/`. The one live question this
run answers is whether Cloudflare's `/snapshot` honours `addScriptTag` — the helper's injected
script reflects each input's `checked` property into `data-checked`, and a `checked: true` view
on a completed todo's checkbox (Task 2) is what reads it. Twelve choices were made in place of an
operator question, each the least machinery that keeps the spec's contract: (1) both exams are
`Guard:`ed, so each lands at its Proof path `tests/state-exams/<stem>.test.ts` beside the
fixture's own `buy-milk.test.ts` — the same directory, so the import depth
(`../../client/src/storeData`) is the fixture's own, and the exam survives in the committed
suite where a later run could break the claim; the evidence directory is unchanged by this.
(2) `clearCompleted` returns `void` like `deleteTodo` — the claim names no count. (3) The button is
a bare `<button id="clearCompleted">` in a new `client/src/ClearCompleted.tsx` (the scaffold's
`button.css` styles every `button`, so no stylesheet), mounted by `client/src/TodoList.tsx` in a
fragment after the `#todoList` div — not inside it, which would silence the `#todoList:empty`
message, and not in `App.tsx`, which Task 2 owns. (4) The counter is a pure `countTodos(table)`
in its own module `client/src/todoCounts.ts`, not in `storeData.ts`, so `storeData.ts` has one
writer; "no new store state" is pinned by a leg on `TABLES_SCHEMA`. (5) The TinyBase `Provider`
moves up to `App` — measured at BASE under happy-dom: a `useTable('todos', STORE_ID)` reader
placed where `<TopBar />` is rendered (outside `Main`'s `Provider`) reads `{}` while the same
reader under a `Provider` lifted to wrap both reads the store — so Task 2 owns `App.tsx`.
(6) The counter's text is exactly `<done> of <total> done`, shown always, `0 of 0 done` on an
empty list. (7) Seeds: each task creates its own (Creates disjoint); Task 1's expected state is
the existing `state-exams/expected/one-open-todo.json`, Task 2 creates its seed and its expected
file. (8) Task 2's exam acts — `setTodoCompleted(store, '1', true)` on a two-open seed — rather
than viewing a one-done seed unchanged, so its mutant is a real perturbation and the file is red
at BASE from its missing `todoCounts` import on either render branch (the engine records a
green-at-BASE exam as one that "establishes nothing"). (9) Every exam file carries, beside its
one `stateExam` call, ordinary `test` blocks from `bun:test` for the legs a state exam cannot
express (a return shape, an edge case) — the helper registers its one test and bun runs the
rest. (10) Task 2's view pairs `checked: true` on `input#todo-1` with a `.todoItem.completed`
count of 1, so a failure of the first with the second green isolates the `addScriptTag`
question from the render itself. (11) Task 1's mutant re-adds the cleared todo to the expected
state; Task 2's unticks it — each names the very change the claim forbids. (12) A laptop reading
is recorded, not repaired: at BASE on this laptop (Bun 1.3.0) `bun test` passes 79 of 84, the five
failures all `Bun.build` inside `bun test` (`Unexpected reading file … react/jsx-runtime.js`)
while the same `Bun.build` succeeds from `bun run`; the fixture's run-2 gate and PR #1 merged
green on this exact tree and the sandbox pins Bun 1.4.0 (`fleet/setup-script.mjs`), and no file
under `packages/` is touched here.
**Closes:** (none — the fixture repository has no issues; the plugin ticket is #758)

**Tech Stack:** Bun 1.4 on the sandbox + TypeScript 6 + TinyBase 9.7 (`with-schemas` entry
points), React 19, Vite 8 for the app's own build. The committed suite is the root `bun run test`
(`package.json` `scripts.test` = `bun run typecheck && bun test`; `typecheck` = the client's, the
server's and the helper's `tsc --noEmit` in turn) — the testCmd the launcher detects
(`package-json-bun`). Bootstrap is `bun install --frozen-lockfile`, driver-derived. No task adds
a dependency, so `bun.lock` has no writer.
**Exam command:** bun test {paths}

**Spec:** `docs/superpowers/specs/2026-09-09-tinyapp-state-exams.md` in the ultrapowers
repository (untracked there, absent from every sandbox — every fact a worker needs is in its
task's Context).

**Parallelization rationale:** one wave, width 2. Task 1 (the button and `clearCompleted`) and
Task 2 (the counter, the lifted `Provider`) share no file and no symbol: Task 1 writes
`storeData.ts`, `TodoList.tsx`, `ClearCompleted.tsx` and its seed; Task 2 writes `todoCounts.ts`,
`DoneCount.tsx`, `TopBar.tsx`, `App.tsx`, `Store.tsx` and its two snapshots. No `Create:`
collides, and no `Modify:` is shared, so nothing folds and nothing waits. Both exams are guarded
and land beside the fixture's own two under `tests/state-exams/`.

## Global Constraints

- Check: git diff --quiet $ULTRA_BASE -- server/ packages/ client/index.html client/vite.config.js client/tsconfig.json client/package.json client/public client/test client/src/TodoInput.tsx client/src/TodoItem.tsx client/src/Button.tsx client/src/Input.tsx client/src/Loading.tsx client/src/Info.tsx client/src/Title.tsx client/src/config.ts client/src/sqlite.tsx client/src/index.tsx client/src/vite-env.d.ts client/src/button.css client/src/todoItem.css client/src/todoList.css client/src/topBar.css client/src/title.css client/src/info.css package.json bun.lock tests/smoke.test.ts tests/state-exams/buy-milk.test.ts tests/state-exams/empty-todo-refused.test.ts state-exams/seeds/empty.json state-exams/expected/one-open-todo.json state-exams/expected/still-empty.json AGENTS.md README.md
- Check: test "$(grep -rl api.cloudflare.com client/src client/test packages tests state-exams 2>/dev/null | wc -l)" -eq 0
- Check: test "$(grep -rlE 'Bun\.serve\(|createWsServer|\.listen\(' client/test packages tests 2>/dev/null | wc -l)" -eq 0
- No test reaches the network: every `fetch` a test exercises is the helper's injected
  `fetchImpl` or the contract's blocked one, no test starts a server or a Durable Object, and the
  renderer is dialled only by the helper's own render move, from the one `TINYAPP_RENDER_URL`
  the driver set. `bun install` is the only network use in the run and happens only in the
  driver's bootstrap.
- The app reads from nowhere but its one TinyBase `MergeableStore` (schema `todos: {text:
  string, completed: boolean}`; the cell is `completed`, not `done`); every mutation the UI makes
  goes through a callback in `client/src/storeData.ts`, and the counter is derived from the
  `todos` table at render time — no new table, value, React state or module-level state holds it.
- The rendered markup the exams read stays the scaffold's: `<div id="todoList">` holding one
  `<div class="todoItem">` (plus the class `completed` when ticked) per row with
  `<input type="checkbox" id="todo-<id>">`, a `<label>` carrying the text and a Delete button;
  `<div id="topBar">` holding `<h1 id="topBarTitle">` and `<div id="info">`.
- The scaffold's files not named in a task's Files block are byte-identical to BASE (the first
  Check); no task adds a dependency, and `bun.lock` and both `package.json` files are unwritten.

**Acceptance:** suite — the committed suite is the verification.

### Task 1: Clear completed — one button, one store callback

**Type:** implementation
**Review:** peer

**Files:**
- Create: `client/src/ClearCompleted.tsx`
- Modify: `client/src/storeData.ts`
- Modify: `client/src/TodoList.tsx`
- Create: `state-exams/seeds/two-todos-one-done.json`
- Test: `tests/state-exams/clear-completed.test.ts`

**Claim:** I press one Clear completed button and every todo I have ticked is gone, while the ones I have not ticked stay exactly as they were. (derived)
Machine: M1. `clearCompleted(store)` removes from `todos` every row whose `completed` cell is `true` and no other row: on `createTodosStore(<the seed of M3>)` it leaves `getContent()` exactly `[{"todos": {"0": {"text": "buy milk", "completed": false}}}, {}]` — the content of `state-exams/expected/one-open-todo.json` — and `clearCompleted` is a named export of `client/src/storeData.ts` that returns `undefined`.
M2. On a store with no completed row `clearCompleted(store)` leaves `getContent()` deep-equal to what it was before the call, and on a store whose every row is completed it leaves `getContent()` exactly `[{}, {}]`.
M3. `state-exams/seeds/two-todos-one-done.json` parses to exactly `[{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": true}}}, {}]`.
M4. `client/src/ClearCompleted.tsx` contains each of the texts `id="clearCompleted"`, `Clear completed`, `onClick=`, `useStore(STORE_ID)` and `clearCompleted(` — one button, its click handler, the provided store and the callback it calls — and `client/src/TodoList.tsx` contains the text `<ClearCompleted />`.
M5. When the run's render move ran — a renderer configured in `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR` set, the pre-registered branch of this run — the page rendered on the post-action state of M1 shows exactly one `.todoItem`, with text `buy milk` and its checkbox unchecked, and exactly one `#clearCompleted` with text `Clear completed`; when it did not run, the exam's record says `skipped` and this clause asserts nothing.

**Authorized-by:** spec `2026-09-09-tinyapp-state-exams` §3.1, §3.3, §4.3 (the first run's `peer` tasks); ultrapowers #758

**Interfaces:**
- Consumes: nothing
- Produces: `clearCompleted(store: TodosStore) -> void`
- Produces: `ClearCompleted() -> JSX.Element`

**Context:** The store module `client/src/storeData.ts` exports `TABLES_SCHEMA = {todos: {text:
{type: 'string', default: ''}, completed: {type: 'boolean', default: false}}}`, `TodosStore`,
`STORE_ID = 'todos'`, `createTodosStore(seed?)`, and the three callbacks `addTodo(store, text)`,
`setTodoCompleted(store, id, completed)` and `deleteTodo(store, id)` (`store.delRow('todos',
id)`). Put `clearCompleted` directly after `deleteTodo` and before the `readSeed` comment, in the
same style: `export const clearCompleted = (store: TodosStore): void => { … }`. Measured at BASE
on `createTodosStore(seed)` with the seed of M3: `store.forEachRow('todos', (id) => { if
(store.getCell('todos', id, 'completed') === true) store.delRow('todos', id); })` leaves
`getContent()` exactly `[{"todos":{"0":{"text":"buy milk","completed":false}}},{}]`, the same
loop inside `store.transaction(() => …)` over `getRowIds('todos')` leaves the same, two fresh
stores from the same seed reach byte-identical `getContent()` (the helper runs every action
twice and rejects a difference as `nondeterministic store:`), and on a seed whose two rows are
both completed the loop leaves `[{},{}]` — a table with no rows does not exist in TinyBase, so
the empty state is `[{}, {}]`, never `[{todos: {}}, {}]`. `createTodosStore(seed)` calls
`setContent(seed)` after the schema and the seed of M3 round-trips exactly (measured). The
component: `client/src/TodoItem.tsx` is the pattern — `const store = useStore(STORE_ID) as
TodosStore | undefined;` with `useStore`, `STORE_ID` and the `TodosStore` type from `./Store`,
and the callback guarded by `if (store)`; import `clearCompleted` from `./storeData` directly
(`./Store` re-exports the other three, but leave `Store.tsx` alone — it is Task 2's file). Write
the element as `<button id="clearCompleted" type="button" onClick={…}>Clear completed</button>`
with the `id` attribute spelled exactly `id="clearCompleted"` (a `Run:` greps that text);
`client/src/button.css` styles every `button`, so no stylesheet is needed and none is in Files.
`client/src/TodoList.tsx` returns one `<div id="todoList">` of `TodoItem`s from
`useSortedRowIds`; make it return a fragment — the unchanged `#todoList` div, then
`<ClearCompleted />` — and nothing inside the div, because `client/src/todoList.css` shows
`No todos yet. Add one above!` through `#todoList:empty::before`, and the fixture's committed
`empty-todo-refused.test.ts` views `{selector: '#todoList', count: 1}` and `{selector:
'.todoItem', absent: true}`. `App.tsx` is not this task's: `Main` renders `<TodoInput />`,
`<TodoList />` and the inspector once the store is ready, so mounting in `TodoList.tsx` is enough.
The exam is one file, `tests/state-exams/clear-completed.test.ts`, which lands at that path
beside the fixture's own `tests/state-exams/buy-milk.test.ts` (both exams of this plan are
guarded, so the Proof path is the landing path); its imports are therefore
`import {stateExam} from 'tinyapp-exam';` (the workspace package, linked at the root by `bun
install`) and `import {addTodo, clearCompleted, createTodosStore, setTodoCompleted} from
'../../client/src/storeData';`, and every `seed`/`expected` path in it is relative to the
repository root, which is `bun test`'s cwd. The helper's call, exactly as the fixture's
`buy-milk.test.ts` spells it, with this task's values:
`stateExam({ clock: '2026-01-01T00:00:00Z', entry: 'client/index.html', seed:
'state-exams/seeds/two-todos-one-done.json', store: () => createTodosStore(), action: (store) =>
{ clearCompleted(store); }, expected: 'state-exams/expected/one-open-todo.json', view: [
{selector: '.todoItem', count: 1, text: 'buy milk'}, {selector: '.todoItem input[type=checkbox]',
unchecked: true}, {selector: '#clearCompleted', count: 1, text: 'Clear completed'} ], mutant: [
{table: 'todos', row: '1', cell: 'text', value: 'walk the dog'}, {table: 'todos', row: '1', cell:
'completed', value: true} ] });` — `stateExam` registers one bun test named `state exam:
clear-completed` that loads `seed` into `store()` with `setContent`, runs `action` under a fixed
clock with `fetch` and `WebSocket` blocked (`contract breach: <url>`), diffs `getContent()`
against `expected` (a red exam prints `table / row / cell / got / wanted`), then — only when that
diff is empty and both `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR` are set in the environment —
bundles `entry`, opens the page on the post-action state through `window.__TINYAPP_SEED__`,
POSTs it to the renderer and reads the returned DOM against `view`, and last applies `mutant` to
`expected` and fails `hollow exam: mutant todos/1/text,todos/1/completed not distinguished`
unless the perturbed expectation differs from what the store reached. The `view` vocabulary,
closed: `{selector, count?, text?, attr?: {name, value}, checked?: true, unchecked?: true,
absent?: true}` — `count` exact, `text` a substring of at least one match's `textContent`,
`attr` at least one match with that attribute value, `checked`/`unchecked` every match (and at
least one) carrying `data-checked="true"`/`"false"`, which the helper's injected script writes
from each input's `checked` property, `absent` zero matches. With the renderer unset (the suite
at the fold, a laptop) the render move is recorded `skipped` and the store and mutant moves are
the proof. A `mutant` edit is `{table, row, cell, value}`, `{table, row, cell, absent: true}` or
`{table, row, absent: true}`; the two edits above put the cleared todo back into the expected
state, so an exam that would let it survive is hollow. Seeds and expected states are JSON in
`getContent()` shape, `[tables, values]`, under `state-exams/seeds/` and
`state-exams/expected/`; `state-exams/expected/one-open-todo.json` exists at BASE with exactly
the content M1 names (blob `b12a5d1`) and is reused, not rewritten. The record lands in
`<ULTRA_RUN_DIR>/state-exams/task-<ULTRA_TASK>/clear-completed-<ULTRA_EXAM_PASS>/` — the driver
sets those three — as `store-diff.json`, `mutant.json`, `contract.json`, `walls.json` and, when
the render ran, `dom.html` and `screenshot.png`; no test reads or sets them. The legs a state
exam cannot express are ordinary `test` blocks from `bun:test` in the same file, beside the
`stateExam` call, building stores with `createTodosStore([{}, {}])` (an emptied store, where
`addTodo` returns `'0'` then `'1'`) and reading the seed file with `node:fs` — the exam file sits
at `tests/state-exams/`, two directories below the root, so its path is exactly
`join(import.meta.dir, '..', '..', 'state-exams', 'seeds', 'two-todos-one-done.json')`. The seed
file is the implementer's to create (it is in this task's Files as a `Create:` and does not exist
at BASE); the exam only reads it and asserts its content, so at BASE that leg is red too. At
BASE the file is red for one reason before any leg runs: `SyntaxError: Export named
'clearCompleted' not found in module '…/client/src/storeData.ts'` (measured).
**BASE facts:** (generated at 207e3bd)
- `state-exams/expected/one-open-todo.json` blob b12a5d1
- `client/src/storeData.ts` blob 6f40f9a
- `client/src/TodoList.tsx` blob 968229b
- `client/src/TodoItem.tsx` blob a5400c8
- `id` at `client/test/todos-store.test.ts:53` blob 4bbc33d
- `client/src/button.css` blob 922ed5f
- `client/src/todoList.css` blob 281f256
- `tests/state-exams/buy-milk.test.ts` blob b2eb5f6
- `expected` at `packages/tinyapp-exam/test/evidence.test.ts:79` blob 91e75ed
- `checked` at `packages/tinyapp-exam/test/render-move.test.ts:251` blob beab774
- `unchecked` at `packages/tinyapp-exam/test/render-move.test.ts:242` blob beab774
- `stateExam` at `packages/tinyapp-exam/src/state-exam.ts:164` blob b96f023
- `addTodo` at `client/src/storeData.ts:44` blob 6f40f9a

**Proof:**
- Test: `tests/state-exams/clear-completed.test.ts`
- Guard: `tests/state-exams/clear-completed.test.ts`
- Run: grep -q 'clearCompleted(' client/src/ClearCompleted.tsx
- Run: grep -q 'id="clearCompleted"' client/src/ClearCompleted.tsx
- Run: grep -q 'Clear completed' client/src/ClearCompleted.tsx
- Run: grep -q 'onClick=' client/src/ClearCompleted.tsx
- Run: grep -q 'useStore(STORE_ID)' client/src/ClearCompleted.tsx
- Run: grep -q '<ClearCompleted />' client/src/TodoList.tsx
- Legs: (a) the file's one `stateExam` call, spelled as in Context — seed `state-exams/seeds/two-todos-one-done.json`, action `clearCompleted(store)`, expected `state-exams/expected/one-open-todo.json`, the three-entry view and the two-edit mutant — passes as the test `state exam: clear-completed`, which is red when the store's `getContent()` after the action differs from `[{"todos": {"0": {"text": "buy milk", "completed": false}}}, {}]` in any cell or row and red as `hollow exam:` when re-adding row `1` to the expected state would not have been noticed; and a plain test asserts `typeof clearCompleted` is `'function'` and that `clearCompleted(createTodosStore([{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": true}}}, {}]))` returns exactly `undefined` with the store's `getContent()` then exactly `[{"todos": {"0": {"text": "buy milk", "completed": false}}}, {}]` [M1]; (b) on `createTodosStore([{}, {}])` after `addTodo(store, 'a')` and `addTodo(store, 'b')` (rows `'0'` and `'1'`, both open), `clearCompleted(store)` leaves `getContent()` deep-equal to the value read just before the call, `[{"todos": {"0": {"text": "a", "completed": false}, "1": {"text": "b", "completed": false}}}, {}]` [M2]; (c) on the same construction with `setTodoCompleted(store, '0', true)` and `setTodoCompleted(store, '1', true)` first, `clearCompleted(store)` leaves `getContent()` exactly `[{}, {}]` — not `[{"todos": {}}, {}]` [M2]; (d) `state-exams/seeds/two-todos-one-done.json`, read from the repository root, parses to exactly `[{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": true}}}, {}]` [M3]; (e) the `Run:` line `grep -q 'clearCompleted(' client/src/ClearCompleted.tsx` exits 0, and exits 1 on a component that never calls the callback [M4]; (f) the `Run:` line `grep -q 'id="clearCompleted"' client/src/ClearCompleted.tsx` exits 0, and exits 1 on a button without that id [M4]; (g) the `Run:` line `grep -q 'Clear completed' client/src/ClearCompleted.tsx` exits 0, and exits 1 on a button with other text [M4]; (h) the `Run:` line `grep -q 'onClick=' client/src/ClearCompleted.tsx` exits 0, and exits 1 on a button with no click handler [M4]; (i) the `Run:` line `grep -q 'useStore(STORE_ID)' client/src/ClearCompleted.tsx` exits 0, and exits 1 on a component that does not read the provided store [M4]; (j) the `Run:` line `grep -q '<ClearCompleted />' client/src/TodoList.tsx` exits 0, and exits 1 on a list that does not mount the button [M4]; (k) when the render ran, the exam's view entries `{selector: '.todoItem', count: 1, text: 'buy milk'}`, `{selector: '.todoItem input[type=checkbox]', unchecked: true}` and `{selector: '#clearCompleted', count: 1, text: 'Clear completed'}` each hold of the returned DOM, so a page with two `.todoItem`s, a ticked checkbox, or no `#clearCompleted` fails the test as `render: view not satisfied`; when it did not run, `walls.json` in the exam's record reads `"render": "skipped"` and the view is not asserted [M5].

**Stale-if:**
- path-exists: `client/src/ClearCompleted.tsx`
- path-absent: `client/src/storeData.ts`
- path-absent: `client/src/TodoList.tsx`
- path-absent: `state-exams/expected/one-open-todo.json`

### Task 2: The done counter in the top bar, derived from the store

**Type:** implementation
**Review:** peer

**Files:**
- Create: `client/src/todoCounts.ts`
- Create: `client/src/DoneCount.tsx`
- Modify: `client/src/TopBar.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/Store.tsx`
- Create: `state-exams/seeds/two-open-todos.json`
- Create: `state-exams/expected/two-todos-one-done.json`
- Test: `tests/state-exams/done-count.test.ts`

**Claim:** The top bar tells me how many of my todos are done — it reads `1 of 2 done` the moment I tick one of two — and it is worked out from the todos themselves, not kept anywhere else. (derived)
Machine: M1. `countTodos(table)`, a named export of `client/src/todoCounts.ts`, takes a `todos` table (row id to `{text, completed}`) and returns `{done, total}` with `total` the number of rows and `done` the number whose `completed` is `true`: exactly `{done: 1, total: 2}` for the `todos` table of the expected state of M3, exactly `{done: 0, total: 0}` for `{}`, and exactly `{done: 2, total: 2}` for a two-row table whose rows are both completed.
M2. `client/src/DoneCount.tsx` renders one `<span>` carrying the attribute text `id="doneCount"` whose text is `<done> of <total> done` — the file contains the JSX text `{done} of {total} done` — from `countTodos(` over the provided store's `todos` table read with `useTable`; `client/src/TopBar.tsx` renders `<DoneCount />` between `<Title />` and `<Info />`; and `client/src/App.tsx`, which still defines `Main` (the text `const Main` is in it), contains exactly one `<Provider>` opening tag and exactly one `</Provider>` closing tag, and the lines from that opening tag to that closing tag carry `<TopBar` and then `<Main` in that order — so the one TinyBase `Provider`, the one in `App`, wraps both `<TopBar />` and `<Main />`, and `Main` renders none of its own.
M3. `state-exams/seeds/two-open-todos.json` parses to exactly `[{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": false}}}, {}]` and `state-exams/expected/two-todos-one-done.json` parses to exactly `[{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": true}}}, {}]`.
M4. `TABLES_SCHEMA` in `client/src/storeData.ts` still has exactly the one table `todos` with exactly the cells `text` and `completed` — the count is derived, and no table, value or cell was added to hold it.
M5. On the seed of M3, `setTodoCompleted(store, '1', true)` reaches exactly the expected state of M3; and when the run's render move ran — a renderer configured in `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR` set, the pre-registered branch of this run — the DOM the renderer returns for the page on that state has exactly one element matching `#doneCount` and its `textContent` contains `1 of 2 done`, every element matching `input#todo-1` (at least one) carries `data-checked="true"` and every element matching `input#todo-0` (at least one) carries `data-checked="false"` — `data-checked` being the attribute the helper's injected script writes from each input's `checked` property, the only form in which a checked box is visible in serialised markup — exactly one element matches `.todoItem.completed` and exactly two match `.todoItem`; when it did not run, the exam's record says `skipped` and the page half of this clause asserts nothing.

**Authorized-by:** spec `2026-09-09-tinyapp-state-exams` §3.1, §3.3 (the `checked` view and the `data-checked` reflection — this run's live question), §4.3; ultrapowers #758

**Interfaces:**
- Consumes: nothing
- Produces: `countTodos(table: Record<string, {text?: string, completed?: boolean}>) -> {done: number, total: number}`
- Produces: `DoneCount() -> JSX.Element`

**Context:** `client/src/TopBar.tsx` at BASE is `<div id="topBar"><Title /><Info /></div>`
(`client/src/topBar.css`: a sticky flex row, `gap: 1rem`; `#topBarTitle` has `flex: 1`, so a
`<span>` placed between `<Title />` and `<Info />` sits at the right beside the info icon — no
stylesheet is needed and none is in Files). `client/src/App.tsx` at BASE renders `<><TopBar
/><Main /></>`, and `Main` holds `<div id="app"><StrictMode><Provider><Store onReady={…} />
{loading ? <Loading /> : <><TodoInput /><TodoList /><Inspector /></>}</Provider></StrictMode>
</div>` — the `Provider` from `tinybase/ui-react`, with `Store` calling `useProvideStore(STORE_ID,
store)` into it. Measured at BASE under happy-dom: a component calling `useTable('todos',
STORE_ID)` rendered where `<TopBar />` is — outside that `Provider` — reads `{}` after the store
is provided, while the same reader under one `Provider` lifted to wrap both it and the `Store`
reads the table; TinyBase stores are provided downward only. So lift it: `App = () =>
<Provider><TopBar /><Main /></Provider>` and delete the `Provider` element pair inside `Main`
(keep `StrictMode`, `Store`, the loading branch and `Inspector` as they are; the `Provider`
import moves from `Main`'s use to `App`'s). The hooks come from `client/src/Store.tsx`, where
`const { useAddRowCallback, … , useStore } = UiReact as UiReact.WithSchemas<Schemas>;` is
destructured from `tinybase/ui-react/with-schemas` and re-exported: add `useTable` to that
destructure and to the `export { … }` list of hooks — it is this task's only edit to `Store.tsx`.
`client/src/DoneCount.tsx`: `const table = useTable('todos', STORE_ID); const {done, total} =
countTodos(table); return <span id="doneCount">{done} of {total} done</span>;` with `useTable`
and `STORE_ID` from `./Store` and `countTodos` from `./todoCounts`, the `id` spelled exactly
`id="doneCount"` (a `Run:` greps it); React renders `{done} of {total} done` as the text `1 of 2
done` with no extra characters. Before the store is provided `useTable` returns `{}` and the span
reads `0 of 0 done`, which is M1's second row. `client/src/todoCounts.ts` is pure: `export const
countTodos = (table: Record<string, {text?: string; completed?: boolean}>): {done: number;
total: number} => …` over `Object.values(table)` — `total` is the row count and `done` counts
`completed === true`; the typed table `useTable` returns (`Table<Schemas, 'todos'>` from
`tinybase/with-schemas`, rows `{text: string, completed: boolean}`) is assignable to that
parameter, and so is `store.getTable('todos')`. Nothing is added to `client/src/storeData.ts`
(Task 1's file, running beside this one): `TABLES_SCHEMA` there is `{todos: {text: {type:
'string', default: ''}, completed: {type: 'boolean', default: false}}} as const`, and a leg reads
it back to pin that the count added no store state. The exam is one file,
`tests/state-exams/done-count.test.ts`, which lands at that path beside the fixture's own
`tests/state-exams/buy-milk.test.ts` (both exams of this plan are guarded, so the Proof path is
the landing path); its imports are therefore `import {stateExam} from 'tinyapp-exam';` (the
workspace package, linked at the root by `bun install`), `import {createTodosStore,
setTodoCompleted, TABLES_SCHEMA} from '../../client/src/storeData';` and `import {countTodos}
from '../../client/src/todoCounts';`, and every `seed`/`expected` path in it is relative to the
repository root, which is `bun test`'s cwd. The helper's call, exactly as the fixture's
`buy-milk.test.ts` spells it, with this task's values: `stateExam({ clock:
'2026-01-01T00:00:00Z', entry: 'client/index.html', seed:
'state-exams/seeds/two-open-todos.json', store: () => createTodosStore(), action: (store) => {
setTodoCompleted(store, '1', true); }, expected: 'state-exams/expected/two-todos-one-done.json',
view: [ {selector: '#doneCount', count: 1, text: '1 of 2 done'}, {selector: 'input#todo-1',
checked: true}, {selector: 'input#todo-0', unchecked: true}, {selector: '.todoItem.completed',
count: 1}, {selector: '.todoItem', count: 2} ], mutant: [{table: 'todos', row: '1', cell:
'completed', value: false}] });` — `stateExam` registers one bun test named `state exam:
done-count` that loads `seed` into `store()` with `setContent`, runs `action` under a fixed clock
with `fetch` and `WebSocket` blocked (`contract breach: <url>`), diffs `getContent()` against
`expected` (a red exam prints `table / row / cell / got / wanted`), then — only when that diff
is empty and both `TINYAPP_RENDER_URL` and `ULTRA_RUN_DIR` are set in the environment — bundles
`entry`, opens the page on the post-action state through `window.__TINYAPP_SEED__`, POSTs it to
the renderer with an injected script that copies every input's `checked` property onto a
`data-checked="true"|"false"` attribute, and reads the returned DOM against `view`; last it
applies `mutant` to `expected` and fails `hollow exam: mutant todos/1/completed not
distinguished` unless the perturbed expectation differs from what the store reached. The `view`
vocabulary, closed: `{selector, count?, text?, attr?: {name, value}, checked?: true, unchecked?:
true, absent?: true}` — `count` exact, `text` a substring of at least one match's
`textContent`, `attr` at least one match with that attribute value, `checked`/`unchecked` every
match (and at least one) carrying `data-checked="true"`/`"false"`, `absent` zero matches. The
`checked: true` entry is this run's one live question — whether Cloudflare's `/snapshot` honours
the helper's `addScriptTag` (documented, never exercised live before this run; the plain
snapshot through the proxy was measured 2026-09-09: `http=200`, `{success: true, result:
{content, screenshot}}` in 2.18 s) — and the `.todoItem.completed` count beside it is the
control: `TodoItem.tsx` adds the class `completed` to a ticked row from the store, so a red
`checked` with a green class count names the reflection script, not the render. With the
renderer unset (the suite at the fold, a laptop) the render move is recorded `skipped` and the
store and mutant moves are the proof. A `mutant` edit is `{table, row, cell, value}`, `{table,
row, cell, absent: true}` or `{table, row, absent: true}`; the one edit above unticks the todo in
the expected state, so an exam that would not notice the tick going missing is hollow. Seeds and
expected states are JSON in `getContent()` shape, `[tables, values]`, under `state-exams/seeds/`
and `state-exams/expected/`; both of this task's are new files with exactly the content M3
names, and `createTodosStore(seed)` round-trips a two-row seed exactly (measured at BASE). The
record lands in `<ULTRA_RUN_DIR>/state-exams/task-<ULTRA_TASK>/done-count-<ULTRA_EXAM_PASS>/` —
the driver sets those three — as `store-diff.json`, `mutant.json`, `contract.json`,
`walls.json` and, when the render ran, `dom.html` and `screenshot.png`; no test reads or sets
them. The legs a state exam cannot express are ordinary `test` blocks from `bun:test` in the
same file, beside the `stateExam` call, calling `countTodos` on literal tables and reading the
two JSON files with `node:fs` — the exam file sits at `tests/state-exams/`, two directories
below the root, so their paths are exactly `join(import.meta.dir, '..', '..', 'state-exams',
'seeds', 'two-open-todos.json')` and `join(import.meta.dir, '..', '..', 'state-exams',
'expected', 'two-todos-one-done.json')`. Both JSON files are the implementer's to create (they
are in this task's Files as `Create:` and do not exist at BASE); the exam only reads them and
asserts their content, so at BASE that leg is red too. At BASE the file is red for one reason
before any leg runs: `error: Cannot find module '../../client/src/todoCounts'` (measured) —
which holds on the render-skipped branch too.
**BASE facts:** (generated at 207e3bd)
- `client/src/TopBar.tsx` blob 4791dd5
- `client/src/App.tsx` blob ad4b93a
- `TABLES_SCHEMA` at `client/src/storeData.ts:9` blob 6f40f9a
- `client/src/storeData.ts` blob 6f40f9a
- `checked` at `packages/tinyapp-exam/test/render-move.test.ts:251` blob beab774
- `client/src/topBar.css` blob 8734bfa
- `client/src/Store.tsx` blob d80d927
- `STORE_ID` at `client/src/storeData.ts:24` blob 6f40f9a
- `id` at `client/test/todos-store.test.ts:53` blob 4bbc33d
- `tests/state-exams/buy-milk.test.ts` blob b2eb5f6
- `expected` at `packages/tinyapp-exam/test/evidence.test.ts:79` blob 91e75ed
- `unchecked` at `packages/tinyapp-exam/test/render-move.test.ts:242` blob beab774
- `stateExam` at `packages/tinyapp-exam/src/state-exam.ts:164` blob b96f023

**Proof:**
- Test: `tests/state-exams/done-count.test.ts`
- Guard: `tests/state-exams/done-count.test.ts`
- Run: grep -q 'countTodos(' client/src/DoneCount.tsx
- Run: grep -q 'id="doneCount"' client/src/DoneCount.tsx
- Run: grep -q 'useTable' client/src/DoneCount.tsx
- Run: grep -qF '{done} of {total} done' client/src/DoneCount.tsx
- Run: sed -n '/<Title/,/<Info/p' client/src/TopBar.tsx | grep -q 'DoneCount'
- Run: sed -n '/<Provider>/,/<\/Provider>/p' client/src/App.tsx | tr '\n' ' ' | grep -q '<Provider>.*<TopBar.*<Main.*</Provider>'
- Run: test "$(grep -c '<Provider>' client/src/App.tsx)" -eq 1
- Run: test "$(grep -c '</Provider>' client/src/App.tsx)" -eq 1
- Run: grep -q 'const Main' client/src/App.tsx
- Run: grep -q 'useTable' client/src/Store.tsx
- Legs: (a) `countTodos({"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": true}})` is exactly `{done: 1, total: 2}` [M1]; (b) `countTodos({})` is exactly `{done: 0, total: 0}` [M1]; (c) `countTodos({"0": {"text": "a", "completed": true}, "1": {"text": "b", "completed": true}})` is exactly `{done: 2, total: 2}` [M1]; (d) the `Run:` line `grep -q 'countTodos(' client/src/DoneCount.tsx` exits 0, and exits 1 on a component that computes the count itself [M2]; (e) the `Run:` line `grep -q 'id="doneCount"' client/src/DoneCount.tsx` exits 0, and exits 1 on a span without that id [M2]; (f) the `Run:` line `grep -q 'useTable' client/src/DoneCount.tsx` exits 0, and exits 1 on a component that reads the table some other way [M2]; (g) the `Run:` line `grep -qF '{done} of {total} done' client/src/DoneCount.tsx` exits 0, and exits 1 on a span whose JSX spells the count any other way — `{done}/{total}`, `{done} done of {total}` — so the rendered text `1 of 2 done` is pinned by the file on the skipped branch too, where the view is not asserted [M2]; (h) the `Run:` line `sed -n '/<Title/,/<Info/p' client/src/TopBar.tsx | grep -q 'DoneCount'` exits 0 only when `DoneCount` appears on or between the lines holding `<Title` and `<Info`, and exits 1 when it is placed before the title or after the info block [M2]; (i) the `Run:` line `sed -n '/<Provider>/,/<\/Provider>/p' client/src/App.tsx | tr '\n' ' ' | grep -q '<Provider>.*<TopBar.*<Main.*</Provider>'` exits 0 only when, between the first `<Provider>` line and the `</Provider>` line that ends its range, `<TopBar` and then `<Main` both appear — so it exits 1 on `<Provider>…</Provider>` closed before `<TopBar />`, on a `<TopBar />` outside the Provider, and on a `<Main />` outside it or placed before `<TopBar />` [M2]; (j) the `Run:` lines `test "$(grep -c '<Provider>' client/src/App.tsx)" -eq 1` and `test "$(grep -c '</Provider>' client/src/App.tsx)" -eq 1` each exit 0 only when `App.tsx` has exactly one line carrying `<Provider>` and exactly one carrying `</Provider>` — so the range of the previous leg is the whole of the one Provider's body — and exit 1 when `Main` kept its own [M2]; (k) the `Run:` line `grep -q 'const Main' client/src/App.tsx` exits 0, and exits 1 on a `Main` moved out of the file the one `Provider` is counted in [M2]; (l) the `Run:` line `grep -q 'useTable' client/src/Store.tsx` exits 0, and exits 1 when the hook was not added to the typed destructure [M2]; (m) `state-exams/seeds/two-open-todos.json`, read from the repository root, parses to exactly `[{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": false}}}, {}]` [M3]; (n) `state-exams/expected/two-todos-one-done.json`, read from the repository root, parses to exactly `[{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": true}}}, {}]` [M3]; (o) `Object.keys(TABLES_SCHEMA)` is exactly `['todos']` and `Object.keys(TABLES_SCHEMA.todos)` sorted is exactly `['completed', 'text']`, so a table or cell added to hold the count fails it [M4]; (p) the file's one `stateExam` call, spelled as in Context — seed `state-exams/seeds/two-open-todos.json`, action `setTodoCompleted(store, '1', true)`, expected `state-exams/expected/two-todos-one-done.json`, the five-entry view and the one-edit mutant — passes as the test `state exam: done-count`, which is red when the store's `getContent()` after the action differs from the expected state in any cell or row, red as `hollow exam:` when unticking row `1` in the expected state would not have been noticed, and, when the render ran, red as `render: view not satisfied` on any of: the number of `#doneCount` matches is not exactly 1 (zero or two spans both fail), or no `#doneCount` match has a `textContent` containing `1 of 2 done`; no element matches `input#todo-1`, or one that matches lacks `data-checked="true"`; no element matches `input#todo-0`, or one that matches lacks `data-checked="false"`; the number of `.todoItem.completed` matches is not exactly 1; the number of `.todoItem` matches is not exactly 2 — one view entry per row of M5, each with the helper's own rule (`count` exact, `text` substring of at least one match, `checked`/`unchecked` every match and at least one); when it did not run, `walls.json` in the exam's record reads `"render": "skipped"` and the view is not asserted [M5].

**Stale-if:**
- path-exists: `client/src/todoCounts.ts`
- path-absent: `client/src/TopBar.tsx`
- path-absent: `client/src/App.tsx`
- path-absent: `client/src/Store.tsx`
