import {stateExam} from 'tinyapp-exam';

import {addTodo, createTodosStore} from '../../client/src/storeData';

// Adding one todo to an empty store leaves exactly that todo, open.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/empty.json',
  store: () => createTodosStore(),
  action: (store) => {
    addTodo(store, 'buy milk');
  },
  expected: 'state-exams/expected/one-open-todo.json',
  view: [
    {selector: '.todoItem', count: 1, text: 'buy milk'},
    {selector: '.todoItem input[type=checkbox]', unchecked: true},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'completed', value: true}],
});
