import {
  createMergeableStore,
  type Content,
  type MergeableStore,
  type NoValuesSchema,
  type Row,
} from 'tinybase/with-schemas';

// The cells of a todo, written once. `trash` is where a deleted todo waits, so
// it is a todos row copied whole — the same cells by construction, which is how
// a cell a later change adds to a todo becomes a cell of a trashed todo too.
const TODO_CELLS = {
  text: {type: 'string', default: ''},
  completed: {type: 'boolean', default: false},
} as const;

export const TABLES_SCHEMA = {
  todos: TODO_CELLS,
  trash: TODO_CELLS,
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

// A completed todo has non-empty text. Held once, because a trashed todo is a
// todos row copied whole and so is a todo by the same rule.
const completedHasText = (
  row: Record<string, string | number | boolean>,
): boolean =>
  row.completed !== true || (typeof row.text === 'string' && row.text !== '');

export const INVARIANTS: Invariant[] = [
  {
    table: 'todos',
    predicate: (row) => completedHasText(row),
    message: 'a completed todo has non-empty text',
  },
  {
    table: 'trash',
    predicate: (row) => completedHasText(row),
    message: 'a completed todo waiting in the trash has non-empty text',
  },
];

export type TodoRow = Row<typeof TABLES_SCHEMA, 'todos'>;

export type Schemas = [typeof TABLES_SCHEMA, NoValuesSchema];

export type TodosStore = MergeableStore<Schemas>;

export type TodosContent = Content<Schemas>;

export const STORE_ID = 'todos';

// The seeded page hands its store back the way it was handed its seed: on
// `window`, under a name the exam knows. A normal page leaves no such handle,
// so the two are told apart by its absence and not by its contents.
declare global {
  interface Window {
    __TINYAPP_STORE__?: TodosStore;
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
  // Only a seeded store is exposed; creating an unseeded one on a page that
  // once held a seed clears the handle rather than leaving a stale one.
  exposeStore(seed === undefined ? undefined : created);
  return created;
};

// The mutations below are the single code path shared by the UI's buttons and
// by any headless caller (an exam, the seeded snapshot page).

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

// Delete moves the row whole into `trash`, which only ever holds the last one
// deleted: clearing `trash` first is what keeps at most one row waiting, and
// doing all three writes in one transaction is what stops a listener ever
// seeing the row in neither table or in both.
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

// Undo puts the waiting row back exactly as it was. With nothing waiting the
// loop body never runs, so the store is left as it was found.
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

// A rendered snapshot page hands its starting state over on `window`; outside
// a browser (or without a seed) there is simply none.
export const readSeed = (): TodosContent | undefined =>
  typeof window === 'undefined' ? undefined : window.__TINYAPP_SEED__;
