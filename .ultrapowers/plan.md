# Rename a todo, and sort the list by due date — a Rename button on every row, and one button that puts the soonest deadline on top

**Grammar:** claims-v1

**Claim:** When I press Rename on a todo, type new words and press Enter, that todo carries the new words and nothing else changes; and when I press Sort by due date, the todos with dates come first, soonest at the top, and pressing it again puts the list back. (elicited)
**Summary:** This gives every todo a Rename button that opens a small box holding its words, ready to be typed over, and gives the list a Sort by due date button. It exists because a todo's words could never be fixed once written, and a list with due dates had no way to show what is due soonest. After this run a typo is one button and one Enter away from fixed, the soonest deadline sits at the top when asked, and both choices ride the synced store so every open browser agrees.

**Goal:** popmechanic/tinyapp-fixture gains two independent features over the one synced store: `renameTodo` with a `Rename <todo>` button and a `New text for <todo>` box on every row, and a `sort` store value with `setSort`, a pure `orderTodos` reading and a `Sort by due date` button above the list. The synced shape is untouched. Two contracts, no edge between them; the features were picked by the operator on 2026-09-21. This is also the first factory run on a TinyApp (the factory map, issue 1131 of popmechanic/ultrapowers, gap 2 of the mow).

**Tech Stack:** Bun 1.4 + TypeScript 6 + TinyBase 9.7 (`tinybase/with-schemas`, a `MergeableStore` under `TABLES_SCHEMA` and `VALUES_SCHEMA`), React 19; Tailwind v4 + shadcn/ui (`Button`, `Input` under `client/src/components/ui/`, the six `@shadcn/lint` rules as `bun run lint:ui`); the `tinyapp-exam` state exams under `tests/state-exams/` over raw CDP against `/headless-shell/headless-shell` on the fleet image, seeds and expected states under `state-exams/`.
**Exam command:** bun test {paths}
**Bootstrap:** bun install --frozen-lockfile

**Spec:** none on disk — the operator's picks of 2026-09-21 are the whole brief, and everything a worker needs is in the Contexts below. The sandbox holds no spec.
**Target:** popmechanic/tinyapp-fixture at `6797f7e7fc671a7cc2af49fbeab90d0a1d3b0174` (main after run-35).

## Global Constraints

- Check: bun run lint:ui
- Check: bun run typecheck
- Check: bun run lint:state
- Check: git diff --quiet $ULTRA_BASE -- server client/src/Store.tsx client/src/sqlite.tsx client/src/config.ts client/src/index.css client/src/components packages package.json client/package.json server/package.json bun.lock
- Check: ! grep -rnE 'bun test|bun run|Bun\.spawn|spawnSync|execSync' tests/state-exams | grep -vE ':[0-9]+:[[:space:]]*(//|\*|/\*)' | grep .
- The synced shape is untouched: `client/src/Store.tsx` — the one `MergeableStore`, its persister and its synchronizer — and `server/` are byte-identical to BASE. A task that opens a second store, a second socket or a second persister is a finding.
- No new dependency: every import this plan adds resolves against what is already installed.
- The design system and nothing else: a shadcn component is restyled only through its variants and layout classes, and `bun run lint:ui`'s word is final.
- No schema `default` on anything this plan adds: every seed and expected file checked in before this plan still loads through `createTodosStore` to itself.
- Every control this plan adds carries an accessible name, and every interaction in an exam names its control by role and name; a view selector is an id, a tag or a `data-*` attribute, never a class.

### Task 1: Rename a todo — a Rename button on every row, a box that is typed over, and Enter writes the new words

**Type:** implementation
**Review:** peer

**Files:**
- Create: `client/src/RenameTodo.tsx`
- Modify: `client/src/storeData.ts`
- Modify: `client/src/TodoItem.tsx`
- Create: `state-exams/expected/two-todos-first-renamed.json`
- Test: `tests/state-exams/rename-todo.test.ts`

**Claim:** When I press Rename on a todo, type new words and press Enter, that todo carries the new words and nothing else changes; words that are only spaces are refused. (derived)
Machine: M1. On the page over `state-exams/seeds/two-open-todos.json` — `[{todos: {'0': {text: 'buy milk', completed: false}, '1': {text: 'walk the dog', completed: false}}}, {}]` — clicking the button named `Rename buy milk`, typing `buy oat milk` into the textbox named `New text for buy milk` and pressing Enter in it leaves the page store's `getContent()` exactly `[{todos: {'0': {text: 'buy oat milk', completed: false}, '1': {text: 'walk the dog', completed: false}}}, {}]`, the page showing exactly 2 `#todoList li`, `#todoList li:nth-child(1)` with text containing `buy oat milk`, `#rename-0` exactly once with `aria-label` exactly `Rename buy oat milk`, and no `#rename-box-0`; and `state-exams/expected/two-todos-first-renamed.json` parses to exactly that literal.
M2. On a store seeded with the two-open content of M1, `renameTodo(store, '0', '  buy oat milk  ')` leaves `getContent()` exactly the M1 expected literal — the text is trimmed.
M3. On that renamed store, `renameTodo(store, '0', '   ')` and then `renameTodo(store, '9', 'x')` — words that are only spaces, and an id `todos` does not hold — each leave `getContent()` deep-equal to the snapshot taken immediately before the call: nothing is written and no row `'9'` appears.

**Authorized-by:** the operator's pick of 2026-09-21 (rename a todo, on popmechanic/tinyapp-fixture); the factory map of popmechanic/ultrapowers, issue 1131 there (gap 2, the first factory run on a TinyApp).

**Interfaces:**
- Consumes: none
- Produces: `renameTodo(store: TodosStore, id: string, text: string): void`
- Produces: `RenameTodo`

**Context:** You see this task body and nothing else, so everything shared is here. **What the sibling task does, and what it assumes of the files you share:** a sibling task adds sorting by due date; it also edits `client/src/storeData.ts` — it adds `sort: {type: 'string'}` to `VALUES_SCHEMA` and a `setSort` function directly after `setFilter`, near the end of the file — and it edits `client/src/TodoList.tsx`, which you do not touch. Put `renameTodo` directly after `setTodoCompleted` (before `setTodoDue`), so the two inserts are in different regions of the file and fold as text; touch nothing else in `storeData.ts` — no schema change is needed, `text` is already a cell. `renameTodo(store, id, text)` trims `text`; when the trimmed text is `''` or `!store.hasRow('todos', id)` it returns having written nothing (measured: `setPartialRow` on a missing row creates a phantom row out of the schema defaults, which is why `pinTodo` guards the same way); otherwise `store.setPartialRow('todos', id, {text: trimmed})`. The UI is one new component `client/src/RenameTodo.tsx`, props `{rowId: string; todoText: string}`, mounted in `client/src/TodoItem.tsx` directly before `<DueInput …>`; import `renameTodo` from `./storeData` and `STORE_ID`, `useStore`, `TodosStore` from `./Store` (the shape `FilterBar.tsx` uses) — `client/src/Store.tsx` must stay byte-identical to BASE, a run-wide check enforces it. It renders a `Button` (`@/components/ui/button`, `variant="outline"`, `size="sm"`) with `id={`rename-${rowId}`}`, `aria-label={`Rename ${todoText}`}` and the visible text `Rename`; clicking it toggles a local `editing` state and resets a local `draft` to `todoText`. While editing it also renders, before the button, an `Input` (`@/components/ui/input`) with `type="text"`, `id={`rename-box-${rowId}`}`, `aria-label={`New text for ${todoText}`}`, a layout-only class such as `w-40 shrink-0`, `autoFocus`, `value={draft}`, `onChange` setting the draft, and `onFocus={(e) => e.target.select()}` — that select is load-bearing: the exam driver types with one CDP `Input.insertText` after focusing the field, and inserted text replaces a selection, so the box that opens holding `buy milk` ends holding exactly `buy oat milk` (measured on a prototype at BASE, 2026-09-21: with the select the store reaches the M1 literal; without it the text would be inserted into the old words). `onKeyDown`: `Enter` calls `renameTodo(store, rowId, draft)` and closes the box; `Escape` closes it without writing. The editing state is local React state, not store data — it is not the app's data, it is where the caret is. **Do not move or restyle the existing text span in `TodoItem.tsx`**: `tests/state-exams/due-date-marks-overdue.test.ts` reads that file's source for the element whose child is `{todo.text}` and requires its `className` to carry `group-data-[overdue=true]:text-primary` (measured: a prototype that replaced the span with a clickable button turned two of that exam's legs red; the separate Rename button turns none). Measured on the prototype with exactly this shape: `bun run typecheck` and `bun run lint:ui` clean, `lint:state: 0 findings over 29 snapshots and 31 exams`, and no test on the tree that was green at BASE goes red. The expected file is one line of JSON like its siblings, tables first: `[{"todos": {"0": {"text": "buy oat milk", "completed": false}, "1": {"text": "walk the dog", "completed": false}}}, {}]`. **For the examiner:** the exam is `tests/state-exams/rename-todo.test.ts`; its imports are `import {expect, test} from 'bun:test'`, `import {stateExam} from 'tinyapp-exam'` and `import * as sd from '../../client/src/storeData'` — a namespace import, because a named import of `renameTodo` is a load error at BASE and one load error reds the whole file instead of the leg. A file's whole state exam is the single top-level `stateExam({…})` in it; every other leg is an ordinary `bun:test` block beside it. `sd.createTodosStore(content)` seeds a store; snapshot a store as `JSON.parse(JSON.stringify(store.getContent()))` before `toEqual`. Every fixture read happens inside a test body, never at module level — the state linter imports this file with `stateExam` and `bun:test` stubbed out. `view` is a closed vocabulary — `{selector, count?, text?, attr?: {name, value}, checked?, unchecked?, absent?: true}`, `text` a contains-match — and `mutant` is a list of `{table, row, cell, value}`, `{table, row, cell, absent: true}` or `{table, row, absent: true}` entries over the expected tables, each of which must break the exam. An `action` is a store callback, or one of `{click: target}`, `{type: [target, text]}`, `{key: [target, key]}` — a target is a CSS selector string or `{role, name}` — or an array of those performed in order. The exam never spawns a runner: no `bun test`, `bun run`, `Bun.spawn`, `spawnSync` or `execSync`, not even in a comment that is not a `//` or `*` line.

**Proof:**
- Test: `tests/state-exams/rename-todo.test.ts`
- Guard: `tests/state-exams/rename-todo.test.ts`
- Legs: (a) [M1] the one `stateExam` of the file, exactly:

```ts
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => sd.createTodosStore(),
  action: [
    {click: {role: 'button', name: 'Rename buy milk'}},
    {type: [{role: 'textbox', name: 'New text for buy milk'}, 'buy oat milk']},
    {key: [{role: 'textbox', name: 'New text for buy milk'}, 'Enter']},
  ],
  expected: 'state-exams/expected/two-todos-first-renamed.json',
  view: [
    {selector: '#todoList li', count: 2},
    {selector: '#todoList li:nth-child(1)', count: 1, text: 'buy oat milk'},
    {selector: '#rename-0', count: 1, attr: {name: 'aria-label', value: 'Rename buy oat milk'}},
    {selector: '#rename-box-0', absent: true},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'text', value: 'buy milk'}],
});
```

  and a `bun:test` block in which the parsed expected file is `toEqual` the M1 expected literal written out in the test; (b) [M2] after `sd.renameTodo(store, '0', '  buy oat milk  ')` on a store seeded with the two-open literal, the snapshot is `toEqual` the M1 expected literal; (c) [M3] on that store, a snapshot taken before `sd.renameTodo(store, '0', '   ')` is `toEqual` the one taken after, and a snapshot taken before `sd.renameTodo(store, '9', 'x')` is `toEqual` the one taken after.

**Stale-if:**
- path-exists: `client/src/RenameTodo.tsx`
- path-exists: `state-exams/expected/two-todos-first-renamed.json`

### Task 2: Sort by due date — one button, a setting in the synced store, and the soonest deadline on top

**Type:** implementation
**Review:** peer

**Files:**
- Create: `client/src/todoOrder.ts`
- Create: `client/src/SortBar.tsx`
- Modify: `client/src/storeData.ts`
- Modify: `client/src/TodoList.tsx`
- Modify: `tests/state-exams/set-todo-tags.test.ts`
- Create: `state-exams/seeds/three-todos-mixed-due.json`
- Create: `state-exams/expected/three-todos-mixed-due-sorted.json`
- Test: `tests/state-exams/sort-by-due.test.ts`

**Claim:** When I press Sort by due date, the todos with dates come first, soonest at the top, the ones without a date after them, and pinned todos stay above everything; pressing it again puts the list back. (derived)
Machine: M1. On the page over `state-exams/seeds/three-todos-mixed-due.json` — `[{todos: {'0': {text: 'buy milk', completed: false, due: '2026-03-01'}, '1': {text: 'walk the dog', completed: false}, '2': {text: 'call mum', completed: false, due: '2026-02-01'}}}, {}]` — clicking the button named `Sort by due date` leaves the page store's `getContent()` exactly those tables beside the values `{sort: 'due'}`, the page showing exactly 3 `#todoList li` of which `li:nth-child(1)` has text containing `call mum`, `li:nth-child(2)` `buy milk` and `li:nth-child(3)` `walk the dog`, and `#sort-due` exactly once with `data-active="true"`; the seed file parses to exactly the seed literal and `state-exams/expected/three-todos-mixed-due-sorted.json` to exactly the seed's tables beside `{sort: 'due'}`.
M2. On a store seeded with the M1 seed content: `setSort(store, 'due')` leaves `getContent()[1]` exactly `{sort: 'due'}`; then `setSort(store, 'bogus')` leaves it exactly `{sort: 'due'}` — an unknown name writes nothing; then `setSort(store, '')` leaves `getContent()` deep-equal to the seed content — the value is deleted, not written as `''`. `VALUES_SCHEMA.sort` is exactly `{type: 'string'}` and has no `default` key.
M3. Over the table `{a: {due: '2026-03-01'}, b: {}, c: {due: '2026-02-01'}, d: {pinned: true}}` and the ids `['a', 'b', 'c', 'd']`, `orderTodos(ids, table, 'due')` is exactly `['d', 'c', 'a', 'b']` and `orderTodos(ids, table, undefined)` is exactly `['d', 'a', 'b', 'c']`.
M4. The static render (`renderStatic` of `client/src/StaticPage.tsx`) over the M1 seed content — no `sort` value — carries `#sort-due` exactly once with `data-active="false"` and `#filterBar button` exactly 3 times, and in its markup `buy milk` occurs before `walk the dog`, which occurs before `call mum`: with the setting gone the list is back in row order.
M5. On this task's tree `bun test tests/state-exams/set-todo-tags.test.ts` exits 0 — the one exam on the tree that pinned the values schema as exactly two entries no longer does.

**Authorized-by:** the operator's pick of 2026-09-21 (sort by due date, on popmechanic/tinyapp-fixture); the factory map of popmechanic/ultrapowers, issue 1131 there (gap 2, the first factory run on a TinyApp).

**Interfaces:**
- Consumes: none
- Produces: `setSort(store: TodosStore, sort: string): void`
- Produces: `orderTodos(ids: readonly string[], table: Record<string, {pinned?: boolean; due?: string}>, sort: unknown): string[]`
- Produces: `SortBar`

**Context:** You see this task body and nothing else, so everything shared is here. **What the sibling task does, and what it assumes of the files you share:** a sibling task adds renaming; it also edits `client/src/storeData.ts` — it adds one function, `renameTodo`, directly after `setTodoCompleted` near the middle of the file, and changes no schema — and it edits `client/src/TodoItem.tsx`, which you do not touch. Put your `storeData.ts` edits where it is not: `sort: {type: 'string'}` as the last entry of `VALUES_SCHEMA` (**no `default`** — a default is materialised into every store's `getContent()` and would rewrite every checked-in snapshot; an absent value is how the app says unsorted, exactly as `filter` and `tag` do), and `setSort` directly after `setFilter`, near the end of the file, so the two tasks' inserts fold as text. `setSort(store, sort)`: `''` → `store.delValue('sort')`; `'due'` → `store.setValue('sort', 'due')`; anything else leaves the store alone (the shape of `setFilter`'s guard). The sort is a store value and not React state because the app keeps its data in TinyBase (`AGENTS.md`), so the choice syncs and persists like the filter. `client/src/todoOrder.ts` imports nothing (the shape `client/src/todoFilter.ts` has) and exports `orderTodos(ids, table, sort)`, returning a new array: pinned rows first (`table[id]?.pinned === true` — `pinned` has no schema default, so the read is `=== true`), and, only when `sort === 'due'`, within each pinned group the rows with a `due` before the rows without, dated rows ascending by the `YYYY-MM-DD` string, everything else left in the order `ids` gave it (`Array.prototype.sort` is stable). At BASE `client/src/TodoList.tsx` (75 lines) computes `ordered` with an inline pinned-first `sort` over `shown`; replace that with `orderTodos(shown, table, useValue('sort', STORE_ID))`, and mount `<SortBar />` directly after `<FilterBar />` — inside `TodoList`, because both `App` and `StaticPage` render `TodoList`, so the live page and the static render carry the bar by that one line. `client/src/SortBar.tsx` renders `<div id="sortBar" className="mb-4 flex gap-2">` holding one `Button` (`@/components/ui/button`) with `id="sort-due"`, `aria-label="Sort by due date"`, the same visible text, `variant` `default` when active and `outline` otherwise, `data-active` `'true'`/`'false'`, and `onClick` calling `setSort(store, active ? '' : 'due')`, where `active = useValue('sort', STORE_ID) === 'due'`; import `setSort` from `./storeData` and `STORE_ID`, `useStore`, `useValue`, `TodosStore` from `./Store` — `client/src/Store.tsx` must stay byte-identical to BASE, a run-wide check enforces it. **The button sits outside `#filterBar`**: `tests/state-exams/filter-bar.test.ts` and `filter-done.test.ts` pin `#filterBar button` at exactly 3 over untagged states. One exam on the tree pins the opposite of M2: `tests/state-exams/set-todo-tags.test.ts` lines 205–210, the test named `leg (b) [M2] a fresh store reads its values schema back as exactly {filter, tag}`, asserts the parsed `getValuesSchemaJson()` `toEqual` exactly `{filter: {type: 'string'}, tag: {type: 'string'}}`, which the `sort` value turns red (measured on a prototype at BASE, 2026-09-21: that one test is the only test on the tree green at BASE that this task turns red). It is in your Files: loosen it to what it meant — the parsed schema's `tag` entry `toEqual` `{type: 'string'}` — the way `tests/state-exams/set-filter.test.ts` lines 132–143 already loosened its own `filter` pin, and never re-pin it to a new three-entry literal, which a later task would break again. Measured on the prototype with exactly this shape: `bun run typecheck` and `bun run lint:ui` clean, `lint:state: 0 findings over 29 snapshots and 31 exams` (the linter reaches the expected file from the new seed in one `setSort` move, its pool carrying `due` from the expected file's own values), and the literals of M2, M3 and M4 are what the prototype printed. The two snapshot files are one line of JSON each like their siblings, tables first — the seed `[{"todos": {"0": {"text": "buy milk", "completed": false, "due": "2026-03-01"}, "1": {"text": "walk the dog", "completed": false}, "2": {"text": "call mum", "completed": false, "due": "2026-02-01"}}}, {}]` and the expected file those same tables beside `{"sort": "due"}`. **For the examiner:** the exam is `tests/state-exams/sort-by-due.test.ts`; its imports are `import {expect, test} from 'bun:test'`, `import {assertView, stateExam} from 'tinyapp-exam'`, `import {renderStatic} from '../../client/src/StaticPage'` and `import * as sd from '../../client/src/storeData'` — a namespace import, because a named import of `setSort` is a load error at BASE and one load error reds the whole file instead of the leg; `client/src/todoOrder.ts` does not exist at BASE, so reach it inside the test body with a computed specifier, `await import(join(import.meta.dir, '..', '..', 'client/src/todoOrder.ts'))`. A file's whole state exam is the single top-level `stateExam({…})` in it; every other leg is an ordinary `bun:test` block beside it. `sd.createTodosStore(content)` seeds a store; snapshot a store as `JSON.parse(JSON.stringify(store.getContent()))` before `toEqual`. `assertView(html, views)` returns `[]` when every view holds. Every fixture read and every render happens inside a test body, never at module level — the state linter imports this file with `stateExam` and `bun:test` stubbed out. `view` is a closed vocabulary — `{selector, count?, text?, attr?: {name, value}, checked?, unchecked?, absent?: true}`, `text` a contains-match — and `mutant` is a list of `{table, row, cell, value}`, `{table, row, cell, absent: true}` or `{table, row, absent: true}` entries; a mutant edits tables only, never values, so the mutant of leg (a) drops row `2`'s `due` — a state the click, which moves only the values half, does not reach. An `action` is a store callback, or one of `{click: target}`, `{type: [target, text]}`, `{key: [target, key]}` — a target is a CSS selector string or `{role, name}`. The exam never spawns a runner: no `bun test`, `bun run`, `Bun.spawn`, `spawnSync` or `execSync`, not even in a comment that is not a `//` or `*` line.

**Proof:**
- Test: `tests/state-exams/sort-by-due.test.ts`
- Guard: `tests/state-exams/sort-by-due.test.ts`
- Run: bun test tests/state-exams/set-todo-tags.test.ts
- Legs: (a) [M1] the one `stateExam` of the file, exactly:

```ts
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/three-todos-mixed-due.json',
  store: () => sd.createTodosStore(),
  action: {click: {role: 'button', name: 'Sort by due date'}},
  expected: 'state-exams/expected/three-todos-mixed-due-sorted.json',
  view: [
    {selector: '#todoList li', count: 3},
    {selector: '#todoList li:nth-child(1)', count: 1, text: 'call mum'},
    {selector: '#todoList li:nth-child(2)', count: 1, text: 'buy milk'},
    {selector: '#todoList li:nth-child(3)', count: 1, text: 'walk the dog'},
    {selector: '#sort-due', count: 1, attr: {name: 'data-active', value: 'true'}},
  ],
  mutant: [{table: 'todos', row: '2', cell: 'due', absent: true}],
});
```

  and a `bun:test` block in which the parsed seed file is `toEqual` the M1 seed literal and the parsed expected file is `toEqual` the seed's tables beside `{sort: 'due'}`, both written out in the test; (b) [M2] on a store seeded with the M1 seed literal, after `sd.setSort(store, 'due')` `getContent()[1]` is `toEqual` `{sort: 'due'}`, after `sd.setSort(store, 'bogus')` it is still `toEqual` `{sort: 'due'}`, after `sd.setSort(store, '')` the snapshot is `toEqual` the seed literal; and `sd.VALUES_SCHEMA.sort` is `toEqual` `{type: 'string'}` with `Object.hasOwn` of `default` `false`; (c) [M3] `orderTodos(['a', 'b', 'c', 'd'], <the M3 table>, 'due')` is `toEqual` `['d', 'c', 'a', 'b']` and with `undefined` is `toEqual` `['d', 'a', 'b', 'c']`; (d) [M4] over `renderStatic(<M1 seed literal>)`: `assertView` with `[{selector: '#sort-due', count: 1, attr: {name: 'data-active', value: 'false'}}, {selector: '#filterBar button', count: 3}]` is `[]`, and `indexOf('buy milk')` is `>= 0` and less than `indexOf('walk the dog')`, which is less than `indexOf('call mum')`; (e) [M5] the `Run:` line — the loosened tags exam exits 0 over this tree.

**Stale-if:**
- path-exists: `client/src/todoOrder.ts`
- path-exists: `state-exams/seeds/three-todos-mixed-due.json`
