# The linted design system — Tailwind v4 + shadcn/ui on the fixture, exams by role and name, `lint:ui` as the sensor

**Grammar:** claims-v1

**Claim:** After this run the fixture is styled through one design system the linter can read, every exam finds its control by role and name, and a class outside the system is a red check that names the fix. (elicited)
**Summary:** This puts the fixture's whole look onto one design system — Tailwind v4 with shadcn/ui installed by its own tool — and adds a linter that reads every class in the app against that system and says, for each one outside it, what to write instead. It is an experiment: it buys a check nothing in the fleet had, presentation judged by a machine instead of by a reviewer's prose, and pays with one more fixed choice on every TinyApp's stack; its rollback is the ten hand-written stylesheets as they stand at `062aebf6`, and `(minor)` on the Check line if the check is kept but stops blocking. What is read is drift at the first check and whether one fix round corrects it, per task, over the next five fixture runs after this one merges — kept if the check keeps catching and correcting, retired if it catches nothing.

**Goal:** popmechanic/tinyapp-fixture styled through Tailwind v4 + shadcn/ui (button, input, checkbox, badge, installed by `bunx --bun shadcn@latest`), its ten hand-written CSS files deleted and every rule they carried re-expressed as Tailwind utilities on a plain element or a variant of the component that owns it; a root `lint:ui` script running ESLint with `@shadcn/lint`'s six rules over `client/src`, `components/ui/**` excluded, exit 0 on the tree; the `tinyapp-exam` contract extended with a role-and-name locator for every interaction, resolved through the browser's accessibility tree, and every interaction exam on the fixture migrated to it, every view moved off the app's own classes onto ids, tags, `data-*` and shadcn's `data-slot`. Authorized by popmechanic/ultrapowers#998 (the map: presentation is the one surface no sensor reads) and the signed spec `docs/superpowers/specs/2026-09-16-linted-design-system-experiment.md` (on the laptop, five sections signed 2026-09-16, §7 the plan shape). Nothing of the store changes: `client/src/storeData.ts` is byte-identical to BASE and no seed or expected file moves.

**Tech Stack:** Bun 1.4 + TypeScript 6 + TinyBase 9.7 (the fixture as it stands; Vite 8 + React 19 on the client); Tailwind v4 (`tailwindcss` + `@tailwindcss/vite` 4.3.3) and shadcn/ui (`shadcn` CLI, style `base-nova`, `@base-ui/react` primitives); ESLint ≥ 9.30 (10.10.0 measured) + `@typescript-eslint/parser` 8.70 + `@shadcn/lint` 0.1.0 under Node 24; `bun-plugin-tailwind` 0.1.2 in the exam's `Bun.build`; the `tinyapp-exam` state exams under `tests/state-exams/` over raw CDP against `/headless-shell/headless-shell` (Chromium 151 on the fleet image); `bun run typecheck`, `bun run lint:state`, `bun test`.
**Exam command:** bun test {paths}

**Spec:** `docs/superpowers/specs/2026-09-16-linted-design-system-experiment.md` on the laptop (§1 the question, §2 the probe's measured facts, §3 the system, §4 the lint, §5 the exams, §6 the record and the reading, §7 this plan's shape, §8 the five picks); popmechanic/ultrapowers#998. The sandbox has no spec — everything a worker needs from it is in the Contexts below. The reading this plan sets up is read off the *next* five fixture runs (n = 5 runs, the test doctrine's floor), per task: `lint:ui` findings on the implementer's first `driver:check-run` (drift), and whether the task's one fix round reached exit 0 (correction); this run's own numbers are the baseline, not the reading.
**Target:** popmechanic/tinyapp-fixture at `eb28af4b5feb284797c389a10d381d835fc97d2d` (main after run-17)

**Parallelization rationale:** Two waves. Wave 1 is three wide — Task 1 installs the system (Tailwind on Vite, the tokens, the four components, the app still on its old CSS beside them), Task 2 teaches the exam package a role-and-name locator, an `aria-checked` reading and Tailwind in its bundle, Task 3 adds `lint:ui` with its own exam — three contracts over shared literals (the component paths, the `Locator` shape, the script name), none needing another's code. Wave 2 is Task 4 alone, the re-platform: it waits on all three for runtime behaviour, not shape — a token that renders in the page the exam bundles, a role the browser can resolve, a linter that runs and exits 0 — and no stub could stand in for any of the three. T = 4, width 3 at wave 1.

## Global Constraints

- Check: bun run typecheck
- Check: bun run lint:state
- Check: git diff --quiet $ULTRA_BASE -- client/src/storeData.ts server packages/tinyapp-history state-exams README.md
- The store is untouched: `client/src/storeData.ts` is byte-identical to BASE, no callback, cell, value or `default` is added, and no file under `state-exams/` is created, edited or deleted — every exam of this plan reaches a state that is already on the tree. A schema `default` anywhere is a finding.
- `bun run lint:ui` is this plan's deliverable, so it is not a `Check:` of this plan: at BASE the script does not exist, the driver runs every `Check:` in every wave-1 clone and on the wave-1 adopted tree, and a missing script is a red blocking check that would fail the wave before Task 4 could make it green. It runs instead as Task 4's `Run:` (paid once, in the wave-2 clone and again on the adopted tree). From the next fixture plan on, every plan carries `- Check: bun run lint:ui`, blocking; `(minor)` on that line is the experiment's rollback.
- In the system means: a colour is a declared token, a size is on the scale, a class is one Tailwind generates, a shadcn component is restyled only through its variants — the six `@shadcn/lint` rules are the definition and the linter's word is final. A class the linter flags, an inline `style=`, or a `<style>` element in `client/index.html` is a finding; `client/src/index.css` is the one stylesheet and the one place a colour is written.
- Every interactive element carries an accessible name (`aria-label` or visible text), every interaction in an exam names its control by role and name, and every view selector is an id, a tag, a `data-*` attribute or shadcn's `data-slot` — never one of the app's own classes. A control the accessibility tree cannot name is a red exam that says so.
- The linter's four test files under `packages/tinyapp-lint/test/` keep their count and list pins loosened only to containment and tree-computed counts, never re-pinned to a new exact literal (both folds of 2026-09-15); a selector or markup literal in them follows the markup, that is all.
- `bun.lock` is regenerated by `bun install`, never edited by hand; three wave-1 tasks add dependencies and their lockfile edits fold at the wave boundary, where `bun install --frozen-lockfile` (Task 1's `Run:` and `render-move.test.ts`'s own leg) reads the result.

### Task 1: shadcn/ui installed on the client — Tailwind v4 on Vite, the tokens, the four components

**Type:** implementation
**Review:** peer

**Files:**
- Create: `client/components.json`
- Create: `client/src/index.css`
- Create: `client/src/lib/utils.ts`
- Create: `client/src/components/ui/button.tsx`
- Create: `client/src/components/ui/input.tsx`
- Create: `client/src/components/ui/checkbox.tsx`
- Create: `client/src/components/ui/badge.tsx`
- Modify: `client/package.json`
- Modify: `bun.lock`
- Modify: `client/tsconfig.json`
- Modify: `client/vite.config.js`
- Modify: `client/src/index.tsx`
- Test: `tests/state-exams/design-system-installed.test.ts`

**Claim:** After this task the app looks and works as it did, and underneath it the design system is installed — the tokens are on every page and the four components are there to be used. (derived)
Machine: M1. `client/src/index.tsx` imports `./index.css` as its first statement; `client/src/index.css` begins with `@import "tailwindcss";` and carries an `@theme inline` block; and `bundleOf('client/index.html', <its text>)` from `tinyapp-exam` resolves with a `css` that contains each of the three texts `--color-primary:var(--primary)`, `--color-background` and `--radius-lg:var(--radius)`.
M2. `client/components.json` parses with `style` `"base-nova"`, `tailwind.css` `"src/index.css"` and `aliases.ui` `"@/components/ui"`; `client/tsconfig.json`'s `compilerOptions.paths` deep-equals `{"@/*": ["./src/*"]}` and `compilerOptions` has no `baseUrl` key; `client/vite.config.js` contains `@tailwindcss/vite`; and `client/package.json` lists `tailwindcss`, `@tailwindcss/vite`, `@base-ui/react`, `class-variance-authority`, `cn` and `lucide-react`, with `devDependencies["@types/node"]` still beginning `^26`.
M3. For each of the four components, imported from `client/src/components/ui/<name>.tsx` and rendered with `react-dom/server`'s `renderToStaticMarkup`: `<Button>Add</Button>` yields markup containing `data-slot="button"` and `Add`; `<Input placeholder="x" />` yields `data-slot="input"`; `<Checkbox aria-label="buy milk" />` yields `role="checkbox"` and `data-slot="checkbox"`; `<Badge>1</Badge>` yields `data-slot="badge"`.
M4. The app still works over the seeded page: the state exam adding `buy milk` to `state-exams/seeds/empty.json` through `addTodo` reaches `state-exams/expected/one-open-todo.json`, the page shows `#todoList` once with text containing `buy milk` and `#todo-0` unchecked, and the mutant setting row `0`'s `completed` to `true` is killed.
M5. `bun run typecheck` exits 0 and `bun install --frozen-lockfile` exits 0 on the tree.

**Authorized-by:** popmechanic/ultrapowers#998; spec `docs/superpowers/specs/2026-09-16-linted-design-system-experiment.md` §3 (the system) and §7 wave 1 (a); the operator's pick "shadcn/ui by CLI" (§8, 2026-09-16).

**Interfaces:**
- Consumes: none
- Produces: `Button`
- Produces: `Input`
- Produces: `Checkbox`
- Produces: `Badge`
- Produces: `client/src/index.css`

**Context:** Don't vendor the vendor: the system is written by shadcn's own CLI, never by hand. Measured 2026-09-16 on a scratch clone at `062aebf6` (Node 24.16, Bun 1.4.2), and the client is unchanged since: in `client/`, `bunx --bun shadcn@latest init -d --yes` writes `components.json` (style `base-nova`, css `src/index.css`, aliases `@/components/ui`), `src/lib/utils.ts` (`export { cn } from "cn"`), `src/components/ui/button.tsx` and a 130-line `src/index.css` whose first lines are `@import "tailwindcss"; @import "tw-animate-css"; @import "shadcn/tailwind.css"; @import "@fontsource-variable/geist";` followed by the `@theme inline` block and the `:root`/`.dark` token values; then `bunx --bun shadcn@latest add input checkbox badge` writes those three. Checkbox pulls `@base-ui/react`, not Radix; the four generated files import `cn` from the `cn` package directly (no `@/` alias inside them), so a test imports them by relative path with no alias resolution. Tailwind v4 is `tailwindcss` + `@tailwindcss/vite` and the one `@import "tailwindcss";` line; the Vite config gains `tailwindcss()` in `plugins` and `resolve.alias['@'] = path.resolve(import.meta.dirname, './src')` (the file is `vite.config.js`, JavaScript). The tsconfig alias is `paths: {"@/*": ["./src/*"]}` and **no `baseUrl`** — TypeScript 6 refuses `baseUrl` with TS5101. The CLI also rewrote `client/package.json`'s `@types/node` from `^26.4.1` to `^22.20.3` on the probe: put it back to `^26.4.1`. `client/src/index.tsx` gains `import './index.css';` — single quotes, the fixture's style — as its first line; `bun run typecheck` stayed green after the install on the probe. Nothing else changes this wave — not `client/index.html`, not a component, not a stylesheet: the ten `client/src/*.css` files and the app's classes stay exactly as they are, the linter is not on this wave, and the wave-1 folded suite must stay green with every class-selector exam untouched; Task 4 is the re-platform. The exam bundles the entry with `Bun.build` (`tinyapp-exam`'s `bundleOf`); measured on the probe with `index.css` imported, the bundle is 577,731 chars of JS and 162,042 of CSS, a `data:` page of ~986,000 chars under the 2,097,152 ceiling, and the CSS carries the theme block (`--color-primary:var(--primary);`, `--radius-lg:var(--radius);`) and Tailwind's preflight — Task 2 adds the plugin that also generates the utilities, so do not add one here. `bun.lock` is regenerated by `bun install` in `client/` (the workspace root's lockfile); Task 3 adds root devDependencies in this same wave, so the two lockfile edits meet at the fold — never hand-edit the lockfile. The four components' files are excluded from every lint rule later: they carry arbitrary values by design (8 of the probe's 15 baseline findings), so do not edit them to please a linter that is not yet on the tree.

**Proof:**
- Test: `tests/state-exams/design-system-installed.test.ts`
- Guard: `tests/state-exams/design-system-installed.test.ts`
- Run: bun run typecheck
- Run: bun install --frozen-lockfile
- Legs: (a) the source of `client/src/index.tsx` starts with `import './index.css';` and `client/src/index.css` starts with `@import "tailwindcss";` and contains `@theme inline` [M1]; (b) `bundleOf('client/index.html', readFileSync('client/index.html'))` resolves and its `css` contains each of `--color-primary:var(--primary)`, `--color-background` and `--radius-lg:var(--radius)` [M1]; (c) `client/components.json` parses to `style` `base-nova`, `tailwind.css` `src/index.css`, `aliases.ui` `@/components/ui` [M2]; (d) `client/tsconfig.json`'s `compilerOptions.paths` deep-equals `{"@/*": ["./src/*"]}` and `'baseUrl' in compilerOptions` is `false`; `client/vite.config.js` contains `@tailwindcss/vite`; `client/package.json` names the six packages and its `@types/node` starts with `^26` [M2]; (e) for each of `button`, `input`, `checkbox`, `badge` — one test per component — `renderToStaticMarkup` of the element as M3 spells it contains the `data-slot` text named there, `Add` for the button and `role="checkbox"` for the checkbox [M3]; (f) the state exam — clock `2026-01-01T00:00:00Z`, entry `client/index.html`, seed `state-exams/seeds/empty.json`, `store: () => createTodosStore()`, action `(store) => { addTodo(store, 'buy milk'); }`, expected `state-exams/expected/one-open-todo.json`, view `[{selector: '#todoList', count: 1, text: 'buy milk'}, {selector: '#todo-0', unchecked: true}]`, mutant `[{table: 'todos', row: '0', cell: 'completed', value: true}]` [M4]; (g) the two `Run:` lines exit 0 [M5].

**Stale-if:**
- path-exists: `client/components.json`

### Task 2: The exam finds a control by role and name — and reads a shadcn page

**Type:** implementation
**Review:** peer

**Files:**
- Modify: `packages/tinyapp-exam/src/types.ts`
- Modify: `packages/tinyapp-exam/src/browser.ts`
- Modify: `packages/tinyapp-exam/src/render-move.ts`
- Modify: `packages/tinyapp-exam/src/index.ts`
- Modify: `packages/tinyapp-exam/package.json`
- Modify: `bun.lock`
- Modify: `packages/tinyapp-lint/src/rules/views.ts`
- Test: `packages/tinyapp-exam/test/browser.test.ts`
- Test: `packages/tinyapp-exam/test/render-move.test.ts`
- Test: `packages/tinyapp-lint/test/views.test.ts`
- Test: `tests/state-exams/click-by-name-completes-todo.test.ts`

**Claim:** An exam can name what it clicks the way a person would — "the checkbox called buy milk" — and land on that control however the page is styled; and it can read a shadcn checkbox as checked. (derived)
Machine: M1. `packages/tinyapp-exam/src/types.ts` exports a `Locator` type admitting a string and `{role: string; name: string}`, and `Action` admits `{click: Locator}`, `{type: [Locator, string]}` and `{key: [Locator, string]}` — `actionsOf` returns `[{click: {role: 'checkbox', name: 'x'}}]` for that single action — and a string locator behaves exactly as at BASE.
M2. `page.act` with a `{role, name}` locator finds the control by its role and its *accessible name* as the browser computes it — a name no CSS selector can express — and acts on it as on a selector match, the first such node in tree order: on a page holding `<input type="checkbox" id="c0"><label for="c0">buy milk</label>`, `<input aria-label="New todo">` and `<span role="checkbox" aria-checked="false" aria-label="walk the dog" onclick="window.__hit='walk'"></span>`, `act({click: {role: 'checkbox', name: 'buy milk'}})` leaves `document.getElementById('c0').checked` `true`, `act({type: [{role: 'textbox', name: 'New todo'}, 'buy milk']})` leaves that input's `value` `buy milk`, and `act({click: {role: 'checkbox', name: 'walk the dog'}})` — the span, named only by `aria-label` — leaves `window.__hit` `walk`.
M3. A locator no node matches rejects with the message `act: no element matches role=checkbox name="Nope"` for `{role: 'checkbox', name: 'Nope'}`; a string locator matching nothing still rejects with `act: no element matches <selector>`.
M4. `assertView`'s `checked` holds of a match whose `data-checked` attribute is `"true"` or whose `aria-checked` attribute is `"true"`, and `unchecked` of one whose `data-checked` or `aria-checked` is `"false"` — still at least one match, every match reading so — and every `checked`/`unchecked` view that held over a `data-checked` DOM at BASE holds unchanged: over `<span role="checkbox" aria-checked="true" id="a"></span><span role="checkbox" aria-checked="false" id="b"></span>`, `{selector: '#a', checked: true}` and `{selector: '#b', unchecked: true}` hold and `{selector: '[role=checkbox]', checked: true}` fails with `a match is not checked`.
M5. The linter's `views` rule reads `aria-checked` the same way in its fix line: over a `LintContext` whose `render` returns that same two-span markup, whose `snapshots` hold one expected file, and whose one exam asserts `{selector: '[role=checkbox]', checked: true}` over it, `rule.run` returns exactly one finding with `problem` `a match is not checked` and `fix` `name the narrower selector: #a`.
M6. `bundleOf` runs Tailwind v4 in the bundle: with `bun-plugin-tailwind` among `Bun.build`'s `plugins`, an entry whose module imports a stylesheet beginning `@import "tailwindcss";` and whose source carries `className="flex"` bundles to a `css` containing `.flex{display:flex}` and no `@tailwind` text, and an entry whose stylesheet is the plain rule `.x{color:red}` bundles to a `css` containing `.x{color:red}`.
M7. The state exam clicking `{role: 'checkbox', name: 'buy milk'}` on the page seeded from `state-exams/seeds/two-open-todos.json` reaches `state-exams/expected/two-todos-first-done.json`, shows `#todo-0` checked and `#todo-1` unchecked, and kills the mutant setting row `0`'s `completed` to `false`.
M8. `packages/tinyapp-exam/src/index.ts` names `Locator` in its type export from `./types`, and `tinyapp-exam` still exports every runtime name it exported at BASE.

**Authorized-by:** popmechanic/ultrapowers#998; spec `docs/superpowers/specs/2026-09-16-linted-design-system-experiment.md` §5 (the exams) and §7 wave 1 (b); the operator's pick "roles and accessible names" over `data-testid` and class selectors (§8, 2026-09-16).

**Interfaces:**
- Consumes: none
- Produces: `Locator`
- Produces: `act(action: Action): Promise<void>`
- Produces: `assertView(html: string, views: View | View[] | undefined): string[]`
- Produces: `bundleOf(entryPath: string, entryHtml: string, opts?: {minify?: boolean}): Promise<{js: string; css: string}>`

**Context:** The mechanism, and the CDP facts measured 2026-09-16 against a local headless shell (HeadlessChrome 153.0.8010.12, protocol 1.3; `Accessibility.queryAXTree` predates Chromium 151, the fleet image's, by many majors): `Accessibility.queryAXTree({nodeId: <DOM.getDocument root>, role, accessibleName})` returns `nodes`, each with `role.value`, `name.value` and `backendDOMNodeId`, in tree order, `[]` for no match; `DOM.getBoxModel({backendNodeId})` and `DOM.focus({backendNodeId})` both accept the backend id in place of `nodeId`, so the resolver hands back a backend id and `centreOf`/the focus call take it — `nodeFor` today returns a `nodeId` from `DOM.querySelector`, and the two paths meet at the same `Input.dispatchMouseEvent`/`Input.insertText`/`Input.dispatchKeyEvent` calls. `Accessibility.enable` was called before the query on the probe; call it once per session. The first node in tree order is the one acted on, exactly `DOM.querySelector`'s first-match rule for a string. How names are computed, measured on the same shell: `<label for>` names an `<input>` (`buy milk` above) but never a `<span role="checkbox">` — a span is not labelable, and wrapping the span in a `<label>` names it no better; `aria-label` names anything; a bare `placeholder` names an `<input>` as `textbox`. The existing string forms and their error text (`act: no element matches <selector>`, pinned by `browser.test.ts` M3) stay byte-identical; the new message spells the object as `role=<role> name="<name>"`. `browser.test.ts` runs its browser legs only where a Chromium exists (`TINYAPP_BROWSER`, else `/headless-shell/headless-shell`) and prints one line and skips them otherwise — keep that shape for the new legs, and open the M2 page as a `data:` URL built from an inline string, dialling nothing. The views: shadcn's Checkbox is `@base-ui/react`'s — its root is a `<span role="checkbox" aria-checked="true|false" data-slot="checkbox">` carrying base-ui's own `data-checked=""` (the empty string, present only when checked) or `data-unchecked=""`, with a visually hidden `<input type="checkbox" aria-hidden="true" tabindex="-1">` beside it; `REFLECT_CHECKED` and the linter's `reflectChecked` write `data-checked="true"|"false"` onto `input` elements only and must keep to inputs — a `data-checked="false"` written onto base-ui's span would match shadcn's `data-checked:` variant and paint it checked. React's static render writes `aria-checked` as a real attribute, so the linter's `views` rule reads it off `ctx.render` with no reflection. In `packages/tinyapp-lint/src/rules/views.ts`, `readingChecked` names the matches reading `data-checked="<want>"` for the fix line (`nameOf` spells a match with an id as `#<id>`); make it read `aria-checked` too, and M5's leg extends `packages/tinyapp-lint/test/views.test.ts` under a comment naming this task — that file's own legs (a)–(f) at BASE are untouched. A `LintContext` (`packages/tinyapp-lint/src/types.ts`) is `{storePath, schema, invariants, callbacks, snapshots, exams, createStore, render, clock}` and `views`' `run` reads only `snapshots` (`{path, kind, content}`), `render` and `exams` (`{path, seed, expected, view, action}`), so M5's context is built by hand with stubs for the rest — never through `loadContext`, which spawns the capture. `bundleOf`: Bun's bundler does not run Tailwind — measured on the probe, the fixture's `index.css` bundles to 162,042 chars keeping `@tailwind utilities;` verbatim and generating no `.flex{`; with `bun-plugin-tailwind` 0.1.2 (`import tailwind from 'bun-plugin-tailwind'`, `plugins: [tailwind]`) the same build gives 144,707 chars with `.flex{display:flex}` present and no `@tailwind`, and still one `index.js` entry point and one `index.css` asset. Tailwind's source scan starts at `process.cwd()` and skips gitignored paths, so M6's `flex` fixture must sit inside the repository (a `mkdtempSync` directory under the root, removed in a `finally`) or declare `@source` beside its import — a fixture under `os.tmpdir()` generates nothing. `bun-plugin-tailwind` and `tailwindcss` (4.3.3) go into `packages/tinyapp-exam/package.json`'s `dependencies`, installed with `bun install` at the root so `bun install --frozen-lockfile` then exits 0; Task 1 adds `tailwindcss` under `client` and Task 3 at the root in this same wave, identical versions, and `bun.lock` is regenerated by `bun install`, never hand-edited. At this wave the fixture's checkbox is still `<input type="checkbox" id="todo-0">` with `<label htmlFor>`, so M7's `buy milk` resolves to row `0`'s input; Task 4 later puts `id="todo-<rowId>"` and `aria-label={todo.text}` on the shadcn Checkbox root, which is why M7's views name `#todo-0`/`#todo-1` and no tag — they hold on both trees. `tests/state-exams/interaction-evidence.test.ts` and the fixture's other exams are not this task's to touch.

**Proof:**
- Test: `packages/tinyapp-exam/test/browser.test.ts`
- Test: `packages/tinyapp-exam/test/render-move.test.ts`
- Test: `tests/state-exams/click-by-name-completes-todo.test.ts`
- Guard: `packages/tinyapp-exam/test/browser.test.ts`
- Guard: `packages/tinyapp-exam/test/render-move.test.ts`
- Guard: `packages/tinyapp-lint/test/views.test.ts`
- Guard: `tests/state-exams/click-by-name-completes-todo.test.ts`
- Run: bunx tsc -p packages/tinyapp-exam --noEmit
- Run: bun install --frozen-lockfile
- Run: grep -q Locator packages/tinyapp-exam/src/index.ts
- Legs, under a comment naming this task in each of the three package files: (a) a `Locator`-typed value accepts a string and `{role, name}`, `actionsOf({click: {role: 'checkbox', name: 'x'}})` deep-equals `[{click: {role: 'checkbox', name: 'x'}}]`, and a string `click` still resolves through `act` as at BASE — the existing M3 legs of `browser.test.ts` re-run unchanged [M1]; (b) on a real browser, over a `data:` page holding the labelled checkbox, the `aria-label`led input and the `aria-label`led span, `act({click: {role: 'checkbox', name: 'buy milk'}})` then `evaluate("document.getElementById('c0').checked")` is `true`, `act({type: [{role: 'textbox', name: 'New todo'}, 'buy milk']})` then `evaluate` of that input's `value` is `buy milk`, and `act({click: {role: 'checkbox', name: 'walk the dog'}})` then `evaluate('window.__hit')` is `walk` [M2]; (c) `act({click: {role: 'checkbox', name: 'Nope'}})` rejects with exactly `act: no element matches role=checkbox name="Nope"`, and `act({click: '#nope'})` still rejects with `act: no element matches #nope` [M3]; (d) in `render-move.test.ts`, over the two-span markup, `assertView` of `{selector: '#a', checked: true}` and of `{selector: '#b', unchecked: true}` is `[]`, of `{selector: '[role=checkbox]', checked: true}` is one failure containing `a match is not checked`, of `{selector: '[role=checkbox]', unchecked: true}` is one failure containing `a match is not unchecked`, and every `checked`/`unchecked` assertion the file made at BASE over `FIXTURE_DOM`, `FIXTURE_DOM_CHECKED` and `MIXED_DOM` still holds [M4]; (e) in `packages/tinyapp-lint/test/views.test.ts`, the `views` rule's `run` over a hand-built context — `render` returning the two-span markup, one expected snapshot, one exam with `{selector: '[role=checkbox]', checked: true}` — returns exactly one finding whose `problem` is `a match is not checked` and whose `fix` is `name the narrower selector: #a` [M5]; (f) `bundleOf` over a temporary entry in a directory made under the repository root (not under `node_modules/`, `dist/` or `.wrangler/`, the gitignored paths) whose stylesheet begins `@import "tailwindcss";` and whose module renders `className="flex"` yields `css` containing `.flex{display:flex}` and not `@tailwind`; over a second temporary entry whose stylesheet is `.x{color:red}` yields `css` containing `.x{color:red}` [M6]; (g) the state exam — clock `2026-01-01T00:00:00Z`, entry `client/index.html`, seed `state-exams/seeds/two-open-todos.json`, `store: () => createTodosStore()`, action `{click: {role: 'checkbox', name: 'buy milk'}}`, expected `state-exams/expected/two-todos-first-done.json`, view `[{selector: '#todo-0', checked: true}, {selector: '#todo-1', unchecked: true}]`, mutant `[{table: 'todos', row: '0', cell: 'completed', value: false}]` [M7]; (h) `import * as exam from 'tinyapp-exam'` carries every runtime name the file's BASE export list names — one assertion per name — and the three `Run:` lines exit 0, the `grep` line reading `Locator` off `index.ts` [M8].

**Stale-if:**
- path-absent: `packages/tinyapp-exam/src/browser.ts`

### Task 3: `lint:ui` — the six rules as one script, with their own exam

**Type:** implementation
**Review:** lean

**Files:**
- Create: `eslint.config.mjs`
- Modify: `package.json`
- Modify: `bun.lock`
- Test: `tests/lint-ui.test.ts`

**Claim:** There is one command, `bun run lint:ui`, that reads the app's styling against the design system and says exactly what is outside it and what to write instead. (derived)
Machine: M1. The root `package.json` carries `scripts["lint:ui"]` exactly `node node_modules/eslint/bin/eslint.js client/src` and `devDependencies` naming `eslint`, `@typescript-eslint/parser`, `@shadcn/lint` at `^0.1.0` and `tailwindcss`.
M2. `eslint.config.mjs` at the repository root exists, imports `plugin` from `@shadcn/lint`, and `node node_modules/eslint/bin/eslint.js --print-config <the temporary sample's path>` prints JSON whose `rules` carry each of `shadcn/no-restyle`, `shadcn/no-raw-colors`, `shadcn/no-arbitrary-values`, `shadcn/no-inline-styles`, `shadcn/no-unknown-classes` and `shadcn/require-static-classes` with first element `2`, `shadcn/no-restyle`'s entry deep-equal to `[2, {allow: ['layout']}]`.
M3. With a temporary component `client/src/components/ui/lint-ui-tmp-<rand>.tsx` and a temporary sample `client/src/lint-ui-tmp-<rand>/Bad.tsx` present — both spelled verbatim under Proof — `bun run lint:ui -f json` exits 1 and prints a JSON array holding an entry whose `filePath` ends with the sample's path and whose `messages[].ruleId` values include each of the six rule ids: `shadcn/no-raw-colors`, `shadcn/no-arbitrary-values`, `shadcn/no-unknown-classes`, `shadcn/no-inline-styles`, `shadcn/no-restyle` (padding is spacing to that rule, not layout) and `shadcn/require-static-classes` — with no `settings` in the config: the plugin resolves Tailwind's class set from the `tailwindcss` package alone.
M4. A copy of that sample at `client/src/components/ui/lint-ui-tmp-<rand>-bad.tsx` has no entry at all in that JSON array — an ignored file is not listed: `client/src/components/ui/**` is outside every rule.
M5. Each finding names the fix (the wording of `@shadcn/lint` 0.1.0): among the sample entry's `messages`, the one whose `message` contains `p-[13px]` contains `p-3.25`, the one containing `rounded-huge` contains `@utility`, and the one containing `"p-4"` contains `owns its spacing`.

**Authorized-by:** popmechanic/ultrapowers#998; spec `docs/superpowers/specs/2026-09-16-linted-design-system-experiment.md` §4 (the lint) and §7 wave 1 (c); the operator's pick "blocking Check from run one" (§8, 2026-09-16) — blocking from the *next* plan on, for the reason the Global Constraints give.

**Interfaces:**
- Consumes: none
- Produces: `lint:ui`
- Produces: `eslint.config.mjs`

**Context:** Measured 2026-09-16 on a scratch clone at `062aebf6` (Node 24.16, Bun 1.4.2): `@shadcn/lint` 0.1.0 (peer `eslint >=9.30.0`; on the probe `eslint` 10.10.0 and `@typescript-eslint/parser` 8.70.0), its `tailwind-worker.js` imports `tailwindcss` from `node_modules` — so `tailwindcss` (4.3.3) is a root devDependency here: this task's clone has no Tailwind on the client yet, and the worker must still find one. The linter runs under Node in 0.48 s wall over the client (`node node_modules/eslint/bin/eslint.js`) and under Bun in 0.97 s, both loading the worker; the script uses Node. The config is one literal, spelled in full under Proof (the first fence there). `components/ui/**` is excluded from all six rules, not only `no-restyle`: shadcn's generated files carry arbitrary values by design (8 of the probe's 15 baseline findings). How recognition works, measured: `no-restyle` fires on `<Button className="p-4">` only when the imported component's file exists on disk under `client/src/components/ui/` — a `cva`-shaped file suffices, `components.json` and the tsconfig `paths` alias are not needed, and the ignore keeps the file from being linted while the recognizer still reads it; `require-static-classes` fires on a template-literal `className` on a recognised component (`Dynamically built className on <Button> cannot be checked`) and not on a plain element; `no-raw-colors` fires on the palette (`bg-red-500`), where `text-[#ff0000]` is `no-arbitrary-values`. The two temporary files the exam writes — the component at `client/src/components/ui/lint-ui-tmp-<rand>.tsx` and the sample at `client/src/lint-ui-tmp-<rand>/Bad.tsx`, importing the component by its alias path `@/components/ui/lint-ui-tmp-<rand>` — are spelled verbatim under Proof (the second and third fences). On that pair the linter printed exactly six lines for the sample, one per rule id, with no shadcn files on the tree — `class-variance-authority` need not be installed, ESLint only parses. Their texts: `"p-[13px]" hardcodes an off-token value. Use "p-3.25" instead (same value, on the scale)`; `"rounded-huge" is not a class this project's Tailwind knows, so no CSS is generated for it. Fix the spelling, or declare it with @utility in your theme CSS` (`in client/src/index.css` once Task 1's sheet exists — pin only `@utility`); `"p-4" is not allowed on <Button>: <Button> owns its spacing. Use a size (default), …`. ESLint's default `stylish` formatter prints a file's path on a header line and each finding on its own path-less line, and the `unix`/`compact` formatters are no longer in ESLint core — so the exam reads the run as JSON: `bun run lint:ui -f json` (`bun run` appends the args to the script) prints one array, one entry per linted file, `{filePath: <absolute>, messages: [{ruleId, message, line, …}]}`, and an ignored file has no entry at all (measured: the `components/ui` copy is absent from the array, and `--print-config` prints each rule as `[2]` or `[2, {…}]`). The exam spawns it from the repository root, writes its files with a random suffix and removes them in a `finally`, and never pins the run's exit code except with the sample present: at this wave the app itself carries 7 `no-unknown-classes` findings (`primary` in `Button.tsx`, `dueInput` in `DueInput.tsx`, `infoTechIcon` ×4 in `Info.tsx`, `overdue` in `TodoItem.tsx`), so a bare run exits 1 here and 0 after Task 4, and the exam is green on both trees. `bun run <script> <args>` appends the args to the script, so `bun run lint:ui client/src/x.tsx` lints that path beside `client/src`. `bun.lock` is regenerated by `bun install` at the root; Tasks 1 and 2 add dependencies in this same wave and the lockfile edits fold — never hand-edit it. The script is this plan's deliverable and runs as Task 4's `Run:`; the next fixture plan carries it as `- Check: bun run lint:ui`.

**Proof:**
- Literals: the config `eslint.config.mjs`, then the temporary component, then the temporary sample — each verbatim:

```js
import {plugin as shadcn} from '@shadcn/lint';
import tsParser from '@typescript-eslint/parser';
import {defineConfig} from 'eslint/config';

export default defineConfig([
  {ignores: ['client/src/components/ui/**']},
  {
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: {parser: tsParser, parserOptions: {ecmaFeatures: {jsx: true}}},
    plugins: {shadcn},
    rules: {
      'shadcn/no-restyle': ['error', {allow: ['layout']}],
      'shadcn/no-raw-colors': 'error',
      'shadcn/no-arbitrary-values': 'error',
      'shadcn/no-inline-styles': 'error',
      'shadcn/no-unknown-classes': 'error',
      'shadcn/require-static-classes': 'error',
    },
  },
]);
```

```tsx
import { cva, type VariantProps } from "class-variance-authority"
const buttonVariants = cva("inline-flex rounded-lg text-sm", { variants: { variant: { default: "bg-primary text-primary-foreground" }, size: { default: "h-8 px-2.5" } }, defaultVariants: { variant: "default", size: "default" } })
function Button({ className, variant, size, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) { return <button data-slot="button" className={buttonVariants({ variant, size, className })} {...props} /> }
export { Button, buttonVariants }
```

```tsx
import {Button} from '@/components/ui/lint-ui-tmp-<rand>';
export const Bad = ({size}: {size: string}) => (
  <div className="p-[13px] rounded-huge bg-red-500" style={{color: 'red'}}>
    <Button className="p-4">x</Button>
    <Button className={`h-${size}`}>y</Button>
  </div>
);
```

- Test: `tests/lint-ui.test.ts`
- Guard: `tests/lint-ui.test.ts`
- Legs: (a) the root `package.json` parses with `scripts["lint:ui"]` exactly `node node_modules/eslint/bin/eslint.js client/src` and `devDependencies` carrying each of `eslint`, `@typescript-eslint/parser`, `@shadcn/lint`, `tailwindcss` — one assertion per name — with `@shadcn/lint` exactly `^0.1.0` [M1]; (b) `eslint.config.mjs` exists at the root and its text contains `@shadcn/lint`; with the temporary sample written, `node node_modules/eslint/bin/eslint.js --print-config <sample path>` exits 0 and parses to JSON whose `rules` has each of the six ids — one assertion per id — with `[0] === 2`, and whose `shadcn/no-restyle` entry deep-equals `[2, {allow: ['layout']}]` [M2]; (c) with the temporary component and sample written, `Bun.spawnSync(['bun', 'run', 'lint:ui', '-f', 'json'], {cwd: ROOT})` exits 1 and its stdout parses to an array with exactly one entry whose `filePath` ends with `lint-ui-tmp-<rand>/Bad.tsx`, and for each of the six rule ids — one assertion per id — that entry's `messages.map((m) => m.ruleId)` contains it [M3]; (d) with the sample also copied to `client/src/components/ui/lint-ui-tmp-<rand>-bad.tsx`, the array has no entry whose `filePath` contains `lint-ui-tmp-<rand>-bad` [M4]; (e) among that entry's `messages`, the `message` containing `p-[13px]` contains `p-3.25`, the one containing `rounded-huge` contains `@utility`, the one containing `"p-4"` contains `owns its spacing` [M5].

**Stale-if:**
- path-exists: `eslint.config.mjs`

### Task 4: The re-platform — every stylesheet gone, every view and interaction on the system, `lint:ui` green

**Type:** implementation
**Review:** peer

**Files:**
- Delete: `client/src/button.css`
- Delete: `client/src/filterBar.css`
- Delete: `client/src/info.css`
- Delete: `client/src/input.css`
- Delete: `client/src/loading.css`
- Delete: `client/src/title.css`
- Delete: `client/src/todoInput.css`
- Delete: `client/src/todoItem.css`
- Delete: `client/src/todoList.css`
- Delete: `client/src/topBar.css`
- Delete: `client/src/Button.tsx`
- Delete: `client/src/Input.tsx`
- Modify: `client/index.html`
- Modify: `client/src/index.css`
- Modify: `client/src/App.tsx`
- Modify: `client/src/ClearCompleted.tsx`
- Modify: `client/src/DoneCount.tsx`
- Modify: `client/src/DueInput.tsx`
- Modify: `client/src/FilterBar.tsx`
- Modify: `client/src/Info.tsx`
- Modify: `client/src/Loading.tsx`
- Modify: `client/src/Title.tsx`
- Modify: `client/src/TodoInput.tsx`
- Modify: `client/src/TodoItem.tsx`
- Modify: `client/src/TodoList.tsx`
- Modify: `client/src/TopBar.tsx`
- Modify: `client/src/UndoDelete.tsx`
- Modify: `tests/state-exams/buy-milk.test.ts`
- Modify: `tests/state-exams/clear-completed.test.ts`
- Modify: `tests/state-exams/click-completes-todo.test.ts`
- Modify: `tests/state-exams/click-by-name-completes-todo.test.ts`
- Modify: `tests/state-exams/completed-past-due-not-overdue.test.ts`
- Modify: `tests/state-exams/delete-to-trash.test.ts`
- Modify: `tests/state-exams/derived-exam.test.ts`
- Modify: `tests/state-exams/design-system-installed.test.ts`
- Modify: `tests/state-exams/done-count.test.ts`
- Modify: `tests/state-exams/due-date-marks-overdue.test.ts`
- Modify: `tests/state-exams/empty-todo-refused.test.ts`
- Modify: `tests/state-exams/enter-submits-todo.test.ts`
- Modify: `tests/state-exams/filter-bar.test.ts`
- Modify: `tests/state-exams/filter-done.test.ts`
- Modify: `tests/state-exams/interaction-evidence.test.ts`
- Modify: `tests/state-exams/mutant-from-diff.test.ts`
- Modify: `tests/state-exams/session-transitions.test.ts`
- Modify: `tests/state-exams/set-filter.test.ts`
- Modify: `tests/state-exams/set-todo-due.test.ts`
- Modify: `tests/state-exams/store-history.test.ts`
- Modify: `tests/state-exams/type-due-date.test.ts`
- Modify: `tests/state-exams/undo-delete.test.ts`
- Modify: `packages/tinyapp-exam/test/browser-exam.test.ts`
- Modify: `packages/tinyapp-lint/test/views.test.ts`
- Modify: `packages/tinyapp-lint/test/lint-cli.test.ts`
- Test: `tests/state-exams/styled-page.test.ts`

**Claim:** After this task the fixture is styled through one design system the linter can read, every exam finds its control by role and name, and a class outside the system is a red check that names the fix. (derived)
Machine: M1. No hand-written stylesheet remains: the only `.css` file under `client/src`, recursively, is `client/src/index.css`; `client/index.html` contains no `<style` text; and `bundleOf('client/index.html', <its text>)`'s `css` contains none of the five texts `.todoItem`, `.infoTechIcon`, `.dueInput`, `button.primary`, `.overdue`.
M2. `bun run lint:ui` exits 0 on the tree.
M3. Every interaction exam finds its control by role and name and no view names a class: over `loadContext()` from `packages/tinyapp-lint/src/context.ts`, for every exam whose `action` is not `'callback'`, every action's locator — the `click` value, or the first element of `type`/`key` — is an object with string `role` and string `name`; and no `selector` of any exam's `view` contains a `.` followed by a letter.
M4. The page from `state-exams/seeds/two-open-todos.json`, after `{click: {role: 'checkbox', name: 'walk the dog'}}`, reaches `state-exams/expected/two-todos-one-done.json` — the second row, which no first-match CSS click could have picked — and shows `#todoList li` twice, `[data-slot=checkbox]` twice, `#todo-1` checked and `#todo-0` unchecked (read off `aria-checked` on the checkbox root, which Task 2's `assertView` reads beside `data-checked`), `#todoList li[data-completed="true"]` once with text containing `walk the dog`, `#todoInput [data-slot=input]` once and `#todoInput [data-slot=button]` once with text `Add`; the mutant setting row `1`'s `completed` to `false` is killed.
M5. The ids and data attributes an exam may hold onto are still on the page: `renderStatic` over `state-exams/expected/two-todos-one-done.json` paints exactly one element for each of `#topBar`, `#topBarTitle`, `#doneCount`, `#info`, `#todoInput`, `#filterBar`, `#filter-all`, `#filter-open`, `#filter-done`, `#todoList`, `#clearCompleted`, `#todo-0`, `#todo-1`, `#due-0`, `#due-1`; each `#filter-*` carries `data-active` `"true"` or `"false"`; each `#todoList li` carries `data-completed` and `data-overdue`, each `"true"` or `"false"`; `#todo-0` and `#todo-1` carry `role="checkbox"` and an `aria-label` equal to the row's text; `#due-0` and `#due-1` carry an `aria-label` starting `Due date for `; and every `#todoList li` has a `[role=button]` or `button` whose accessible name text starts `Delete ` — read as `aria-label` on the element.
M6. No exam file under `tests/state-exams/` that exists at BASE is deleted or renamed — `git diff --name-status $ULTRA_BASE -- tests/state-exams` has no `D` and no `R` row — and every exam on the tree is green over it: `bun test tests/state-exams` exits 0 and `bun test packages/tinyapp-lint packages/tinyapp-exam` exits 0.
M7. A class outside the system is a red check that names the fix: with a temporary `client/src/lint-ui-tmp-<rand>/Stray.tsx` holding `export const Stray = () => <div className="todoItem">x</div>;` on the tree, `bun run lint:ui -f json` exits 1 and its array holds an entry whose `filePath` ends with that path with one message whose `ruleId` is `shadcn/no-unknown-classes` and whose `message` contains `todoItem` and `@utility`; with the file removed, `bun run lint:ui` exits 0 again.

**Authorized-by:** popmechanic/ultrapowers#998; spec `docs/superpowers/specs/2026-09-16-linted-design-system-experiment.md` §3 (every CSS file deleted, each rule re-expressed), §5 (every interaction migrated, views off our classes) and §7 wave 2.

**Interfaces:**
- Consumes: `Locator`
- Consumes: `Button`
- Consumes: `Input`
- Consumes: `Checkbox`
- Consumes: `Badge`
- Consumes: `lint:ui`
- Consumes: `assertView(html: string, views: View | View[] | undefined): string[]`
- Produces: nothing

**Context:** This task consumes the runtime of all three wave-1 tasks: the tokens Task 1 put in `client/src/index.css` render in the page the exam bundles (Task 2's `bundleOf` now runs Tailwind, so utilities appear in the exam's page and its screenshot), Task 2's `{role, name}` locator resolves through the browser, and Task 3's `bun run lint:ui` runs — its exit 0 is this task's `Run:` and the reason the plan has a wave 2. The system: shadcn's `Button`, `Input`, `Checkbox`, `Badge` from `client/src/components/ui/`, imported through the `@/components/ui/<name>` alias (Task 1's tsconfig `paths` + Vite alias; a test file imports them by relative path); `client/src/Button.tsx` and `client/src/Input.tsx` are wrappers over raw elements and go, their two callers (`TodoInput.tsx`, `TodoItem.tsx`) taking the shadcn ones. Every rule the ten stylesheets carried is re-expressed as utilities on a plain element or a variant of the component that owns it; the operator's dark look (`--bg` oklch 20 % at hue 270, accent `#d81b60`) is re-expressed by setting the tokens in `index.css`'s `:root` — a colour is written once there and never in a `.tsx`; `client/index.html`'s `<style>` block goes, its `body`/`#root`/`#app` rules moving into `index.css` `@layer base` or onto the elements as utilities, and its Google Fonts `<link>` may stay (the exam blocks every request anyway). The linter's rules, measured 2026-09-16: `no-unknown-classes` flags a class Tailwind cannot generate on a plain element too (`primary`, `dueInput`, `infoTechIcon`, `overdue` — the 7 baseline findings), so no semantic class survives anywhere, and state that a view once read off a class goes on a `data-*` attribute: a row is `<li data-completed="true|false" data-overdue="true|false">` inside `<ul id="todoList">`, the filter buttons keep `data-active`, and Tailwind's `data-[completed=true]:line-through` style variants (or `aria-*`/`data-*` variants) paint from those; `require-static-classes` flags a non-static `className` on a shadcn component, so a pressed filter button is `variant={filter === name ? 'default' : 'outline'}`, never a computed class string; `no-restyle` (`allow: ['layout']`) lets margin, flex and gap onto a component but no colour, padding or radius — use `variant`/`size`. `#todoList:empty::before` (the "No todos yet. Add one above!" text) becomes a conditional element rendered when the shown list is empty, so `empty-todo-refused`'s `{selector: '#todoList', count: 1}` still holds and `#todoList li` is absent. The checkbox: shadcn's is `@base-ui/react`'s — the root is `<span role="checkbox" aria-checked data-slot="checkbox">` plus a visually hidden `<input type="checkbox" aria-hidden="true">`; `id` and `aria-label` passed to `<Checkbox>` land on the root (`useRenderElement('span', …)` with `id: rootId`, `nativeButton` false); a `<label htmlFor>` gives a span no accessible name, so the row's checkbox is named `aria-label={todo.text}` and keeps `id={`todo-${rowId}`}`, its `onCheckedChange` calling `setTodoCompleted`. `assertView`'s `checked`/`unchecked` read `aria-checked` since Task 2, and the linter's static render carries `aria-checked` as a real attribute, so `{selector: '#todo-1', checked: true}` holds in the browser and in `lint:state` alike. Accessible names, the shared literals every migrated exam and the components agree on: checkbox → the todo's text (`buy milk`, `walk the dog`); the row's delete button → `aria-label={`Delete ${todo.text}`}` (visible text `Delete`; two rows would otherwise be two buttons named `Delete`, and role-and-name picks the first in tree order); the row's due-date input → `aria-label={`Due date for ${todo.text}`}` keeping `id={`due-${rowId}`}` and `placeholder="YYYY-MM-DD"` as `type="text"` (CDP `Input.insertText` does not reach a date input — the trio's rule); the new-todo input → `aria-label="New todo"` keeping its placeholder `What needs to be done?`; the buttons by their visible text `Add`, `All`, `Open`, `Done`, `Clear completed`, `Undo`. The migration map, one line per exam: `click-completes-todo` and `completed-past-due-not-overdue` → `{click: {role: 'checkbox', name: 'buy milk'}}`; `delete-to-trash` → `{click: {role: 'button', name: 'Delete buy milk'}}`; `undo-delete` → that click then `{click: {role: 'button', name: 'Undo'}}`; `due-date-marks-overdue` → `{type: [{role: 'textbox', name: 'Due date for buy milk'}, '2025-12-31']}`; `type-due-date` → `{type: [{role: 'textbox', name: 'Due date for walk the dog'}, '2025-06-30']}`; `enter-submits-todo` → `{type: [{role: 'textbox', name: 'New todo'}, 'buy milk']}` then `{key: [{role: 'textbox', name: 'New todo'}, 'Enter']}`; `filter-bar` → `{click: {role: 'button', name: 'Open'}}`; `filter-done` → `{click: {role: 'button', name: 'Done'}}`; `packages/tinyapp-exam/test/browser-exam.test.ts` leg (g) and its unminified twin click the fixture with `.todoItem input[type=checkbox]` on a real browser and migrate to the checkbox named `buy milk`. Views, the map: `.todoItem` → `#todoList li`; `.todoItem.completed` → `#todoList li[data-completed="true"]`; `.todoItem input[type=checkbox]` → `#todoList li [role=checkbox]` (or `#todo-<id>`); `.todoItem.completed input[type=checkbox]` → `#todoList li[data-completed="true"] [role=checkbox]`; `.todoItem.overdue` → `#todoList li[data-overdue="true"]`; `input#todo-1` → `#todo-1`; `input#due-0` → `#due-0` (the `attr: {name: 'value', …}` views still hold — shadcn's `Input` is a native controlled input); `#doneCount`, `#filter-*`, `#clearCompleted`, `#undoDelete`, `#todoList` unchanged. Two exams carry `Run:`-line legs that grep a deleted stylesheet — `due-date-marks-overdue` (`todoItem.css`'s `.todoItem.overdue label` block) and `filter-done` (`filterBar.css` and `import './filterBar.css'`) — re-aim those legs at what replaces them (the overdue mark as a utility variant on the row, the pressed filter as the button's `variant`); `interaction-evidence.test.ts` reads two sibling exams' *source* with regexes for `click: '.todoItem input[type=checkbox]'` and `input[placeholder=…]` and their `selector` literals — rewrite those regexes to the migrated literals. The linter's two test files pin the fixture's markup and follow it: `views.test.ts`'s `RUN_7` spec and `RUN_7_EXAM_FILE` name `.todoItem input[type=checkbox]` and `.todoItem`, and pin the fix line `name the narrower selector: #todo-1` — the ids stay, so the selector in those literals becomes `#todoList li [role=checkbox]` / `#todoList li` and the pinned lines change only there; `lint-cli.test.ts` leg (d) reads `#todo-0`/`#todo-1`'s `data-checked` (now `aria-checked`), counts `.todoItem` (now `#todoList li`), asserts every `input` carries `data-checked` (still true — `reflectChecked` writes it on inputs, base-ui's hidden one included) and pins `<span id="doneCount">1 of 2 done</span>` verbatim — loosen to containing `id="doneCount"` and `1 of 2 done` if the counter becomes a `Badge`. Counts in those files stay containment/tree-computed (Global Constraints). `packages/tinyapp-exam/test/state-exam.test.ts` and `render-move.test.ts` hold `.todoItem` only in stand-in DOM strings a fake browser hands back — not the fixture's markup, not this task's. `client/src/StaticPage.tsx` and `Store.tsx` carry no class and need no change; `README.md` is byte-identical to BASE (a `Check:`), `interaction-evidence` greps its State exams section. The order of rows is ascending by row id (`useSortedRowIds`), so `walk the dog` is row `1`, and `state-exams/expected/two-todos-one-done.json` — row `1` done, row `0` open — is exactly M4's state, already on the tree; no snapshot is added. `M3`'s reading goes through `loadContext()` (it spawns the capture child; give the test 60 s as `views.test.ts` does), never through a text grep of a sibling exam. Every `Run:` here is run once by the driver in this clone and again on the adopted tree; `bun run lint:ui` at exit 0 is the sentence the plan-level Claim rests on, and M7 is its converse — the linter still fires once the tree is clean. `bun run lint:ui -f json` prints one array entry per linted file, `{filePath: <absolute>, messages: [{ruleId, message, …}]}` (Task 3's Context has the measured shape). The 21 exam files under `tests/state-exams/` in Files are rewritten in place — none is deleted, none renamed, and the `git diff --name-status` line reads that.

**Proof:**
- Test: `tests/state-exams/styled-page.test.ts`
- Guard: `tests/state-exams/styled-page.test.ts`
- Run: bun run lint:ui
- Run: test "$(ls client/src/*.css)" = client/src/index.css
- Run: bun test tests/state-exams
- Run: bun test packages/tinyapp-lint packages/tinyapp-exam
- Run: test "$(git diff --name-status $ULTRA_BASE -- tests/state-exams | grep -c -E '^[DR]')" -eq 0
- Legs: (a) walking `client/src` recursively, the `.css` files are exactly `['client/src/index.css']`; the text of `client/index.html` does not contain `<style`; `bundleOf('client/index.html', readFileSync('client/index.html'))`'s `css` contains none of `.todoItem`, `.infoTechIcon`, `.dueInput`, `button.primary`, `.overdue` — one assertion per text [M1]; (b) `Bun.spawnSync(['bun', 'run', 'lint:ui'], {cwd: ROOT})` exits 0 [M2]; (c) over `loadContext()`, for every exam with `action !== 'callback'` and every action in it, the locator is an object with `typeof role === 'string'` and `typeof name === 'string'`, and the set of such exams is non-empty; for every exam's every view, `/\.[A-Za-z]/.test(selector)` is `false` [M3]; (d) the state exam — clock `2026-01-01T00:00:00Z`, entry `client/index.html`, seed `state-exams/seeds/two-open-todos.json`, `store: () => createTodosStore()`, action `{click: {role: 'checkbox', name: 'walk the dog'}}`, expected `state-exams/expected/two-todos-one-done.json`, view `[{selector: '#todoList li', count: 2}, {selector: '[data-slot=checkbox]', count: 2}, {selector: '#todo-1', checked: true}, {selector: '#todo-0', unchecked: true}, {selector: '#todoList li[data-completed="true"]', count: 1, text: 'walk the dog'}, {selector: '#todoInput [data-slot=input]', count: 1}, {selector: '#todoInput [data-slot=button]', count: 1, text: 'Add'}]`, mutant `[{table: 'todos', row: '1', cell: 'completed', value: false}]` [M4]; (e) `renderStatic` over `state-exams/expected/two-todos-one-done.json`, parsed with `node-html-parser`: one test per id in M5's list asserting exactly one match; one test asserting each `#filter-*`'s `data-active` is `"true"` or `"false"` with exactly one `"true"`; one test asserting each `#todoList li`'s `data-completed` and `data-overdue` are each `"true"` or `"false"`; one asserting `#todo-0` and `#todo-1` carry `role="checkbox"` and `aria-label` `buy milk` and `walk the dog` respectively; one asserting `#due-0`/`#due-1`'s `aria-label` starts `Due date for `; one asserting each `#todoList li` has a `button` (or `[role=button]`) whose `aria-label` starts `Delete ` [M5]; (f) the five `Run:` lines exit 0, the `git diff --name-status` line reading no deleted or renamed exam [M6]; (g) with `client/src/lint-ui-tmp-<rand>/Stray.tsx` written as M7 spells it, `Bun.spawnSync(['bun', 'run', 'lint:ui', '-f', 'json'], {cwd: ROOT})` exits 1 and its array has an entry whose `filePath` ends with `Stray.tsx`, with exactly one message, `ruleId` `shadcn/no-unknown-classes`, `message` containing `todoItem` and `@utility`; with the file removed in a `finally`, `bun run lint:ui` exits 0 [M7].

**Stale-if:**
- path-absent: `client/src/todoItem.css`
