// Exam for Task 5 — "The fixture honours the seed and exposes its callbacks".
//
// This file covers Proof legs (a)–(e) [M1–M5], (h) [M7] and (i) [M8].
// Legs (f) and (g) [M6] live in ./seeded-store.test.ts, which needs a DOM.
//
// `storeData` is imported as a namespace so that a missing export fails the one
// leg that names it, rather than failing the whole file at link time.

import {expect, test} from 'bun:test';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import * as storeData from '../src/storeData';

const sd = storeData as any;

// The buy-milk snapshot, in `getContent()` shape — `[tables, values]`.
const BUY_MILK = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}];
const EMPTY = [{}, {}];

// This file lands at `client/test/`; the repository root is two levels up.
const fromRoot = (...parts: string[]) =>
  join(import.meta.dir, '..', '..', ...parts);
const fromClient = (...parts: string[]) => join(import.meta.dir, '..', ...parts);

const readJson = (relative: string) => {
  const path = fromRoot(...relative.split('/'));
  expect(existsSync(path)).toBe(true);
  return JSON.parse(readFileSync(path, 'utf8'));
};

// ---------------------------------------------------------------------------
// The produced surface itself (Interfaces: Produces). Named first so that a
// missing callback reads as "the implementation does not exist yet".
// ---------------------------------------------------------------------------

test('storeData exports the five callbacks the task produces [M1,M2,M3,M4,M5]', () => {
  expect(typeof sd.addTodo).toBe('function');
  expect(typeof sd.setTodoCompleted).toBe('function');
  expect(typeof sd.deleteTodo).toBe('function');
  expect(typeof sd.createTodosStore).toBe('function');
  expect(typeof sd.readSeed).toBe('function');
  // `TodosStore` is a type; it has no runtime witness and is checked by the
  // client's own `tsc`, not here.
});

// ---------------------------------------------------------------------------
// Leg (a) [M1]
// ---------------------------------------------------------------------------

test("leg (a) [M1]: addTodo trims, defaults completed to false, and returns '0' on an emptied store", () => {
  const store = sd.createTodosStore(EMPTY);

  const id = sd.addTodo(store, '  buy milk ');

  expect(id).toBe('0');
  expect(store.getContent()).toEqual(BUY_MILK);
});

test('leg (a) [M1]: addTodo on the scaffold defaults returns a string id and makes a third row', () => {
  const store = sd.createTodosStore();

  const id = sd.addTodo(store, 'x');

  expect(typeof id).toBe('string');
  expect(store.getRowCount('todos')).toBe(3);
  expect(store.getCell('todos', id, 'text')).toBe('x');
  expect(store.getCell('todos', id, 'completed')).toBe(false);
});

// ---------------------------------------------------------------------------
// Leg (b) [M2]
// ---------------------------------------------------------------------------

test('leg (b) [M2]: a blank todo is refused and the store is left exactly as it was', () => {
  const store = sd.createTodosStore(EMPTY);
  const before = store.getContent();

  expect(sd.addTodo(store, '')).toBe(undefined);
  expect(store.getContent()).toEqual(EMPTY);

  expect(sd.addTodo(store, '   ')).toBe(undefined);
  expect(store.getContent()).toEqual(EMPTY);

  expect(store.getContent()).toEqual(before);
});

// ---------------------------------------------------------------------------
// Leg (c) [M3]
// ---------------------------------------------------------------------------

test('leg (c) [M3]: setTodoCompleted ticks and unticks, deleteTodo removes the row', () => {
  const store = sd.createTodosStore(EMPTY);
  sd.addTodo(store, 'a');

  sd.setTodoCompleted(store, '0', true);
  expect(store.getCell('todos', '0', 'completed')).toBe(true);

  sd.setTodoCompleted(store, '0', false);
  expect(store.getCell('todos', '0', 'completed')).toBe(false);

  sd.deleteTodo(store, '0');
  expect(store.hasRow('todos', '0')).toBe(false);
  expect(store.getContent()).toEqual(EMPTY);
});

// ---------------------------------------------------------------------------
// Leg (d) [M4]
// ---------------------------------------------------------------------------

test("leg (d) [M4]: createTodosStore() keeps exactly the scaffold's rows '1' and '2'", () => {
  const content = sd.createTodosStore().getContent();

  expect(Object.keys(content[0].todos).sort()).toEqual(['1', '2']);
});

test('leg (d) [M4]: createTodosStore(seed) yields a store whose getContent() is exactly the seed', () => {
  expect(sd.createTodosStore(EMPTY).getContent()).toEqual(EMPTY);
  expect(sd.createTodosStore(BUY_MILK).getContent()).toEqual(BUY_MILK);
});

// ---------------------------------------------------------------------------
// Leg (e) [M5]
// ---------------------------------------------------------------------------

test('leg (e) [M5]: readSeed returns window.__TINYAPP_SEED__, or undefined with no window and no error', () => {
  const g = globalThis as any;
  const had = Object.prototype.hasOwnProperty.call(g, 'window');
  const saved = Object.getOwnPropertyDescriptor(g, 'window');

  try {
    const seed = [{}, {}];
    g.window = {__TINYAPP_SEED__: seed};
    expect(sd.readSeed()).toBe(seed); // same reference, per the leg

    delete g.window.__TINYAPP_SEED__;
    expect(sd.readSeed()).toBe(undefined);

    delete g.window;
    expect(() => sd.readSeed()).not.toThrow(); // no seed, no error
    expect(sd.readSeed()).toBe(undefined);
  } finally {
    delete g.window;
    if (had && saved) {
      Object.defineProperty(g, 'window', saved);
    }
  }
});

// ---------------------------------------------------------------------------
// Leg (h) [M7] — the seed and expected-state JSON files, read from the
// repository root by the exact paths the composition task uses.
// ---------------------------------------------------------------------------

test('leg (h) [M7]: state-exams/seeds/empty.json parses to [{}, {}]', () => {
  expect(readJson('state-exams/seeds/empty.json')).toEqual([{}, {}]);
});

test('leg (h) [M7]: state-exams/expected/one-open-todo.json parses to the buy-milk snapshot', () => {
  expect(readJson('state-exams/expected/one-open-todo.json')).toEqual([
    {todos: {'0': {text: 'buy milk', completed: false}}},
    {},
  ]);
});

test('leg (h) [M7]: state-exams/expected/still-empty.json parses to [{}, {}]', () => {
  expect(readJson('state-exams/expected/still-empty.json')).toEqual([{}, {}]);
});

// ---------------------------------------------------------------------------
// Leg (i) [M8] — the buttons and the exam share one code path, and the DOM
// registrator is a declared devDependency. (`bun install --frozen-lockfile`
// and the four greps are also the Proof's own `Run:` lines; the suite pins the
// same texts here so the claim survives in the committed suite.)
// ---------------------------------------------------------------------------

test('leg (i) [M8]: TodoInput calls addTodo(, TodoItem calls setTodoCompleted( and deleteTodo(, index calls readSeed(', () => {
  const todoInput = readFileSync(fromClient('src', 'TodoInput.tsx'), 'utf8');
  const todoItem = readFileSync(fromClient('src', 'TodoItem.tsx'), 'utf8');
  const index = readFileSync(fromClient('src', 'index.tsx'), 'utf8');

  expect(todoInput).toContain('addTodo(');
  expect(todoItem).toContain('setTodoCompleted(');
  expect(todoItem).toContain('deleteTodo(');
  expect(index).toContain('readSeed(');
});

test('leg (i) [M8]: client/package.json devDependencies carries @happy-dom/global-registrator', () => {
  const pkg = JSON.parse(readFileSync(fromClient('package.json'), 'utf8'));
  const version = pkg.devDependencies?.['@happy-dom/global-registrator'];

  expect(typeof version).toBe('string');
  expect(version.length).toBeGreaterThan(0);
});

test('leg (i) [M8]: bun.lock records @happy-dom/global-registrator, so --frozen-lockfile can exit 0', () => {
  const lock = readFileSync(fromRoot('bun.lock'), 'utf8');

  expect(lock).toContain('@happy-dom/global-registrator');
});
