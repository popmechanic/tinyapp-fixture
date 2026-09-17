/**
 * The exam for Task 2 — "shadcn/ui installed on the client — Tailwind v4 on
 * Vite, the tokens, the four components".
 *
 * Legs and the Machine clauses they come from:
 *   (a) [M1] `client/src/index.tsx`'s first statement is `import './index.css';`
 *            and `client/src/index.css` starts with `@import "tailwindcss";`
 *            and carries an `@theme inline` block;
 *   (b) [M1] `bundleOf('client/index.html', readFileSync('client/index.html'))`
 *            resolves and its `css` contains `--color-primary`,
 *            `--color-background` and `--radius-lg`;
 *   (c) [M2] `client/components.json` parses to `style` `base-nova`,
 *            `tailwind.css` `src/index.css`, `aliases.ui` `@/components/ui`;
 *   (d) [M2] `client/tsconfig.json`'s `compilerOptions.paths` deep-equals
 *            `{"@/*": ["./src/*"]}`, `'baseUrl' in compilerOptions` is `false`,
 *            and `client/vite.config.js` contains `@tailwindcss/vite`;
 *   (e) [M3] one test per component — `renderToStaticMarkup` of the element as
 *            M3 spells it carries the `data-slot` text named there, plus `Add`
 *            for the button and `role="checkbox"` for the checkbox;
 *   (f) [M4] the single `stateExam({…})` in this file, spelled as the leg does:
 *            the seeded page still reaches `one-open-todo.json`, shows
 *            `#todoList` once with `buy milk` and `#todo-0` unchecked, and the
 *            mutant of row `0`'s `completed` is killed.
 *
 * Leg (g) [M5] ran the typecheck and a frozen-lockfile install as child
 * commands. Both are gone: one claim, one prover — this file proves the design
 * system is installed, and the run's own checks prove the tree still typechecks
 * and its lockfile is still honoured.
 *
 * Four readings this file makes, written down because they are choices:
 *
 *   - The four components are reached by `await import()` inside each leg's own
 *     test body, not by a module-level import. None of the four files exists at
 *     BASE, and a module-level import of an absent module is one load error for
 *     the whole file; this way each of leg (e)'s four tests is its own red and
 *     names the file shadcn's CLI has yet to write.
 *   - The Proof names this file `.test.ts`, where JSX is not available, so the
 *     elements M3 spells as JSX are built with `createElement`:
 *     `createElement(Button, null, 'Add')` is `<Button>Add</Button>` — the same
 *     element, rendered by the same `renderToStaticMarkup`. No element's props
 *     or children differ from the clause.
 *   - Every file read happens inside a test body, never at module level: the
 *     state linter's capture child imports this file with `stateExam` and
 *     `bun:test` stubbed out, so a module-level read of `client/src/index.css`
 *     — a file this task creates — would make `lint:state` fail as `capture
 *     failed` rather than leave leg (a) red as the finding it is.
 *   - Legs (b) and (f) are written for a run whose working directory is the
 *     repository root, which is what running this file by its
 *     `tests/state-exams/…` path and the helper's own `pageFor` already assume;
 *     leg (b) keeps the leg's literal relative `'client/index.html'` and says so
 *     when the directory is wrong, so a mis-run never reads as a missing entry.
 *
 * Leg (f) holds at BASE and is meant to: M4 is the regression clause — the app
 * still works over the seeded page — the point being that installing the system
 * leaves it alone. The red at BASE is legs (a)–(e).
 */

import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {expect, test} from 'bun:test';
import {createElement, type ComponentType} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {bundleOf, stateExam} from 'tinyapp-exam';

import {addTodo, createTodosStore} from '../../client/src/storeData';

/** This file sits two directories below the repository root. */
const ROOT = join(import.meta.dir, '..', '..');

/** The entry the render move builds, as leg (b) spells it. */
const ENTRY = 'client/index.html';

/** The wall a leg that bundles the client is given, in milliseconds. */
const BUNDLE_TIMEOUT_MS = 180_000;

/**
 * The text of a file this task must write, or a failure that names the missing
 * file rather than one that reads like a typo here.
 */
const readTree = (relative: string): string => {
  const path = join(ROOT, relative);
  if (!existsSync(path)) {
    throw new Error(
      `${relative} does not exist — this task must create it before its exam can grade it`,
    );
  }
  return readFileSync(path, 'utf8');
};

/** The same, parsed as JSON. */
const readTreeJson = (relative: string): any => JSON.parse(readTree(relative));

/**
 * `source` with its leading blank lines and comments dropped, so leg (a) can
 * read the *first statement* M1 names rather than the first character: a file
 * doc comment above the import is not a statement.
 */
const firstStatementOf = (source: string): string => {
  let rest = source.replace(/^\uFEFF/, '');
  for (;;) {
    const trimmed = rest.replace(/^\s+/, '');
    if (trimmed.startsWith('//')) {
      rest = trimmed.replace(/^\/\/[^\n]*/, '');
      continue;
    }
    if (trimmed.startsWith('/*')) {
      const end = trimmed.indexOf('*/');
      if (end < 0) {
        return trimmed;
      }
      rest = trimmed.slice(end + 2);
      continue;
    }
    return trimmed;
  }
};

/** `text`'s opening `prefix.length` characters, for an equality that reads. */
const head = (text: string, prefix: string): string => text.slice(0, prefix.length);

/**
 * One of the four components' modules, imported by relative path — the four
 * generated files import `cn` from the `cn` package directly, so no `@/` alias
 * has to resolve for this to load.
 */
const importUi = async (name: string): Promise<Record<string, unknown>> => {
  const relative = `client/src/components/ui/${name}.tsx`;
  if (!existsSync(join(ROOT, relative))) {
    throw new Error(
      `${relative} does not exist — this task must create it with shadcn's own CLI before its exam can grade it`,
    );
  }
  return (await import(`../../client/src/components/ui/${name}`)) as Record<
    string,
    unknown
  >;
};

/** The named export of one of those modules, or a failure naming the export. */
const exportOf = async (name: string, exported: string): Promise<ComponentType<any>> => {
  const module = await importUi(name);
  const component = module[exported];
  if (component === undefined || component === null) {
    throw new Error(
      `client/src/components/ui/${name}.tsx exports no \`${exported}\` — this task produces it`,
    );
  }
  return component as ComponentType<any>;
};

// --- Leg (a) [M1]: the entry imports the stylesheet, the stylesheet is Tailwind's

test("leg (a) [M1]: client/src/index.tsx's first statement is `import './index.css';`", () => {
  const source = readTree('client/src/index.tsx');
  const statement = "import './index.css';";

  expect(head(firstStatementOf(source), statement)).toBe(statement);
});

test('leg (a) [M1]: client/src/index.css starts with `@import "tailwindcss";` and carries an `@theme inline` block', () => {
  const css = readTree('client/src/index.css');
  const first = '@import "tailwindcss";';

  expect(head(css, first)).toBe(first);
  expect(css).toContain('@theme inline');
});

// --- Leg (b) [M1]: the bundle the render move builds carries the tokens ------

test(
  'leg (b) [M1]: the CSS of `bundleOf(\'client/index.html\', …)` contains --color-primary, --color-background and --radius-lg',
  async () => {
    if (!existsSync(ENTRY)) {
      throw new Error(
        `${ENTRY} is not there relative to ${process.cwd()} — this exam is run from the repository root, by its path ${'tests/state-exams/design-system-installed.test.ts'}`,
      );
    }

    const bundle = await bundleOf(ENTRY, readFileSync(ENTRY, 'utf8'));

    expect(bundle.css).toContain('--color-primary');
    expect(bundle.css).toContain('--color-background');
    expect(bundle.css).toContain('--radius-lg');
  },
  BUNDLE_TIMEOUT_MS,
);

// --- Leg (c) [M2]: components.json ------------------------------------------

test('leg (c) [M2]: client/components.json parses to style base-nova, tailwind.css src/index.css, aliases.ui @/components/ui', () => {
  const manifest = readTreeJson('client/components.json');

  expect(manifest.style).toBe('base-nova');
  expect(manifest.tailwind.css).toBe('src/index.css');
  expect(manifest.aliases.ui).toBe('@/components/ui');
});

// --- Leg (d) [M2]: the alias, the absent baseUrl, the Vite plugin -----------

test("leg (d) [M2]: client/tsconfig.json's compilerOptions.paths is {\"@/*\": [\"./src/*\"]} and it has no baseUrl", () => {
  const options = readTreeJson('client/tsconfig.json').compilerOptions;

  expect(options.paths).toEqual({'@/*': ['./src/*']});
  expect('baseUrl' in options).toBe(false);
});

test('leg (d) [M2]: client/vite.config.js contains @tailwindcss/vite', () => {
  expect(readTree('client/vite.config.js')).toContain('@tailwindcss/vite');
});

// --- Leg (e) [M3]: the four components, one test each ------------------------

test('leg (e) [M3]: `<Button>Add</Button>` renders data-slot="button" and Add', async () => {
  const Button = await exportOf('button', 'Button');

  const markup = renderToStaticMarkup(createElement(Button, null, 'Add'));

  expect(markup).toContain('data-slot="button"');
  expect(markup).toContain('Add');
});

test('leg (e) [M3]: `<Input placeholder="x" />` renders data-slot="input"', async () => {
  const Input = await exportOf('input', 'Input');

  const markup = renderToStaticMarkup(createElement(Input, {placeholder: 'x'}));

  expect(markup).toContain('data-slot="input"');
});

test('leg (e) [M3]: `<Checkbox aria-label="buy milk" />` renders role="checkbox" and data-slot="checkbox"', async () => {
  const Checkbox = await exportOf('checkbox', 'Checkbox');

  const markup = renderToStaticMarkup(
    createElement(Checkbox, {'aria-label': 'buy milk'}),
  );

  expect(markup).toContain('role="checkbox"');
  expect(markup).toContain('data-slot="checkbox"');
});

test('leg (e) [M3]: `<Badge>1</Badge>` renders data-slot="badge"', async () => {
  const Badge = await exportOf('badge', 'Badge');

  const markup = renderToStaticMarkup(createElement(Badge, null, '1'));

  expect(markup).toContain('data-slot="badge"');
});

// --- Leg (f) [M4]: the app still works over the seeded page ------------------

// A file's whole state exam is the single `stateExam({…})` in it: adding
// `buy milk` to the empty seed reaches `one-open-todo.json`, the page shows
// `#todoList` once carrying that text with `#todo-0` unchecked, and the mutant
// that ticks row `0` is noticed.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/empty.json',
  store: () => createTodosStore(),
  action: (store) => {
    addTodo(store, 'buy milk');
  },
  expected: 'state-exams/expected/one-open-todo.json',
  view: [
    {selector: '#todoList', count: 1, text: 'buy milk'},
    {selector: '#todo-0', unchecked: true},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: true}],
});
