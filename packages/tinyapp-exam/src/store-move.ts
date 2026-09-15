/**
 * The store move: load a seed, run one action under the determinism contract,
 * and report every cell that differs from the state the examiner expected.
 *
 * There are two forms of it, because there are two forms of action. A callback
 * runs against a store this process makes, and `withContract` is what pins its
 * clock and unplugs its network. An interaction runs in a page — the app's own
 * click handler, its own reducer, its own store — and the contract there is the
 * driver's: a clock pinned before a line of the app runs and every request
 * blocked in the browser. Both forms run twice on a fresh start and must agree.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import type {Browser, Page} from './browser';
import {withContract} from './contract';
import {pageFor} from './render-move';
import {
  VALUES_TABLE,
  actionsOf,
  isCallbackAction,
  type Action,
  type Cell,
  type Difference,
  type ExamStore,
  type Snapshot,
  type StateExamSpec,
} from './types';

export {withContract} from './contract';
export type {
  Action,
  Cell,
  Difference,
  ExamRecord,
  ExamStore,
  MutantEdit,
  Snapshot,
  StateExamSpec,
  Tables,
  Values,
  View,
} from './types';

/** The union of two objects' keys, in string order. */
const idsOf = (
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined,
): string[] =>
  [...new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})])].sort();

const cellOf = (
  cells: Record<string, Cell> | undefined,
  cell: string,
): Cell | null => (cells != null && cell in cells ? cells[cell]! : null);

/**
 * Every cell that differs between two snapshots, ordered by table, then row,
 * then cell in string order, with store values — `table` `$values`, `row` the
 * empty string — after every table row. `[]` means the two are deep-equal.
 */
export const diffContent = (got: Snapshot, wanted: Snapshot): Difference[] => {
  const [gotTables, gotValues] = got;
  const [wantedTables, wantedValues] = wanted;
  const differences: Difference[] = [];

  for (const table of idsOf(gotTables, wantedTables)) {
    const gotRows = gotTables?.[table];
    const wantedRows = wantedTables?.[table];
    for (const row of idsOf(gotRows, wantedRows)) {
      const gotCells = gotRows?.[row];
      const wantedCells = wantedRows?.[row];
      for (const cell of idsOf(gotCells, wantedCells)) {
        const gotCell = cellOf(gotCells, cell);
        const wantedCell = cellOf(wantedCells, cell);
        if (gotCell !== wantedCell) {
          differences.push({table, row, cell, got: gotCell, wanted: wantedCell});
        }
      }
    }
  }

  for (const value of idsOf(gotValues, wantedValues)) {
    const gotValue = cellOf(gotValues, value);
    const wantedValue = cellOf(wantedValues, value);
    if (gotValue !== wantedValue) {
      differences.push({
        table: VALUES_TABLE,
        row: '',
        cell: value,
        got: gotValue,
        wanted: wantedValue,
      });
    }
  }

  return differences;
};

const spell = (cell: Cell | null): string =>
  cell === null ? 'absent' : JSON.stringify(cell);

/** The diff table: a header line, then one line per difference, in order. */
export const renderDiff = (differences: Difference[]): string =>
  [
    'table / row / cell / got / wanted',
    ...differences.map(
      ({table, row, cell, got, wanted}) =>
        `${table} / ${row} / ${cell} / ${spell(got)} / ${spell(wanted)}`,
    ),
  ].join('\n');

/** Reads a snapshot from a path relative to `process.cwd()`. */
const readSnapshot = (path: string): Snapshot =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as Snapshot;

const at = ({table, row, cell}: Difference): string => `${table}/${row}/${cell}`;

/**
 * Loads `seed` into a fresh store and runs `spec.action` under the contract.
 *
 * TinyBase drops cells the schema does not know and fills in the ones it
 * defaults, silently — so the seed is checked by comparing the loaded content
 * against the file rather than by watching for an error.
 */
const runOnce = async <S extends ExamStore>(
  spec: StateExamSpec<S>,
  seed: Snapshot,
): Promise<S> => {
  if (spec.store === undefined) {
    throw new Error('store move: a callback action needs a store');
  }
  if (!isCallbackAction(spec.action)) {
    throw new Error('store move: an interaction needs a page');
  }
  const action = spec.action;

  const store = spec.store();
  store.setContent(seed);

  const violations = diffContent(store.getContent(), seed);
  if (violations.length > 0) {
    throw new Error(
      `snapshot violates schema: ${spec.seed} at ${at(violations[0]!)}`,
    );
  }

  await withContract(spec.clock, () => action(store));
  return store;
};

/**
 * Runs one state exam's store move.
 *
 * Resolves `{content, diff, ms}` — the store's content after the action, its
 * difference from `spec.expected`, and how long the first run took. Rejects
 * when the seed does not survive the schema (before the action ever runs), when
 * the action breaches the contract, or when two runs on fresh stores disagree.
 */
export const storeMove = async <S extends ExamStore>(
  spec: StateExamSpec<S>,
): Promise<{content: Snapshot; diff: Difference[]; ms: number}> => {
  const seed = readSnapshot(spec.seed);

  const started = performance.now();
  const first = (await runOnce(spec, seed)).getContent();
  const ms = performance.now() - started;

  // A second run on a fresh store catches what the contract could not pin — a
  // `Math.random`, an id drawn from anywhere but the store.
  const second = (await runOnce(spec, seed)).getContent();
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error(
      `nondeterministic store: ${spec.seed}\n${renderDiff(
        diffContent(first, second),
      )}`,
    );
  }

  return {content: first, diff: diffContent(first, readSnapshot(spec.expected)), ms};
};

/** The one expression the exam reads a page's store through. */
export const READ_CONTENT =
  'JSON.stringify(window.__TINYAPP_STORE__.getContent())';

/** What one page of the browser store move gave up. */
type PageRun = {
  content: Snapshot;
  actionMs: number;
  shotMs: number | null;
  shot?: {dom: string; screenshot: Uint8Array};
};

/**
 * Opens one page on `html`, performs `actions` in order, and reads its store.
 *
 * `photograph` asks for the picture and the markup of this very page, after the
 * interaction and before it is closed — the whole point of the browser form is
 * that the evidence is of the page the action happened in.
 */
const actOnPage = async (
  browser: Browser,
  html: string,
  clock: string,
  actions: Action[],
  photograph: boolean,
): Promise<PageRun> => {
  const page: Page = await browser.open({html, clock});
  try {
    const started = performance.now();
    for (const action of actions) {
      await page.act(action);
    }
    const actionMs = Math.max(0, performance.now() - started);

    const read = await page.evaluate(READ_CONTENT);
    // The page answers a string; a stand-in browser may answer the pair itself.
    const content = (
      typeof read === 'string' ? JSON.parse(read) : read
    ) as Snapshot;

    if (!photograph) {
      return {content, actionMs, shotMs: null};
    }
    const shotStarted = performance.now();
    const shot = await page.snapshot();
    return {content, actionMs, shotMs: Math.max(0, performance.now() - shotStarted), shot};
  } finally {
    await page.close().catch(() => {});
  }
};

/**
 * Runs one state exam's store move in the browser, for an action that is an
 * interaction rather than a callback.
 *
 * Resolves `{content, diff, ms, actionMs, renderMs, dom, screenshot}` — the
 * page's store content after the interaction, its difference from
 * `spec.expected`, the wall of the whole first page, of its interaction alone
 * and of its picture alone, and the picture and markup of that same first page.
 * Rejects with `nondeterministic store:` when a
 * second fresh page, acted on the same way, reaches a different content.
 *
 * The bundle is built once and both pages are opened from it, so the two runs
 * differ in nothing the exam controls.
 */
export const browserStoreMove = async <S extends ExamStore>(
  spec: StateExamSpec<S>,
  browser: Browser,
  opts: {minify?: boolean} = {},
): Promise<{
  content: Snapshot;
  diff: Difference[];
  ms: number;
  actionMs: number;
  renderMs: number;
  dom: string;
  screenshot: Uint8Array;
}> => {
  if (spec.entry === undefined || spec.entry === '') {
    throw new Error('store move: an interaction needs an entry to open');
  }
  const actions = actionsOf(spec.action);
  const seed = readSnapshot(spec.seed);
  const html = await pageFor(spec.entry, seed, opts);

  const started = performance.now();
  const first = await actOnPage(browser, html, spec.clock, actions, true);
  const ms = Math.max(0, performance.now() - started);

  // A second fresh page catches what the pinned clock could not — a `Math.random`,
  // an id drawn from anywhere but the store. Only the first page is photographed.
  const second = await actOnPage(browser, html, spec.clock, actions, false);
  if (JSON.stringify(first.content) !== JSON.stringify(second.content)) {
    throw new Error(
      `nondeterministic store: ${spec.seed}\n${renderDiff(
        diffContent(first.content, second.content),
      )}`,
    );
  }

  return {
    content: first.content,
    diff: diffContent(first.content, readSnapshot(spec.expected)),
    ms,
    actionMs: first.actionMs,
    renderMs: first.shotMs ?? 0,
    dom: first.shot?.dom ?? '',
    screenshot: first.shot?.screenshot ?? new Uint8Array(),
  };
};
