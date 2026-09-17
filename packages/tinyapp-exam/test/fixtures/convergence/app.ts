// The convergence move's stand-in app: a synced page, kept by hand.
//
// It is not the fixture's own client. It is the smallest page that honours what
// `runConvergenceExam` reads — the sync handle, a store handle, one control
// that writes one row — so the move can be exercised before the app itself is
// pointed at an exam's runtime. Nothing here is under the exam flag: the page
// is an ordinary unseeded page that happens to have been told, in
// `window.__TINYAPP_SYNC__`, which origin to dial.
//
// The store is empty at load and stays empty until something puts a row in it:
// either this page's own `Add`, or the module object sending down what another
// page's `Add` put there. That is the whole of the claim the exam makes.

import {createMergeableStore, type MergeableStore} from 'tinybase';
import {createWsSynchronizer} from 'tinybase/synchronizers/synchronizer-ws-client';

declare global {
  interface Window {
    __TINYAPP_SYNC__?: string;
    __TINYAPP_STORE__?: MergeableStore;
  }
}

const store = createMergeableStore();
window.__TINYAPP_STORE__ = store;

const list = document.querySelector('#rows')!;

/** One `<li>` per row of `todos`, in row-id order, carrying the row's text. */
const render = (): void => {
  const rows = store.getTable('todos');
  list.replaceChildren(
    ...Object.keys(rows)
      .sort()
      .map((id) => {
        const item = document.createElement('li');
        item.id = `row-${id}`;
        item.textContent = String(rows[id]?.text ?? '');
        return item;
      }),
  );
};

store.addDidFinishTransactionListener(render);
render();

document.querySelector('#add')!.addEventListener('click', () => {
  store.setRow('todos', '0', {text: 'buy milk', completed: false});
});

// The dial, and only when the handle names a socket origin: without one this is
// the page it always was, which is the rule `client/src/storeData.ts` keeps.
const origin = window.__TINYAPP_SYNC__;
if (typeof origin === 'string' && origin.startsWith('ws')) {
  void (async () => {
    const socket = new WebSocket(`${origin}/sync/todos`);
    const synchronizer = await createWsSynchronizer(store, socket);
    await synchronizer.startSync();
    // Load then save on open, as the app's own `SyncLink` does: the load is how
    // a page opened late catches up, and the save is how the module object
    // hears about a page that arrived with something of its own.
    await synchronizer.load();
    await synchronizer.save();
  })();
}
