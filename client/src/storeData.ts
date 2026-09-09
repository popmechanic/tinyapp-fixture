import {
  createMergeableStore,
  type Content,
  type MergeableStore,
  type NoValuesSchema,
  type Row,
} from 'tinybase/with-schemas';

export const TABLES_SCHEMA = {
  todos: {
    text: {type: 'string', default: ''},
    completed: {type: 'boolean', default: false},
  },
} as const;

export type TodoRow = Row<typeof TABLES_SCHEMA, 'todos'>;

export type Schemas = [typeof TABLES_SCHEMA, NoValuesSchema];

export type TodosStore = MergeableStore<Schemas>;

export type TodosContent = Content<Schemas>;

export const STORE_ID = 'todos';

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
  return seed === undefined ? store : store.setContent(seed);
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

export const deleteTodo = (store: TodosStore, id: string): void => {
  store.delRow('todos', id);
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
