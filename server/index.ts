import {createMergeableStore, type IdAddedOrRemoved} from 'tinybase';
import {createDurableObjectSqlStoragePersister} from 'tinybase/persisters/persister-durable-object-sql-storage';
import {
  getWsServerDurableObjectFetch,
  WsServerDurableObject,
} from 'tinybase/synchronizers/synchronizer-ws-server-durable-object';

export class TinyBaseDurableObject extends WsServerDurableObject {
  createPersister() {
    const store = createMergeableStore();
    const persister = createDurableObjectSqlStoragePersister(
      store,
      this.ctx.storage.sql,
    );
    return persister;
  }

  onClientId(
    pathId: string,
    clientId: string,
    addedOrRemoved: IdAddedOrRemoved,
  ) {
    console.log(
      `Client ${clientId} ${addedOrRemoved == 1 ? 'joined' : 'left'} /${pathId}`,
    );
  }
}

export default {
  fetch: getWsServerDurableObjectFetch('TinyBaseDurableObjects'),
};
