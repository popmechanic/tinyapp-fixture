import {createMergeableStore, type Row} from 'tinybase/with-schemas';

export const TABLES_SCHEMA = {
  todos: {
    text: {type: 'string', default: ''},
    completed: {type: 'boolean', default: false},
  },
} as const;

export type TodoRow = Row<typeof TABLES_SCHEMA, 'todos'>;

export const STORE_ID = 'todos';

export const createTodosStore = () =>
  createMergeableStore()
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
