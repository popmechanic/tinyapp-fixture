// Exam for Task 2 — "A page under exam dials the exam's own runtime".
//
// Claim: open the app with a sync origin handed in before it loads; see it sync
// to that origin's todos module instead of the built-in server, hand its live
// store out for the exam to read, and leave a page opened without the handle
// exactly the page it was.
//
// The Proof's legs, restated, and where each is answered below:
//
//   (a) [M1] `readSyncOrigin()` is `'ws://127.0.0.1:4321'` when
//       `window.__TINYAPP_SYNC__` is that string and `'wss://x'` when it is
//       that, and `undefined` for each of: the handle unset, the handle
//       `'http://127.0.0.1:4321'`, the handle `42`, the handle `''`, and
//       `globalThis.window` temporarily replaced by `undefined` (the Bun-side
//       call the linter's capture child makes) — restored after. M1 also asks
//       that `client/src/vite-env.d.ts` declare `__TINYAPP_SYNC__?: string` on
//       `Window` beside the two existing handles, which is the second test.
//   (b) [M2] `syncUrl('todos')` is `'ws://127.0.0.1:4321/sync/todos'` with the
//       handle set and `'ws://localhost:9876/sync/todos'` with it unset
//       (`SERVER` itself unchanged at `ws://localhost:9876`), and the
//       `reconnecting-websocket` stub's constructor is called exactly once with
//       `'ws://127.0.0.1:4321/sync/todos'` when the `Store` renders unseeded and
//       unflagged with the handle set — "and nothing else", so the global
//       `WebSocket` is stubbed into the same tally and must stay at zero
//       constructions of its own.
//   (c) [M3] that render leaves `window.__TINYAPP_STORE__` defined and equal to
//       the Provider's store — its `getContent()` after `setTodoCompleted`
//       follows the app store — with the persister stub constructed once and the
//       synchronizer stub constructed once.
//   (d) [M4] for each of: no handle, a seed, the exam flag — the render's
//       `__TINYAPP_STORE__` is undefined for the first, and the socket stub is
//       constructed zero times for the second and the third, and once with
//       `'ws://localhost:9876/sync/todos'` for the first.
//   (e) [M5] the `## Key Files` section of `AGENTS.md`, read to
//       `## Working Method`, names `__TINYAPP_SYNC__`, then `/sync/todos`, then
//       `store`, in that order — the first `Run:` line of the Proof, run here
//       over the file's own text.
//
// How leg (d)'s three cases are read: leg (c)'s page is the handle set, unseeded
// and unflagged, and leg (d) varies exactly one thing about it each time — take
// the handle away; add a seed; raise the exam flag. So the seeded and flagged
// cases below keep the sync handle set, which is what makes them answer M4's
// "a seeded page and a flagged page behave as at BASE — the seeded page dials
// nothing, the flagged page dials nothing": the risk this change carries is a
// third mode reaching pages that already had their own.
//
// This is a `.ts` file, so render trees are built with `React.createElement`
// rather than JSX. Nothing here dials a socket, opens a database or starts a
// server: `reconnecting-websocket`, the global `WebSocket`, the sqlite helper
// and both TinyBase link factories are stubbed and only counted. The shape is
// `client/test/exam-page.test.ts`'s, including its two rules for sharing one
// process with the other DOM files; see `afterAll`.
//
// `../src/config` and `../src/storeData` are pulled in with `await import` like
// every other module here, so a missing `syncUrl` or `readSyncOrigin` at BASE
// reads as "not implemented yet" on its own assertion rather than as a link
// error that takes the whole file down.

import {afterAll, beforeAll, expect, mock, test} from 'bun:test';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {readFileSync} from 'node:fs';

// Captured before the DOM is registered, so it is the constructor this process
// had. `afterAll` puts it back: a state exam elsewhere in a whole-suite run
// opens its CDP connection with `new WebSocket(url)`.
const realWebSocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');

// Rule one of sharing the process: register a window only if no other file has
// already put one in place — `GlobalRegistrator.register()` throws outright when
// one is already registered.
const registeredHere = !GlobalRegistrator.isRegistered;
if (registeredHere) {
  GlobalRegistrator.register();
}

// Leg (a)'s "`globalThis.window` temporarily replaced by `undefined` — restored
// after": the descriptor the registrar left, kept so the replacement can be put
// back exactly as it was rather than reassigned.
const realWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

// The settle timer the BASE render exams pin: the render's effects, and the
// persister's `load()`/`startAutoSave()` chain, have run by then.
const SETTLE_MS = 300;

// This file lives at `client/test/`, so the repository root is two levels up.
const ROOT = `${import.meta.dir}/../..`;

// The origin a harness hands in, and the URL it must produce.
const SYNC_ORIGIN = 'ws://127.0.0.1:4321';
const SYNC_URL = 'ws://127.0.0.1:4321/sync/todos';

// The built-in server, and the URL a page without the handle must produce —
// `SERVER` unchanged at `ws://localhost:9876` is M2's own words.
const SERVER_ORIGIN = 'ws://localhost:9876';
const SERVER_URL = 'ws://localhost:9876/sync/todos';

const STORE_ID = 'todos';

// Leg (d)'s seed, and what a seeded page's store must hold.
const SEED = [{todos: {'0': {text: 'buy milk', completed: false}}}, {}];

// What an unseeded store holds: `createTodosStore`'s default content, with the
// persister stubbed so nothing is loaded over it. Leg (c) toggles `'1'`.
const DEFAULT_CONTENT = [
  {
    todos: {
      '1': {text: 'Learn TinyBase', completed: false},
      '2': {text: 'Build an app', completed: false},
    },
  },
  {},
];
const DEFAULT_CONTENT_WITH_1_COMPLETED = [
  {
    todos: {
      '1': {text: 'Learn TinyBase', completed: true},
      '2': {text: 'Build an app', completed: false},
    },
  },
  {},
];

// Every URL a socket has been constructed with in this process, newest last.
// Both `ReconnectingWebSocket` and the global `WebSocket` land here, so M2's
// "and nothing else" is a claim about this whole list and not just about the
// module the app happens to import.
const socketUrls: unknown[] = [];

let persisters = 0;
let syncs = 0;

class RecordingSocket {
  constructor(url?: unknown) {
    socketUrls.push(url);
  }
  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {}
}

mock.module('reconnecting-websocket', () => ({default: RecordingSocket}));

(globalThis as unknown as {WebSocket: unknown}).WebSocket = RecordingSocket;

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
const ConfigModule: any = await import('../src/config');
const StoreDataModule: any = await import('../src/storeData');

const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

const win = () =>
  window as unknown as {
    __TINYAPP_STORE__?: any;
    __TINYAPP_DB__?: unknown;
    __TINYAPP_PERSISTER__?: unknown;
    __TINYAPP_EXAM__?: boolean;
    __TINYAPP_SEED__?: unknown;
    __TINYAPP_SYNC__?: unknown;
  };

// Every handle, in and out, cleared so each assertion below is about the render
// it follows and not about the one before it.
const clearAll = () => {
  delete win().__TINYAPP_STORE__;
  delete win().__TINYAPP_DB__;
  delete win().__TINYAPP_PERSISTER__;
  delete win().__TINYAPP_SEED__;
  delete win().__TINYAPP_EXAM__;
  delete win().__TINYAPP_SYNC__;
};

// Reads the store provided under `STORE_ID` back out of the same Provider —
// this is "the Provider's store" of leg (c).
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

const readRepoFile = (relative: string): string =>
  readFileSync(`${ROOT}/${relative}`, 'utf8');

beforeAll(() => {
  expect(typeof StoreModule.Store).toBe('function');
  expect(typeof StoreDataModule.setTodoCompleted).toBe('function');
});

afterAll(async () => {
  // The last `root.unmount()` leaves one React scheduler macrotask queued (the
  // passive-effect flush) whose first statement reads `window.event`. Let it
  // drain before the DOM goes away; no assertion above depends on this.
  await new Promise((resolve) => setTimeout(resolve, 25));

  clearAll();

  if (registeredHere) {
    // Rule two of sharing the process, copied from
    // `client/test/exam-page.test.ts`: hand the window back, but do not close
    // it. `react-dom` binds its scheduler to the `MessageChannel` of whichever
    // window was registered when it was first imported, for the life of the
    // process; closing this one would leave that scheduler posting into a dead
    // channel. Blanking `happyDOM` is what `unregister()` checks before
    // closing, so the globals are restored and the window is left alive.
    (globalThis as unknown as {happyDOM?: unknown}).happyDOM = undefined;
    await GlobalRegistrator.unregister();
  }

  if (realWebSocket) {
    Object.defineProperty(globalThis, 'WebSocket', realWebSocket);
  } else {
    delete (globalThis as unknown as {WebSocket?: unknown}).WebSocket;
  }
});

// ---------------------------------------------------------------------------
// Leg (a) [M1] — `readSyncOrigin()` over every case the Proof names.
// ---------------------------------------------------------------------------

test('leg (a) [M1]: readSyncOrigin returns the ws:// and wss:// handles and undefined for every other case, including no window', () => {
  clearAll();
  const readSyncOrigin = StoreDataModule.readSyncOrigin;
  expect(typeof readSyncOrigin).toBe('function');

  // [M1] a `ws://` handle is returned as the string it is.
  win().__TINYAPP_SYNC__ = SYNC_ORIGIN;
  expect(readSyncOrigin()).toBe(SYNC_ORIGIN);

  // [M1] and so is a `wss://` one.
  win().__TINYAPP_SYNC__ = 'wss://x';
  expect(readSyncOrigin()).toBe('wss://x');

  // [M1] the handle unset.
  delete win().__TINYAPP_SYNC__;
  expect(readSyncOrigin()).toBeUndefined();

  // [M1] a scheme that is neither `ws://` nor `wss://`.
  win().__TINYAPP_SYNC__ = 'http://127.0.0.1:4321';
  expect(readSyncOrigin()).toBeUndefined();

  // [M1] a handle that is not a string at all.
  win().__TINYAPP_SYNC__ = 42;
  expect(readSyncOrigin()).toBeUndefined();

  // [M1] the empty string.
  win().__TINYAPP_SYNC__ = '';
  expect(readSyncOrigin()).toBeUndefined();

  clearAll();
});

test('leg (a) [M1]: readSyncOrigin is undefined with globalThis.window replaced by undefined, and the window is restored after', () => {
  const readSyncOrigin = StoreDataModule.readSyncOrigin;
  expect(typeof readSyncOrigin).toBe('function');

  let withoutWindow: unknown = 'not called';
  try {
    // The Bun-side call the linter's capture child makes: the module is
    // imported where there is no `window` at all.
    (globalThis as unknown as {window?: unknown}).window = undefined;
    withoutWindow = readSyncOrigin();
  } finally {
    // "restored after" — put the descriptor back exactly as the registrar left
    // it, whatever the call above did.
    if (realWindow) {
      Object.defineProperty(globalThis, 'window', realWindow);
    } else {
      delete (globalThis as unknown as {window?: unknown}).window;
    }
  }

  // [M1] `undefined` when `window` is undefined.
  expect(withoutWindow).toBeUndefined();

  // And the window really is back, so the renders below have a DOM.
  expect(typeof window).toBe('object');
  expect(typeof document.createElement).toBe('function');
});

test('leg (a) [M1]: vite-env.d.ts declares __TINYAPP_SYNC__?: string on Window beside the two existing handles', () => {
  const declarations = readRepoFile('client/src/vite-env.d.ts');

  // [M1] the declaration itself — the Proof's second `Run:` line, verbatim.
  expect(declarations).toContain('__TINYAPP_SYNC__?: string');

  // [M1] "beside the two existing handles": the same `interface Window` block
  // still names the seed and the exam flag.
  const block = declarations.slice(declarations.indexOf('interface Window'));
  expect(block).toContain('__TINYAPP_SEED__');
  expect(block).toContain('__TINYAPP_EXAM__');
  expect(block).toContain('__TINYAPP_SYNC__');
});

// ---------------------------------------------------------------------------
// Leg (b) [M2] — `syncUrl`, and the one socket the page dials with the handle.
// ---------------------------------------------------------------------------

test("leg (b) [M2]: syncUrl('todos') is the handle's /sync/todos with the handle set and SERVER's with it unset, SERVER unchanged", () => {
  clearAll();
  const syncUrl = ConfigModule.syncUrl;
  expect(typeof syncUrl).toBe('function');

  // [M2] `SERVER` unchanged at `ws://localhost:9876` — the value, and the
  // Proof's third `Run:` line over the source.
  expect(ConfigModule.SERVER).toBe(SERVER_ORIGIN);
  expect(
    readRepoFile('client/src/config.ts')
      .split('\n')
      .some((line) => line === `export const SERVER = '${SERVER_ORIGIN}';`),
  ).toBe(true);

  // [M2] with the handle set, `<readSyncOrigin()>/sync/<module>`.
  win().__TINYAPP_SYNC__ = SYNC_ORIGIN;
  expect(syncUrl('todos')).toBe(SYNC_URL);

  // [M2] with it unset, `<SERVER>/sync/<module>`.
  delete win().__TINYAPP_SYNC__;
  expect(syncUrl('todos')).toBe(SERVER_URL);

  clearAll();
});

test("leg (b) [M2]: an unseeded, unflagged render with the handle set constructs the socket exactly once, with the handle's /sync/todos", async () => {
  clearAll();
  win().__TINYAPP_SYNC__ = SYNC_ORIGIN;

  const socketsBefore = socketUrls.length;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  expect(sink.store).toBeDefined();

  // [M2] `SyncLink` dials `syncUrl('todos')` and nothing else: one construction
  // in the whole tally, and it is the handle's URL.
  expect(socketUrls.slice(socketsBefore)).toEqual([SYNC_URL]);

  root.unmount();
  clearAll();
});

// ---------------------------------------------------------------------------
// Leg (c) [M3] — the same render hands its live store out, and both links run.
// ---------------------------------------------------------------------------

test('leg (c) [M3]: that render exposes the Provider store itself, which follows setTodoCompleted, with one persister and one synchronizer', async () => {
  clearAll();
  win().__TINYAPP_SYNC__ = SYNC_ORIGIN;

  const persistersBefore = persisters;
  const syncsBefore = syncs;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  // [M3] `window.__TINYAPP_STORE__` is defined, and is the Provider's store —
  // the same object, not a copy of its content.
  expect(sink.store).toBeDefined();
  expect(win().__TINYAPP_STORE__).toBeDefined();
  expect(win().__TINYAPP_STORE__).toBe(sink.store);

  // [M3] before the mutation both hold the unseeded page's content.
  expect(sink.store.getContent()).toEqual(DEFAULT_CONTENT);
  expect(win().__TINYAPP_STORE__.getContent()).toEqual(DEFAULT_CONTENT);

  // [M3] "its `getContent()` after `setTodoCompleted` follows the app store":
  // the mutation goes through the app's own mutation on the Provider's store,
  // and the handle shows it.
  StoreDataModule.setTodoCompleted(sink.store, '1', true);
  expect(win().__TINYAPP_STORE__.getContent()).toEqual(
    DEFAULT_CONTENT_WITH_1_COMPLETED,
  );
  expect(win().__TINYAPP_STORE__.getContent()).toEqual(sink.store.getContent());

  // [M3] the persister and the synchronizer each started exactly once — this is
  // the page at BASE, with the socket pointed somewhere else.
  expect(persisters - persistersBefore).toBe(1);
  expect(syncs - syncsBefore).toBe(1);

  root.unmount();
  clearAll();
});

// ---------------------------------------------------------------------------
// Leg (d) [M4] — the three pages that are exactly the pages they were.
// ---------------------------------------------------------------------------

test('leg (d) [M4]: with no handle the page dials ws://localhost:9876/sync/todos once and leaves __TINYAPP_STORE__ undefined', async () => {
  clearAll();

  const socketsBefore = socketUrls.length;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  expect(sink.store).toBeDefined();

  // [M4] the socket stub is constructed once, with `SERVER`'s URL.
  expect(socketUrls.slice(socketsBefore)).toEqual([SERVER_URL]);

  // [M4] and the page exposes nothing.
  expect(win().__TINYAPP_STORE__).toBeUndefined();

  root.unmount();
  clearAll();
});

test('leg (d) [M4]: a seeded page with the handle set dials nothing and is the seeded page it was at BASE', async () => {
  clearAll();
  win().__TINYAPP_SYNC__ = SYNC_ORIGIN;
  win().__TINYAPP_SEED__ = SEED;

  const socketsBefore = socketUrls.length;
  const syncsBefore = syncs;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  // [M4] the seeded page dials nothing — zero socket constructions, handle or
  // no handle.
  expect(socketUrls.slice(socketsBefore)).toEqual([]);
  expect(syncs - syncsBefore).toBe(0);

  // [M4] and it is otherwise the page it was at BASE: the seed is what it
  // holds, handed over on `__TINYAPP_STORE__`.
  expect(sink.store).toBeDefined();
  expect(sink.store.getContent()).toEqual(SEED);
  expect(win().__TINYAPP_STORE__).toBeDefined();
  expect(win().__TINYAPP_STORE__.getContent()).toEqual(SEED);

  root.unmount();
  clearAll();
});

test('leg (d) [M4]: a flagged page with the handle set dials nothing and is the flagged page it was at BASE', async () => {
  clearAll();
  win().__TINYAPP_SYNC__ = SYNC_ORIGIN;
  win().__TINYAPP_EXAM__ = true;

  const socketsBefore = socketUrls.length;
  const syncsBefore = syncs;

  const sink: {store?: any} = {};
  const root = render(sink);

  await settle();

  // [M4] the flagged page dials nothing — the exam flag's contract is
  // unchanged, handle or no handle.
  expect(socketUrls.slice(socketsBefore)).toEqual([]);
  expect(syncs - syncsBefore).toBe(0);

  // [M4] and it is otherwise the page it was at BASE: the flag still hands the
  // store over.
  expect(sink.store).toBeDefined();
  expect(win().__TINYAPP_STORE__).toBe(sink.store);

  root.unmount();
  clearAll();
});

// ---------------------------------------------------------------------------
// Leg (e) [M5] — AGENTS.md's key-files list names the third handle.
// ---------------------------------------------------------------------------

test('leg (e) [M5]: the Key Files section of AGENTS.md names __TINYAPP_SYNC__, then /sync/todos, then store, in that order', () => {
  // The Proof's first `Run:` line, run here over the file's own text:
  //   sed -n '/^## Key Files/,/^## Working Method/p' AGENTS.md
  //     | tr '\n' ' '
  //     | grep -q '__TINYAPP_SYNC__.*/sync/todos.*store'
  const lines = readRepoFile('AGENTS.md').split('\n');

  const start = lines.findIndex((line) => /^## Key Files/.test(line));
  expect(start).toBeGreaterThanOrEqual(0);

  const offset = lines
    .slice(start)
    .findIndex((line) => /^## Working Method/.test(line));
  // `sed` prints to end of file when the closing address never matches.
  const end = offset === -1 ? lines.length : start + offset + 1;

  const section = lines.slice(start, end).join(' ');

  // [M5] the three, in that order, in the one section.
  expect(/__TINYAPP_SYNC__.*\/sync\/todos.*store/.test(section)).toBe(true);
});
