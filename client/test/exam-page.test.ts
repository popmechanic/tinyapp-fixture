// Exam for Task 1 — "The exam flag: an unseeded page that carries
// `window.__TINYAPP_EXAM__` hands the exam its store, its SQLite handle and its
// persister, and dials no socket".
//
// Legs covered here:
//   (b) [M2] the flagged unseeded render hands over the store the `Provider`
//       holds, the sentinel `db` `getDb` resolved and the persister the factory
//       returned — the persister only once its `load()` has resolved — and
//       starts no synchronizer and constructs no socket.
//   (c) [M3] the unflagged unseeded render is exactly BASE's page (no handles, a
//       synchronizer started), and the flagged *seeded* render is exactly BASE's
//       seeded page (no database, no synchronizer, the store on the handle).
//
// Legs (a), (d) and (e) [M1, M4, M5] are the other file of this Proof,
// `tests/state-exams/exam-page.test.ts`.
//
// This is a `.ts` file, so render trees are built with `React.createElement`
// rather than JSX. Nothing here dials a socket, opens a database or starts a
// server: `reconnecting-websocket`, the global `WebSocket`, the sqlite helper
// and both TinyBase link factories are stubbed and only counted — M2 asks for
// exactly that set. The shape is `client/test/seeded-store-global.test.ts`'s,
// including its two rules for sharing one process with the other DOM files; see
// `afterAll`.
//
// Note on where `window.__TINYAPP_DB__` may be written: M2 mocks `getDb` and
// still asks for the sentinel on the handle, so the assignment has to be made by
// the caller of `getDb` — the persister factory in `client/src/Store.tsx` — and
// not inside `client/src/sqlite.tsx`, which this exam replaces wholesale.

import {afterAll, beforeAll, expect, mock, test} from 'bun:test';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {readFileSync} from 'node:fs';
import {STORE_ID} from '../src/storeData';

// Captured before the DOM is registered, so it is the constructor this process
// had — Bun's own, in a run that starts here. `afterAll` puts it back: a state
// exam elsewhere in the run opens its CDP connection with `new WebSocket(url)`,
// and neither this file's counting stub nor happy-dom's window-bound one can
// carry that.
const realWebSocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');

// Rule one of sharing the process: register a window only if no other file has
// already put one in place — `GlobalRegistrator.register()` throws outright when
// one is already registered.
const registeredHere = !GlobalRegistrator.isRegistered;
if (registeredHere) {
  GlobalRegistrator.register();
}

// The settle timer the BASE render exams pin: the render's effects, and the
// persister's `load()`/`startAutoSave()` chain, have run by then.
const SETTLE_MS = 300;

// This file lives at `client/test/`, so the repository root is two levels up.
const ROOT = `${import.meta.dir}/../..`;

// Leg (c)'s "the two-open-todos content", read from the seed checked in rather
// than transcribed here.
const SEED = JSON.parse(
  readFileSync(`${ROOT}/state-exams/seeds/two-open-todos.json`, 'utf8'),
) as [Record<string, Record<string, Record<string, unknown>>>, object];

// M2's "<one sentinel object>": the single `db` every `getDb()` of this file
// resolves, so `window.__TINYAPP_DB__` can be asserted to be that object itself
// rather than something merely shaped like it.
const SENTINEL_DB = {sentinel: 'the db getDb resolved'};

let sockets = 0;
let getDbCalls = 0;
let syncs = 0;

// Every persister this file's factory has handed out, newest last. M2 asks for
// the handle to be "the persister the factory returned", which is this object.
const persisters: {load: () => Promise<void>}[] = [];

// Flipped before a render to get M2's second case: a factory whose `load` never
// resolves, so the page has a database but has not finished loading.
let loadNeverResolves = false;

// M2 asks for `WebSocket` stubbed to count constructions. `Store.tsx` reaches a
// socket through `ReconnectingWebSocket`, so both the module and the global
// constructor are stubbed, and both count into `sockets`.
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

// M2's `getDb`: resolves `{sqlite3: {}, db: <one sentinel object>}`, and counts
// its calls for leg (c)'s seeded render.
mock.module('../src/sqlite', () => ({
  getDb: async () => {
    getDbCalls++;
    return {sqlite3: {}, db: SENTINEL_DB};
  },
}));

// M2's persister factory: one persister, whose `load` either resolves or — in
// the second case — never does.
mock.module('tinybase/persisters/persister-sqlite-wasm/with-schemas', () => ({
  createSqliteWasmPersister: () => {
    const persister = {
      load: loadNeverResolves
        ? () => new Promise<void>(() => {})
        : async () => {},
      startAutoSave: async () => {},
      stopAutoSave() {},
      destroy() {},
    };
    persisters.push(persister);
    return persister;
  },
}));

// M2's `createWsSynchronizer`, mocked and counted.
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

const win = () =>
  window as unknown as {
    __TINYAPP_STORE__?: any;
    __TINYAPP_DB__?: unknown;
    __TINYAPP_PERSISTER__?: unknown;
    __TINYAPP_EXAM__?: boolean;
    __TINYAPP_SEED__?: unknown;
  };

// The three handles, cleared before each render so every assertion below is
// about the render it follows and not about the one before it.
const clearHandles = () => {
  delete win().__TINYAPP_STORE__;
  delete win().__TINYAPP_DB__;
  delete win().__TINYAPP_PERSISTER__;
};

// Reads the store provided under STORE_ID back out of the same Provider — this
// is "the store the `Provider` holds under `STORE_ID`" of M2.
const makeProbe = (sink: {store?: any}) => () => {
  const store = useStore(STORE_ID);
  React.useEffect(() => {
    sink.store = store;
  }, [store]);
  return null;
};

// Renders the page's own `Store` — the page as the app builds it.
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
  expect(Object.keys(SEED[0].todos).length).toBeGreaterThanOrEqual(1);
});

afterAll(async () => {
  // The last `root.unmount()` leaves one React scheduler macrotask queued (the
  // passive-effect flush) whose first statement reads `window.event`. Let it
  // drain before the DOM goes away; no assertion above depends on this.
  await new Promise((resolve) => setTimeout(resolve, 25));

  if (registeredHere) {
    // Rule two of sharing the process, copied from
    // `client/test/seeded-store-global.test.ts`: hand the window back, but do
    // not close it. `react-dom` binds its scheduler to the `MessageChannel` of
    // whichever window was registered when it was first imported, for the life
    // of the process. Closing this window — which is what `unregister()` does
    // via `globalThis.happyDOM.close()` — would leave that scheduler posting
    // into a dead channel, and the next file to register a window and render
    // would see its renders silently never happen. Blanking `happyDOM` first is
    // what `unregister()` checks before closing, so the globals are restored and
    // the window is left alive. One leaked window is the price.
    (globalThis as unknown as {happyDOM?: unknown}).happyDOM = undefined;
    await GlobalRegistrator.unregister();
  }

  // And put the real `WebSocket` back, whoever registered the window: a state
  // exam later in a whole-suite run opens its CDP connection with it.
  if (realWebSocket) {
    Object.defineProperty(globalThis, 'WebSocket', realWebSocket);
  } else {
    delete (globalThis as unknown as {WebSocket?: unknown}).WebSocket;
  }
});

// ---------------------------------------------------------------------------
// Leg (b) [M2] — the flagged unseeded render hands over all three handles, and
// dials nothing.
// ---------------------------------------------------------------------------

test('leg (b) [M2]: the flagged unseeded render exposes the Provider store, the sentinel db and the loaded persister, with no synchronizer and no socket', async () => {
  delete win().__TINYAPP_SEED__;
  win().__TINYAPP_EXAM__ = true;
  clearHandles();
  loadNeverResolves = false;
  persisters.length = 0;

  const syncsBefore = syncs;
  const socketsBefore = sockets;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  // [M2] `window.__TINYAPP_STORE__` is the store the `Provider` holds under
  // `STORE_ID` — the same object, not a copy of its content.
  expect(sink.store).toBeDefined();
  expect(win().__TINYAPP_STORE__).toBe(sink.store);

  // [M2] `window.__TINYAPP_DB__` is the sentinel `db` object itself.
  expect(win().__TINYAPP_DB__).toBe(SENTINEL_DB);

  // [M2] `window.__TINYAPP_PERSISTER__` is the persister the factory returned.
  expect(persisters.length).toBe(1);
  expect(win().__TINYAPP_PERSISTER__).toBe(persisters[0]);

  // [M2] `createWsSynchronizer` is called 0 times and 0 sockets are constructed.
  expect(syncs - syncsBefore).toBe(0);
  expect(sockets - socketsBefore).toBe(0);

  root.unmount();
});

test('leg (b) [M2]: with a load that never resolves the db handle is already the sentinel and the persister handle stays undefined', async () => {
  delete win().__TINYAPP_SEED__;
  win().__TINYAPP_EXAM__ = true;
  clearHandles();
  loadNeverResolves = true;
  persisters.length = 0;

  const syncsBefore = syncs;
  const socketsBefore = sockets;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  // [M2] the persister was made and its `load` was called and hangs, so:
  expect(persisters.length).toBe(1);

  // [M2] `window.__TINYAPP_DB__` is already the sentinel...
  expect(win().__TINYAPP_DB__).toBe(SENTINEL_DB);

  // [M2] ...while `window.__TINYAPP_PERSISTER__` stays undefined: its presence
  // is what a helper reads as "the page has loaded what it persisted".
  expect(win().__TINYAPP_PERSISTER__).toBeUndefined();

  // [M2] and in this render too, no synchronizer and no socket.
  expect(syncs - syncsBefore).toBe(0);
  expect(sockets - socketsBefore).toBe(0);

  root.unmount();
  loadNeverResolves = false;
});

// ---------------------------------------------------------------------------
// Leg (c) [M3] — the two pages that must be exactly the pages they were.
// ---------------------------------------------------------------------------

test('leg (c) [M3]: the unflagged unseeded render leaves all three handles undefined and starts a synchronizer', async () => {
  delete win().__TINYAPP_SEED__;
  delete win().__TINYAPP_EXAM__;
  clearHandles();

  const syncsBefore = syncs;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  expect(sink.store).toBeDefined();

  // [M3] BASE's behaviour: no handles at all...
  expect(win().__TINYAPP_STORE__).toBeUndefined();
  expect(win().__TINYAPP_DB__).toBeUndefined();
  expect(win().__TINYAPP_PERSISTER__).toBeUndefined();

  // [M3] ...and the synchronizer still started.
  expect(syncs - syncsBefore).toBeGreaterThanOrEqual(1);

  root.unmount();
});

test('leg (c) [M3]: the flagged seeded render opens no database and no synchronizer, and exposes only the seeded store', async () => {
  win().__TINYAPP_SEED__ = SEED;
  win().__TINYAPP_EXAM__ = true;
  clearHandles();

  const getDbBefore = getDbCalls;
  const syncsBefore = syncs;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  expect(sink.store).toBeDefined();

  // [M3] a seeded page is exactly the page it was, flag or no flag: `getDb` 0
  // times, `createWsSynchronizer` 0 times.
  expect(getDbCalls - getDbBefore).toBe(0);
  expect(syncs - syncsBefore).toBe(0);

  // [M3] the flag writes nothing else on a seeded page.
  expect(win().__TINYAPP_DB__).toBeUndefined();
  expect(win().__TINYAPP_PERSISTER__).toBeUndefined();

  // [M3] and the seeded handle is what it was at BASE.
  expect(win().__TINYAPP_STORE__).toBeDefined();
  expect(win().__TINYAPP_STORE__.getContent()).toEqual(SEED);

  root.unmount();

  delete win().__TINYAPP_SEED__;
  delete win().__TINYAPP_EXAM__;
});
