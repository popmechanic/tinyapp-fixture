// Exam for Task 1 — "The exam flag: an unseeded page that carries
// `window.__TINYAPP_EXAM__` hands the exam its store, its SQLite handle and its
// persister, and dials no socket".
//
// Claim under test: when an exam opens the app unseeded and raises its flag, the
// page hands over its store, its SQLite database and — once it has finished
// loading — its persister, and never tries to reach the sync server; a page
// without the flag is exactly the page it was, seeded or not.
//
// Legs covered here:
//   (a) [M1] `readExamFlag()` and what `createTodosStore()` does with it, over a
//       plain `globalThis.window` — no DOM needed, the shape of
//       `client/test/todos-store.test.ts` leg (e).
//   (d) [M4] the one `stateExam({…})`: the seeded page still works.
//   (e) [M5] the Proof's two documentation lines, read here out of `AGENTS.md`
//       itself rather than out of a child shell's exit status. The third line of
//       that leg ran the two BASE render exams as children; it is gone, because
//       those two exams prove themselves and the fold's suite runs them once.
//
// Legs (b) and (c) [M2, M3] — the rendered flagged page — are the other file of
// this Proof, `client/test/exam-page.test.ts`, because they need a DOM.
//
// `storeData` is imported as a namespace as well as by name: at BASE
// `readExamFlag` does not exist yet, and a named import of a missing export
// would fail this whole file to link, taking legs (d) and (e) down with it. As a
// namespace lookup the absence is what leg (a) reports, and nothing else.

import {readFileSync} from 'node:fs';

import {expect, test} from 'bun:test';
import {stateExam} from 'tinyapp-exam';

import * as storeData from '../../client/src/storeData';
import {addTodo, createTodosStore} from '../../client/src/storeData';

// This file lives at `tests/state-exams/`, so the repository root is two levels
// up. The `Run:` lines are shell pipelines relative to it.
const ROOT = `${import.meta.dir}/../..`;

// The module under test, read through a shape that does not require the export
// to exist yet — its absence is leg (a)'s first assertion, not a link error.
const module_ = storeData as unknown as {readExamFlag?: () => boolean};

// Leg (a)'s "<the two-open-todos content>", read from the seed checked in rather
// than transcribed here.
const TWO_OPEN_TODOS = JSON.parse(
  readFileSync(`${ROOT}/state-exams/seeds/two-open-todos.json`, 'utf8'),
) as storeData.TodosContent;

/**
 * Runs `body` with `globalThis.window` set to `replacement` — or deleted, when
 * that is `undefined` — and puts the real one back afterwards.
 *
 * The restore is in a `finally`, per the leg: this file shares its process with
 * the state exam below, which opens a real browser, and with whatever else a
 * whole-suite run loads after it.
 */
const withWindow = (replacement: object | undefined, body: () => void): void => {
  const g = globalThis as unknown as {window?: unknown};
  const had = Object.prototype.hasOwnProperty.call(g, 'window');
  const saved = Object.getOwnPropertyDescriptor(g, 'window');

  try {
    delete g.window;
    if (replacement !== undefined) {
      g.window = replacement;
    }
    body();
  } finally {
    delete g.window;
    if (had && saved) {
      Object.defineProperty(g, 'window', saved);
    }
  }
};

/** What `window.__TINYAPP_STORE__` currently holds, whatever `window` is. */
const globalStore = (): unknown =>
  (globalThis as unknown as {window?: {__TINYAPP_STORE__?: unknown}}).window
    ?.__TINYAPP_STORE__;

// ---------------------------------------------------------------------------
// Leg (a) [M1] — `readExamFlag()`, and the handle `createTodosStore()` leaves.
// ---------------------------------------------------------------------------

test('leg (a) [M1]: with window.__TINYAPP_EXAM__ true, readExamFlag() is true and createTodosStore() is the very store on window.__TINYAPP_STORE__', () => {
  withWindow({__TINYAPP_EXAM__: true}, () => {
    // [M1] `storeData.ts` exports `readExamFlag(): boolean`.
    expect(typeof module_.readExamFlag).toBe('function');

    // [M1] it returns `true` exactly when `window.__TINYAPP_EXAM__ === true`.
    expect(module_.readExamFlag!()).toBe(true);

    // [M1] `createTodosStore()` with no seed sets `window.__TINYAPP_STORE__` to
    // the very store it returns — the same object, not a copy of its content.
    const store = createTodosStore();
    expect(globalStore()).toBe(store);
  });
});

test('leg (a) [M1]: with window {} the flag is false and createTodosStore() leaves window.__TINYAPP_STORE__ undefined', () => {
  withWindow({}, () => {
    // [M1] `false` when the flag is absent.
    expect(typeof module_.readExamFlag).toBe('function');
    expect(module_.readExamFlag!()).toBe(false);

    // [M1] and an unflagged unseeded store leaves the handle undefined.
    createTodosStore();
    expect(globalStore()).toBeUndefined();
  });
});

test('leg (a) [M1]: with no window at all the flag is false and createTodosStore() does not throw', () => {
  withWindow(undefined, () => {
    // [M1] `false` when there is no `window`.
    expect(typeof module_.readExamFlag).toBe('function');
    expect(module_.readExamFlag!()).toBe(false);

    // [M1] and creating a store off a page is not an error.
    expect(() => createTodosStore()).not.toThrow();
  });
});

test('leg (a) [M1]: with window {} a seeded createTodosStore() sets window.__TINYAPP_STORE__ to a store whose getContent() is the seed', () => {
  withWindow({}, () => {
    // [M1] `createTodosStore(seed)` sets the handle to the seeded store as at
    // BASE, flag or no flag — this is the no-flag half.
    createTodosStore(TWO_OPEN_TODOS);

    const exposed = globalStore() as {getContent(): unknown} | undefined;
    expect(exposed).toBeDefined();
    expect(typeof exposed!.getContent).toBe('function');
    expect(exposed!.getContent()).toEqual(TWO_OPEN_TODOS);
  });
});

// ---------------------------------------------------------------------------
// Leg (d) [M4] — the seeded page still works: `buy milk` added to an empty seed
// reaches `one-open-todo.json`, renders as one open todo, and kills the mutant
// that completes it.
// ---------------------------------------------------------------------------

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
    {selector: '#todoList li', count: 1, text: 'buy milk'},
    {selector: '#todo-0', unchecked: true},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: true}],
});

// ---------------------------------------------------------------------------
// Leg (e) [M5] — the Proof's two documentation lines, read here out of
// `AGENTS.md` in this process rather than out of a child shell's exit status.
// ---------------------------------------------------------------------------

/**
 * `AGENTS.md`'s Key Files section, folded onto one line — the same text the
 * leg's `sed -n '/^## Key Files/,/^## Working Method/p' AGENTS.md | tr '\n' ' '`
 * produced, computed here by reading the file.
 *
 * `sed`'s range is inclusive at both ends and runs to the end of the file when
 * the closing address never matches, and `tr` leaves the trailing newline as a
 * final space; this reproduces all three.
 */
const keyFilesSection = (): string => {
  const lines = readFileSync(`${ROOT}/AGENTS.md`, 'utf8').split('\n');
  const start = lines.findIndex((line) => /^## Key Files/.test(line));
  if (start < 0) {
    throw new Error('AGENTS.md carries no `## Key Files` heading');
  }
  const after = lines.slice(start + 1).findIndex((line) => /^## Working Method/.test(line));
  const end = after < 0 ? lines.length : start + 1 + after + 1;
  return `${lines.slice(start, end).join(' ')} `;
};

test("leg (e) [M5]: AGENTS.md's Key Files section names __TINYAPP_EXAM__, then __TINYAPP_DB__, then __TINYAPP_PERSISTER__", () => {
  expect(
    /__TINYAPP_EXAM__.*__TINYAPP_DB__.*__TINYAPP_PERSISTER__/.test(keyFilesSection()),
  ).toBe(true);
});

test("leg (e) [M5]: AGENTS.md's Key Files section still carries its BASE sentence, __TINYAPP_STORE__ followed later by 'normal page'", () => {
  expect(/__TINYAPP_STORE__.*normal page/.test(keyFilesSection())).toBe(true);
});
