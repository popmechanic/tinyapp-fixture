// Exam for Task 5 — "The fixture honours the seed and exposes its callbacks".
//
// This file covers Proof legs (f) and (g) [M6]: a page opened with a seed shows
// the seed and talks to no database and no server, and the same page without a
// seed still starts both links.
//
// It is a `.ts` file, so the render trees are built with `React.createElement`
// rather than JSX. Nothing here dials a socket, opens a database or starts a
// server: the persister factory, the synchronizer factory, the sqlite helper
// and the `reconnecting-websocket` constructor are all module-mocked and only
// counted. Bun runs every test file in one process, so the DOM is unregistered
// in `afterAll`.

import {afterAll, beforeAll, expect, mock, test} from 'bun:test';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {STORE_ID} from '../src/storeData';

GlobalRegistrator.register();

// The settle timer the Context pins: the render's effects have run by then.
const SETTLE_MS = 300;

const SEED = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}];

let sockets = 0;
let persisters = 0;
let syncs = 0;

mock.module('reconnecting-websocket', () => ({
  default: class {
    constructor() {
      sockets++;
    }
    addEventListener() {}
    close() {}
  },
}));

mock.module('../src/sqlite', () => ({
  getDb: async () => ({sqlite3: {}, db: {}}),
}));

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

const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

// Reads the store provided under STORE_ID back out of the same Provider.
const makeProbe = (sink: {store?: any}) => () => {
  const store = useStore(STORE_ID);
  React.useEffect(() => {
    sink.store = store;
  }, [store]);
  return null;
};

const render = (onReady: () => void, sink: {store?: any}) => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);
  root.render(
    React.createElement(
      Provider,
      null,
      React.createElement(StoreModule.Store, {onReady}),
      React.createElement(makeProbe(sink), null),
    ),
  );
  return root;
};

beforeAll(() => {
  expect(typeof StoreModule.Store).toBe('function');
});

afterAll(async () => {
  // The last `root.unmount()` leaves one React scheduler macrotask queued (the
  // passive-effect flush), and its first statement is `schedulerEvent =
  // window.event`. Unregistering the DOM in the same synchronous turn pulls
  // `window` out from under that task, which then throws between files. Let it
  // drain first; no assertion above depends on this.
  await new Promise((resolve) => setTimeout(resolve, 25));
  GlobalRegistrator.unregister();
});

// ---------------------------------------------------------------------------
// Leg (f) [M6] — seeded: the seed is what the page holds, and neither link runs.
// ---------------------------------------------------------------------------

test('leg (f) [M6]: a seeded render shows the seed and starts no persister, no synchronizer and no socket', async () => {
  (window as any).__TINYAPP_SEED__ = SEED;

  let ready = 0;
  const sink: {store?: any} = {};
  const root = render(() => {
    ready++;
  }, sink);

  await settle();

  expect(ready).toBeGreaterThanOrEqual(1);
  expect(sink.store).toBeDefined();
  expect(sink.store.getContent()).toEqual(SEED);

  expect(persisters).toBe(0);
  expect(syncs).toBe(0);
  expect(sockets).toBe(0);

  root.unmount();
});

// ---------------------------------------------------------------------------
// Leg (g) [M6] — the negative control: no seed, both links start.
// ---------------------------------------------------------------------------

test('leg (g) [M6]: an unseeded render into a fresh Provider starts the persister, the synchronizer and the socket', async () => {
  delete (window as any).__TINYAPP_SEED__;

  const persistersBefore = persisters;
  const syncsBefore = syncs;
  const socketsBefore = sockets;

  const sink: {store?: any} = {};
  const root = render(() => {}, sink);

  await settle();

  expect(persisters - persistersBefore).toBeGreaterThanOrEqual(1);
  expect(syncs - syncsBefore).toBeGreaterThanOrEqual(1);
  expect(sockets - socketsBefore).toBeGreaterThanOrEqual(1);

  root.unmount();
});
