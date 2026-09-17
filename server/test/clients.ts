/** A synced client of one module, from a test: a MergeableStore over a WebSocket to `/sync/<module>`. */
import {createMergeableStore, type MergeableStore} from 'tinybase';
import {createWsSynchronizer, type WsSynchronizer} from 'tinybase/synchronizers/synchronizer-ws-client';

export type Client = {store: MergeableStore; sync: WsSynchronizer<WebSocket>};

export const client = async (ws: string, module: string): Promise<Client> => {
  const store = createMergeableStore();
  const sync = await createWsSynchronizer(store, new WebSocket(`${ws}/sync/${module}`));
  await sync.startSync();
  return {store, sync};
};

export const same = (a: MergeableStore, b: MergeableStore): boolean =>
  JSON.stringify(a.getContent()) === JSON.stringify(b.getContent());

export const until = async (label: string, pred: () => boolean, limit = 10_000): Promise<number> => {
  const start = performance.now();
  while (!pred()) {
    if (performance.now() - start > limit) throw new Error(`${label}: not within ${limit} ms`);
    await Bun.sleep(20);
  }
  return Math.round(performance.now() - start);
};
