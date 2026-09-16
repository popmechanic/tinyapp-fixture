import {
  createMergeableStore,
  type Content,
  type MergeableStore,
  type Row,
} from 'tinybase/with-schemas';

import {isIsoDate} from './overdue';

// The cells of a todo, written once. `todos` and `trash` are both this literal,
// so a cell a later change adds to a todo is a cell of a trashed todo by
// construction — a deleted row is the row it was, not a hand-picked subset of
// it, whatever the schema grows to hold.
const TODO_CELLS = {
  text: {type: 'string', default: ''},
  completed: {type: 'boolean', default: false},
  // No default, deliberately: a cell with one is materialised into the
  // `getContent()` of every row TinyBase holds, which would write a `due`
  // into every seed and expected state already checked in. Without one, a
  // todo that has no date has no `due` cell at all.
  due: {type: 'string'},
  // No default either, and for `due`'s reason: a `pinned: false` materialised
  // into every row would rewrite all eighteen snapshots checked in before the
  // cell existed. A todo that is not pinned has no `pinned` cell at all.
  pinned: {type: 'boolean'},
} as const;

export const TABLES_SCHEMA = {
  todos: TODO_CELLS,
  // Where the last deleted todo waits. At most one row ever sits here — that
  // is `deleteTodo`'s contract, not the schema's: the linter's invariants are
  // per row and cannot speak about how many rows a table holds.
  trash: TODO_CELLS,
} as const;

// The chosen filter, and nowhere else. Deliberately no `default`: a default
// would put `{filter: 'all'}` into a store nobody has filtered, so every
// snapshot checked in beside the seeds would stop loading to itself. An absent
// value is how the app says All.
export const VALUES_SCHEMA = {
  filter: {type: 'string'},
} as const;

// What every row of a table must satisfy, whoever wrote the row: the UI, an
// exam's seed, or an expected state checked in beside it. The schema says what
// a cell is; an invariant says what a row means, and carries the sentence to
// say when a row stops meaning it.
export type Invariant = {
  table: keyof typeof TABLES_SCHEMA;
  predicate: (row: Record<string, string | number | boolean>, rowId: string) => boolean;
  message: string;
};

export const INVARIANTS: Invariant[] = [
  {
    table: 'todos',
    predicate: (row) =>
      row.completed !== true || (typeof row.text === 'string' && row.text !== ''),
    message: 'a completed todo has non-empty text',
  },
  // Appended, never inserted: the linter's own exam reads the entry above as
  // `INVARIANTS[0]`. An absent `due` satisfies this one, which is what keeps
  // every row written before the cell existed a row that still holds.
  {
    table: 'todos',
    predicate: (row) =>
      row.due === undefined || (typeof row.due === 'string' && isIsoDate(row.due)),
    message: 'a due date is absent or a valid YYYY-MM-DD',
  },
  // A trashed todo is a todo: the row `deleteTodo` copies across is the row it
  // was, so the rule about what a completed todo means goes on holding while
  // it waits. Appended for the same reason as the entry above.
  {
    table: 'trash',
    predicate: (row) =>
      row.completed !== true || (typeof row.text === 'string' && row.text !== ''),
    message: 'a completed todo in the trash has non-empty text',
  },
];

export type TodoRow = Row<typeof TABLES_SCHEMA, 'todos'>;

export type Schemas = [typeof TABLES_SCHEMA, typeof VALUES_SCHEMA];

export type TodosStore = MergeableStore<Schemas>;

export type TodosContent = Content<Schemas>;

export const STORE_ID = 'todos';

// The handles a page hands *out*, declared beside the store they belong to.
// (The two a harness sets *into* a page — `__TINYAPP_SEED__` and
// `__TINYAPP_EXAM__` — are declared in `vite-env.d.ts`.)
//
// The seeded page hands its store back the way it was handed its seed: on
// `window`, under a name the exam knows. A normal page leaves no such handle,
// so the two are told apart by its absence and not by its contents. A page
// flying the exam flag hands over the same handle unseeded, plus the SQLite
// database it opened and — once it has loaded what it persisted — its
// persister; `Store.tsx` is what writes those two.
declare global {
  interface Window {
    __TINYAPP_STORE__?: TodosStore;
    __TINYAPP_DB__?: unknown;
    __TINYAPP_PERSISTER__?: unknown;
  }
}

const exposeStore = (store: TodosStore | undefined): void => {
  if (typeof window === 'undefined') {
    return;
  }
  if (store === undefined) {
    delete window.__TINYAPP_STORE__;
  } else {
    window.__TINYAPP_STORE__ = store;
  }
};

export const createTodosStore = (seed?: TodosContent): TodosStore => {
  const store = createMergeableStore()
    .setTablesSchema(TABLES_SCHEMA)
    .setValuesSchema(VALUES_SCHEMA)
    .setDefaultContent([
      {
        todos: {
          '1': {text: 'Learn TinyBase', completed: false},
          '2': {text: 'Build an app', completed: false},
        },
      },
      {},
    ]);
  const created: TodosStore = seed === undefined ? store : store.setContent(seed);
  // A seeded store is exposed as it always was, flag or no flag; an unseeded
  // one only under the exam flag. Creating an unexposed store on a page that
  // once held one clears the handle rather than leaving a stale one.
  exposeStore(seed === undefined && !readExamFlag() ? undefined : created);
  return created;
};

// The three mutations below are the single code path shared by the UI's
// buttons and by any headless caller (an exam, the seeded snapshot page).

export const addTodo = (store: TodosStore, text: string): string | undefined => {
  const trimmed = text.trim();
  return trimmed === ''
    ? undefined
    : store.addRow('todos', {text: trimmed, completed: false});
};

export const setTodoCompleted = (
  store: TodosStore,
  id: string,
  completed: boolean,
): void => {
  store.setPartialRow('todos', id, {completed});
};

/**
 * Sets row `id`'s due date, or clears it when `due` is `''`.
 *
 * Nothing but a real `YYYY-MM-DD` is ever written: a date that does not parse
 * is refused outright rather than stored and reported later, so the invariant
 * above only ever has to speak about a state that arrived some other way — a
 * hand-written seed, or an expected file.
 */
export const setTodoDue = (store: TodosStore, id: string, due: string): void => {
  if (due === '') {
    store.delCell('todos', id, 'due');
  } else if (isIsoDate(due)) {
    store.setPartialRow('todos', id, {due});
  }
};

/**
 * Pins todo `id`, or unpins it.
 *
 * Unpinning deletes the cell rather than writing `false`, so a todo that has
 * been pinned and unpinned is byte for byte the todo it was — the shape every
 * snapshot checked in before the cell existed still has. A `delCell` of a cell
 * that is not there is a no-op, so unpinning an unpinned todo is one too.
 *
 * An id the list does not hold is left alone: `setPartialRow` on a missing row
 * would create a phantom row out of the schema's defaults rather than fail.
 */
export const pinTodo = (store: TodosStore, id: string, pinned: boolean): void => {
  if (!store.hasRow('todos', id)) {
    return;
  }
  if (pinned) {
    store.setPartialRow('todos', id, {pinned: true});
  } else {
    store.delCell('todos', id, 'pinned');
  }
};

/**
 * Moves todo `id` out of the list and into the trash, whole.
 *
 * One transaction, so no listener ever sees the row in neither table or in
 * both. The `delTable` comes first: the trash holds the last delete and only
 * that one, so a second Delete replaces what was waiting rather than piling up
 * beside it. An id the list does not hold is left alone — nothing is deleted,
 * so nothing goes to the trash and whatever was waiting there stays.
 */
export const deleteTodo = (store: TodosStore, id: string): void => {
  store.transaction(() => {
    if (!store.hasRow('todos', id)) {
      return;
    }
    store.delTable('trash');
    store.setRow('trash', id, store.getRow('todos', id));
    store.delRow('todos', id);
  });
};

/**
 * Puts the waiting todo back under the id it had, exactly as it was.
 *
 * With nothing waiting the loop body never runs, so an undo on an empty trash
 * leaves the store untouched rather than writing an empty table into it.
 */
export const undoDelete = (store: TodosStore): void => {
  store.transaction(() => {
    store.getRowIds('trash').forEach((id) => {
      store.setRow('todos', id, store.getRow('trash', id));
      store.delRow('trash', id);
    });
  });
};

export const clearCompleted = (store: TodosStore): void => {
  store.transaction(() => {
    store.getRowIds('todos').forEach((id) => {
      if (store.getCell('todos', id, 'completed') === true) {
        store.delRow('todos', id);
      }
    });
  });
};

// The three names the app knows, spelled here once. The schema says `filter`
// holds a string, so it would take `'bogus'` without complaint — this guard is
// what refuses it, and an unknown name leaves the store exactly as it was.
export const setFilter = (store: TodosStore, filter: string): void => {
  if (filter === 'all' || filter === 'open' || filter === 'done') {
    store.setValue('filter', filter);
  }
};

// A rendered snapshot page hands its starting state over on `window`; outside
// a browser (or without a seed) there is simply none.
export const readSeed = (): TodosContent | undefined =>
  typeof window === 'undefined' ? undefined : window.__TINYAPP_SEED__;

/**
 * Whether this page was opened by an exam, which is the one thing that makes it
 * hand its own innards over.
 *
 * Read exactly like `readSeed`, and as narrowly: only the literal `true` raises
 * the flag, so a page that happens to carry the name under some other value is
 * the normal page it was. Outside a browser there is no flag at all — the
 * linter imports this module under Bun, where `window` is undefined.
 */
export const readExamFlag = (): boolean =>
  typeof window === 'undefined' ? false : window.__TINYAPP_EXAM__ === true;
