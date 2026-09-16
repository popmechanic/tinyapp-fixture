This puts the fixture's whole look onto one design system — Tailwind v4 with shadcn/ui installed by its own tool — and adds a linter that reads every class in the app against that system and says, for each one outside it, what to write instead. It is an experiment: it buys a check nothing in the fleet had, presentation judged by a machine instead of by a reviewer's prose, and pays with one more fixed choice on every TinyApp's stack; its rollback is the ten hand-written stylesheets as they stand at `062aebf6`, and `(minor)` on the Check line if the check is kept but stops blocking. What is read is drift at the first check and whether one fix round corrects it, per task, over the next five fixture runs after this one merges — kept if the check keeps catching and correcting, retired if it catches nothing.

**Merge-ready**

> After this run the fixture is styled through one design system the linter can read, every exam finds its control by role and name, and a class outside the system is a red check that names the fix.

| task | claim | exam | probes | mutant | suite |
|---|---|---|---|---|---|
| 1 | Every package the rest of this plan reaches for is already on the tree, installed once and recorded in one lockfile, so no later task has to touch a manifest. | red at BASE → green | — | — | — |
| 2 | After this task the app looks and works as it did, and underneath it the design system is installed — the tokens are on every page and the four components are there to be used. | red at BASE → green | — | killed, reviewer skipped | — |
| 3 | An exam can name what it clicks the way a person would — "the checkbox called buy milk" — and land on that control however the page is styled; and it can read a shadcn checkbox as checked. | red at BASE → green | — | killed, reviewer skipped | — |
| 4 | There is one command, `bun run lint:ui`, that reads the app's styling against the design system and says exactly what is outside it and what to write instead. | red at BASE → green | — | — | — |
| 5 | After this task the fixture is styled through one design system the linter can read, every exam finds its control by role and name, and a class outside the system is a red check that names the fix. | red at BASE → green | — | killed, reviewer skipped | — |

Residuals: 8 from review

Amendments: 6 from workers

- task 2 — clause: The Context's install recipe — "in `client/`, `bunx --bun shadcn@latest init -d --yes` writes `components.json` … and a 130-line `src/index.css`" — read as needing two of its own later products in place before it will run. I wrote the tsconfig `paths` alias and a one-line stub `client/src/index.css` containing `@import "tailwindcss";` first, then ran init, which overwrote the stub with its own 129-line sheet. The end state is the CLI's own output, unedited. — On this tree init refused twice at preflight: "No Tailwind CSS configuration found at .../client" (shadcn detects Tailwind v4 by finding a stylesheet that imports it, and at BASE `client/src/index.css` did not exist) and "Could not find valid path aliases or package imports for init" (at BASE `client/tsconfig.json` had no `paths`). Neither refusal is reachable by re-running the command as the Context spells it; the sequencing is the only way to get the CLI to write the vendor files rather than hand-vendoring them, which the Context forbids.
- task 2 — clause: The Context says the CLI "reformats the manifests and, on the probe, downgraded `@types/node`", so `git checkout -- package.json client/package.json bun.lock` puts back whatever it rewrote. I ran no such checkout. — The CLI touched none of them here — `git status` after both CLI invocations showed only the new vendor files and my three edits. The checkout would have been a no-op, and `bun install --frozen-lockfile` exits 0 without it. Noting it so a later session does not read the missing checkout as a skipped step.
- task 5 — files: Deleted the ten hand-written stylesheets under `client/src` — `button.css`, `filterBar.css`, `info.css`, `input.css`, `loading.css`, `title.css`, `todoInput.css`, `todoItem.css`, `todoList.css`, `topBar.css`. None is named in FILES (only `client/src/index.css` is). — M1 requires that the only `.css` under `client/src` recursively is `client/src/index.css`, so the clause cannot be met without deleting files FILES does not name. Each deletion is paired with the component edit that replaces its rules with Tailwind utilities and shadcn variants.
- task 5 — files: Deleted `client/src/Button.tsx` and `client/src/Input.tsx`, neither of which is named in FILES. — Both are the fixture's own hand-rolled controls whose only styling was `./button.css` and `./input.css`. With those stylesheets gone the imports dangle, and their hand-written class names (`primary`, and the input's own) are exactly what `shadcn/no-unknown-classes` flags, so leaving the files in place makes `bun run lint:ui` red and M2 unreachable. The vendored `@/components/ui/button` and `@/components/ui/input` replace them at every call site; `bun run typecheck` and all three test suites are green with them gone.
- task 5 — files: Edited `tests/state-exams/pin-todo.test.ts`, which is not named in FILES: its action became `{click: {role: 'button', name: 'Pin walk the dog'}}`, its views moved off `.todoItem` onto `#todoList li` and `[role=checkbox]`, and leg (f)'s two verbatim `<button ...>Pin</button>` regexes were loosened to `/<button[^>]*id="pin-1"[^>]*>Unpin<\/button>/` and the `pin-0` twin so they follow the shadcn markup rather than pin a class list. — The file is one of the 23 exams `loadContext()` reads and one of the 24 files `bun test tests/state-exams` runs, so M3's locator/selector sweep and M6's green suite both cover it. Left unmigrated it would fail on `act: no element matches .todoItem …` and would put a `.todoItem` selector in M3's sweep.
- task 5 — clause: Read the task Context's sentence about giving shadcn's `Checkbox` an `id` otherwise than as written: rows pass `render={<span id={`todo-${rowId}`} />}` instead of `id={`todo-${rowId}`}`. — Empirically, and per base-ui's `CheckboxRoot` source (`const rootId = nativeButton ? controlId : id;`), a plain `id` lands on the visually-hidden `<input type="checkbox" aria-hidden="true">`, not on the `role="checkbox"` root. M4 reads `#todo-1` checked / `#todo-0` unchecked and M5 requires `role="checkbox"` and `aria-label` on `#todo-0`/`#todo-1`; the `render` prop is the only way to put the id on the element that carries all three.

<details><summary>Record</summary>

## fleet run-22 — gate-green

| | |
|---|---|
| verdict | `PASS` |
| target | `popmechanic/tinyapp-fixture` at `486ab07278aed9caec7900c84c7637f3b5e7a4b1` |
| engine | `80c0ef304c0410332180ee58e33a68ac8438bc0a` |
| plan | `.ultrapowers/plan.md` at `d13124e48de5cd2903f87da698555244a7a83065` |
| branch | `ultra/integration-run-22` |
| vm | `fleet-r22-2609161519-a21c` |

### Checks

```json
{"mode": "gate", "stamp": "run-22", "reportPath": "/home/exedev/target/.claude/ultrapowers/run-run-22/report.json", "branch": "ultra/integration-run-22", "gateCheck": {"verdict": "PASS", "checks": [{"name": "report-parse", "ok": true, "detail": ""}, {"name": "clean-tree", "ok": true, "detail": ""}, {"name": "wave-merges", "ok": true, "detail": ""}, {"name": "head-match", "ok": true, "detail": ""}, {"name": "git-verified", "ok": true, "detail": ""}, {"name": "ancestry", "ok": true, "detail": ""}, {"name": "deliverables", "ok": true, "detail": ""}], "notes": [], "repo": "/home/exedev/target"}, "gateCheckExit": 0, "suite": {"passed": true, "unattributed": [], "output": " action and an entry is the same red [1.90ms]\n(pass) leg (e) [M5]: the mutant move is unchanged \u2014 a green click spec still kills its mutant [0.22ms]\n(pass) leg (f) [M6]: the two re-aimed test files pass, and neither names the endpoint or its stub [5346.65ms]\n(pass) leg (g) [M1] [M7]: a click on the fixture completes the todo, read through the page store, under the ceiling [2309.57ms]\n(pass) leg (g) [M7]: forced unminified, the url is over the ceiling and the exam says so rather than hanging [254.92ms]\n(pass) leg (g) [M7]: `open` refuses a data: url over the ceiling within 15 s, naming it [96.59ms]\n\npackages/tinyapp-lint/test/references.test.ts:\n(pass) (a) [M1] the rule is named `references` and says nothing about the fixture [212.02ms]\n(pass) (b) [M2] the dangling `owner` is one finding, formatted exactly as pinned [0.50ms]\n(pass) (c) [M3] a resolvable reference, and a row without the cell, are both silent [0.28ms]\n(pass) (d) [M4] a snapshot without the referenced table names the missing row [0.15ms]\n(pass) (e) [M5] the fixture store module, and `lint:state` over one seeded violation [176.79ms]\n\npackages/tinyapp-lint/test/reachability.test.ts:\n(pass) (a) [M1] the rule is named `reachability`, and the fixture`s four expected states are each reached [1306.20ms]\n(pass) (b) [M2] an unreachable expected state is one finding, on the pinned line [3596.96ms]\n(pass) (c) [M3] a state equal to a seed is reached in zero moves [0.17ms]\n(pass) (d) [M4] the walk runs under the context`s clock, and a callback that dials breaches the contract [0.76ms]\n$ bun packages/tinyapp-lint/src/cli.ts --expected \"/home/exedev/target/.claude/ultrapowers/run-run-22/clones/integration/state-exams/lint-tmp-X0JfpK/expected\" --exams \"/home/exedev/target/.claude/ultrapowers/run-run-22/clones/integration/state-exams/lint-tmp-X0JfpK/exams\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `lint:state` over a seeded unreachable state exits 1 and prints the pinned line [3892.21ms]\n\npackages/tinyapp-lint/test/lint-cli.test.ts:\n(pass) (a) [M1] `bun run lint:state` exits 0 with one zero-findings summary line [1821.10ms]\n(pass) (b) [M2] `loadContext()` resolves to the pinned context [205.95ms]\n(pass) (c) [M3] the exam specs, in path order, and the pinned click entry [0.37ms]\n(pass) (d) [M4] `ctx.render` reflects `checked` and paints the two rows [15.42ms]\n$ bun packages/tinyapp-lint/src/cli.ts --rules \"/tmp/tinyapp-lint-rules-f32Qqz\"\nerror: script \"lint:state\" exited with code 1\n\n(pass) (e) [M5] `runLint` over two rule modules, the CLI `--rules` run, and an absent directory [369.13ms]\n(pass) (f) [M6] `captureExams` leaves no exam file in the caller`s `require.cache` [232.39ms]\n\npackages/tinyapp-lint/test/invariants.test.ts:\n(pass) (a) [M1] `INVARIANTS` carries the todos invariant first, with the pinned predicate [0.43ms]\n(pass) (a) [M5] the due-date invariant is on `todos`, and holds of an absent or valid date [0.46ms]\n(pass) (b) [M2] the rule is named `invariants` and is quiet over the fixture [210.96ms]\n(pass) (c) [M3] the bad snapshot is exactly one finding, formatted character for character [0.28ms]\n(pass) (d) [M4] an empty snapshot is quiet, and a throwing invariant is one finding per row [0.26ms]\n(pass) (e) [M5] the CLI over one seeded violation exits 1 and names the row [1223.76ms]\n\npackages/tinyapp-lint/test/views.test.ts:\n(pass) (a) [M1] the `views` rule finds nothing over the fixture`s own six exams [281.45ms]\n(pass) (b) [M2] the run-7 spec is one finding naming the narrower selector `#todo-1` [3.38ms]\n(pass) (c) [M3] the `count: 1` spec is one finding reading `found 2` [2.30ms]\n(pass) (d) [M4] the corrected selector holds, and the `unchecked` breach names `#todo-0` [4.74ms]\n(pass) (e) [M5] a `view` of `undefined` asserts nothing, and a missing state is one finding [0.15ms]\n(pass) (f) [M6] `bun run lint:state -- --exams <dir>` exits 1 and prints that line [1338.49ms]\n\n 539 pass\n 0 fail\n 1713 expect() calls\nRan 539 tests across 45 files. [399.34s]\n"}, "verdict": "PASS"}

```

### Evidence

https://github.com/popmechanic/tinyapp-fixture/tree/ultra/evidence/run-22/.ultrapowers/runs/22/

- approve-receipt.json
- claude-version.txt
- engine.log
- events.jsonl
- gate-receipt.json
- kata.jsonl
- pr-body.md
- publish-fold
- receipt.json
- report.json
- residuals.jsonl
- state-exams
- status.json
- transcripts

### Plan

https://github.com/popmechanic/tinyapp-fixture/blob/ultra/plan/run-22/.ultrapowers/plan.md

### Residuals

- [ ] task 4 reviewer — concern: plan-defect: leg (c) reads "its stdout parses to an array with exactly one entry whose `filePath` ends with `lint-ui-tmp-<rand>/Bad.tsx`". Measured on this tree the array has 26 entries — ESLint's JSON formatter emits one entry per linted file, most with zero messages — so the sentence can only mean exactly one *matching* entry, which is what I verified. An exam that asserts the array's own length is 1 is red for any config
- [ ] task 4 reviewer — the task's own Context ("prints one array, one entry per linted file") supports the matching-entry reading, so I resolved it that way rather than changing anything. Flagged only so a red exam on that assertion is read as the wording, not the config.
- [ ] task 5 reviewer — concern: plan-defect: the task Context asserts that `<Checkbox id="todo-0" />` puts the id on the element carrying `role="checkbox"`. It does not — base-ui's `CheckboxRoot` routes `id` to the hidden native input (`const rootId = nativeButton ? controlId : id;`), so views naming `#todo-0` would have read the `aria-hidden` input instead of the root. Taken as written, M4's `#todo-1` checked / `#todo-0` unchecked and M5's `role="checkbox"` on `#todo-*` would both have been unreachable.
- [ ] task 5 reviewer — concern: plan-defect: the task Context describes `bun run lint:ui` at BASE as producing "7 baseline findings". The measured count at BASE on this clone is 8. Nothing in the acceptance clauses depends on the number — M2 and M7 are about exit codes — but the figure should not be trusted as a landmark by a later reader.
- [ ] task 5 reviewer — concern: The Proof's `Test:`/guard file `tests/state-exams/styled-page.test.ts` is a peer's and is absent from this tree, so M4, M5 and M7 are verified here by throwaway scripts that reproduce each clause's own words rather than by the peer's assertions. The scripts were deleted
- [ ] task 5 reviewer — only their results are reported above. If the peer's file words any clause more narrowly than the clause does, that difference is unmeasured from here.
- [ ] task 5 reviewer — concern: `tests/state-exams/pin-todo.test.ts` is required to migrate (it clicked `.todoItem` markup and asserted on the app's own classes) but is not named in FILES
- [ ] task 5 reviewer — the edit was taken and is recorded as an amendment rather than left as a red, because leaving it would have failed the `bun test tests/state-exams` Run line.

</details>

