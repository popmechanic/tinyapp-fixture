/**
 * Loading everything a rule reads, once, before any rule runs.
 *
 * A rule is handed the app's own vocabulary already in hand: the schema as the
 * store module exports it, the mutation callbacks by name, every seed and
 * expected file parsed through the schema, every state exam's spec, and a
 * renderer that paints a state without opening anything.
 *
 * Two things are deliberately narrow. The schema is the module's own
 * `TABLES_SCHEMA` object and is never read back out of a store: TinyBase keeps
 * its own copy and drops any key it does not know — `ref` among them — so a
 * convention the app writes into the export survives only in the export. And
 * the loader reads exactly the directories it was pointed at: a `lint-tmp-…`
 * directory beside the seeds is invisible to a default run, which is what lets
 * a rule's own exam seed one violation without disturbing the fixture.
 */

import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';

import {parse} from 'node-html-parser';
import {createMergeableStore} from 'tinybase/with-schemas';

import {captureExams} from './capture';
import type {
  Callback,
  Invariant,
  LintContext,
  Snapshot,
  SnapshotFile,
  TablesSchema,
} from './types';

export {captureExams} from './capture';
export {formatFinding, runLint, RULES_DIR} from './lint';
export type {
  Callback,
  Cell,
  CellSchema,
  ExamSpec,
  Finding,
  Invariant,
  LintContext,
  Row,
  Rule,
  Snapshot,
  SnapshotFile,
  TablesSchema,
} from './types';

/** Where the linter looks, and the clock a state is read under. */
export type LoadOptions = {
  root: string;
  store: string;
  page: string;
  seeds: string;
  expected: string;
  exams: string;
  clock: string;
};

/** The fixture's own layout — every path relative to `root`. */
export const LOAD_DEFAULTS: Omit<LoadOptions, 'root'> = {
  store: 'client/src/storeData.ts',
  page: 'client/src/StaticPage.tsx',
  seeds: 'state-exams/seeds',
  expected: 'state-exams/expected',
  exams: 'tests/state-exams',
  clock: '2026-01-01T00:00:00Z',
};

/** `opts` over the defaults, ignoring keys handed over as `undefined`. */
const settle = (opts: Partial<LoadOptions>): LoadOptions => {
  const settled: LoadOptions = {root: process.cwd(), ...LOAD_DEFAULTS};
  for (const [key, value] of Object.entries(opts)) {
    if (value !== undefined) {
      settled[key as keyof LoadOptions] = value;
    }
  }
  return settled;
};

/** A path under `root`, written with forward slashes whatever the platform. */
const relativeTo = (root: string, path: string): string =>
  resolve(path).slice(resolve(root).length + 1).replaceAll('\\', '/');

/**
 * An exported function that is one of the store's mutations.
 *
 * A mutation takes the store it acts on, so it has at least one parameter —
 * which is what tells `readSeed` (none) from the four that act. A `create…` or
 * `read…` makes or reads a store rather than moving one, and is named so.
 */
const isCallback = (name: string, value: unknown): value is Callback =>
  typeof value === 'function' &&
  value.length >= 1 &&
  !name.startsWith('create') &&
  !name.startsWith('read');

/** The `.json` files of `dir`, sorted; `[]` when there is no such directory. */
const snapshotFilesOf = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .sort()
    : [];

/**
 * Each input's `checked` property copied onto a `data-checked` attribute, the
 * way `tinyapp-exam`'s `REFLECT_CHECKED` does it in a page.
 *
 * `checked` is a DOM property and invisible in markup, so a view asking for it
 * would read nothing at all off a static render. Reflecting it here is what
 * makes `assertView` read this markup exactly as it reads a page's.
 */
const reflectChecked = (html: string): string => {
  const root = parse(html);
  for (const input of root.querySelectorAll('input')) {
    input.setAttribute(
      'data-checked',
      input.hasAttribute('checked') ? 'true' : 'false',
    );
  }
  return root.toString();
};

/** Everything the rules read, loaded from `root`. */
export const loadContext = async (
  opts: Partial<LoadOptions> = {},
): Promise<LintContext> => {
  const {root, store, page, seeds, expected, exams, clock} = settle(opts);

  const storeModule = (await import(resolve(root, store))) as Record<
    string,
    unknown
  >;
  const schema = storeModule.TABLES_SCHEMA as TablesSchema;
  const invariants = (storeModule.INVARIANTS as Invariant[] | undefined) ?? [];

  const callbacks: Record<string, Callback> = {};
  for (const name of Object.keys(storeModule).sort()) {
    const value = storeModule[name];
    if (isCallback(name, value)) {
      callbacks[name] = value;
    }
  }

  const createStore = (content: Snapshot) =>
    (createMergeableStore() as any)
      .setTablesSchema(schema)
      .setContent(content) as {
      setContent(c: Snapshot): unknown;
      getContent(): Snapshot;
    };

  const snapshots: SnapshotFile[] = [];
  for (const [dir, kind] of [
    [expected, 'expected'],
    [seeds, 'seed'],
  ] as const) {
    const absolute = resolve(root, dir);
    for (const name of snapshotFilesOf(absolute)) {
      const path = join(absolute, name);
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
      snapshots.push({
        path: relativeTo(root, path),
        kind,
        content: createStore(parsed).getContent(),
      });
    }
  }
  snapshots.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const pageModule = (await import(resolve(root, page))) as {
    renderStatic: (content: Snapshot) => string;
  };

  return {
    storePath: store,
    schema,
    invariants,
    callbacks,
    snapshots,
    exams: await captureExams(resolve(root, exams), {root}),
    createStore,
    render: (content: Snapshot) => reflectChecked(pageModule.renderStatic(content)),
    clock,
  };
};
