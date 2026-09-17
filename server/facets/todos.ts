/**
 * The `todos` facet: the module that owns the todos store.
 *
 * This file is bundled to a string by `build-facets.ts` and loaded by the root
 * through the Worker Loader, so it runs as a Durable Object Facet with its own
 * SQLite database and no network (`globalOutbound: null`). Nothing in here can
 * see the root's storage, and the root reaches it only through `fetch`.
 *
 * Two surfaces: the WebSocket sync every client dials (TinyBase's ws server),
 * and — only when the loader handed it `TINYAPP_EXAM=1` — the exam routes the
 * root forwards: `/exam/content` (the store's `getContent()`), `/exam/seed`
 * (`setContent` from a snapshot, then save) and `/exam/rows` (the SQLite rows
 * the persister wrote, table by table).
 */
import {createMergeableStore, type MergeableStore} from 'tinybase';
import type {Persister, Persists} from 'tinybase/persisters';
import {createDurableObjectSqlStoragePersister} from 'tinybase/persisters/persister-durable-object-sql-storage';
import {WsServerDurableObject} from 'tinybase/synchronizers/synchronizer-ws-server-durable-object';

type FacetEnv = {TINYAPP_EXAM?: string};

export class Facet extends WsServerDurableObject<FacetEnv> {
  #persister?: Persister<Persists.MergeableStoreOnly>;

  createPersister() {
    const store = createMergeableStore();
    // Fragmented: each table's rows as SQLite rows of their own, so the exam's
    // `rows` read compares the app's tables, not one JSON blob of the store.
    this.#persister = createDurableObjectSqlStoragePersister(
      store,
      this.ctx.storage.sql,
      {mode: 'fragmented'},
    );
    return this.#persister;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/exam/')) {
      if (this.env.TINYAPP_EXAM !== '1') {
        return new Response('exam surface is off', {status: 404});
      }
      return this.#exam(url.pathname.slice('/exam/'.length), request);
    }
    // DurableObject types `fetch` as optional; the ws server always defines it.
    return super.fetch!(request);
  }

  async #exam(verb: string, request: Request): Promise<Response> {
    const persister = this.#persister;
    if (persister === undefined) {
      return new Response('persister not ready', {status: 503});
    }
    const store = persister.getStore();
    switch (verb) {
      case 'content':
        return Response.json(store.getContent());
      case 'seed': {
        const content = (await request.json()) as Parameters<typeof store.setContent>[0];
        store.setContent(content);
        await persister.save();
        return Response.json(store.getContent());
      }
      case 'rows': {
        const sql = this.ctx.storage.sql;
        const tables = sql
          // The runtime keeps its own tables in the same file (`_cf_*`,
          // `_litestream_*` on celld) and refuses a read of them; the app's
          // rows are every table not named with a leading underscore.
          .exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\' ORDER BY name")
          .toArray()
          .map((row) => String(row.name));
        const rows: Record<string, unknown[]> = {};
        for (const table of tables) {
          rows[table] = sql.exec(`SELECT * FROM "${table.replaceAll('"', '""')}"`).toArray();
        }
        return Response.json(rows);
      }
      case 'discard': {
        // The named shape's delete: drop every row and every socket; the
        // next request to this name starts empty (a facet is deleted by the
        // root instead).
        // 1000: the runtime permits only 1000 and 3000–4999 from script.
        for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'discarded');
        await this.ctx.storage.deleteAll();
        return new Response('discarded');
      }
      default:
        return new Response(`no such exam verb: ${verb}`, {status: 404});
    }
  }
}
