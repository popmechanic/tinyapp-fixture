import * as UiReact from 'tinybase/ui-react/with-schemas';
import {type MergeableStore, type NoValuesSchema} from 'tinybase/with-schemas';
import {TABLES_SCHEMA} from './storeData';
import {STORE_ID, createTodosStore, type TodoRow} from './storeData';
import {createSqliteWasmPersister} from 'tinybase/persisters/persister-sqlite-wasm/with-schemas';
import {getDb} from './sqlite';
import {SERVER} from './config';
import ReconnectingWebSocket from 'reconnecting-websocket';
import {createWsSynchronizer} from 'tinybase/synchronizers/synchronizer-ws-client/with-schemas';

type Schemas = [typeof TABLES_SCHEMA, NoValuesSchema];

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
} = UiReact as UiReact.WithSchemas<Schemas>;

export {STORE_ID};
export type {TodoRow};
export {
  useAddRowCallback,
  useDelRowCallback,
  useRow,
  useSortedRowIds,
  useSetPartialRowCallback,
};

export const Store = ({onReady}: {onReady?: () => void}) => {
  const store = useCreateMergeableStore(() => createTodosStore());

  useProvideStore(STORE_ID, store);

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
      new ReconnectingWebSocket(SERVER + serverPathId),
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
