# Undo of the last delete — a deleted todo waits in a `trash` table and one press of Undo puts it back whole

**Grammar:** claims-v1

**Claim:** After I delete a todo I can press Undo once and it comes back exactly as it was, and after that Undo is gone until the next delete. (elicited)
**Summary:** This adds a single-step undo for deletion. It exists because an undo is a state transition in both directions, the first exam on the fixture whose action is two interactions with an assertion between. After the run a deleted todo returns with its text, its done state and its due date when Undo is pressed, and the button disappears once used.

**Goal:** The fixture's store gains a `trash` table shaped exactly like `todos`; `deleteTodo` moves the whole row there (clearing what waited before, so at most one deleted todo waits) and a new `undoDelete` moves it back under the id it had; an `Undo` button (`#undoDelete`) exists only while a row waits; every existing snapshot loads unchanged, and the two BASE tests that pinned the table list to exactly `todos` are loosened to what they meant.

**Tech Stack:** Bun + TypeScript + TinyBase (`tinybase/with-schemas` 9.7, a `MergeableStore` under `TABLES_SCHEMA`), React (`tinybase/ui-react/with-schemas` hooks re-exported from `client/src/Store.tsx`); the `tinyapp-exam` state exams under `tests/state-exams/` with seeds and expected states under `state-exams/`; `bun run typecheck`, `bun run lint:state`, `bun test`.
**Exam command:** bun test {paths}

**Spec:** popmechanic/ultrapowers#867 (the trio of fixture plans); popmechanic/ultrapowers#998 (the map). The sitting's one design question — where the deleted row waits — was put as "A `trash` table" vs "A single store value" and the operator picked the table.

**Parallelization rationale:** two waves, width 1 each — a chain of two. Task 2 waits on Task 1 for runtime behaviour, not shape: its exam opens the page over the seed, clicks Delete and then clicks `#undoDelete`, and the store the page renders from must already hold the `trash` table and run the real `undoDelete` for that second click to restore anything — a button over a table the schema does not have renders nothing. Two concurrent sibling runs on the same base add a cell to `todos` and a values schema; this plan asserts nothing about either surface.

## Global Constraints

- Check: bun run typecheck
- Check: bun run lint:state
- Check: git diff --quiet $ULTRA_BASE -- packages/tinyapp-exam packages/tinyapp-lint/src
- Nothing this plan asserts pins the exact key set of `TABLES_SCHEMA`, of a todos row, or of the store's values: two sibling runs on the same base add a cell to `todos` and a values schema concurrently, and the fold at publish must leave both green. A test that lists every table, every cell of a row, or every value is a finding.
- A deleted todo is never lost between the two tables: `deleteTodo` writes `trash` and `todos` inside one `store.transaction`, and so does `undoDelete`, so no listener ever sees the row in neither table or in both.
- The trash row is the todos row copied whole, whatever cells the schema holds — `getRow` out, `setRow` in — never a hand-picked subset of cells.
- No exam and no source names a `due` cell.

### Task 1: The trash table — Delete moves the whole row there, Undo moves it back

**Type:** implementation
**Review:** peer

**Files:**
- Modify: `client/src/storeData.ts`
- Modify: `tests/smoke.test.ts`
- Modify: `tests/state-exams/done-count.test.ts`
- Modify: `client/test/todos-store.test.ts`
- Modify: `packages/tinyapp-lint/test/invariants.test.ts`
- Modify: `packages/tinyapp-lint/test/lint-cli.test.ts`
- Modify: `packages/tinyapp-lint/test/reachability.test.ts`
- Modify: `packages/tinyapp-lint/test/views.test.ts`
- Create: `state-exams/expected/two-open-todos-first-trashed.json`
- Create: `state-exams/expected/second-delete-replaces-trash.json`
- Create: `state-exams/expected/two-open-todos-restored.json`
- Test: `tests/state-exams/delete-to-trash.test.ts`

**Claim:** When I press Delete on a todo it leaves the list and waits, whole, in a trash that only ever holds the last one I deleted; an undo puts it back exactly as it was, an undo with nothing waiting does nothing, and Clear completed never fills the trash. (derived)
Machine: M1. On the page over `state-exams/seeds/two-open-todos.json` — `[{todos: {'0': {text: 'buy milk', completed: false}, '1': {text: 'walk the dog', completed: false}}}, {}]` — clicking the first `.todoItem`'s `button` (its Delete) leaves the page store's `getContent()` exactly `[{todos: {'1': {text: 'walk the dog', completed: false}}, trash: {'0': {text: 'buy milk', completed: false}}}, {}]`: `todos` lacks `'0'`, and `trash` holds `'0'` with every cell the todos row held.
M2. On a store seeded with that content, `deleteTodo(store, '0')` then `deleteTodo(store, '1')` leaves `getContent()` exactly `[{trash: {'1': {text: 'walk the dog', completed: false}}}, {}]` — the second delete replaced the waiting row, and `todos` is gone from the content because it has no rows.
M3. On a store seeded with that content, `deleteTodo(store, '0')` then `undoDelete(store)` leaves `getContent()` deep-equal to the seed content, with no `trash` table in it.
M4. On a store seeded with that content, `undoDelete(store)` with nothing in `trash` leaves `getContent()` deep-equal to what it was immediately before the call.
M5. On a store seeded with that content, `deleteTodo(store, '9')` — an id `todos` does not hold — leaves `getContent()` deep-equal to what it was immediately before the call.
M6. On a store seeded with `state-exams/seeds/two-todos-one-done.json`, `clearCompleted(store)` leaves `getContent()` exactly `[{todos: {'0': {text: 'buy milk', completed: false}}}, {}]` — the content of `state-exams/expected/one-open-todo.json` — with no `trash` table: only a single Delete is undoable.
M7. `TABLES_SCHEMA.trash` is deep-equal to `TABLES_SCHEMA.todos`, and `INVARIANTS` holds exactly one entry whose `table` is `'trash'`; that entry's `predicate` returns `true` for the row `{text: 'buy milk', completed: false}` and `false` for the row `{text: '', completed: true}`.
M8. Every `.json` file under `state-exams/seeds/` and under `state-exams/expected/` — at BASE three seeds and four expected states, `[{}, {}]` among them — loads through `createTodosStore` to a `getContent()` deep-equal to the file's own content: the empty `trash` table appears in none of them.
M9. `tests/smoke.test.ts` and `tests/state-exams/done-count.test.ts` no longer assert the table list is exactly `['todos']`: each asserts that `todos` is among `Object.keys(TABLES_SCHEMA)`, leg (o) of `done-count` asserts that `completed` and `text` are among the cells of `TABLES_SCHEMA.todos`; and leg (c) of `client/test/todos-store.test.ts` no longer asserts that the content after `deleteTodo(store, '0')` is exactly `[{}, {}]` — it asserts that `todos` is absent from `getContent()[0]` after the delete; `bun test` over each of the three files exits 0. And the linter's own tests under `packages/tinyapp-lint/test/` no longer pin the fixture's exact counts and lists that this change moves — `invariants.test.ts`, `lint-cli.test.ts`, `reachability.test.ts` and `views.test.ts` read the snapshot list and the exam list off the tree, match the snapshot, exam and seed counts with `[0-9]+` or a lower bound, and assert the four BASE callbacks (`addTodo`, `clearCompleted`, `deleteTodo`, `setTodoCompleted`) and the todos invariant are *among* the callbacks and the invariants rather than the whole list — and `bun test packages/tinyapp-lint` exits 0 with no `packages/tinyapp-lint/src` file changed.

**Authorized-by:** popmechanic/ultrapowers#867; popmechanic/ultrapowers#998; the sitting's pick "A `trash` table" for where the deleted row waits.

**Interfaces:**
- Consumes: none
- Produces: `deleteTodo(store: TodosStore, id: string): void`
- Produces: `undoDelete(store: TodosStore): void`
- Produces: `TABLES_SCHEMA`

**Context:** At BASE `client/src/storeData.ts` (127 lines) defines `TABLES_SCHEMA = {todos: {text: {type: 'string', default: ''}, completed: {type: 'boolean', default: false}}} as const`, `Invariant` with `table: keyof typeof TABLES_SCHEMA`, one `INVARIANTS` entry (`todos`, "a completed todo has non-empty text"), and `deleteTodo` as a bare `store.delRow('todos', id)`. Write the todo cells once and use that one literal for both tables — `todos` and `trash` — so a cell a later change adds to a todo is a cell of a trashed todo by construction; a sibling run is adding a cell to `todos` in that same literal concurrently, and the fold at publish resolves the two edits, so the literal's lines are the only place the two runs meet. `deleteTodo` becomes, inside one `store.transaction`: return if `todos` has no such row (`hasRow`), else `delTable('trash')`, then `setRow('trash', id, getRow('todos', id))`, then `delRow('todos', id)` — clearing first is what keeps at most one row waiting. `undoDelete(store)` inside one transaction: for each id of `getRowIds('trash')`, `setRow('todos', id, getRow('trash', id))` then `delRow('trash', id)`; with nothing waiting the loop body never runs. `clearCompleted` is untouched and fills no trash. Measured at BASE with the two-table schema (`tinybase/with-schemas` 9.7): a table with no rows is absent from `getContent()`, so `[{}, {}]` round-trips to `[{}, {}]` and every existing seed and expected file round-trips unchanged; `getContent()` after the delete of `'0'` is exactly the M1 literal, after `'0'` then `'1'` exactly the M2 literal, and a seed that already holds a `trash` row loads through the schema unchanged. The linter's invariant is per row — `predicate(row, rowId)` — so "trash has at most one row" cannot be an `INVARIANTS` entry without editing `packages/tinyapp-lint`, which this plan does not touch; the one-row property is the contract of `deleteTodo` (M2) and the `INVARIANTS` entry for `trash` is the todos rule applied to a trashed row, since a trash row is a todos row copied whole. The linter (`bun run lint:state`) walks the store module's exported callbacks — every exported function with at least one parameter not named `create*`/`read*` — with `callback.length - 1` arguments drawn from the snapshots' pool, three moves deep, so `undoDelete(store)` walks as a zero-argument move and `deleteTodo` with one; measured with this change, the three new expected files are each reached from `two-open-todos.json` (one `deleteTodo`, two `deleteTodo`s, and the restored state which equals the seed) and lint reports `0 findings over 10 snapshots and 8 exams`. Two BASE tests pin the table list exactly and go red on this change: `tests/smoke.test.ts` line 6, `expect(Object.keys(TABLES_SCHEMA)).toEqual(["todos"])`, and `tests/state-exams/done-count.test.ts` leg (o) at lines 149–155, which pins `Object.keys(TABLES_SCHEMA)` to `['todos']` and the sorted cells of `todos` to `['completed', 'text']`. Both are this task's to loosen to what they meant — `toContain("todos")`, and for leg (o) `toContain('completed')` and `toContain('text')` on the cells — never to a new exact list, because a sibling run adds a cell to `todos` concurrently. A third BASE pin goes red on the new delete: `client/test/todos-store.test.ts` leg (c) (lines 91–104) adds one todo to an empty store, deletes it with `deleteTodo(store, '0')` and asserts `store.getContent()` is exactly `[{}, {}]` — with the row now waiting in `trash` the content is `[{trash: {'0': {text: 'a', completed: false}}}, {}]`; the leg meant that the todo left the list, so its last assertion becomes `expect(store.getContent()[0].todos).toBeUndefined()` and its `hasRow` line stays (measured: 14 pass on the file with that one line changed). That file's other `toEqual(EMPTY)` assertions (legs on `addTodo` of a blank, lines 76–84) delete nothing and stay green. The linter's own exams pin the fixture's shape at BASE and ten of them go red on this change — measured in the prototype, `bun test packages/tinyapp-lint` → 17 pass, 10 fail — all under `packages/tinyapp-lint/test/`, none in `packages/tinyapp-lint/src`, which stays byte-identical to BASE (the Global Check). Each is this task's to loosen to what it meant, never to a new exact literal, because a sibling run adds a callback, a values schema and snapshots concurrently and any exact count pinned today is wrong at publish: `lint-cli.test.ts` leg (a) line 149 pins the summary `0 findings over 7 snapshots and 6 exams` — its regex becomes `[0-9]+ snapshots and [0-9]+ exams`; leg (b) lines 166–181 pin the callback list `['addTodo', 'clearCompleted', 'deleteTodo', 'setTodoCompleted']` with `toEqual` and the seven snapshot paths as a literal list — the four names become `toContain` rows and the snapshot list is built off the tree with `readdirSync` (add it to the `node:fs` import) over `state-exams/expected` then `state-exams/seeds`, `.json` names sorted, with a `>= 7` lower bound, so the per-index content check that follows still runs over every file; leg (c) lines 213–222 pin the six exam paths — built off the tree from `tests/state-exams/*.test.ts` minus `interaction-evidence.test.ts`, sorted, with `>= 6`; leg (f) line 327 pins `specs` length 6 — `>= 6`. `reachability.test.ts` leg (a) lines 122–123 pin four expected and three seeds — lower bounds; its `BAD_LINE` (lines 141–145) and `CLI_LINE` (lines 257–258) spell `the 3 seeds` and the exact list `addTodo, clearCompleted, deleteTodo or setTodoCompleted` — each becomes a regex with `[0-9]+ seeds` and four lookaheads `(?=[^—]*addTodo)` … `(?=[^—]*setTodoCompleted)` over `[^—]+` in place of the list, and leg (b)'s `toBe(BAD_LINE)` becomes `toMatch(BAD_LINE)`. `invariants.test.ts` leg (a) lines 150–153 pin `INVARIANTS` length 1 and `INVARIANTS[0]` as the todos entry — `>= 1` and `INVARIANTS.find(entry => entry.table === 'todos' && entry.message === MESSAGE)`, asserted defined, with the three predicate rows unchanged; leg (b) lines 179–181 pin seven snapshots, one invariant and `invariants[0].message` — `>= 7`, `>= 1` and `map(({message}) => message)` `toContain(MESSAGE)`. `views.test.ts` leg (a) line 120 pins six exams — `>= 6`; its two `toEqual([])` sweeps and the rule's empty result stay exact. With exactly those edits, measured in the prototype: `bun test packages/tinyapp-lint` → `27 pass, 0 fail, Ran 27 tests across 5 files` (the two `error: script "lint:state" exited with code 1` lines in that output are the seeded-violation legs' own expected child output, not failures), and `bun run typecheck` exit 0. The page's Delete button is `client/src/TodoItem.tsx`'s `<Button onClick={handleDelete}>Delete</Button>`, a `<button>` with no id inside `.todoItem`, and `TodoList` renders rows ascending by row id with `Page.act` clicking the first match — so `{click: '.todoItem button'}` on the two-open seed deletes row `'0'`. The seed `state-exams/seeds/two-todos-one-done.json` is `[{todos: {'0': {text: 'buy milk', completed: false}, '1': {text: 'walk the dog', completed: true}}}, {}]`. Snapshot files are one line of JSON like their BASE siblings. The exam file is `tests/state-exams/delete-to-trash.test.ts`: one `stateExam({…})` for leg (a) — a file's whole state exam is the single `stateExam` call in it, as `tests/state-exams/clear-completed.test.ts` shows, with the other legs as ordinary `bun:test` blocks beside it — importing `clearCompleted`, `createTodosStore`, `deleteTodo`, `INVARIANTS`, `TABLES_SCHEMA`, `undoDelete` and `type TodosContent` from `../../client/src/storeData`; `createTodosStore(content)` seeds a store; snapshot a store as `JSON.parse(JSON.stringify(store.getContent()))` before `toEqual`.

**Proof:**
- Test: `tests/state-exams/delete-to-trash.test.ts`
- Guard: `tests/state-exams/delete-to-trash.test.ts`
- Legs: (a) [M1] the one `stateExam` of the file — `entry: 'client/index.html'`, `seed: 'state-exams/seeds/two-open-todos.json'`, `store: () => createTodosStore()`, `action: {click: '.todoItem button'}`, `expected: 'state-exams/expected/two-open-todos-first-trashed.json'` holding exactly the M1 literal, `view: [{selector: '.todoItem', count: 1, text: 'walk the dog'}, {selector: '.todoItem input[type=checkbox]', unchecked: true}]`, `mutant: [{table: 'trash', row: '0', absent: true}]` — the store move fails naming the first differing cell, and the mutant that drops the trash row is killed; (b) [M2] `deleteTodo(store, '0')` then `deleteTodo(store, '1')` on a store seeded with the two-open content snapshots deep-equal to the parsed `state-exams/expected/second-delete-replaces-trash.json`, which is exactly the M2 literal; (c) [M3] `deleteTodo(store, '0')` then `undoDelete(store)` snapshots deep-equal to the two-open seed content and the parsed `state-exams/expected/two-open-todos-restored.json`, which is exactly that seed content, and `Object.keys(content[0])` lacks `trash`; (d) [M4] a snapshot taken before `undoDelete(store)` on the two-open seed is deep-equal to the one taken after; (e) [M5] a snapshot taken before `deleteTodo(store, '9')` on the two-open seed is deep-equal to the one taken after; (f) [M6] `clearCompleted(store)` on a store seeded with the parsed `state-exams/seeds/two-todos-one-done.json` snapshots deep-equal to the parsed `state-exams/expected/one-open-todo.json`, and `Object.keys(content[0])` lacks `trash`; (g) [M7] `TABLES_SCHEMA.trash` is `toEqual` `TABLES_SCHEMA.todos`, and exactly one `INVARIANTS` entry has `table === 'trash'`; (h) [M7] that entry's `predicate({text: 'buy milk', completed: false}, '0')` is `true`; (i) [M7] that entry's `predicate({text: '', completed: true}, '0')` is `false`; (j) [M8] for every `.json` file `readdirSync` lists under `state-exams/seeds` and under `state-exams/expected`, the parsed file seeded through `createTodosStore` snapshots deep-equal to the parsed file, the assertion message naming the file that fails; (k) [M9] the eight `Run:` lines below — each of the three pinned files' own `bun test` exits 0, the two schema pins carry the `toContain` on `todos` in place of the exact list, the delete pin asserts `todos` undefined in the content, the whole linter test suite exits 0, and its four loosened files no longer carry the exact-callback-list literal `deleteTodo or setTodoCompleted` as a plain string pin (the second line: zero such lines in `reachability.test.ts`, whose lines 143 and 258 were that literal's only carriers at BASE across the linter's tests, neither a comment).
- Run: bun test packages/tinyapp-lint
- Run: test "$(grep -c 'deleteTodo or setTodoCompleted' packages/tinyapp-lint/test/reachability.test.ts)" -eq 0
- Run: bun test tests/smoke.test.ts
- Run: bun test tests/state-exams/done-count.test.ts
- Run: bun test client/test/todos-store.test.ts
- Run: grep -q 'toContain("todos")' tests/smoke.test.ts
- Run: grep -q "toContain('todos')" tests/state-exams/done-count.test.ts
- Run: grep -q "getContent()\[0\].todos).toBeUndefined()" client/test/todos-store.test.ts

**Stale-if:**
- path-absent: `client/src/storeData.ts`

### Task 2: The Undo button — shown only while a deleted todo waits, gone once pressed

**Type:** implementation
**Review:** peer

**Files:**
- Create: `client/src/UndoDelete.tsx`
- Modify: `client/src/TodoList.tsx`
- Test: `tests/state-exams/undo-delete.test.ts`

**Claim:** After I delete a todo an Undo button appears; pressing it puts the todo back in the list exactly as it was, and the button is gone until I delete something again. (derived)
Machine: M1. On the page over `state-exams/seeds/two-open-todos.json` — `[{todos: {'0': {text: 'buy milk', completed: false}, '1': {text: 'walk the dog', completed: false}}}, {}]` — clicking the first `.todoItem`'s `button` and then clicking `#undoDelete` leaves the page store's `getContent()` deep-equal to that seed content, the page showing exactly 2 `.todoItem` elements and no `#undoDelete`; and `state-exams/expected/two-open-todos-restored.json`, the expected file the exam compares against, parses to exactly that seed content — `[{todos: {'0': {text: 'buy milk', completed: false}, '1': {text: 'walk the dog', completed: false}}}, {}]`, no `trash` key in it.
M2. The static render (`renderStatic` of `client/src/StaticPage.tsx`) over `[{todos: {'1': {text: 'walk the dog', completed: false}}, trash: {'0': {text: 'buy milk', completed: false}}}, {}]` carries exactly one element with `id="undoDelete"`, and it is a `<button>` whose text is `Undo`.
M3. The static render over the two-open-todos content of M1 — no `trash` table — carries no `undoDelete` at all.
M4. `client/src/UndoDelete.tsx` exports `UndoDelete`, calls `undoDelete(` imported from `./storeData`, reads the provided store with `useStore(STORE_ID)` and the waiting row with `useTable('trash'`; and `client/src/TodoList.tsx` mounts `<UndoDelete />`.

**Authorized-by:** popmechanic/ultrapowers#867; popmechanic/ultrapowers#998; the sitting's pick "A `trash` table" for where the deleted row waits.

**Interfaces:**
- Consumes: `undoDelete(store: TodosStore): void`
- Produces: `UndoDelete`

**Context:** `undoDelete(store)` puts the one waiting `trash` row back into `todos` under its id and empties `trash`, inside one transaction; `TABLES_SCHEMA` has `trash` with the cells `todos` has. The component is the shape of `client/src/ClearCompleted.tsx`: `useStore(STORE_ID) as TodosStore | undefined` from `./Store`, the callback from `./storeData`, a plain `<button id="undoDelete" type="button" onClick={…}>Undo</button>`; it also reads `useTable('trash', STORE_ID)` — `useTable` is already re-exported from `client/src/Store.tsx` (`DoneCount.tsx` uses it) — and returns `null` while that table has no keys, which is what makes the button exist only while a row waits and vanish once `undoDelete` empties the table. `TodoList.tsx` renders `<div id="todoList">…</div>` then `<ClearCompleted />` inside a fragment; mount `<UndoDelete />` directly after `<ClearCompleted />`. `client/src/StaticPage.tsx` renders `TopBar`, `TodoInput` and `TodoList` over a store it is handed, with no browser — its `renderStatic(content)` is the linter's own render, so a static render over a content whose `trash` holds a row is exactly the page the linter checks views against, and a `bun:test` block can call it directly. Measured with the prototype: the two-click interaction on the page reaches the seed content on both of the exam's fresh pages (React flushes the click's state change before `Page.act` returns, so `#undoDelete` exists when the second click looks for it), and `renderStatic` over the M2 content contains `<button type="button" id="undoDelete">Undo</button>` once, while over the M3 content it contains no `undoDelete`. The Delete button is `TodoItem.tsx`'s `<Button>` — a `<button>` with no id inside `.todoItem` — and rows render ascending by id with the first match clicked, so `{click: '.todoItem button'}` deletes row `'0'`; the restored expected file `state-exams/expected/two-open-todos-restored.json` holds exactly the seed content and exists in this task's clone. The exam file is `tests/state-exams/undo-delete.test.ts`: one `stateExam({…})` for leg (a) with the other legs as `bun:test` blocks beside it, importing `renderStatic` from `../../client/src/StaticPage` and `createTodosStore` from `../../client/src/storeData`.

**Proof:**
- Test: `tests/state-exams/undo-delete.test.ts`
- Guard: `tests/state-exams/undo-delete.test.ts`
- Legs: (a) [M1] the one `stateExam` of the file, in this shape —

  ```ts
  stateExam({
    clock: '2026-01-01T00:00:00Z',
    entry: 'client/index.html',
    seed: 'state-exams/seeds/two-open-todos.json',
    store: () => createTodosStore(),
    action: [{click: '.todoItem button'}, {click: '#undoDelete'}],
    expected: 'state-exams/expected/two-open-todos-restored.json',
    view: [
      {selector: '#undoDelete', absent: true},
      {selector: '.todoItem', count: 2},
    ],
    mutant: [{table: 'todos', row: '0', absent: true}],
  });
  ```

  — the store move fails naming the first differing cell, the `absent` view fails naming how many `#undoDelete` it found, and the mutant that drops row `'0'` from the expected state is killed; and a `bun:test` block beside it in which the parsed `state-exams/expected/two-open-todos-restored.json` is `toEqual` the seed literal of M1 written out in the test — `[{todos: {'0': {text: 'buy milk', completed: false}, '1': {text: 'walk the dog', completed: false}}}, {}]` — so a restored file that differs from the seed in any cell, id or table fails naming it; (b) [M2] `renderStatic` over the M2 content matches `/id="undoDelete"/g` exactly once and matches `/<button[^>]*id="undoDelete"[^>]*>Undo<\/button>/`; (c) [M3] `renderStatic` over the two-open-todos content does not contain `undoDelete`; (d) [M4] the first `Run:` line — the component is exported; (e) [M4] the second — it calls the callback; (f) [M4] the third — it reads the provided store; (g) [M4] the fourth — it reads the `trash` table; (h) [M4] the fifth — the list mounts it.
- Run: grep -q 'export const UndoDelete' client/src/UndoDelete.tsx
- Run: grep -q 'undoDelete(' client/src/UndoDelete.tsx
- Run: grep -q 'useStore(STORE_ID)' client/src/UndoDelete.tsx
- Run: grep -q "useTable('trash'" client/src/UndoDelete.tsx
- Run: grep -q '<UndoDelete />' client/src/TodoList.tsx

**Stale-if:**
- path-exists: `client/src/UndoDelete.tsx`
