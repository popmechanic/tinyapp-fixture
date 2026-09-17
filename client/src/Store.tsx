import {useEffect, useState} from 'react';
import * as UiReact from 'tinybase/ui-react/with-schemas';
import {type MergeableStore} from 'tinybase/with-schemas';
import {
  STORE_ID,
  addTodo,
  createTodosStore,
  deleteTodo,
  pinTodo,
  readExamFlag,
  readSeed,
  setTodoCompleted,
  setTodoDue,
  type Schemas,
  type TodoRow,
  type TodosStore,
} from './storeData';
import {createSqliteWasmPersister} from 'tinybase/persisters/persister-sqlite-wasm/with-schemas';
import {getDb} from './sqlite';
import {SERVER} from './config';
import ReconnectingWebSocket from 'reconnecting-websocket';
import {createWsSynchronizer} from 'tinybase/synchronizers/synchronizer-ws-client/with-schemas';

const {
  useAddRowCallback,
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useDelRowCallback,
  useProvideStore,
  useRow,
  useSetPartialRowCallback,
  useSortedRowIds,
  useStore,
  useTable,
  useValue,
} = UiReact as UiReact.WithSchemas<Schemas>;

export {STORE_ID, addTodo, deleteTodo, pinTodo, setTodoCompleted, setTodoDue};
export type {TodoRow, TodosStore};
export {
  useAddRowCallback,
  useDelRowCallback,
  useRow,
  useSortedRowIds,
  useSetPartialRowCallback,
  useStore,
  useTable,
  useValue,
};

// The two handles the exam flag adds, wiped back off `window`.
//
// A page that has just mounted has opened nothing and loaded nothing, so
// neither handle is true of it yet; clearing them here is what stops a second
// render in one process — or a page that once flew the flag — from being read
// as this one's. It is the rule `exposeStore` already applies to
// `__TINYAPP_STORE__`, said about the other two.
const clearExamHandles = (): void => {
  if (typeof window !== 'undefined') {
    delete window.__TINYAPP_DB__;
    delete window.__TINYAPP_PERSISTER__;
  }
};

export const Store = ({onReady}: {onReady?: () => void}) => {
  // Read the seed once, at mount: which of the two components below renders
  // must not flip between renders, since each holds its own hooks.
  const [seed] = useState(readSeed);
  // The exam flag is read once for the same reason — `StoreLinks` mounts a
  // different set of children under it. Clearing the handles rides along in
  // the same once-at-mount initialiser so it happens before any child's
  // effect can set them.
  const [exam] = useState(() => {
    clearExamHandles();
    return readExamFlag();
  });
  // Handing the seed on is also what exposes `window.__TINYAPP_STORE__`:
  // `createTodosStore` sets the handle when it is seeded, and — since the flag
  // — when an exam asked for it.
  const store = useCreateMergeableStore(() => createTodosStore(seed));

  useProvideStore(STORE_ID, store);

  // A seeded page is a snapshot of state that already exists: it opens neither
  // the SQLite database nor the sync socket, flag or no flag.
  return seed === undefined ? (
    <StoreLinks store={store} exam={exam} onReady={onReady} />
  ) : (
    <SeededStore onReady={onReady} />
  );
};

const SeededStore = ({onReady}: {onReady?: () => void}) => {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return null;
};

const StoreLinks = ({
  store,
  exam,
  onReady,
}: {
  store: TodosStore;
  exam: boolean;
  onReady?: () => void;
}) => {
  useCreatePersister(
    store,
    async (store) => {
      const {sqlite3, db} = await getDb();
      // The database an exam reads rows out of, handed over the moment it
      // exists — an exam holding it can read what the page persisted without
      // opening a second connection to the same kvvfs.
      if (exam && typeof window !== 'undefined') {
        window.__TINYAPP_DB__ = db;
      }
      // The hook offers `Store | MergeableStore`; this store is always the
      // MergeableStore created above, and the persister's mergeable overload
      // needs to see that (seed skeleton fix, 2026-09-09; TS 6 + tinybase 9.7).
      return createSqliteWasmPersister(
        store as MergeableStore<Schemas>,
        sqlite3,
        db,
        STORE_ID,
      );
    },
    [],
    async (persister) => {
      await persister.load();
      // Set here and nowhere earlier: a helper reads the presence of this
      // handle as "the page has loaded back what it persisted", so it must not
      // appear while the `load()` above is still in flight.
      if (exam && typeof window !== 'undefined') {
        window.__TINYAPP_PERSISTER__ = persister;
      }
      await persister.startAutoSave();
      onReady?.();
    },
  );

  // Hooks are unconditional, so the synchronizer cannot be skipped behind an
  // `if` here — it is the whole of a child that simply is not mounted under
  // the exam flag. An exam runs against one page and no server; a socket
  // dialled from it would be a breach of that, not a feature going unused.
  return exam ? null : <SyncLink store={store} />;
};

const SyncLink = ({store}: {store: TodosStore}) => {
  useCreateSynchronizer(store, async (store) => {
    // The module this store belongs to — the root maps it to the todos facet.
    const serverPathId = '/sync/todos';
    const synchronizer = await createWsSynchronizer(
      store,
      // `WebSocketTypes` is `WebSocket | ws.WebSocket`; pulling
      // `@happy-dom/global-registrator` in for the tests brings `@types/ws`
      // with it, which resolves that union for the first time and exposes
      // `ReconnectingWebSocket`'s narrower `onerror`. It is a drop-in
      // WebSocket at runtime, so say so.
      new ReconnectingWebSocket(SERVER + serverPathId) as unknown as WebSocket,
    );
    await synchronizer.startSync();

    synchronizer.getWebSocket().addEventListener('open', () => {
      synchronizer.load().then(() => {
        synchronizer.save();
      });
    });

    return synchronizer;
  });

  return null;
};
