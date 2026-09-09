import {useEffect, useState} from 'react';
import * as UiReact from 'tinybase/ui-react/with-schemas';
import {type MergeableStore} from 'tinybase/with-schemas';
import {
  STORE_ID,
  addTodo,
  createTodosStore,
  deleteTodo,
  readSeed,
  setTodoCompleted,
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
} = UiReact as UiReact.WithSchemas<Schemas>;

export {STORE_ID, addTodo, deleteTodo, setTodoCompleted};
export type {TodoRow, TodosStore};
export {
  useAddRowCallback,
  useDelRowCallback,
  useRow,
  useSortedRowIds,
  useSetPartialRowCallback,
  useStore,
  useTable,
};

export const Store = ({onReady}: {onReady?: () => void}) => {
  // Read the seed once, at mount: which of the two components below renders
  // must not flip between renders, since each holds its own hooks.
  const [seed] = useState(readSeed);
  const store = useCreateMergeableStore(() => createTodosStore(seed));

  useProvideStore(STORE_ID, store);

  // A seeded page is a snapshot of state that already exists: it opens neither
  // the SQLite database nor the sync socket.
  return seed === undefined ? (
    <StoreLinks store={store} onReady={onReady} />
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
  onReady,
}: {
  store: TodosStore;
  onReady?: () => void;
}) => {
  useCreatePersister(
    store,
    async (store) => {
      const {sqlite3, db} = await getDb();
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
      await persister.startAutoSave();
      onReady?.();
    },
  );

  useCreateSynchronizer(store, async (store) => {
    const serverPathId = location.pathname;
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
