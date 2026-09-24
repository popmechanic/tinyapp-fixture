# A search box narrows the todo list as you type

**Grammar:** claims-v1
**Claim:** do: launch this plan; see: after the run merges, the todo list has a search box: typing words shows only the todos whose text contains every word, in any case, clearing it shows all again, the count line keeps counting the whole list, and the choice is stored beside the filter so it syncs with it; the run's deploy and live check give the third deploy-window reading. (elicited)
**Summary:** The fixture's todo list can be filtered by status and by tag, but a reader who remembers a word of a todo still has to scan for it. This adds a search box that narrows the list as you type, matching every typed word anywhere in a todo's text regardless of case, with the choice kept in the store like the other filters. It is a real change to the app's store and page, so the deploy that follows is a fair third reading of whether a fresh deploy stalls on its first open.
**Goal:** `client/src/todoSearch.ts` is the one spelling of the matching rule (`searchWords`, `matchesSearch`, `searchOf`, importing nothing, the shape of `todoFilter.ts`); `client/src/storeData.ts` gains the `search` value (no default, `setSearch` writes it as typed and deletes it when the text is blank); `client/src/SearchBox.tsx` is the box, mounted by `client/src/TodoList.tsx`, which admits a row only when `matchesSearch` does; the plan carries the three publish lines for popmechanic/ultrapowers #835's deploy-window reading, deploy 3 of 3 (runs 43 and 44 on this repository, tags `ultra/evidence/run-43` and `ultra/evidence/run-44`).
**Tech Stack:** Bun 1.4 + TypeScript + TinyBase 9.7 + React 19; the deploy is the server's `wrangler deploy` (the page is not published); `celld` is not needed by any probe of this plan.
**Bootstrap:** bun install --frozen-lockfile
**Publish:** bun install --frozen-lockfile && bun run --cwd server deploy
**Verify:** bun server/probe/converge-live.ts $ULTRA_PUBLISH_URL
**Rollback:** cd server && bunx wrangler rollback --yes --message "fleet: the live check was red"
**Spec:** none on disk; the app's own filter and tag features (`client/src/todoFilter.ts`, `client/src/todoTags.ts`, `client/src/FilterBar.tsx`, merged on this repository's PRs #13 and #24) are the pattern this follows, and #835's pre-registration ("read `attempts` and the first-attempt wall on the next three fixture deploys") is why the plan publishes.
**Target:** popmechanic/tinyapp-fixture at `09ae7ddb65b6b6082091abbd9a2faf821e424900` (main after run-44).

## Global Constraints

- Check: bun run typecheck
- Check: bun run lint:ui
- Check: bun run lint:state
- Check: git diff --quiet $ULTRA_BASE -- server packages state-exams tests package.json bun.lock AGENTS.md README.md client/package.json client/index.html
- The matching rule lives in one module that imports nothing; the store's schema gains one value and one mutation and no default; every snapshot checked in under `state-exams/` still loads to itself, which is what `lint:state` reads.
- What the run measures: the third point of #835's deploy-window reading — `attempts` and every try's wall off `publish-verify.log` at the evidence tag; a rollback, if any, lands on run-44's deploy.

### Task 1: The matching rule — every typed word, anywhere in the text, any case

**Type:** implementation
**Review:** lean

**Files:**
- Create: `client/src/todoSearch.ts`

**Claim:** do: hand the rule a todo's text and what was typed; see: it admits the todo exactly when every typed word appears somewhere in the text regardless of letter case, admits every todo when nothing but spaces was typed, and admits no todo that has no text when a word was typed. (derived)
Machine: M1. `searchWords('  Buy   MILK ')` returns exactly `['buy', 'milk']`; `searchWords('')` and `searchWords('   ')` both return an empty array.
M2. `matchesSearch('Buy milk', 'milk BUY')` is `true`; `matchesSearch('Buy milk', 'bread')` is `false`; `matchesSearch(undefined, 'x')` is `false`; `matchesSearch('anything', '')` and `matchesSearch('anything', '   ')` are both `true`; `searchOf('milk')` is `'milk'` and `searchOf(undefined)` and `searchOf(3)` are both `''`.
M3. The file `client/src/todoSearch.ts` exists and carries no `import` line: it imports nothing, so the store and the rule stay apart.

**Authorized-by:** https://github.com/popmechanic/ultrapowers/issues/835 (the third pre-registered fixture deploy); the plan-level Claim above.

**Interfaces:**
- Consumes: nothing
- Produces: `searchWords(query: string): string[]`
- Produces: `matchesSearch(text: string | undefined, query: string): boolean`
- Produces: `searchOf(value: unknown): string`

**Context:** The module has the shape of `client/src/todoFilter.ts` at BASE (a header comment, exported pure functions, no imports). `searchWords(query)` is `query.toLowerCase().split(/\s+/)` with the empty pieces dropped, in the order typed. `matchesSearch(text, query)` is `searchWords(query).every((w) => (text ?? '').toLowerCase().includes(w))` — an empty word list admits everything, and a row with no `text` cell (`undefined`) is read as `''`, so it is admitted only by an empty query. `searchOf(value)` reads the store's `search` value the way `filterOf` reads `filter`: a string is returned as is, anything else (an absent value, a number) is `''`, which is no search. The typed text is never trimmed by this module — trimming is the store's business in `setSearch` — so `matchesSearch('x', ' ')` is `true` because `searchWords(' ')` is empty. Under Bun, `await import('./client/src/todoSearch.ts')` from the repository root is how the probes reach it (measured at BASE with `./client/src/todoFilter.ts`, 2026-09-24).

**Proof:**
- Run: bun -e "const m = await import('./client/src/todoSearch.ts'); const ok = (c, l) => { if (!c) { console.log('red', l); process.exit(1); } }; ok(JSON.stringify(m.searchWords('  Buy   MILK ')) === JSON.stringify(['buy', 'milk']), 'a'); ok(Array.isArray(m.searchWords('')) && m.searchWords('').length === 0, 'b'); ok(m.searchWords('   ').length === 0, 'c')" [M1]
- Run: bun -e "const m = await import('./client/src/todoSearch.ts'); const ok = (c, l) => { if (!c) { console.log('red', l); process.exit(1); } }; ok(m.matchesSearch('Buy milk', 'milk BUY') === true, 'a'); ok(m.matchesSearch('Buy milk', 'bread') === false, 'b'); ok(m.matchesSearch(undefined, 'x') === false, 'c'); ok(m.matchesSearch('anything', '') === true && m.matchesSearch('anything', '   ') === true, 'd'); ok(m.searchOf('milk') === 'milk' && m.searchOf(undefined) === '' && m.searchOf(3) === '', 'e')" [M2]
- Run: test -f client/src/todoSearch.ts && ! grep -q '^import' client/src/todoSearch.ts [M3]
- Legs: (a) `searchWords` lower-cases and splits on runs of spaces, dropping empties, and a blank or empty query yields no words [M1]; (b) `matchesSearch` admits when every word is a case-insensitive substring, refuses a missing word, refuses a row with no text against a real word, admits anything against a blank query, and `searchOf` reads a non-string value as no search [M2]; (c) the module exists and has no import line [M3].

**Stale-if:**
- path-exists: `client/src/todoSearch.ts`

### Task 2: The store keeps what was typed, beside the filter, and no default

**Type:** implementation
**Review:** lean

**Files:**
- Modify: `client/src/storeData.ts`

**Claim:** do: type into the search box; see: what was typed is kept in the store beside the status filter and the tag filter, so it syncs with them; blank text takes the value away instead of storing spaces, and a store nobody has searched carries no such value at all. (derived)
Machine: M1. On a fresh `createTodosStore()`, `setSearch(store, '')` leaves `getContent()` byte-identical; `setSearch(store, 'buy m')` makes `getValue('search')` equal `'buy m'`; then `setSearch(store, '   ')` makes `hasValue('search')` `false` and `getContent()` byte-identical to the fresh store's again.
M2. `VALUES_SCHEMA.search` is exactly `{type: 'string'}` — no `default`.
M3. `createTodosStore().getValues()` is `{}`: the new value materialises nothing into a store nobody has searched.

**Authorized-by:** https://github.com/popmechanic/ultrapowers/issues/835; the plan-level Claim above.

**Interfaces:**
- Consumes: nothing
- Produces: `setSearch(store: TodosStore, query: string): void`

**Context:** `client/src/storeData.ts` at BASE (about 430 lines): `VALUES_SCHEMA` holds `filter`, `tag` and `sort`, each `{type: 'string'}` with no default and a comment saying why (a default would materialise into every snapshot checked in under `state-exams/`; an absent value is how the app says the neutral choice). This task appends `search: {type: 'string'}` to `VALUES_SCHEMA` with the same reason in its comment, and adds one exported mutation beside `setSort`: `setSearch(store, query)` deletes the value (`store.delValue('search')`) when `query.trim() === ''` and otherwise writes `store.setValue('search', query)` — the text *as typed*, untrimmed, because the box is bound to this value and a trailing space on the way to the next word must survive the round trip; the matching rule (`client/src/todoSearch.ts`, a sibling task) ignores blank space itself. `TodosStore` is `MergeableStore<Schemas>` from `tinybase/with-schemas`, so `setValue('search', …)` typechecks only once the schema names the value. `INVARIANTS` and `TABLES_SCHEMA` are untouched: the value is a choice, not a cell of a row. Nothing here changes `client/src/Store.tsx`'s re-export list; the box imports the mutation from `./storeData` directly, as `client/src/TagsInput.tsx` imports `setTodoTags`. Measured at BASE (2026-09-24): `createTodosStore().getValues()` is `{}`; `setSort(store, 'due')` then `setSort(store, '')` returns it to `{}`; the probes reach the module with `await import('./client/src/storeData.ts')` under Bun from the repository root.

**Proof:**
- Run: bun -e "const m = await import('./client/src/storeData.ts'); const ok = (c, l) => { if (!c) { console.log('red', l); process.exit(1); } }; const s = m.createTodosStore(); const before = JSON.stringify(s.getContent()); m.setSearch(s, ''); ok(JSON.stringify(s.getContent()) === before, 'a'); m.setSearch(s, 'buy m'); ok(s.getValue('search') === 'buy m', 'b'); m.setSearch(s, '   '); ok(s.hasValue('search') === false, 'c'); ok(JSON.stringify(s.getContent()) === before, 'd')" [M1]
- Run: bun -e "const m = await import('./client/src/storeData.ts'); if (JSON.stringify(m.VALUES_SCHEMA.search) !== JSON.stringify({type: 'string'})) { console.log('red', JSON.stringify(m.VALUES_SCHEMA.search)); process.exit(1); }" [M2]
- Run: bun -e "const m = await import('./client/src/storeData.ts'); const v = m.createTodosStore().getValues(); if (JSON.stringify(v) !== '{}') { console.log('red', JSON.stringify(v)); process.exit(1); }" [M3]
- Legs: (a) a blank write is a no-op on a fresh store, a real write is read back as typed, and a blank write afterwards deletes the value and restores the fresh content [M1]; (b) the schema entry is exactly a string with no default [M2]; (c) a fresh store's values are empty [M3].

**Stale-if:**
- path-absent: `client/src/storeData.ts`

### Task 3: The box on the page, and the list that follows it

**Type:** implementation
**Review:** lean

**Files:**
- Create: `client/src/SearchBox.tsx`
- Modify: `client/src/TodoList.tsx`

**Claim:** do: type a word into the search box above the list; see: only the todos whose text contains what you typed stay in the list, an empty search shows every todo, a search nothing matches shows the empty-list line, and the count line in the top bar goes on counting the whole list. (derived)
Machine: M1. Rendering `TodoList` to static markup inside a TinyBase `Provider` over a store holding todos `Buy milk` (open) and `Walk dog` (done) after `setSearch(store, ' MILK')`: the markup contains `Buy milk`, does not contain `Walk dog`, contains an element with `id="searchBox"` and `aria-label="Search todos"`, and that element's `value` attribute is ` MILK`.
M2. The same render with no `search` value contains both `Buy milk` and `Walk dog`; after `setSearch(store, 'zzz')` it contains no `<li` and contains `id="todoListEmpty"`.
M3. Rendering `DoneCount` over the store from M1, search set to ` MILK`, yields markup containing `1 of 2 done`: the count reads the whole table, not the shown rows.
M4. `client/src/TodoList.tsx` imports from `./todoSearch` and renders `SearchBox`; `client/src/SearchBox.tsx` imports `setSearch` from `./storeData`.

**Authorized-by:** https://github.com/popmechanic/ultrapowers/issues/835; the plan-level Claim above.

**Interfaces:**
- Consumes: `matchesSearch(text: string | undefined, query: string): boolean`
- Consumes: `searchOf(value: unknown): string`
- Consumes: `setSearch(store: TodosStore, query: string): void`
- Produces: `SearchBox()` (React component, `client/src/SearchBox.tsx`)

**Context:** Two sibling tasks provide what this one uses, and their shapes are these literals: `client/src/todoSearch.ts` exports `matchesSearch(text: string | undefined, query: string): boolean` (every lower-cased word of `query` is a substring of the lower-cased `text`; a blank query admits everything) and `searchOf(value: unknown): string` (a string as is, anything else `''`); `client/src/storeData.ts` exports `setSearch(store: TodosStore, query: string): void` and its `VALUES_SCHEMA` carries `search: {type: 'string'}` with no default. `client/src/TodoList.tsx` at BASE mounts `<FilterBar />` then `<SortBar />` above `#todoList`, computes `shown` as the ids admitted by `admits(filter, …)` and `hasTag(…)`, and renders `<p id="todoListEmpty">` when `ordered` is empty. This task adds `&& matchesSearch(table[id]?.text, searchOf(useValue('search', STORE_ID)))` to `shown` (read the value once, outside the filter callback — hooks are not called inside loops) and mounts `<SearchBox />` after `<SortBar />`; the count line is `client/src/DoneCount.tsx`, which reads `useTable('todos', STORE_ID)` and is not touched. `SearchBox.tsx` follows `client/src/TodoInput.tsx`'s shape: `Input` from `@/components/ui/input`, `useStore`, `useValue`, `STORE_ID` and `type TodosStore` from `./Store`, `setSearch` from `./storeData` (the store module does not re-export it, exactly as `TagsInput.tsx` reaches `setTodoTags`); it renders one controlled `<Input type="search" id="searchBox" aria-label="Search todos" placeholder="Search todos" value={searchOf(useValue('search', STORE_ID))} onChange={(e) => store && setSearch(store, e.target.value)} className="mb-4 w-full" />` and nothing else — no form, no button, no local state, because every keystroke is a store write and the box reads back what the store holds. Measured at BASE (2026-09-24): from the repository root under Bun, `await import('./client/src/TodoList.tsx')` resolves (the `@/` alias included), and `renderToStaticMarkup(React.createElement(Provider, {storesById: {todos: store}}, React.createElement(TodoList)))` over `createTodosStore([{todos: {…}}, {filter: 'done'}])` rendered 11,812 bytes containing only the done todo — so a static render is how the probes read the page, with `react-dom/server`, `react` and `tinybase/ui-react` imported by their package names. `lint:ui` (`eslint client/src` with the shadcn rules) is a run-wide `Check:`, so the box's classes are layout only (`mb-4 w-full`) and it restyles nothing.

**Proof:**
- Run: bun -e "const {renderToStaticMarkup} = await import('react-dom/server'); const React = await import('react'); const {Provider} = await import('tinybase/ui-react'); const sd = await import('./client/src/storeData.ts'); const {TodoList} = await import('./client/src/TodoList.tsx'); const ok = (c, l) => { if (!c) { console.log('red', l); process.exit(1); } }; const store = sd.createTodosStore([{todos: {'1': {text: 'Buy milk', completed: false}, '2': {text: 'Walk dog', completed: true}}}, {}]); sd.setSearch(store, ' MILK'); const html = renderToStaticMarkup(React.createElement(Provider, {storesById: {todos: store}}, React.createElement(TodoList))); ok(html.includes('Buy milk'), 'a'); ok(!html.includes('Walk dog'), 'b'); ok(html.includes('id=\"searchBox\"') && html.includes('aria-label=\"Search todos\"'), 'c'); ok(html.includes('value=\" MILK\"'), 'd')" [M1]
- Run: bun -e "const {renderToStaticMarkup} = await import('react-dom/server'); const React = await import('react'); const {Provider} = await import('tinybase/ui-react'); const sd = await import('./client/src/storeData.ts'); const {TodoList} = await import('./client/src/TodoList.tsx'); const ok = (c, l) => { if (!c) { console.log('red', l); process.exit(1); } }; const store = sd.createTodosStore([{todos: {'1': {text: 'Buy milk', completed: false}, '2': {text: 'Walk dog', completed: true}}}, {}]); const render = () => renderToStaticMarkup(React.createElement(Provider, {storesById: {todos: store}}, React.createElement(TodoList))); let html = render(); ok(html.includes('Buy milk') && html.includes('Walk dog'), 'a'); sd.setSearch(store, 'zzz'); html = render(); ok(!html.includes('<li'), 'b'); ok(html.includes('id=\"todoListEmpty\"'), 'c')" [M2]
- Run: bun -e "const {renderToStaticMarkup} = await import('react-dom/server'); const React = await import('react'); const {Provider} = await import('tinybase/ui-react'); const sd = await import('./client/src/storeData.ts'); const {DoneCount} = await import('./client/src/DoneCount.tsx'); const store = sd.createTodosStore([{todos: {'1': {text: 'Buy milk', completed: false}, '2': {text: 'Walk dog', completed: true}}}, {}]); sd.setSearch(store, ' MILK'); const html = renderToStaticMarkup(React.createElement(Provider, {storesById: {todos: store}}, React.createElement(DoneCount))); if (!html.includes('1 of 2 done')) { console.log('red', html); process.exit(1); }" [M3]
- Run: grep -q "from './todoSearch'" client/src/TodoList.tsx && grep -q 'SearchBox' client/src/TodoList.tsx && grep -q "from './storeData'" client/src/SearchBox.tsx && grep -q 'setSearch' client/src/SearchBox.tsx [M4]
- Legs: (a) with ` MILK` searched, the static list carries the matching todo, not the other, the box with its id and accessible name, and the typed text as its value [M1]; (b) with nothing searched both todos render, and a search nothing matches renders no list item and the empty line [M2]; (c) the count line over the same searched store still reads the whole table [M3]; (d) the list imports the rule and mounts the box, and the box imports the mutation [M4].

**Stale-if:**
- path-exists: `client/src/SearchBox.tsx`
