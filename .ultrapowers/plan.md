# The convergence exam on celld — two pages through a real module object agree, the object's rows equal the expected state, a third page converges, and every transition is on the record

**Grammar:** claims-v1

**Claim:** do: run the fixture's convergence exam on the fleet; see: two pages through a real module object on celld agree, the object's own rows equal the expected state, a third fresh page converges to the same state, every transition of the session is on the evidence, and the exam's mutant is killed — with the runtime started and stopped by the helper, never by hand. (elicited)
**Summary:** This plan gives the fixture its first exam of the synced app itself: two real pages in the sandbox's Chromium, syncing through a module object on celld, judged against the expected state three ways. It exists because until now no exam read the Durable Object's rows or said that two clients agree, and because the runtime, the fork and the recorder were proved by hand on the laptop last night but nothing on the fleet can use them yet. After it, a TinyApp plan can name a convergence exam the way it names a state exam, the helper owns the runtime's start and stop, and the record of a run carries the walls that decide celld's GO or NO on the fleet.

**Goal:** popmechanic/ultrapowers#996's exam, on celld, as the fixture's own: `tinyapp-exam` gains `startCelld`/`examSurface` (the runtime helper and the root's exam-mode verbs), the client honours a `window.__TINYAPP_SYNC__` origin so a page under exam dials the exam's own runtime, `tinyapp-exam` gains the `convergenceExam` species (two pages, three-way equality, the transitions of the session as evidence), and the fixture registers one such exam under `tests/state-exams/`. Step 2's fleet half of #1094's sequence; its first run is #996's reading and the celld GO/NO. The greenfield rule's `--internal-listen` start-line correction (popmechanic/ultrapowers#1094) is that repository's, not this plan's.

**Tech Stack:** Bun 1.4 + TypeScript 6 + TinyBase 9.7 (the fixture as it stands on `facets-on-celld`: a root Durable Object `AppRoot` and a module object `Facet` per store in `server/`, Vite 8 + React 19 on the client, the `tinyapp-exam` and `tinyapp-history` workspace packages); celld 0.5.0 as the Workers runtime (`/usr/local/bin/celld` on the sandbox since popmechanic/ultrapowers#1099; `CELLD_BIN` or `PATH` on a laptop); the sandbox's Chromium at `/headless-shell/headless-shell` over loopback CDP (`TINYAPP_BROWSER` on a laptop).
**Exam command:** bun test {paths}

**Spec:** `docs/superpowers/specs/2026-09-16-root-and-facets-on-celld.md` on the laptop (§3.2 the exam surface, §3.3 the recorder as measured, §3.4 the exams, §3.6 the sandbox); popmechanic/ultrapowers#996 and #1094. The sandbox has no spec — every fact a worker needs is in its task's Context.
**Target:** popmechanic/tinyapp-fixture at `7be55c13db331973f1d1b79936b9f03c6ac4360f` (main after PR #34, run-34's tasks 1 and 3: the runtime helper, the exam surface and the `convergenceExam` species; after #32, #31, #30 and #29)

**Parallelization rationale:** one task, no width. Run-34 merged this plan's other three — its tasks 1 and 3 as PR #34, run-33's task 2 as PR #32 — and parked this one on a plan defect its worker verified against the run's own `dom.html`. The numbering is run-33's, kept so the four runs line up.

## Global Constraints

- Check: bun run typecheck
- Check: bun run lint:state
- Check: git diff --quiet $ULTRA_BASE -- package.json client/package.json server/package.json packages/tinyapp-exam/package.json packages/tinyapp-history/package.json bun.lock
- Check: git diff --quiet $ULTRA_BASE -- server/index.ts server/facets server/wrangler.jsonc packages/tinyapp-history/src
- No manifest moves: no task adds a package; DoltLite stays in `tinyapp-history` and never enters `tinyapp-exam` or the app; the exam records the session's transitions as JSON and leaves the DoltLite commit to the history package.
- The server is not edited: the root's exam surface (`content`, `rows`, `fork`, `reload`, `discard`, `events`, `transition`), the module object and the recorder are exactly as at BASE; a task that needs a different verb has found a plan defect and says so.
- No exam dials anything but loopback: every request a page makes is to the exam's own page origin or the exam's own celld origin, both on 127.0.0.1, and a request anywhere else is failed in the browser before it leaves the machine, as at BASE.
- A page without the handle is the page at BASE: no seed, no exam flag and no `__TINYAPP_SYNC__` means the client dials `SERVER` exactly as before and exposes nothing on `window`.
- Every runtime an exam starts is stopped by the exam: SIGTERM to the supervisor, a wait for its exit and for the port to clear, the temp copy removed — never a hard kill, never a port left held.
- Findings are about the result — what the tree, the exams and their evidence now do — never about the order the work was done in, the number of commits, or whether a test was written before its code.

### Task 4: The fixture's convergence exam, registered — two pages add a todo and agree, the module's rows say so, a third page converges

**Type:** implementation
**Review:** peer

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Test: `tests/state-exams/two-pages-converge.test.ts`

**Claim:** do: type buy milk into one page of the app and press Enter while a second page is open on the same module; see: the second page shows it, the module object's own rows hold it, a third page opened afterwards shows it too, and an expected state that says otherwise fails the exam. (derived)
Machine: M1. `tests/state-exams/two-pages-converge.test.ts` registers, through `convergenceExam`, one test named `convergence exam: two-pages-converge` with `server: 'server'`, `entry: 'client/index.html'`, `module: 'todos'`, the action `[{ type: [{ role: 'textbox', name: 'New todo' }, 'buy milk'] }, { key: [{ role: 'textbox', name: 'New todo' }, 'Enter'] }]`, `expected: 'state-exams/expected/default-todos-plus-buy-milk.json'`, the view `{ selector: '#todoList li', count: 3 }` and `{ selector: '#todo-0', attr: { name: 'aria-label', value: 'buy milk' } }`, and the mutant `[{ table: 'todos', row: '0', cell: 'completed', value: true }]`; and that view is the one `#todo-0` can satisfy, because `client/src/TodoItem.tsx` puts the row id and the accessible name on the same element — `render={<span id={todo-<rowId>} />}` with `aria-label={todo.text}` beside it — so `#todo-0` is the checkbox span, whose `textContent` is empty and whose name is the todo's words. M2. The expected state is the file already on the tree, `state-exams/expected/default-todos-plus-buy-milk.json`, which parses to `[{"todos":{"0":{"text":"buy milk","completed":false},"1":{"text":"Learn TinyBase","completed":false},"2":{"text":"Build an app","completed":false}}},{}]` — the persistence exam's expected state, reached from `state-exams/seeds/default-todos.json` (rows `1` `Learn TinyBase` and `2` `Build an app`) by `addTodo` — and no file under `state-exams/` is created or changed; `bun run lint:state` exits 0. M3. The exam is green under `bun test tests/state-exams/two-pages-converge.test.ts` on a machine with celld and a browser, and its evidence directory carries `walls.json` with `sync_ms` and `converge_ms` and `transitions.json` with at least two entries. M4. `README.md`'s `## State exams` section says a convergence exam starts celld itself and names `CELLD_BIN` beside `TINYAPP_BROWSER` as the two things a laptop provides, in one paragraph; `AGENTS.md`'s `## Verification` section names the convergence exam as the way the two-client sync is checked, and its sentence beginning `Open the same room URL in two clients` — present at BASE — is gone.

**Authorized-by:** popmechanic/ultrapowers#996 (the convergence exam, registered on the fixture); popmechanic/ultrapowers#1094 (decision 6, the first move)

**Interfaces:**
- Consumes: `convergenceExam(spec) -> void`
- Consumes: `syncUrl(module: string) -> string` (at BASE since PR #32)
- Produces: nothing

**Context:** The registered exam is the fixture's own species instance, the way `tests/state-exams/persistence-exam.test.ts` registers the persistence species: one top-level `convergenceExam({...})` and nothing else at module level (the lint capture child imports the file for its spec alone). The app's unseeded page starts from the default content — rows `1` `Learn TinyBase` and `2` `Build an app` — and `addTodo` gives the new row id `0` (`tests/state-exams/added-todo-survives-reload.test.ts` at BASE pins both, `DEFAULT_TODOS` and `PLUS_BUY_MILK`; the expected file of M2 is that exam's own `default-todos-plus-buy-milk.json`, already on the tree, so this task creates no snapshot). The action is `tests/state-exams/enter-submits-todo.test.ts`'s, by role and name: the textbox is named `New todo`. Page B's view: `#todoList li` counts three, and `#todo-0` carries `buy milk` as its **accessible name**, not as text — `client/src/TodoItem.tsx` renders the Checkbox with `render={<span id={`todo-${rowId}`} />}` and `aria-label={todo.text}`, so `#todo-0` is the checkbox span, its `textContent` is empty, and the words live in a sibling span. `assertView`'s `text` is `textContent.includes(...)`, so a `text` assertion on `#todo-0` cannot pass for any implementation; the `attr` form above is the one that reads what that element carries. Run-34's task 4 was parked on exactly that defect and verified it against the run's `dom.html` (2026-09-17). Ids ascend by row id — `TodoList` renders them so. The page dials the runtime through the `window.__TINYAPP_SYNC__` handle, which is at BASE since PR #32 and which the species sets: nothing in this file names the handle. A machine without celld or without a browser fails this exam rather than skipping it, which is the rule every state exam follows. `bun run lint:state` at BASE checks every expected file under `state-exams/expected/` for invariants, referential integrity and reachability from a seed; the new file is reachable from `default-todos.json` by one `addTodo`. README's `## State exams` section at BASE explains `TINYAPP_BROWSER`; add the celld sentence there. AGENTS.md's `## Verification` at BASE carries the sentence `Open the same room URL in two clients, change data in one, and confirm the other` `updates.`; that sentence becomes the convergence exam.

**Proof:**
- Test: `tests/state-exams/two-pages-converge.test.ts`
- Guard: `tests/state-exams/two-pages-converge.test.ts`
- Legs: (a) the registration above, read back in-process: the test's name is `convergence exam: two-pages-converge` (`examStem(Bun.main)`), and the spec literal names the server, entry, module, the two actions, the expected path, the two views and the mutant of M1 — the second view asserting `#todo-0`'s `aria-label`, never its text; and the first `Run:` line below, which reads `client/src/TodoItem.tsx` from the line carrying the row id to the first line that closes a tag — `/^ *\/>/`, which at BASE is the `<Checkbox>`'s own closer six spaces in, four lines below — and finds `aria-label={todo.text}` inside that one element's window; measured against markup with the label moved onto the sibling span, the window closes first and the grep fails, which is the shape it has to have, is what pins M1's premise that `#todo-0` carries the todo's words as its name — it fails on any markup that moves the id or the label off that element [M1]; (b) `state-exams/expected/default-todos-plus-buy-milk.json` parses to exactly M2's snapshot, its rows `1` and `2` equal the seed's rows `1` and `2` read from `state-exams/seeds/default-todos.json`, and the second, third and fourth `Run:` lines below exit 0 — the third is `git diff --quiet $ULTRA_BASE -- state-exams`, which fails if the task touched a snapshot [M2]; (c) the registered exam passes on the tree, and `runConvergenceExam` over the same spec, called in-process with `ULTRA_RUN_DIR` set to a temp dir for the call, resolves `ok: true`, and the evidence directory it wrote under that dir carries `walls.json` parsing with `sync_ms` and `converge_ms` numbers and `transitions.json` parsing to an array of at least `2` entries; the same spec with `expected` naming `state-exams/expected/one-open-todo.json` resolves `ok: false` with a failure beginning `convergence: ` [M3]; (d) the fifth and sixth `Run:` lines below [M4].
- Run: sed -n '/id={.todo-/,/^ *\/>/p' client/src/TodoItem.tsx | tr '\n' ' ' | grep -q 'aria-label={todo.text}'
- Run: bun run lint:state
- Run: grep -q 'Learn TinyBase' state-exams/seeds/default-todos.json
- Run: git diff --quiet $ULTRA_BASE -- state-exams
- Run: sed -n '/^## State exams/,/^## /p' README.md | tr '\n' ' ' | grep -q 'convergence exam.*celld.*CELLD_BIN.*TINYAPP_BROWSER'
- Run: sed -n '/^## Verification/,$p' AGENTS.md | tr '\n' ' ' | grep -q 'convergence exam' && ! grep -q 'Open the same room URL in two clients' AGENTS.md

**Stale-if:**
- path-exists: `tests/state-exams/two-pages-converge.test.ts`
- path-absent: `state-exams/seeds/default-todos.json`
