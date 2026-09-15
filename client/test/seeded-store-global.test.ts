// Exam for Task 1 — "A seeded fixture page exposes its store to the exam".
//
// Claim under test: after this run, a page opened on a seed lets the exam read
// the app's store back exactly as the app holds it, and a normal page exposes
// nothing.
//
// Legs covered here:
//   (a) [M1] a seeded page defines `window.__TINYAPP_STORE__`, its
//       `getContent()` deep-equals the seed, and it tracks the app's own store
//       after a mutation.
//   (b) [M2] an unseeded page defines no such handle.
//   (c) [M3] the seeded render constructs no `WebSocket` and calls `getDb`
//       zero times; the unseeded render calls `getDb` at least once. (The other
//       half of leg (c) — the BASE rule of `client/test/seeded-store.test.ts` —
//       is the Proof's first `Run:` line and is not re-run here.)
//   (d) [M4] the `AGENTS.md` Key Files sentence, by the Proof's second `Run:`
//       line's own check.
//
// Leg (a) renders `Store` rather than calling `createTodosStore(seed)` directly:
// the task permits the assignment to live either in `createTodosStore` or in
// `Store`'s seeded branch, and only a render exercises both placements. Its
// words are "the store created as the page creates it".
//
// This is a `.ts` file, so render trees are built with `React.createElement`
// rather than JSX. Nothing here dials a socket, opens a database or starts a
// server: `reconnecting-websocket`, the global `WebSocket`, the sqlite helper
// and both TinyBase link factories are stubbed and only counted.
//
// Bun runs every test file in one process, and this is the second file in the
// suite to want a DOM (`client/test/seeded-store.test.ts` is the other), so the
// two have to share the process cleanly. Two rules do that; see `afterAll`.

import {afterAll, beforeAll, expect, mock, test} from 'bun:test';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {readFileSync} from 'node:fs';
import {STORE_ID, setTodoCompleted} from '../src/storeData';

// Rule one of sharing the process: register a window only if no other file has
// already put one in place — `GlobalRegistrator.register()` throws outright when
// one is already registered.
const registeredHere = !GlobalRegistrator.isRegistered;
if (registeredHere) {
  GlobalRegistrator.register();
}

// The settle timer the BASE seeded-store exam pins: the render's effects, and
// the persister's `load()`/`startAutoSave()` chain, have run by then.
const SETTLE_MS = 300;

// This file lives at `client/test/`, so the repository root is two levels up.
const ROOT = `${import.meta.dir}/../..`;

// Leg (a) names `state-exams/seeds/two-open-todos.json`'s content as the seed,
// so it is read from disk rather than transcribed.
const SEED = JSON.parse(
  readFileSync(`${ROOT}/state-exams/seeds/two-open-todos.json`, 'utf8'),
) as [Record<string, Record<string, Record<string, unknown>>>, object];

// `<first id>` of leg (a): the first row id of the seed's `todos` table.
const FIRST_ID = Object.keys(SEED[0].todos)[0];

// The seed with that todo completed — derived from the same file, so the
// expected value is exact without pinning a file this task does not own.
const SEED_WITH_FIRST_COMPLETED = (() => {
  const content = JSON.parse(JSON.stringify(SEED));
  content[0].todos[FIRST_ID].completed = true;
  return content;
})();

let sockets = 0;
let getDbCalls = 0;
let persisters = 0;
let syncs = 0;

// Leg (c) asks for `WebSocket` stubbed to record construction. `Store.tsx`
// reaches a socket through `ReconnectingWebSocket`, so both the module and the
// global constructor are stubbed, and both count into `sockets`.
class RecordingSocket {
  constructor() {
    sockets++;
  }
  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {}
}

mock.module('reconnecting-websocket', () => ({default: RecordingSocket}));

(globalThis as unknown as {WebSocket: unknown}).WebSocket = RecordingSocket;

// Leg (c) asks for the `getDb` export of `client/src/sqlite` mocked to record
// calls.
mock.module('../src/sqlite', () => ({
  getDb: async () => {
    getDbCalls++;
    return {sqlite3: {}, db: {}};
  },
}));

// Not a leg: the two link factories are stubbed so the unseeded render stays
// inert and offline once `getDb` has handed it a placeholder database.
mock.module('tinybase/persisters/persister-sqlite-wasm/with-schemas', () => ({
  createSqliteWasmPersister: () => {
    persisters++;
    return {
      load: async () => {},
      startAutoSave: async () => {},
      stopAutoSave() {},
      destroy() {},
    };
  },
}));

mock.module('tinybase/synchronizers/synchronizer-ws-client/with-schemas', () => ({
  createWsSynchronizer: async () => {
    syncs++;
    return {
      startSync: async () => {},
      getWebSocket: () => ({addEventListener() {}}),
      load: async () => {},
      save: async () => {},
      stopSync() {},
      destroy() {},
    };
  },
}));

// Imported only after the mocks are registered.
const React: any = await import('react');
const {createRoot} = (await import('react-dom/client')) as any;
const {Provider, useStore} = (await import('tinybase/ui-react')) as any;
const StoreModule: any = await import('../src/Store');
const {createTodosStore} = (await import('../src/storeData')) as any;

const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

const globalStore = () =>
  (window as unknown as {__TINYAPP_STORE__?: any}).__TINYAPP_STORE__;

// Reads the store provided under STORE_ID back out of the same Provider — this
// is "the app's store" leg (a) mutates.
const makeProbe = (sink: {store?: any}) => () => {
  const store = useStore(STORE_ID);
  React.useEffect(() => {
    sink.store = store;
  }, [store]);
  return null;
};

// Renders the page's own `Store` — the store created as the page creates it.
const render = (sink: {store?: any}) => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);
  root.render(
    React.createElement(
      Provider,
      null,
      React.createElement(StoreModule.Store, null),
      React.createElement(makeProbe(sink), null),
    ),
  );
  return root;
};

beforeAll(() => {
  expect(typeof StoreModule.Store).toBe('function');
  expect(typeof setTodoCompleted).toBe('function');
  expect(Object.keys(SEED[0].todos).length).toBeGreaterThanOrEqual(1);
});

afterAll(async () => {
  // The last `root.unmount()` leaves one React scheduler macrotask queued (the
  // passive-effect flush) whose first statement reads `window.event`. Let it
  // drain before the DOM goes away; no assertion above depends on this.
  await new Promise((resolve) => setTimeout(resolve, 25));

  if (registeredHere) {
    // Rule two of sharing the process: hand the window back, but do not close
    // it. `react-dom` binds its scheduler to the `MessageChannel` of whichever
    // window was registered when it was first imported, and that binding is for
    // the life of the process — it does not follow a later re-registration. So
    // if this file closed its window (which is what `unregister()` does, via
    // `globalThis.happyDOM.close()`), the scheduler of the already-imported
    // `react-dom` would be posting into a dead channel, and the *next* file to
    // register a window and render — `client/test/seeded-store.test.ts` — would
    // see its renders silently never happen and go red for a reason that has
    // nothing to do with it. Blanking `happyDOM` first is what `unregister()`
    // checks before closing, so the globals are restored and the window is left
    // alive. One leaked window for the rest of the test process is the price.
    (globalThis as unknown as {happyDOM?: unknown}).happyDOM = undefined;
    await GlobalRegistrator.unregister();
  }
});

// ---------------------------------------------------------------------------
// Leg (a) [M1] — the seeded page hands its store over, and keeps handing over
// the same content the app's own store holds.
// ---------------------------------------------------------------------------

test('leg (a) [M1]: a seeded page defines window.__TINYAPP_STORE__, whose getContent() is the seed and then follows the app store through setTodoCompleted', async () => {
  (window as any).__TINYAPP_SEED__ = SEED;
  delete (window as any).__TINYAPP_STORE__;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  // The app's own store, read back out of the Provider.
  expect(sink.store).toBeDefined();
  expect(sink.store.getContent()).toEqual(SEED);

  // [M1] the global is defined, and it is a store: `getContent(): [tables,
  // values]` is the contract this task Produces.
  expect(globalStore()).toBeDefined();
  expect(typeof globalStore().getContent).toBe('function');

  // [M1] its `getContent()` deep-equals the seed.
  expect(globalStore().getContent()).toEqual(SEED);

  // [M1] after `setTodoCompleted(store, <first id>, true)` on the app's store,
  // the global deep-equals the store's own `getContent()` with that todo
  // completed.
  setTodoCompleted(sink.store, FIRST_ID, true);
  await settle();

  expect(sink.store.getContent()).toEqual(SEED_WITH_FIRST_COMPLETED);
  expect(globalStore().getContent()).toEqual(SEED_WITH_FIRST_COMPLETED);
  expect(globalStore().getContent()).toEqual(sink.store.getContent());

  root.unmount();
});

// ---------------------------------------------------------------------------
// Leg (b) [M2] — the negative control: a normal page exposes nothing.
// ---------------------------------------------------------------------------

test('leg (b) [M2]: with window.__TINYAPP_SEED__ deleted and a fresh store created, window.__TINYAPP_STORE__ is undefined', async () => {
  delete (window as any).__TINYAPP_SEED__;
  // Leg (a) ran first in this process and set the handle; clear it so this
  // asserts against this render rather than against that leftover.
  delete (window as any).__TINYAPP_STORE__;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  expect(sink.store).toBeDefined();
  expect(globalStore()).toBeUndefined();

  // A fresh store created directly, with no seed, is likewise silent.
  createTodosStore();
  expect(globalStore()).toBeUndefined();

  root.unmount();
});

// ---------------------------------------------------------------------------
// Leg (c) [M3] — the seeded page still starts neither link. (The BASE rule of
// `client/test/seeded-store.test.ts` is kept by the Proof's first `Run:` line.)
// ---------------------------------------------------------------------------

test('leg (c) [M3]: rendering the seeded Store constructs no WebSocket and calls getDb zero times', async () => {
  (window as any).__TINYAPP_SEED__ = SEED;

  const socketsBefore = sockets;
  const getDbBefore = getDbCalls;
  const persistersBefore = persisters;
  const syncsBefore = syncs;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  expect(sink.store).toBeDefined();
  expect(sockets - socketsBefore).toBe(0);
  expect(getDbCalls - getDbBefore).toBe(0);
  expect(persisters - persistersBefore).toBe(0);
  expect(syncs - syncsBefore).toBe(0);

  root.unmount();
});

test('leg (c) [M3]: rendering the unseeded Store calls getDb at least once', async () => {
  delete (window as any).__TINYAPP_SEED__;

  const getDbBefore = getDbCalls;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  expect(sink.store).toBeDefined();
  expect(getDbCalls - getDbBefore).toBeGreaterThanOrEqual(1);

  root.unmount();
});

// ---------------------------------------------------------------------------
// Leg (d) [M4] — the AGENTS.md sentence, by the Proof's second `Run:` line:
//   sed -n '/^## Key Files/,/^## Working Method/p' AGENTS.md \
//     | tr '\n' ' ' | grep -q '__TINYAPP_STORE__.*normal page'
// ---------------------------------------------------------------------------

test("leg (d) [M4]: AGENTS.md's Key Files section says a seeded page sets window.__TINYAPP_STORE__ and a normal page does not", () => {
  const lines = readFileSync(`${ROOT}/AGENTS.md`, 'utf8').split('\n');

  const start = lines.findIndex((line) => /^## Key Files/.test(line));
  expect(start).toBeGreaterThanOrEqual(0);

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^## Working Method/.test(line));
  const section = end === -1 ? rest : rest.slice(0, end + 1);

  // `tr '\n' ' '` — the newlines become spaces so `.*` can span lines.
  const flattened = [lines[start], ...section].join(' ');

  expect(flattened).toMatch(/__TINYAPP_STORE__.*normal page/);
});
