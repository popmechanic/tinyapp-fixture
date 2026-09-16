/**
 * The exam for Task 5 — "The re-platform — every stylesheet gone, every view
 * and interaction on the system, `lint:ui` green".
 *
 * One test per Proof leg, named for its leg and for the Machine clause it comes
 * from:
 *
 *   (a) [M1] walking `client/src` recursively the `.css` files are exactly
 *            `['client/src/index.css']`; `client/index.html` does not contain
 *            `<style`; and the `css` of `bundleOf('client/index.html',
 *            readFileSync('client/index.html'))` contains none of `.todoItem`,
 *            `.infoTechIcon`, `.dueInput`, `button.primary`, `.overdue` — one
 *            assertion per text;
 *   (b) [M2] `Bun.spawnSync(['bun', 'run', 'lint:ui'], {cwd: ROOT})` exits 0;
 *   (c) [M3] over `loadContext()`, every action of every exam whose `action` is
 *            not `'callback'` names its control by `{role, name}` — both
 *            strings — and the set of such exams is non-empty; and no
 *            `selector` of any exam's `view` matches `/\.[A-Za-z]/`;
 *   (d) [M4] the single `stateExam({…})` in this file, spelled as the leg
 *            spells it: the second row is clicked by its accessible name, the
 *            page reaches `two-todos-one-done.json`, the seven views hold and
 *            the mutant of row `1`'s `completed` is killed;
 *   (e) [M5] `renderStatic` over `state-exams/expected/two-todos-one-done.json`
 *            parsed with `node-html-parser`: one test per id in M5's list, then
 *            the `data-active`, `data-completed`/`data-overdue`,
 *            `role="checkbox"`/`aria-label`, `Due date for ` and `Delete `
 *            tests the leg lists;
 *   (f) [M6] the five `Run:` lines exit 0, and no exam file under
 *            `tests/state-exams` is deleted or renamed;
 *   (g) [M7] with a stray `todoItem` class on the tree `bun run lint:ui -f json`
 *            exits 1 and names it with `shadcn/no-unknown-classes`, and with the
 *            file removed `bun run lint:ui` exits 0 again.
 *
 * Readings this file makes, written down because they are choices:
 *
 *   - Leg (f)'s `bun test tests/state-exams` re-enters this very file: the exam
 *     the Proof names lives in the directory that `Run:` line runs. The child is
 *     spawned with `TINYAPP_STYLED_PAGE_NESTED=1` in its environment and the two
 *     `bun test` lines of leg (f) are simply not registered when that marker is
 *     set, so the recursion is one level deep and bounded. Every other leg — (a)
 *     to (e) and (g), and the other three `Run:` lines of (f) — stays live in
 *     the child, so the directory run grades this file as it grades every other.
 *     Not registered rather than `test.skipIf`: the linter's capture child
 *     imports every exam file with `bun:test` stubbed by a plain `() => {}`,
 *     which carries no `skipIf`, and reaching for one there would make every
 *     `loadContext()` on the tree fail as `capture failed`.
 *   - `$ULTRA_BASE` is the driver's variable and is not set in an ordinary
 *     shell. Leg (f)'s git line reads `process.env.ULTRA_BASE` and falls back to
 *     the sha this exam was written at; if neither names a commit this
 *     repository has, the test says so rather than reading as a deleted exam.
 *     The substance of M6 — that no exam that existed at BASE is gone — is
 *     pinned a second time and git-independently, as the list of the 24 exam
 *     files that exist at BASE.
 *   - Every file read and every spawn happens inside a test body, never at
 *     module level: the linter's capture child imports this file with
 *     `stateExam` and `bun:test` stubbed out, so a module-level read of a file
 *     this task rewrites would make `bun run lint:state` fail as
 *     `capture failed` rather than leave the leg red as the finding it is.
 *   - Leg (e) renders inside `withContract(CLOCK, …)`: a row reads `new Date()`
 *     through `isOverdue`, so `data-overdue` is only determinate under the
 *     exam's own clock.
 *   - The legs that spawn a child are given walls well above what they cost
 *     rather than walls that pin them: a wall is not one of this task's
 *     measurements, and a wall too tight fails a correct tree on a slow
 *     sandbox. Leg (c)'s `loadContext()` spawns the capture child and is given
 *     more than the 60 s `views.test.ts` asks for, for the same reason.
 *
 * Legs (a) to (e) and (g) are red at BASE, and each for the absent
 * re-platform: the ten stylesheets and the `<style>` block are still on the
 * tree, `lint:ui` reports its eight unknown-class findings, the exams still name
 * `.todoItem`, the page carries no `[data-slot=checkbox]`, `#todoList` is a
 * `<div>` of `<div class="todoItem">` so `#todoList li` matches nothing, and the
 * tree is not clean enough for (g)'s closing `lint:ui` to be green. The fifteen
 * ids of leg (e) all resolve at BASE already — that half of M5 is the
 * regression clause, and it is meant to hold on both trees.
 */

import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

import {expect, test} from 'bun:test';
import {parse, type HTMLElement} from 'node-html-parser';
import {bundleOf, stateExam, withContract, type Action, type View} from 'tinyapp-exam';

import {loadContext} from '../../packages/tinyapp-lint/src/context';
import {renderStatic} from '../../client/src/StaticPage';
import {createTodosStore, type TodosContent} from '../../client/src/storeData';

/** This file sits two directories below the repository root. */
const ROOT = join(import.meta.dir, '..', '..');

/** The clock every leg here is measured under, as the Machine pins it. */
const CLOCK = '2026-01-01T00:00:00Z';

/** The entry the render move builds, as legs (a) and (d) spell it. */
const ENTRY = 'client/index.html';

/** The state legs (d) and (e) both read. */
const EXPECTED_FILE = 'state-exams/expected/two-todos-one-done.json';

/** The wall a leg that bundles the client is given, in milliseconds. */
const BUNDLE_TIMEOUT_MS = 180_000;

/** The wall a leg that spawns one `bun` or `eslint` child is given. */
const SPAWN_TIMEOUT_MS = 600_000;

/** The wall the two legs that run a whole test directory are given. */
const SUITE_TIMEOUT_MS = 1_800_000;

/** The sha this exam was written at, for a run whose `$ULTRA_BASE` is unset. */
const BASE_AT_WRITING = '4fa714b7ca099fd46be33aaf8392935299b5baf2';

/**
 * The marker leg (f) puts in the environment of the `bun test` children it
 * spawns, so that this file — which lives in `tests/state-exams` and is
 * therefore part of one of those runs — does not spawn them again.
 */
const NESTED = 'TINYAPP_STYLED_PAGE_NESTED';

/** True when this process is itself one of leg (f)'s children. */
const IS_NESTED = process.env[NESTED] === '1';

/** The exam files under `tests/state-exams` at BASE, which M6 says all survive. */
const EXAMS_AT_BASE = [
  'buy-milk.test.ts',
  'clear-completed.test.ts',
  'click-by-name-completes-todo.test.ts',
  'click-completes-todo.test.ts',
  'completed-past-due-not-overdue.test.ts',
  'delete-to-trash.test.ts',
  'derived-complete-first-todo.test.ts',
  'derived-exam.test.ts',
  'design-system-installed.test.ts',
  'done-count.test.ts',
  'due-date-marks-overdue.test.ts',
  'empty-todo-refused.test.ts',
  'enter-submits-todo.test.ts',
  'filter-bar.test.ts',
  'filter-done.test.ts',
  'interaction-evidence.test.ts',
  'mutant-from-diff.test.ts',
  'pin-todo.test.ts',
  'session-transitions.test.ts',
  'set-filter.test.ts',
  'set-todo-due.test.ts',
  'store-history.test.ts',
  'type-due-date.test.ts',
  'undo-delete.test.ts',
];

/** The ids M5 says the page still paints exactly once each. */
const IDS = [
  'topBar',
  'topBarTitle',
  'doneCount',
  'info',
  'todoInput',
  'filterBar',
  'filter-all',
  'filter-open',
  'filter-done',
  'todoList',
  'clearCompleted',
  'todo-0',
  'todo-1',
  'due-0',
  'due-1',
];

/** The five texts M1 says the bundled stylesheet carries none of. */
const GONE_FROM_CSS = ['.todoItem', '.infoTechIcon', '.dueInput', 'button.primary', '.overdue'];

/** One spawned command's status and everything it printed. */
type Run = {exitCode: number | null; output: string};

/** Runs one command from the repository root, waiting for it. */
const runLine = async (cmd: string[], env?: Record<string, string>): Promise<Run> => {
  const child = Bun.spawn({
    cmd,
    cwd: ROOT,
    env: env === undefined ? process.env : {...process.env, ...env},
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, err] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return {exitCode: await child.exited, output: `${out}${err}`};
};

/** Fails with the command's own output when it did not exit 0. */
const expectGreen = (run: Run, line: string): void => {
  if (run.exitCode !== 0) {
    throw new Error(`\`${line}\` exited ${run.exitCode}; its output was:\n${run.output}`);
  }
  expect(run.exitCode).toBe(0);
};

/**
 * The text of a file on the tree, or a failure that names the missing file
 * rather than one that reads like a typo here.
 */
const readTree = (relative: string): string => {
  const path = join(ROOT, relative);
  if (!existsSync(path)) {
    throw new Error(`${relative} does not exist on the tree — this exam grades it`);
  }
  return readFileSync(path, 'utf8');
};

/** Every file under `dir`, recursively, as a path relative to `ROOT`. */
const filesUnder = (relative: string): string[] => {
  const found: string[] = [];
  const walk = (here: string): void => {
    for (const entry of readdirSync(join(ROOT, here), {withFileTypes: true})) {
      const path = `${here}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(path);
      } else {
        found.push(path);
      }
    }
  };
  walk(relative);
  return found.sort();
};

/**
 * The exam context, loaded once and shared by both of leg (c)'s tests.
 *
 * `loadContext()` is called bare, as M3 spells it, so its every default — the
 * store module, the page, the seed and expected directories and
 * `tests/state-exams` itself — is read relative to the working directory. That
 * directory has to be the repository root, which is what the guard says when it
 * is not.
 */
let contextPromise: ReturnType<typeof loadContext> | undefined;
const contextOnce = () => {
  if (resolve(process.cwd()) !== resolve(ROOT)) {
    throw new Error(
      `this exam is run from the repository root, as \`bun test tests/state-exams/styled-page.test.ts\` — it was run from ${process.cwd()}, and \`loadContext()\` reads its every path from there`,
    );
  }
  return (contextPromise ??= loadContext());
};

/** The one control an action names, whichever of the three forms it takes. */
const locatorOf = (action: Action): unknown => {
  if ('click' in action) {
    return action.click;
  }
  if ('type' in action) {
    return action.type[0];
  }
  return action.key[0];
};

/** A spec's views as a list, `[]` when it asserts none. */
const viewsOf = (view: View | View[] | undefined): View[] =>
  view === undefined ? [] : Array.isArray(view) ? view : [view];

/**
 * `renderStatic` over the expected state, under the clock the exam pins,
 * parsed. The render reads `new Date()`, so it happens inside the contract; the
 * assertions are the caller's and happen outside it.
 */
const renderedOnce = async (): Promise<HTMLElement> => {
  const content = JSON.parse(readTree(EXPECTED_FILE)) as TodosContent;
  let html: string | undefined;
  await withContract(CLOCK, () => {
    html = renderStatic(content);
  });
  return parse(html as string);
};

/** The `#todoList li` rows of a render, in the order the list paints them. */
const rowsOf = (root: HTMLElement): HTMLElement[] => root.querySelectorAll('#todoList li');

/** The one JSON array an `eslint -f json` run printed, among `bun run`'s own lines. */
const jsonArrayOf = (output: string, line: string): {filePath: string; messages: {ruleId: string; message: string}[]}[] => {
  const found = output.split('\n').find((text) => text.trimStart().startsWith('['));
  if (found === undefined) {
    throw new Error(`\`${line}\` printed no JSON array; its output was:\n${output}`);
  }
  return JSON.parse(found.trim());
};

// --- Leg (a) [M1]: no hand-written stylesheet remains ------------------------

test('leg (a) [M1]: the .css files under client/src, recursively, are exactly client/src/index.css', () => {
  expect(filesUnder('client/src').filter((path) => path.endsWith('.css'))).toEqual([
    'client/src/index.css',
  ]);
});

test('leg (a) [M1]: client/index.html contains no `<style` text', () => {
  expect(readTree(ENTRY)).not.toContain('<style');
});

test(
  "leg (a) [M1]: the css of bundleOf('client/index.html', …) carries none of the five texts",
  async () => {
    if (!existsSync(ENTRY)) {
      throw new Error(
        `${ENTRY} is not there relative to ${process.cwd()} — this exam is run from the repository root, as \`bun test tests/state-exams/styled-page.test.ts\``,
      );
    }

    const {css} = await bundleOf(ENTRY, readFileSync(ENTRY, 'utf8'));

    // One assertion per text, as the leg asks.
    expect(css).not.toContain(GONE_FROM_CSS[0]);
    expect(css).not.toContain(GONE_FROM_CSS[1]);
    expect(css).not.toContain(GONE_FROM_CSS[2]);
    expect(css).not.toContain(GONE_FROM_CSS[3]);
    expect(css).not.toContain(GONE_FROM_CSS[4]);
  },
  BUNDLE_TIMEOUT_MS,
);

// --- Leg (b) [M2]: the linter is green on the tree ---------------------------

test(
  'leg (b) [M2]: `bun run lint:ui` exits 0',
  () => {
    const run = Bun.spawnSync(['bun', 'run', 'lint:ui'], {cwd: ROOT});

    expectGreen(
      {
        exitCode: run.exitCode,
        output: `${run.stdout.toString()}${run.stderr.toString()}`,
      },
      'bun run lint:ui',
    );
  },
  SPAWN_TIMEOUT_MS,
);

// --- Leg (c) [M3]: every interaction by role and name, no view on a class ----

test(
  'leg (c) [M3]: every action of every non-callback exam names its control by {role, name}',
  async () => {
    const {exams} = await contextOnce();
    const interacting = exams.filter((exam) => exam.action !== 'callback');

    // Not a vacuous pass: the fixture's interaction exams are the point of M3.
    expect(interacting.length).toBeGreaterThan(0);

    for (const exam of interacting) {
      for (const action of exam.action as Action[]) {
        const locator = locatorOf(action);
        const named =
          typeof locator === 'object' &&
          locator !== null &&
          typeof (locator as {role?: unknown}).role === 'string' &&
          typeof (locator as {name?: unknown}).name === 'string';
        if (!named) {
          throw new Error(
            `${exam.path} names a control as ${JSON.stringify(locator)} — M3 asks for an object with a string \`role\` and a string \`name\``,
          );
        }
        expect(named).toBe(true);
      }
    }
  },
  SUITE_TIMEOUT_MS,
);

test(
  'leg (c) [M3]: no view selector of any exam contains a `.` followed by a letter',
  async () => {
    const {exams} = await contextOnce();

    for (const exam of exams) {
      for (const view of viewsOf(exam.view)) {
        if (/\.[A-Za-z]/.test(view.selector)) {
          throw new Error(
            `${exam.path} asserts a view over ${JSON.stringify(view.selector)} — M3 asks that no selector name a class`,
          );
        }
        expect(/\.[A-Za-z]/.test(view.selector)).toBe(false);
      }
    }
  },
  SUITE_TIMEOUT_MS,
);

// --- Leg (d) [M4]: the second row, clicked by its name ----------------------

// A file's whole state exam is the single `stateExam({…})` in it. `walk the dog`
// is row `1` — the list paints ascending by row id — so this click lands where
// no first-match CSS selector could have taken it.
stateExam({
  clock: CLOCK,
  entry: ENTRY,
  seed: 'state-exams/seeds/two-open-todos.json',
  store: () => createTodosStore(),
  action: {click: {role: 'checkbox', name: 'walk the dog'}},
  expected: EXPECTED_FILE,
  view: [
    {selector: '#todoList li', count: 2},
    {selector: '[data-slot=checkbox]', count: 2},
    {selector: '#todo-1', checked: true},
    {selector: '#todo-0', unchecked: true},
    {selector: '#todoList li[data-completed="true"]', count: 1, text: 'walk the dog'},
    {selector: '#todoInput [data-slot=input]', count: 1},
    {selector: '#todoInput [data-slot=button]', count: 1, text: 'Add'},
  ],
  mutant: [{table: 'todos', row: '1', cell: 'completed', value: false}],
});

// --- Leg (e) [M5]: the ids and data attributes an exam holds onto -----------

for (const id of IDS) {
  test(`leg (e) [M5]: renderStatic over ${EXPECTED_FILE} paints exactly one #${id}`, async () => {
    expect((await renderedOnce()).querySelectorAll(`#${id}`).length).toBe(1);
  });
}

test("leg (e) [M5]: each #filter-* carries data-active \"true\" or \"false\", exactly one of them \"true\"", async () => {
  const root = await renderedOnce();

  const actives = ['filter-all', 'filter-open', 'filter-done'].map((id) =>
    root.querySelector(`#${id}`)?.getAttribute('data-active'),
  );

  for (const active of actives) {
    expect(['true', 'false']).toContain(active);
  }
  expect(actives.filter((active) => active === 'true').length).toBe(1);
});

test('leg (e) [M5]: each #todoList li carries data-completed and data-overdue, each "true" or "false"', async () => {
  const rows = rowsOf(await renderedOnce());

  // The state has two todos, so an empty list here would be the finding rather
  // than a vacuous pass.
  expect(rows.length).toBe(2);
  for (const row of rows) {
    expect(['true', 'false']).toContain(row.getAttribute('data-completed'));
    expect(['true', 'false']).toContain(row.getAttribute('data-overdue'));
  }
});

test('leg (e) [M5]: #todo-0 and #todo-1 carry role="checkbox" and an aria-label equal to the row\'s text', async () => {
  const root = await renderedOnce();

  for (const [id, text] of [
    ['todo-0', 'buy milk'],
    ['todo-1', 'walk the dog'],
  ] as const) {
    const element = root.querySelector(`#${id}`);
    expect(element?.getAttribute('role')).toBe('checkbox');
    expect(element?.getAttribute('aria-label')).toBe(text);
  }
});

test('leg (e) [M5]: #due-0 and #due-1 carry an aria-label starting `Due date for `', async () => {
  const root = await renderedOnce();

  for (const id of ['due-0', 'due-1']) {
    const label = root.querySelector(`#${id}`)?.getAttribute('aria-label') ?? '';
    expect(label.startsWith('Due date for ')).toBe(true);
  }
});

test('leg (e) [M5]: every #todoList li has a button whose aria-label starts `Delete `', async () => {
  const rows = rowsOf(await renderedOnce());

  expect(rows.length).toBe(2);
  for (const row of rows) {
    const labels = row
      .querySelectorAll('button, [role=button]')
      .map((element) => element.getAttribute('aria-label') ?? '');
    expect(labels.some((label) => label.startsWith('Delete '))).toBe(true);
  }
});

// --- Leg (f) [M6]: the five `Run:` lines, and no exam lost ------------------

test(
  'leg (f) [M6]: `bun run lint:ui` exits 0',
  async () => {
    expectGreen(await runLine(['bun', 'run', 'lint:ui']), 'bun run lint:ui');
  },
  SPAWN_TIMEOUT_MS,
);

test(
  'leg (f) [M6]: `test "$(ls client/src/*.css)" = client/src/index.css` exits 0',
  async () => {
    const line = 'test "$(ls client/src/*.css)" = client/src/index.css';
    expectGreen(await runLine(['bash', '-c', line]), line);
  },
  SPAWN_TIMEOUT_MS,
);

// The two `bun test` lines are registered only in the outer run: this file
// lives in the directory the first of them runs, so an unguarded spawn would
// re-enter it without end. The outer run is the one that grades both lines.
if (!IS_NESTED) {
  test(
    'leg (f) [M6]: `bun test tests/state-exams` exits 0',
    async () => {
      expectGreen(
        await runLine(['bun', 'test', 'tests/state-exams'], {[NESTED]: '1'}),
        'bun test tests/state-exams',
      );
    },
    SUITE_TIMEOUT_MS,
  );

  test(
    'leg (f) [M6]: `bun test packages/tinyapp-lint packages/tinyapp-exam` exits 0',
    async () => {
      expectGreen(
        await runLine(['bun', 'test', 'packages/tinyapp-lint', 'packages/tinyapp-exam'], {
          [NESTED]: '1',
        }),
        'bun test packages/tinyapp-lint packages/tinyapp-exam',
      );
    },
    SUITE_TIMEOUT_MS,
  );
}

test(
  'leg (f) [M6]: `git diff --name-status $ULTRA_BASE -- tests/state-exams` has no D and no R row',
  async () => {
    const base = process.env.ULTRA_BASE ?? BASE_AT_WRITING;
    const known = await runLine(['git', 'cat-file', '-e', `${base}^{commit}`]);
    if (known.exitCode !== 0) {
      throw new Error(
        `neither $ULTRA_BASE nor ${BASE_AT_WRITING} names a commit in this repository — set ULTRA_BASE to the sha this task branched from and run this exam again`,
      );
    }

    const diff = await runLine(['git', 'diff', '--name-status', base, '--', 'tests/state-exams']);
    expectGreen(diff, `git diff --name-status ${base} -- tests/state-exams`);

    const moved = diff.output
      .split('\n')
      .filter((row) => /^[DR]/.test(row));
    expect(moved).toEqual([]);
  },
  SPAWN_TIMEOUT_MS,
);

test('leg (f) [M6]: every exam file that exists at BASE is still under tests/state-exams', () => {
  const here = readdirSync(join(ROOT, 'tests', 'state-exams'))
    .filter((name) => name.endsWith('.test.ts'))
    .sort();

  for (const name of EXAMS_AT_BASE) {
    expect(here).toContain(name);
  }
});

// --- Leg (g) [M7]: the linter still fires on a class outside the system ------

test(
  'leg (g) [M7]: a stray `todoItem` class is one shadcn/no-unknown-classes finding, and the tree is green again once it is gone',
  async () => {
    const dir = `lint-ui-tmp-${Math.random().toString(36).slice(2, 10)}`;
    const relative = `client/src/${dir}/Stray.tsx`;
    const line = 'bun run lint:ui -f json';

    try {
      mkdirSync(join(ROOT, 'client', 'src', dir), {recursive: true});
      writeFileSync(
        join(ROOT, relative),
        'export const Stray = () => <div className="todoItem">x</div>;\n',
        'utf8',
      );

      const run = Bun.spawnSync(['bun', 'run', 'lint:ui', '-f', 'json'], {cwd: ROOT});
      const output = `${run.stdout.toString()}${run.stderr.toString()}`;

      expect(run.exitCode).toBe(1);

      const entries = jsonArrayOf(output, line);
      const entry = entries.find((one) => one.filePath.endsWith(relative));
      if (entry === undefined) {
        throw new Error(
          `\`${line}\` reported no entry for ${relative}; it reported ${JSON.stringify(entries.map((one) => one.filePath))}`,
        );
      }

      expect(entry.messages.length).toBe(1);
      expect(entry.messages[0].ruleId).toBe('shadcn/no-unknown-classes');
      expect(entry.messages[0].message).toContain('todoItem');
      expect(entry.messages[0].message).toContain('@utility');
    } finally {
      rmSync(join(ROOT, 'client', 'src', dir), {recursive: true, force: true});
    }

    expectGreen(await runLine(['bun', 'run', 'lint:ui']), 'bun run lint:ui');
  },
  SPAWN_TIMEOUT_MS,
);
