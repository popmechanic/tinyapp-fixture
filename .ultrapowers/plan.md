# tinyapp-fixture — every todo can carry a due date, and an open todo past its date shows overdue

**Grammar:** claims-v1
**Claim:** I can give a todo a due date, and an open todo whose date has passed shows as overdue in the list. (elicited)
**Summary:** This adds a due date to each todo and marks overdue ones in the list. It exists as the first of #867's three real-feature runs, the kind of state exam that reads a computed view (overdue is a function of the row and the exam's pinned clock). After the run every todo carries a `due` cell, and an open todo past its date is visibly overdue while a completed one is not.

**Goal:** Give the `todos` table a `due` cell (a `YYYY-MM-DD`, absent when the todo has no date), a `setTodoDue` callback that refuses anything else and clears by removing the cell, an `isOverdue(row, now)` pure function, a per-row text field the exam can type a date into, and a `data-overdue` / `.overdue` mark on each row — with every existing pin the new cell and callback move owned by the task that adds them.

**Tech Stack:** Bun + TypeScript + TinyBase, React
**Exam command:** bun test {paths}
**Spec:** popmechanic/ultrapowers#867 (the trio: three real-feature runs on the fixture); popmechanic/ultrapowers#998 (the map)
**Target:** popmechanic/tinyapp-fixture at `f24d4059a76fa6c58a38a26ca2b60d4cd59fe336`

**Parallelization rationale:** Three waves. Wave 1 is one task, the store: the `due` cell, the callback, the invariant, the pure functions, and the pins of the linter's own tests that a new callback and new snapshot files move. Wave 2 is two tasks wide — the date field (Task 2) and the overdue mark (Task 3) — each needing Task 1's runtime store (a typed date has to land on a `due` cell the schema knows, or TinyBase drops it; a rendered mark reads one), both editing `TodoItem.tsx` in different regions, which folds. Wave 3 is one task, the end-to-end exam the Claim names — a typed date showing overdue — which needs both Task 2's field to type into and Task 3's attribute to read, at runtime in one page. Total: T = 4, width 2 at wave 2.

## Global Constraints

- Check: bun run typecheck
- Check: bun run lint:state
- Check: git diff --quiet $ULTRA_BASE -- packages/tinyapp-exam/src packages/tinyapp-lint/src
- The `due` cell has no schema default: a todo with no date has no `due` cell, `setTodoDue(store, id, '')` removes the cell, and `''` is never stored. Measured at BASE (tinybase 9.7.0, 2026-09-15): a cell with `default: ''` is materialised into `getContent()` of every seeded row, which rewrote the five snapshot files that hold rows and reddened 20 files of pins (three fixture exams, two `client/test` files, four `packages/tinyapp-lint/test` files, three `packages/tinyapp-exam/test` files, and the snapshots); the same cell with no default leaves `getContent()` of every existing seed byte-identical and reddens only the count, list and cell-name pins the tasks below own. A sibling plan's expected file whose rows carry only `text` and `completed` therefore still round-trips.
- A stored `due` is a `YYYY-MM-DD` that is a real UTC calendar date; nothing else is ever written, and the `INVARIANTS` entry for it is what lets `lint:state` reject a bad seed.
- Every dated seed or expected row in this plan is dated before `2026-01-01` (the clock every exam pins). A page's `new Date()` is the exam's pinned clock, but the linter's static render (`packages/tinyapp-lint/src/context.ts` calls `renderStatic` outside `withContract`) runs under the wall clock — so a view asserting `data-overdue="true"` rests on a date that is past under both clocks, and a `data-overdue="false"` view rests on a completed row or a row with no date, never on a future date.
- No exam or test pins the exact key set of a sibling plan's surface: a pin of `TABLES_SCHEMA.todos`'s cells names `completed`, `due` and `text`; nothing here pins the tables of `TABLES_SCHEMA`, the values schema, the callback list, the invariant list, or a count of snapshot or exam files as an exact number — lists are matched by containment, counts are read off the directories or bounded from below, since two sibling runs add a callback, a values schema, a table and snapshots concurrently.
- `packages/tinyapp-exam/src` and `packages/tinyapp-lint/src` are byte-identical to BASE; the tests under `packages/tinyapp-lint/test` change only where a count, a list or a message the new callback and snapshots move is pinned, and nothing under `packages/tinyapp-exam/test` changes.
- A state exam whose action is an interaction imports `createTodosStore` from `client/src/storeData` and names `store: () => createTodosStore()` exactly as `tests/state-exams/click-completes-todo.test.ts` does: measured 2026-09-15, an interaction exam file that imports nothing from `client/src` fails under `bun test` with `Bundle failed` before it opens a page, and the same spec with that import passes.

### Task 1: The due cell — schema, callback, invariant, and the pins they move

**Type:** implementation
**Review:** peer

**Files:**
- Create: `client/src/overdue.ts`
- Create: `state-exams/expected/two-todos-second-due.json`
- Modify: `client/src/storeData.ts`
- Modify: `client/src/Store.tsx`
- Modify: `tests/state-exams/done-count.test.ts`
- Modify: `packages/tinyapp-lint/test/invariants.test.ts`
- Modify: `packages/tinyapp-lint/test/lint-cli.test.ts`
- Modify: `packages/tinyapp-lint/test/reachability.test.ts`
- Modify: `packages/tinyapp-lint/test/views.test.ts`
- Test: `tests/state-exams/set-todo-due.test.ts`

**Claim:** I can set a todo's due date through the store or clear it, a bad date is refused, and every todo I already had reads exactly as it did. (derived)
Machine: M1. `TABLES_SCHEMA.todos.due` is `{type: 'string'}` with no `default`, and `createTodosStore(seed).getContent()` over the seed `[{todos: {'0': {text: 'buy milk', completed: false}}}, {}]` is exactly that seed — no `due` cell appears.
M2. `setTodoDue(store, id, due)` returns `undefined` in every case; with `due` a valid `YYYY-MM-DD` it sets row `id`'s `due` cell to it; with `''` it removes row `id`'s `due` cell so the row has no `due` key; with `'2025-13-45'` and with `'soon'` it leaves `store.getContent()` deep-equal to what it was before the call.
M3. `isIsoDate(value)` is `true` for `'2025-12-31'` and `'2024-02-29'`, and `false` for `''`, `'2025-13-45'`, `'2025-02-30'`, `'2025-1-5'` and `'soon'`.
M4. With `now` the instant `2026-01-01T00:00:00Z`, `isOverdue(row, now)` is `true` for `{completed: false, due: '2025-12-31'}` and `false` for each of `{completed: true, due: '2025-12-31'}`, `{completed: false, due: ''}`, `{completed: false}`, `{completed: false, due: '2026-01-01'}` and `{completed: false, due: '2026-06-01'}`.
M5. `INVARIANTS` holds an entry on table `todos` with message `a due date is absent or a valid YYYY-MM-DD`, whose predicate returns `true` for a row with no `due` and for `due` `'2025-12-31'`, and `false` for `''`, `'2025-13-45'` and `'soon'`; and `bun run lint:state --seeds <dir> --expected <absent> --exams <absent>` over one seed whose row `0` has `due: '2025-13-45'` exits 1 and prints a line containing `todos/0: breaks the invariant "a due date is absent or a valid YYYY-MM-DD"`.
M6. `setTodoDue(store, '1', '2025-06-30')` on the seed `state-exams/seeds/two-open-todos.json` reaches exactly `state-exams/expected/two-todos-second-due.json`, which parses to `[{"todos": {"0": {"text": "buy milk", "completed": false}, "1": {"text": "walk the dog", "completed": false, "due": "2025-06-30"}}}, {}]`, and the page rendered on that state shows two `.todoItem` rows with `input#todo-1` unchecked.
M7. The pins the new callback, invariant and snapshot move follow them, loosened to what they meant and never to a new exact literal: `bun test tests/state-exams/done-count.test.ts` as its own process exits 0 with its leg (o) naming the cells `completed`, `due` and `text`; and `bun test packages/tinyapp-lint` exits 0.

**Authorized-by:** popmechanic/ultrapowers#867 (run 1 of the trio: due dates); the sitting's answered question "Where does the date get set?" → per-item date field; `skills/ultrawrite/references/greenfield-stack.md` §State exams.

**Interfaces:**
- Consumes: none
- Produces: `setTodoDue(store: TodosStore, id: string, due: string): void`
- Produces: `isIsoDate(value: string): boolean`
- Produces: `isOverdue(row: {completed?: boolean; due?: string}, now: Date): boolean`
- Produces: `dateOf(now: Date): string`

**Context:** The store module is `client/src/storeData.ts`; its `TABLES_SCHEMA` is `{todos: {text: {type: 'string', default: ''}, completed: {type: 'boolean', default: false}}}` and gains `due: {type: 'string'}` as the third cell — no default, for the measured reason in Global Constraints. The pure functions live in a sibling module `client/src/overdue.ts`, not in the store module: `packages/tinyapp-lint/src/context.ts` treats every exported function of the store module with at least one parameter whose name does not start with `create` or `read` as a mutation callback and walks it, so `isOverdue` in `storeData.ts` would be walked as a move. `dateOf(now)` is `now.toISOString().slice(0, 10)`; `isIsoDate` checks the `^\d{4}-\d{2}-\d{2}$` shape and that `new Date(Date.parse(value + 'T00:00:00Z')).toISOString().slice(0, 10) === value` (so `2025-02-30` is refused); `isOverdue(row, now)` is `row.completed !== true && typeof row.due === 'string' && row.due !== '' && row.due < dateOf(now)` — an ISO date compares as a string, and a date equal to today is due, not overdue. `setTodoDue` is `if (due === '') store.delCell('todos', id, 'due'); else if (isIsoDate(due)) store.setPartialRow('todos', id, {due});` — measured: after `setTodoDue(store, '1', '')` the row's `getContent()` entry is `{text: 'walk the dog', completed: false}` with no `due` key, and after `'2025-13-45'` and `'soon'` the content is byte-identical to before. `client/src/Store.tsx` re-exports it beside `setTodoCompleted` (both the import list from `./storeData` and the `export {STORE_ID, addTodo, deleteTodo, setTodoCompleted}` line). The `INVARIANTS` entry is appended after the existing one (the linter's tests index `INVARIANTS[0]` for the completed-text invariant) with predicate `row.due === undefined || (typeof row.due === 'string' && isIsoDate(row.due))`. `TodoRow` (`Row<typeof TABLES_SCHEMA, 'todos'>`) therefore types `due` as optional; consumers read `todo.due ?? ''`.

The pins that go red at BASE with this change, read by running the suite over it per file, and their loosening — each to what the pin meant, never to a new exact literal, because two sibling plans add a callback, a values schema, a table and snapshot files concurrently:

- `tests/state-exams/done-count.test.ts` leg (o) pins `Object.keys(TABLES_SCHEMA.todos).sort()` as `['completed', 'text']`; it becomes `['completed', 'due', 'text']` (the cells of this plan's own table — no sibling adds a `todos` cell). Its pin of `Object.keys(TABLES_SCHEMA)` as `['todos']` is left alone.
- `packages/tinyapp-lint/test/lint-cli.test.ts`: leg (a)'s summary regex `over 7 snapshots and 6 exams` becomes `over [0-9]+ snapshots and [0-9]+ exams`; leg (b)'s exact callback list becomes `expect(Object.keys(ctx.callbacks).sort()).toEqual(expect.arrayContaining([...the four of BASE, 'setTodoDue']))`; leg (b)'s seven-entry `snapshots` literal becomes a `snapshotFiles()` helper that lists every `.json` under `state-exams/expected` (kind `expected`) and `state-exams/seeds` (kind `seed`), sorted by path (the loader's own order), so a later task's or plan's snapshot is read here without editing this pin; leg (c)'s six-path exam list and its `toHaveLength(6)`, and leg (f)'s `toHaveLength(6)`, become an `examFiles()` helper — every `.test.ts` under `tests/state-exams/` whose text matches `/^stateExam\(/m` (a top-level call, which is why `interaction-evidence.test.ts`, whose only `stateExam` is in prose, stays out), sorted — with leg (c) also asserting that list contains `click-completes-todo.test.ts` and not `interaction-evidence.test.ts`.
- `packages/tinyapp-lint/test/views.test.ts` leg (a)'s `expect(ctx.exams).toHaveLength(6)` becomes `expect(ctx.exams.length).toBeGreaterThanOrEqual(6)`.
- `packages/tinyapp-lint/test/reachability.test.ts`: leg (a)'s `toHaveLength(4)` over expected snapshots and `toHaveLength(3)` over seeds become `.length).toBeGreaterThanOrEqual(4)` and `(3)`; `BAD_LINE` and `CLI_LINE` pin the finding text `reached by none of the 3 seeds within 3 moves of addTodo, clearCompleted, deleteTodo or setTodoCompleted` character for character — both are replaced by one helper `isFindingLine(line, file, callbacks)` that parses the line with `/^(.+): state: reached by none of the (\d+) seeds within 3 moves of (.+) — write the state a callback reaches from a seed, or add the seed it is reached from$/`, requires the file part to match the leg's path pattern and the seed count to equal a `SEED_COUNT` read off `readdirSync` of `state-exams/seeds` (`.json` files), splits the callback list (replace ` or ` with `, `, split on `, `, sort) and requires it to equal `Object.keys(callbacks).sort()` and to include the four callbacks of BASE plus `setTodoDue`; leg (b) checks `formatFinding(findings[0])` with it against `ctx.callbacks` and leg (e) filters the CLI's lines with it against the loaded context's callbacks, expecting exactly one. Parsed rather than pinned, because a sibling plan's callback sorts anywhere in that list and either merge order has to stay green (the filter-bar author uses the same shape).
- `packages/tinyapp-lint/test/invariants.test.ts`: leg (a)'s `toHaveLength(1)` becomes `.length).toBeGreaterThanOrEqual(2)`, keeping every assertion on `INVARIANTS[0]`, and gains the M5 rows on the entry found by `INVARIANTS.find((entry) => entry.message === DUE_MESSAGE)`; leg (b)'s `expect(ctx.snapshots).toHaveLength(7)` becomes `.length).toBeGreaterThanOrEqual(7)`, its `toHaveLength(1)` on `ctx.invariants` becomes `.length).toBeGreaterThanOrEqual(2)`, and `ctx.invariants.map((entry) => entry.message)` is asserted to contain the new message. Legs (c) and (d), which hand the rule raw rows without a `due` key and pin their finding counts exactly, are untouched and stay green because an absent `due` satisfies the predicate.

Measured with those edits in place (2026-09-15, laptop): `bun test packages/tinyapp-lint` → `27 pass, 0 fail`; `bun run lint:state` → `0 findings over 8 snapshots and 7 exams` with this task's files alone; `bun test tests/state-exams/done-count.test.ts` → `16 pass`. Nothing under `client/test`, `packages/tinyapp-exam/test` or the other fixture exams changes, and each was run per file unchanged. Reachability with `setTodoDue`'s two-argument tuples stays under `reachability.test.ts` leg (b)'s 3,000 ms pin because `setTodoDue` refuses every non-date string in the pool.

**Proof:**
- Test: `tests/state-exams/set-todo-due.test.ts`
- Guard: `tests/state-exams/set-todo-due.test.ts`
- Legs: (a) `TABLES_SCHEMA.todos.due` deep-equals `{type: 'string'}` and has no `default` key, and `createTodosStore([{todos: {'0': {text: 'buy milk', completed: false}}}, {}]).getContent()` deep-equals that same seed [M1]; (b) on a store seeded with `two-open-todos.json`'s content, `setTodoDue(store, '0', '2025-12-31')` returns `undefined` and row `0` reads `due` `'2025-12-31'`; then `setTodoDue(store, '0', '')` returns `undefined` and `store.getRow('todos', '0')` has no `due` key; and for each of `'2025-13-45'` and `'soon'`, `setTodoDue(store, '0', bad)` returns `undefined` and `store.getContent()` deep-equals a copy taken before the call [M2]; (c) `isIsoDate` returns `true` for `'2025-12-31'` and `'2024-02-29'` and `false` for each of `''`, `'2025-13-45'`, `'2025-02-30'`, `'2025-1-5'`, `'soon'` — one assertion per value [M3]; (d) with `now = new Date('2026-01-01T00:00:00Z')`, `isOverdue` is `true` for `{completed: false, due: '2025-12-31'}` and `false` for each of the five rows M4 lists — one assertion per row [M4]; (e) `INVARIANTS.find` by the pinned message is defined, on table `todos`, and its predicate returns `true` for a row with no `due` and for `'2025-12-31'`, `false` for each of `''`, `'2025-13-45'`, `'soon'`; and the lint Run: below exits 0 — it captures the lint's own exit status into `code` before the grep, requires `code` to be exactly 1, and only then greps the captured output for the pinned line, so a lint that printed the line yet exited 0, or exited 1 without the line, fails it [M5]; (f) the state exam: clock `2026-01-01T00:00:00Z`, entry `client/index.html`, seed `state-exams/seeds/two-open-todos.json`, `store: () => createTodosStore()`, action `(store) => { setTodoDue(store, '1', '2025-06-30'); }`, expected `state-exams/expected/two-todos-second-due.json`, view `[{selector: '.todoItem', count: 2, text: 'walk the dog'}, {selector: 'input#todo-1', unchecked: true}]`, mutant `[{table: 'todos', row: '1', cell: 'due', absent: true}]` — and the expected file parses to exactly the M6 literal [M6]; (g) the two `bun test` Run: lines below exit 0, and `done-count.test.ts`'s source pins the sorted cells `['completed', 'due', 'text']` [M7].
- Run: d=$(mktemp -d state-exams/lint-tmp-XXXXXX); mkdir "$d/seeds"; printf '%s' '[{"todos":{"0":{"text":"a","completed":false,"due":"2025-13-45"}}},{}]' > "$d/seeds/bad.json"; out=$(bun run lint:state --seeds "$d/seeds" --expected "$d/none" --exams "$d/none" 2>&1); code=$?; rm -rf "$d"; test "$code" -eq 1 && printf '%s\n' "$out" | grep -q 'todos/0: breaks the invariant "a due date is absent or a valid YYYY-MM-DD"'
- Run: bun test tests/state-exams/done-count.test.ts
- Run: bun test packages/tinyapp-lint

**Stale-if:**
- path-exists: `client/src/overdue.ts`

### Task 2: The date field on each row

**Type:** implementation
**Review:** peer

**Files:**
- Create: `client/src/DueInput.tsx`
- Modify: `client/src/TodoItem.tsx`
- Modify: `client/src/todoItem.css`
- Test: `tests/state-exams/type-due-date.test.ts`

**Claim:** Each todo in the list has a date box beside it, and a date I type there is kept on that todo. (derived)
Machine: M1. In the markup `renderStatic(content)` paints over `state-exams/expected/two-todos-second-due.json`'s content, each `.todoItem` holds, after its `label`, exactly one `input` with `type="text"`, `id="due-<rowId>"`, class `dueInput` and `placeholder="YYYY-MM-DD"`, and `input#due-1` carries `value="2025-06-30"` while `input#due-0` carries `value=""`.
M2. Typing `2025-06-30` into `input#due-1` on the page seeded from `state-exams/seeds/two-open-todos.json` reaches exactly `state-exams/expected/two-todos-second-due.json`, and the page then shows `input#due-1` with `value="2025-06-30"`, `input#due-0` with `value=""` and two `.todoItem` rows.

**Authorized-by:** popmechanic/ultrapowers#867; the sitting's answered question "Where does the date get set?" → per-item date field (picked over a date on the add form).

**Interfaces:**
- Consumes: `setTodoDue(store: TodosStore, id: string, due: string): void`
- Consumes: `isIsoDate(value: string): boolean`
- Produces: `DueInput({rowId, due}: {rowId: string; due: string})`

**Context:** The field is a text input, not `<input type="date">`: measured 2026-09-15, the exam driver's `{type: [selector, text]}` is one CDP `Input.insertText` after `DOM.focus` (`packages/tinyapp-exam/src/browser.ts`), and inserted text does not reach a date input — an exam that typed `2025-12-31` into a `type="date"` field read the row back with no `due`. A text field takes the whole string in one `onChange`. `DueInput` reads the provided store with `useStore(STORE_ID) as TodosStore | undefined` from `./Store`, exactly as `TodoItem.tsx` does, and imports `setTodoDue` from `./Store` (Task 1 re-exports it there) and `isIsoDate` from `./overdue`. It keeps what is being typed in a `useState(due)` synced from the `due` prop by a `useEffect`, and on change calls `setTodoDue(store, rowId, value)` only when `value === '' || isIsoDate(value)`, so a half-typed date is never sent and the controlled field never snaps back mid-word; clearing the field sends `''`, which removes the cell. The input carries `size={10}` and `aria-label="Due date"`. `TodoItem.tsx` mounts `<DueInput rowId={rowId} due={todo.due ?? ''} />` on the line directly after `<label htmlFor={`todo-${rowId}`}>{todo.text}</label>` and imports it from `./DueInput` — `due` is optional on `TodoRow`, so the `?? ''` is what typechecks; nothing else in `TodoItem.tsx` changes in this task, since Task 3 edits the root `div` of the same component in the same wave and the two edits fold. `todoItem.css` gains one rule on `.todoItem input.dueInput` (flex-shrink 0, `font: inherit`, `color: var(--fg)`, `background: var(--bg2)`, `border: 1px solid var(--border)`) appended at the end of the file. React writes a controlled input's `value` as a DOM attribute, so `attr: {name: 'value', value: '…'}` in a view reads it in a live page (measured: the view below passed) and `renderToStaticMarkup` emits it in the static markup. `renderStatic` is exported by `client/src/StaticPage.tsx` and takes a `[tables, values]` content; import it in the exam as `../../client/src/StaticPage` and parse the markup with `node-html-parser` (the exam package's own dependency), or match the strings directly. The exam file must import `createTodosStore` and name `store: () => createTodosStore()` beside `entry` (Global Constraints, last bullet).

**Proof:**
- Test: `tests/state-exams/type-due-date.test.ts`
- Guard: `tests/state-exams/type-due-date.test.ts`
- Legs: (a) `renderStatic(JSON.parse(readFileSync('state-exams/expected/two-todos-second-due.json')))` contains exactly two `input.dueInput`, each `type="text"` with `placeholder="YYYY-MM-DD"`, `#due-0` with `value=""` and `#due-1` with `value="2025-06-30"`, and each sits inside a `.todoItem` after that row's `label` [M1]; (b) the state exam: clock `2026-01-01T00:00:00Z`, entry `client/index.html`, seed `state-exams/seeds/two-open-todos.json`, `store: () => createTodosStore()`, action `{type: ['input#due-1', '2025-06-30']}`, expected `state-exams/expected/two-todos-second-due.json`, view `[{selector: 'input#due-1', attr: {name: 'value', value: '2025-06-30'}}, {selector: 'input#due-0', attr: {name: 'value', value: ''}}, {selector: '.todoItem', count: 2}]`, mutant `[{table: 'todos', row: '1', cell: 'due', absent: true}]` [M2].

**Stale-if:**
- path-exists: `client/src/DueInput.tsx`

### Task 3: The overdue mark on a row

**Type:** implementation
**Review:** peer

**Files:**
- Modify: `client/src/TodoItem.tsx`
- Create: `state-exams/seeds/two-open-todos-first-past-due.json`
- Create: `state-exams/expected/two-todos-first-past-due-done.json`
- Test: `tests/state-exams/completed-past-due-not-overdue.test.ts`

**Claim:** An open todo whose date has passed is marked overdue in the list, and ticking it off takes the mark away. (derived)
Machine: M1. Every `.todoItem` carries `data-overdue="true"` and the class `overdue` exactly when `isOverdue(row, new Date())` is true, and `data-overdue="false"` without that class otherwise: `renderStatic` over the content of `state-exams/seeds/two-open-todos-first-past-due.json`, run inside `withContract('2026-01-01T00:00:00Z', …)`, paints exactly one `.todoItem[data-overdue="true"]`, holding `buy milk` with `class="todoItem overdue"`, and exactly one `.todoItem[data-overdue="false"]`, holding `walk the dog`; and `renderStatic` over the content of `state-exams/expected/two-todos-first-past-due-done.json` under the same contract paints no `.todoItem[data-overdue="true"]` and two `.todoItem[data-overdue="false"]`.
M2. Clicking the first checkbox on the page seeded from `state-exams/seeds/two-open-todos-first-past-due.json` reaches exactly `state-exams/expected/two-todos-first-past-due-done.json` — row `0` completed with its `due` still `2025-12-31` — and the page then shows no `.todoItem[data-overdue="true"]`, no `.todoItem.overdue`, two `.todoItem[data-overdue="false"]`, and `.todoItem.completed input#todo-0` checked.

**Authorized-by:** popmechanic/ultrapowers#867; the Summary's "an open todo past its date is visibly overdue while a completed one is not".

**Interfaces:**
- Consumes: `isOverdue(row: {completed?: boolean; due?: string}, now: Date): boolean`
- Produces: `data-overdue`

**Context:** `TodoItem.tsx` computes `const overdue = isOverdue(todo, new Date());` (import from `./overdue`) and renders its root as `<div className={`todoItem${todo.completed ? ' completed' : ''}${overdue ? ' overdue' : ''}`} data-overdue={overdue ? 'true' : 'false'}>` — the attribute is written on both branches so a `view` can assert `"false"` with `attr`, and the `completed` class stays first so `tests/state-exams/interaction-evidence.test.ts`'s pin of `class="todoItem completed"` on a completed, undated row still holds (measured: that file's 10 legs pass with this markup). Nothing else in `TodoItem.tsx` changes in this task; Task 2 inserts a `DueInput` line after the label in the same wave, and the two edits fold. "Now" is `new Date()` in the page: `packages/tinyapp-exam/src/browser.ts` installs a `Date` pinned to the exam's clock before a line of the app runs, and `packages/tinyapp-exam`'s `withContract(clock, fn)` (exported) pins `globalThis.Date` in-process, which is how the static-render legs read the same clock — the linter's own static render runs under the wall clock (Global Constraints), so the dated row here is dated `2025-12-31`, past under either. The seed is `[{"todos": {"0": {"text": "buy milk", "completed": false, "due": "2025-12-31"}, "1": {"text": "walk the dog", "completed": false}}}, {}]` and the expected state `[{"todos": {"0": {"text": "buy milk", "completed": true, "due": "2025-12-31"}, "1": {"text": "walk the dog", "completed": false}}}, {}]` — row `1` has no `due` key — one `setTodoCompleted` move apart, which is what the reachability rule needs, and `TodoList` renders rows ascending by id so `.todoItem input[type=checkbox]` clicks row `0`. This exam names no `input#due-…` selector: the date field is Task 2's, in the same wave. `renderStatic` is exported by `client/src/StaticPage.tsx`; the exam file must import `createTodosStore` and name `store: () => createTodosStore()` beside `entry` (Global Constraints, last bullet).

**Proof:**
- Test: `tests/state-exams/completed-past-due-not-overdue.test.ts`
- Guard: `tests/state-exams/completed-past-due-not-overdue.test.ts`
- Legs: (a) inside `withContract('2026-01-01T00:00:00Z', …)`, `renderStatic` over the seed file's parsed content has exactly one element matching `.todoItem[data-overdue="true"]`, whose text contains `buy milk` and whose `class` attribute is `todoItem overdue`, and exactly one matching `.todoItem[data-overdue="false"]`, whose text contains `walk the dog` and whose class list has no `overdue` [M1]; (b) under the same contract, `renderStatic` over the expected file's parsed content has no element matching `.todoItem[data-overdue="true"]` and exactly two matching `.todoItem[data-overdue="false"]` [M1]; (c) the state exam: clock `2026-01-01T00:00:00Z`, entry `client/index.html`, seed `state-exams/seeds/two-open-todos-first-past-due.json`, `store: () => createTodosStore()`, action `{click: '.todoItem input[type=checkbox]'}`, expected `state-exams/expected/two-todos-first-past-due-done.json`, view `[{selector: '.todoItem[data-overdue="true"]', absent: true}, {selector: '.todoItem.overdue', absent: true}, {selector: '.todoItem[data-overdue="false"]', count: 2}, {selector: '.todoItem.completed input#todo-0', checked: true}]`, mutant `[{table: 'todos', row: '0', cell: 'completed', value: false}]`; and the two snapshot files parse to exactly the two literals in Context [M2].

**Stale-if:**
- path-exists: `state-exams/seeds/two-open-todos-first-past-due.json`

### Task 4: A date typed into a row shows it overdue

**Type:** implementation
**Review:** peer

**Files:**
- Create: `state-exams/expected/two-todos-first-due.json`
- Modify: `client/src/todoItem.css`
- Test: `tests/state-exams/due-date-marks-overdue.test.ts`

**Claim:** When I type a past date into a todo's date box, that todo shows as overdue in the list and the others do not. (derived)
Machine: M1. Typing `2025-12-31` into `input#due-0` on the page seeded from `state-exams/seeds/two-open-todos.json` reaches exactly `state-exams/expected/two-todos-first-due.json`, which parses to `[{"todos": {"0": {"text": "buy milk", "completed": false, "due": "2025-12-31"}, "1": {"text": "walk the dog", "completed": false}}}, {}]`, and the page then shows exactly one `.todoItem[data-overdue="true"]`, holding `buy milk`, exactly one `.todoItem.overdue`, exactly one `.todoItem[data-overdue="false"]`, holding `walk the dog`, and `input#due-0` with `value="2025-12-31"`.
M2. `client/src/todoItem.css` holds a rule whose selector is `.todoItem.overdue label` and whose block sets `color`, so an overdue row's text is visibly marked.

**Authorized-by:** popmechanic/ultrapowers#867; the plan-level Claim's "an open todo whose date has passed shows as overdue in the list".

**Interfaces:**
- Consumes: `DueInput({rowId, due}: {rowId: string; due: string})`
- Consumes: `data-overdue`
- Produces: none

**Context:** This is the end-to-end exam the Claim names, and it needs both wave-2 halves in one page: Task 2's `input#due-<rowId>` text field (whose `onChange` sends a whole `YYYY-MM-DD` to `setTodoDue`) and Task 3's `data-overdue` / `overdue` on the row, read off `isOverdue(row, new Date())` under the clock `packages/tinyapp-exam/src/browser.ts` pins before the app runs. The expected file is one `setTodoDue` move from `two-open-todos.json`, which the reachability rule reaches; row `1` has no `due` key. `2025-12-31` is past under the pinned `2026-01-01` and under the wall clock (Global Constraints), and row `1` reads `"false"` because it has no date, never because of a future date. The css rule is appended to `client/src/todoItem.css`: `.todoItem.overdue label { color: var(--accent); }` — `--accent` is defined on `body` in `client/index.html` — and may be followed by `.todoItem.overdue input.dueInput { border-color: var(--accent); }`; Task 2 appends its own `input.dueInput` rule to the same file in the earlier wave, and the two fold. The exam file must import `createTodosStore` and name `store: () => createTodosStore()` beside `entry` (Global Constraints, last bullet). Measured 2026-09-15 with all four tasks' files in one tree: this exam passes, `bun run lint:state` reports 0 findings over 11 snapshots and 10 exams, and the mutant on `todos/0/due` is killed.

**Proof:**
- Test: `tests/state-exams/due-date-marks-overdue.test.ts`
- Guard: `tests/state-exams/due-date-marks-overdue.test.ts`
- Legs: (a) the state exam: clock `2026-01-01T00:00:00Z`, entry `client/index.html`, seed `state-exams/seeds/two-open-todos.json`, `store: () => createTodosStore()`, action `{type: ['input#due-0', '2025-12-31']}`, expected `state-exams/expected/two-todos-first-due.json`, view `[{selector: '.todoItem[data-overdue="true"]', count: 1, text: 'buy milk'}, {selector: '.todoItem.overdue', count: 1, text: 'buy milk'}, {selector: '.todoItem[data-overdue="false"]', count: 1, text: 'walk the dog'}, {selector: 'input#due-0', attr: {name: 'value', value: '2025-12-31'}}, {selector: '.todoItem', count: 2}]`, mutant `[{table: 'todos', row: '0', cell: 'due', absent: true}]`; and the expected file parses to exactly the M1 literal [M1]; (b) the Run: line below exits 0 — the css rule's block, from its selector line to its closing brace, contains `color` [M2].
- Run: sed -n '/^\.todoItem\.overdue label/,/}/p' client/src/todoItem.css | grep -q 'color'

**Stale-if:**
- path-exists: `state-exams/expected/two-todos-first-due.json`
