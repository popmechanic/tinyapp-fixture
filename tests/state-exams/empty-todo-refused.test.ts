import {stateExam} from 'tinyapp-exam';

import {addTodo, createTodosStore} from '../../client/src/storeData';

// Whitespace is not a todo: the store is left exactly as the seed left it.
stateExam({
  clock: '2026-01-01T00:00:00Z',
  entry: 'client/index.html',
  seed: 'state-exams/seeds/empty.json',
  store: () => createTodosStore(),
  action: (store) => {
    addTodo(store, '   ');
  },
  expected: 'state-exams/expected/still-empty.json',
  view: [
    {selector: '.todoItem', absent: true},
    {selector: '#todoList', count: 1},
  ],
  mutant: [{table: 'todos', row: '0', cell: 'text', value: ''}],
});
