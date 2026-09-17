import {readSyncOrigin} from './storeData';

// celld dev's default port; the root forwards /sync/<module> to that module's facet.
export const SERVER = 'ws://localhost:9876';

/**
 * Where this page syncs `module`.
 *
 * The built-in server, as it always was — unless an exam handed the page an
 * origin of its own before it loaded, in which case the same path is dialled at
 * that origin instead. Only the host changes: `/sync/<module>` is the root's
 * mapping either way, so a page under exam reaches the exam's own runtime by
 * the same route it would have reached celld dev.
 */
export const syncUrl = (module: string): string =>
  `${readSyncOrigin() ?? SERVER}/sync/${module}`;
